import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailDeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { maxAttempts, readSmtpSettings, retryBaseMs } from './email.config';
import { lookupMailAuthentication } from './email.dns';
import { EmailPreferencesService } from './email-preferences.service';
import {
  cleanTemplateVars,
  isPermanentSmtpError,
  isValidEmail,
  makeIdempotencyKey,
  nextRetryDelayMs,
  preferenceAllows,
  redactStoredError,
  replyMailbox,
  sanitizeHeader,
  selectMailbox,
  shouldFailPermanently,
  validateSmtpSettings,
} from './email.policy';
import {
  renderTemplate,
  findTemplate,
  listTemplateCatalog,
} from './email.templates';
import { createMailboxTransport } from './email.transport';
import {
  PARENT_FACING_CATEGORIES,
  type EmailDispatchResult,
  type MailboxId,
  type OutboundEmail,
  type SmtpSettings,
} from './email.types';

const SCHOOL_QUOTA = 500;
const PLATFORM_QUOTA = 30;
const QUOTA_WINDOW_MS = 10 * 60 * 1000;
const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const CLAIM_LOCK_MS = 120_000;

type DeliveryRow = {
  id: string;
  recipient: string;
  sender: string;
  replyTo: string | null;
  subject: string;
  templateId: string;
  variables: Prisma.JsonValue | null;
  maxAttempts: number;
  attempts: number;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private dnsCache: {
    at: number;
    value: Awaited<ReturnType<typeof lookupMailAuthentication>>;
  } | null = null;
  private lastPruneAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly preferences: EmailPreferencesService,
  ) {}

  settings(): SmtpSettings {
    return readSmtpSettings(this.config);
  }

  async enqueue(input: OutboundEmail): Promise<EmailDispatchResult> {
    const prepared = await this.prepare(input);
    if (!prepared.ok) return prepared.result;
    try {
      const row = await this.prisma.emailDelivery.create({
        data: prepared.data,
      });
      return { sent: false, queued: true, id: row.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          sent: false,
          queued: false,
          duplicate: true,
          reason: 'Duplicate suppressed',
        };
      }
      throw error;
    }
  }

  async enqueueSafe(input: OutboundEmail): Promise<void> {
    try {
      await this.enqueue(input);
    } catch {
      this.logger.warn(`Email enqueue failed (${input.category})`);
    }
  }

  async sendNow(input: OutboundEmail): Promise<EmailDispatchResult> {
    const prepared = await this.prepare(input);
    if (!prepared.ok) return prepared.result;
    try {
      const row = await this.prisma.emailDelivery.create({
        data: {
          ...prepared.data,
          status: EmailDeliveryStatus.SENDING,
          attempts: 1,
        },
      });
      return this.deliverClaimed(row, 1);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          sent: false,
          queued: false,
          duplicate: true,
          reason: 'Duplicate suppressed',
        };
      }
      throw error;
    }
  }

  async notifyParents(input: {
    schoolId: string;
    preference: OutboundEmail['preference'];
    category: OutboundEmail['category'];
    templateId: string;
    messages: {
      parentId: string;
      idempotencyKey: string;
      vars?: Record<string, string | undefined>;
    }[];
  }): Promise<void> {
    const settings = this.settings();
    if (!settings.enabled || input.messages.length === 0) return;
    const schoolPrefs = await this.preferences.getSchool(input.schoolId);
    if (!preferenceAllows(schoolPrefs, input.preference)) return;

    const parentIds = [
      ...new Set(input.messages.map((message) => message.parentId)),
    ];
    const [parents, parentPrefs, school] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          id: { in: parentIds },
          schoolId: input.schoolId,
          role: 'parent',
        },
        select: { id: true, email: true, firstName: true },
      }),
      this.prisma.parentEmailPreference.findMany({
        where: { userId: { in: parentIds }, schoolId: input.schoolId },
      }),
      this.prisma.school.findUnique({
        where: { id: input.schoolId },
        select: { name: true },
      }),
    ]);
    const byId = new Map(parents.map((parent) => [parent.id, parent]));
    const prefById = new Map(parentPrefs.map((pref) => [pref.userId, pref]));
    const room = await this.remainingQuota(input.schoolId);
    let used = 0;
    for (const message of input.messages) {
      if (used >= room) break;
      const parent = byId.get(message.parentId);
      if (!parent) continue;
      const pref = prefById.get(parent.id);
      if (
        pref &&
        input.preference &&
        (!pref.enabled || pref[input.preference] === false)
      ) {
        continue;
      }
      await this.enqueueSafe({
        to: parent.email,
        schoolId: input.schoolId,
        category: input.category,
        templateId: input.templateId,
        idempotencyKey: message.idempotencyKey,
        vars: {
          schoolName: school?.name ?? '',
          firstName: parent.firstName,
          ...message.vars,
        },
      });
      used += 1;
    }
  }

  async notifySchoolParents(input: {
    schoolId: string;
    preference: NonNullable<OutboundEmail['preference']>;
    category: OutboundEmail['category'];
    templateId: string;
    idempotencyPrefix: string;
    recipientUserId?: string | null;
    vars?: Record<string, string | undefined>;
  }): Promise<void> {
    const settings = this.settings();
    if (!settings.enabled) return;
    const where = input.recipientUserId
      ? {
          id: input.recipientUserId,
          schoolId: input.schoolId,
          role: {
            in: ['parent', 'admin', 'teacher'] as (
              | 'parent'
              | 'admin'
              | 'teacher'
            )[],
          },
        }
      : { schoolId: input.schoolId, role: 'parent' as const };
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, role: true },
    });
    const parents = users.filter((user) => user.role === 'parent');
    const others = users.filter((user) => user.role !== 'parent');
    if (parents.length > 0) {
      await this.notifyParents({
        schoolId: input.schoolId,
        preference: input.preference,
        category: input.category,
        templateId: input.templateId,
        messages: parents.map((parent) => ({
          parentId: parent.id,
          idempotencyKey: `${input.idempotencyPrefix}:${parent.id}`,
          vars: input.vars,
        })),
      });
    }
    for (const user of others) {
      await this.enqueueSafe({
        to: user.email,
        schoolId: input.schoolId,
        category: input.category,
        templateId: input.templateId,
        preference: input.preference,
        idempotencyKey: `${input.idempotencyPrefix}:${user.id}`,
        vars: { firstName: user.firstName, ...input.vars },
      });
    }
  }

  async notifySchoolAdmins(input: {
    schoolId: string;
    category: OutboundEmail['category'];
    templateId: string;
    idempotencyPrefix: string;
    vars?: Record<string, string | undefined>;
  }): Promise<void> {
    if (!this.settings().enabled) return;
    const admins = await this.prisma.user.findMany({
      where: { schoolId: input.schoolId, role: 'admin' },
      select: { id: true, email: true, firstName: true },
    });
    for (const admin of admins) {
      await this.enqueueSafe({
        to: admin.email,
        schoolId: input.schoolId,
        category: input.category,
        templateId: input.templateId,
        idempotencyKey: `${input.idempotencyPrefix}:${admin.id}`,
        vars: { firstName: admin.firstName, ...input.vars },
      });
    }
  }

  async processDue(now = new Date()): Promise<{ processed: number }> {
    if (!this.settings().enabled) return { processed: 0 };
    await this.recoverStaleClaims(now);
    const due = await this.prisma.emailDelivery.findMany({
      where: {
        status: EmailDeliveryStatus.QUEUED,
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: 15,
    });
    let processed = 0;
    for (const row of due) {
      const claimed = await this.prisma.emailDelivery.updateMany({
        where: { id: row.id, status: EmailDeliveryStatus.QUEUED },
        data: {
          status: EmailDeliveryStatus.SENDING,
          attempts: { increment: 1 },
        },
      });
      if (claimed.count !== 1) continue;
      await this.deliverClaimed(row, row.attempts + 1);
      processed += 1;
    }
    return { processed };
  }

  async pruneOld(now = new Date()): Promise<number> {
    if (now.getTime() - this.lastPruneAt < 60 * 60 * 1000) return 0;
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    const old = await this.prisma.emailDelivery.findMany({
      where: {
        status: {
          in: [
            EmailDeliveryStatus.SENT,
            EmailDeliveryStatus.FAILED,
            EmailDeliveryStatus.SKIPPED,
          ],
        },
        createdAt: { lt: cutoff },
      },
      select: { id: true },
      take: 200,
    });
    if (old.length === 0) {
      this.lastPruneAt = now.getTime();
      return 0;
    }
    const deleted = await this.prisma.emailDelivery.deleteMany({
      where: { id: { in: old.map((row) => row.id) } },
    });
    this.lastPruneAt = now.getTime();
    return deleted.count;
  }

  async overview() {
    const [total, sent, failed, pending, skipped, oldest] = await Promise.all([
      this.prisma.emailDelivery.count(),
      this.prisma.emailDelivery.count({
        where: { status: EmailDeliveryStatus.SENT },
      }),
      this.prisma.emailDelivery.count({
        where: { status: EmailDeliveryStatus.FAILED },
      }),
      this.prisma.emailDelivery.count({
        where: {
          status: {
            in: [EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.SENDING],
          },
        },
      }),
      this.prisma.emailDelivery.count({
        where: { status: EmailDeliveryStatus.SKIPPED },
      }),
      this.prisma.emailDelivery.findFirst({
        where: { status: EmailDeliveryStatus.QUEUED },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);
    const finished = sent + failed;
    const state = await this.prisma.emailSystemState.findUnique({
      where: { id: 'default' },
    });
    return {
      totals: { total, sent, failed, pending, skipped },
      rates: {
        delivery: finished > 0 ? sent / finished : null,
        bounce: null,
      },
      queue: { pending, oldestPendingAt: oldest?.createdAt ?? null },
      lastTest: state
        ? {
            at: state.lastTestAt,
            ok: state.lastTestOk,
            error: state.lastTestError,
            mailbox: state.lastTestMailbox,
          }
        : null,
    };
  }

  async listLogs(filters: {
    status?: string;
    schoolId?: string;
    limit?: number;
    cursor?: string;
  }) {
    const limit = Math.min(50, Math.max(1, filters.limit ?? 25));
    const status = Object.values(EmailDeliveryStatus).includes(
      filters.status as EmailDeliveryStatus,
    )
      ? (filters.status as EmailDeliveryStatus)
      : undefined;
    let rows;
    try {
      rows = await this.prisma.emailDelivery.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          recipient: true,
          sender: true,
          subject: true,
          category: true,
          templateId: true,
          schoolId: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          sentAt: true,
          school: { select: { name: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return { items: [], nextCursor: null };
      }
      throw error;
    }
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((row) => ({
        id: row.id,
        recipient: row.recipient,
        sender: row.sender,
        subject: row.subject,
        category: row.category,
        templateId: row.templateId,
        schoolId: row.schoolId,
        schoolName: row.school?.name ?? null,
        status: row.status,
        attempts: row.attempts,
        error: row.lastError,
        createdAt: row.createdAt,
        sentAt: row.sentAt,
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  listTemplates() {
    return listTemplateCatalog();
  }

  previewTemplate(id: string) {
    const template = findTemplate(id);
    if (!template) return null;
    const rendered = renderTemplate(id, template.sample);
    return {
      id: template.id,
      label: template.label,
      wired: template.wired,
      ...rendered,
    };
  }

  async providerStatus() {
    const settings = this.settings();
    const state = await this.prisma.emailSystemState.findUnique({
      where: { id: 'default' },
    });
    const dns = await this.cachedDns();
    return {
      enabled: settings.enabled,
      host: settings.host,
      port: settings.port,
      encryption: settings.encryption,
      validationErrors: validateSmtpSettings(settings),
      connection: smtpConnectionState(settings, state),
      mailboxes: Object.values(settings.mailboxes).map((mailbox) => ({
        id: mailbox.id,
        address: mailbox.address,
        configured: mailbox.configured,
      })),
      lastTest: state
        ? {
            at: state.lastTestAt,
            ok: state.lastTestOk,
            error: state.lastTestError,
            mailbox: state.lastTestMailbox,
          }
        : null,
      dns,
    };
  }

  async sendTest(input: {
    to: string;
    actorEmail: string;
    mailboxId?: MailboxId;
  }) {
    const actor = sanitizeHeader(input.actorEmail).toLowerCase();
    const recipient = sanitizeHeader(input.to).toLowerCase();
    if (!isValidEmail(actor) || recipient !== actor) {
      throw new ForbiddenException(
        'Test messages can only be sent to the signed-in operator',
      );
    }
    const mailboxId = input.mailboxId ?? 'contact';
    const mailbox = this.settings().mailboxes[mailboxId];
    const result = await this.sendNow({
      to: actor,
      category: 'test',
      templateId: 'test',
      mailboxId,
      idempotencyKey: `test:${mailboxId}:${actor}:${Date.now()}`,
      vars: { sender: mailbox?.address ?? '', firstName: 'there' },
    });
    await this.prisma.emailSystemState.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        lastTestAt: new Date(),
        lastTestOk: result.sent,
        lastTestError: result.sent ? null : (result.reason ?? 'Send failed'),
        lastTestMailbox: mailbox?.address ?? mailboxId,
      },
      update: {
        lastTestAt: new Date(),
        lastTestOk: result.sent,
        lastTestError: result.sent ? null : (result.reason ?? 'Send failed'),
        lastTestMailbox: mailbox?.address ?? mailboxId,
      },
    });
    return result;
  }

  private async prepare(
    input: OutboundEmail,
  ): Promise<
    | { ok: true; data: Prisma.EmailDeliveryCreateInput }
    | { ok: false; result: EmailDispatchResult }
  > {
    const settings = this.settings();
    if (!settings.enabled) {
      return {
        ok: false,
        result: {
          sent: false,
          queued: false,
          reason: 'Email is not configured',
        },
      };
    }
    const validationErrors = validateSmtpSettings(settings);
    if (validationErrors.length > 0) {
      return {
        ok: false,
        result: { sent: false, queued: false, reason: validationErrors[0] },
      };
    }
    const recipient = sanitizeHeader(input.to).toLowerCase();
    if (!isValidEmail(recipient)) {
      return {
        ok: false,
        result: { sent: false, queued: false, reason: 'Invalid recipient' },
      };
    }
    if (!findTemplate(input.templateId)) {
      return {
        ok: false,
        result: {
          sent: false,
          queued: false,
          reason: 'Unknown email template',
        },
      };
    }

    if (input.preference && input.schoolId) {
      const schoolPrefs = await this.preferences.getSchool(input.schoolId);
      let parentEnabled = true;
      if (input.parentUserId) {
        const parentPrefs = await this.preferences.getParent(
          input.schoolId,
          input.parentUserId,
        );
        parentEnabled = preferenceAllows(
          parentPrefs,
          input.preference,
          parentPrefs.enabled,
        );
      }
      if (!preferenceAllows(schoolPrefs, input.preference, parentEnabled)) {
        return {
          ok: false,
          result: {
            sent: false,
            queued: false,
            reason: 'Disabled by notification preferences',
          },
        };
      }
    }

    const idempotencyKey = makeIdempotencyKey(input.idempotencyKey);
    const existing = await this.prisma.emailDelivery.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        ok: false,
        result: {
          sent: existing.status === EmailDeliveryStatus.SENT,
          queued:
            existing.status === EmailDeliveryStatus.QUEUED ||
            existing.status === EmailDeliveryStatus.SENDING,
          duplicate: true,
          id: existing.id,
          reason: 'Duplicate suppressed',
        },
      };
    }

    const room = await this.remainingQuota(input.schoolId);
    if (room <= 0) {
      return {
        ok: false,
        result: {
          sent: false,
          queued: false,
          reason: 'Email rate limit reached',
        },
      };
    }

    const mailboxId = selectMailbox(input.category, input.mailboxId);
    const mailbox = settings.mailboxes[mailboxId];
    const vars = cleanTemplateVars(input.vars);
    if (input.schoolId && !vars.schoolName) {
      const school = await this.prisma.school.findUnique({
        where: { id: input.schoolId },
        select: { name: true, email: true },
      });
      if (school?.name) vars.schoolName = school.name;
      if (
        PARENT_FACING_CATEGORIES.has(input.category) &&
        school?.email &&
        isValidEmail(school.email)
      ) {
        vars.replyTo = school.email;
      }
    }
    const rendered = renderTemplate(input.templateId, vars);
    const replyAddress =
      (vars.replyTo && isValidEmail(vars.replyTo) ? vars.replyTo : null) ??
      settings.mailboxes[replyMailbox(input.category)].address;
    delete vars.replyTo;

    return {
      ok: true,
      data: {
        recipient,
        sender: mailbox.address,
        replyTo: sanitizeHeader(replyAddress),
        subject: rendered.subject,
        category: input.category,
        templateId: input.templateId,
        status: EmailDeliveryStatus.QUEUED,
        attempts: 0,
        maxAttempts: maxAttempts(this.config),
        nextAttemptAt: new Date(),
        idempotencyKey,
        variables: vars,
        ...(input.schoolId
          ? { school: { connect: { id: input.schoolId } } }
          : {}),
      },
    };
  }

  private async deliverClaimed(
    row: DeliveryRow,
    attempts: number,
  ): Promise<EmailDispatchResult> {
    const settings = this.settings();
    if (!settings.enabled) {
      return {
        sent: false,
        queued: true,
        id: row.id,
        reason: 'Email is not configured',
      };
    }
    const mailbox = Object.values(settings.mailboxes).find(
      (item) => item.address === row.sender,
    );
    const vars = asVars(row.variables);
    if (!mailbox?.configured) {
      return this.finishFailure(
        row.id,
        attempts,
        row.maxAttempts,
        'Mailbox is not configured',
        true,
      );
    }
    try {
      const rendered = renderTemplate(row.templateId, vars);
      const transport = createMailboxTransport(settings, mailbox.id);
      if (!transport) {
        return this.finishFailure(
          row.id,
          attempts,
          row.maxAttempts,
          'Mailbox is not configured',
          true,
        );
      }
      const info = await transport.sendMail({
        from: { name: 'Chora', address: mailbox.address },
        envelope: { from: mailbox.address, to: row.recipient },
        to: row.recipient,
        replyTo: row.replyTo ?? undefined,
        subject: sanitizeHeader(row.subject),
        text: rendered.text,
        html: rendered.html,
      });
      const recorded = await this.recordAccepted(row.id, info?.messageId);
      if (!recorded) {
        this.logger.warn(
          `Email status update failed after SMTP accept (${row.templateId})`,
        );
        return {
          sent: true,
          queued: false,
          id: row.id,
          reason: 'Accepted by SMTP; delivery log update failed',
        };
      }
      return { sent: true, queued: false, id: row.id };
    } catch (error) {
      const reason = redactStoredError(error, [mailbox.password]);
      this.logger.warn(`Email delivery failed (${row.templateId})`);
      return this.finishFailure(
        row.id,
        attempts,
        row.maxAttempts,
        reason,
        isPermanentSmtpError(reason),
      );
    }
  }

  private async finishFailure(
    id: string,
    attempts: number,
    max: number,
    reason: string,
    permanent: boolean,
  ): Promise<EmailDispatchResult> {
    const stop = permanent || shouldFailPermanently(reason, attempts, max);
    if (stop) {
      await this.prisma.emailDelivery.update({
        where: { id },
        data: {
          status: EmailDeliveryStatus.FAILED,
          lastError: reason,
          variables: Prisma.DbNull,
        },
      });
      return { sent: false, queued: false, id, reason };
    }
    const delay = nextRetryDelayMs(attempts, retryBaseMs(this.config));
    await this.prisma.emailDelivery.update({
      where: { id },
      data: {
        status: EmailDeliveryStatus.QUEUED,
        lastError: reason,
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
    return { sent: false, queued: true, id, reason };
  }

  private async recordAccepted(
    id: string,
    messageId: unknown,
  ): Promise<boolean> {
    const data = {
      status: EmailDeliveryStatus.SENT,
      sentAt: new Date(),
      lastError: null,
      variables: Prisma.DbNull,
      providerMessageId: typeof messageId === 'string' ? messageId : null,
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await this.prisma.emailDelivery.update({ where: { id }, data });
        return true;
      } catch {
        // The message is already accepted. One retry covers a brief database blip.
      }
    }
    return false;
  }

  private async recoverStaleClaims(now: Date): Promise<void> {
    const staleBefore = new Date(now.getTime() - CLAIM_LOCK_MS);
    const stale = await this.prisma.emailDelivery.findMany({
      where: {
        status: EmailDeliveryStatus.SENDING,
        updatedAt: { lt: staleBefore },
      },
      select: { id: true, attempts: true, maxAttempts: true },
      take: 20,
    });
    for (const row of stale) {
      if (row.attempts >= row.maxAttempts) {
        await this.prisma.emailDelivery.updateMany({
          where: { id: row.id, status: EmailDeliveryStatus.SENDING },
          data: {
            status: EmailDeliveryStatus.FAILED,
            lastError: 'Stopped after the worker was interrupted',
            variables: Prisma.DbNull,
          },
        });
        continue;
      }
      await this.prisma.emailDelivery.updateMany({
        where: { id: row.id, status: EmailDeliveryStatus.SENDING },
        data: {
          status: EmailDeliveryStatus.QUEUED,
          nextAttemptAt: now,
          lastError: 'Requeued after the worker was interrupted',
        },
      });
    }
  }

  private async remainingQuota(schoolId?: string | null): Promise<number> {
    const since = new Date(Date.now() - QUOTA_WINDOW_MS);
    const count = await this.prisma.emailDelivery.count({
      where: {
        createdAt: { gte: since },
        ...(schoolId ? { schoolId } : { schoolId: null }),
      },
    });
    return Math.max(0, (schoolId ? SCHOOL_QUOTA : PLATFORM_QUOTA) - count);
  }

  private async cachedDns() {
    if (this.dnsCache && Date.now() - this.dnsCache.at < 10 * 60 * 1000) {
      return this.dnsCache.value;
    }
    const value = await lookupMailAuthentication('awuddigitals.com');
    this.dnsCache = { at: Date.now(), value };
    return value;
  }
}

function smtpConnectionState(
  settings: SmtpSettings,
  state: { lastTestOk: boolean | null } | null,
):
  | 'missing_credentials'
  | 'disabled'
  | 'not_tested'
  | 'last_test_failed'
  | 'last_test_accepted' {
  const missing = Object.values(settings.mailboxes).some(
    (mailbox) => !mailbox.configured,
  );
  if (missing) return 'missing_credentials';
  if (!settings.enabled) return 'disabled';
  if (!state || state.lastTestOk == null) return 'not_tested';
  return state.lastTestOk ? 'last_test_accepted' : 'last_test_failed';
}

function asVars(value: Prisma.JsonValue | null): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const vars: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') vars[key] = entry;
  }
  return vars;
}
