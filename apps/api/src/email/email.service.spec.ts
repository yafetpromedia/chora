import { Prisma } from '@prisma/client';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

jest.mock('./email.dns', () => ({
  lookupMailAuthentication: jest.fn(() => ({
    domain: 'awuddigitals.com',
    spf: 'v=spf1 mx -all',
    dmarc: 'v=DMARC1; p=reject',
    dkimSelectors: [],
  })),
}));

import { EmailPreferencesService } from './email-preferences.service';
import { EmailService } from './email.service';

type Row = {
  id: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey: string;
  recipient: string;
  sender: string;
  replyTo: string | null;
  subject: string;
  category: string;
  templateId: string;
  variables: unknown;
  lastError: string | null;
  schoolId?: string | null;
};

function config(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    CHORA_EMAIL_ENABLED: 'true',
    CHORA_SMTP_HOST: 'mx1.aletcloud.com',
    CHORA_SMTP_PORT: '465',
    CHORA_SMTP_SECURE: 'true',
    CHORA_CONTACT_EMAIL: 'contact@awuddigitals.com',
    CHORA_CONTACT_EMAIL_PASSWORD: 'contact-secret',
    CHORA_SUPPORT_EMAIL: 'support@awuddigitals.com',
    CHORA_SUPPORT_EMAIL_PASSWORD: 'support-secret',
    CHORA_ADMIN_EMAIL: 'admin@awuddigitals.com',
    CHORA_ADMIN_EMAIL_PASSWORD: 'admin-secret',
    CHORA_INFO_EMAIL: 'info@awuddigitals.com',
    CHORA_INFO_EMAIL_PASSWORD: 'info-secret',
    CHORA_SALES_EMAIL: 'sales@awuddigitals.com',
    CHORA_SALES_EMAIL_PASSWORD: 'sales-secret',
    ...overrides,
  };
  return { get: (key: string) => values[key] };
}

function memory() {
  const rows: Row[] = [];
  const apply = (row: Row, data: Record<string, unknown>) => {
    const attempts = data.attempts as
      | { increment?: number }
      | number
      | undefined;
    if (attempts && typeof attempts === 'object' && attempts.increment) {
      row.attempts += attempts.increment;
    } else if (typeof attempts === 'number') {
      row.attempts = attempts;
    }
    const rest = { ...data };
    delete rest.attempts;
    Object.assign(row, rest);
    return row;
  };
  const prisma = {
    rows,
    emailDelivery: {
      findUnique: jest.fn(
        ({ where }: { where: { idempotencyKey?: string } }) =>
          rows.find((row) => row.idempotencyKey === where.idempotencyKey) ??
          null,
      ),
      create: jest.fn(({ data }: { data: Row }) => {
        const now = new Date();
        const row: Row = {
          id: `mail-${rows.length + 1}`,
          status: data.status,
          attempts: data.attempts ?? 0,
          maxAttempts: data.maxAttempts ?? 5,
          nextAttemptAt: data.nextAttemptAt ?? now,
          createdAt: now,
          updatedAt: now,
          idempotencyKey: data.idempotencyKey,
          recipient: data.recipient,
          sender: data.sender,
          replyTo: data.replyTo ?? null,
          subject: data.subject,
          category: data.category,
          templateId: data.templateId,
          variables: data.variables,
          lastError: null,
        };
        rows.push(row);
        return row;
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = rows.find((item) => item.id === where.id);
          if (!row) throw new Error('missing row');
          return apply(row, data);
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string; status: string };
          data: Record<string, unknown>;
        }) => {
          const row = rows.find(
            (item) => item.id === where.id && item.status === where.status,
          );
          if (!row) return { count: 0 };
          apply(row, data);
          return { count: 1 };
        },
      ),
      findMany: jest.fn(
        (args: {
          where?: {
            status?: string | { in?: string[] };
            nextAttemptAt?: { lte: Date };
            updatedAt?: { lt: Date };
            createdAt?: { lt: Date };
            schoolId?: string;
          };
          take?: number;
          skip?: number;
          cursor?: { id: string };
        }) => {
          const where = args.where ?? {};
          let matched = rows.filter((row) => {
            if (typeof where.status === 'string' && row.status !== where.status)
              return false;
            if (
              where.status &&
              typeof where.status === 'object' &&
              where.status.in
            ) {
              if (!where.status.in.includes(row.status)) return false;
            }
            if (
              where.nextAttemptAt?.lte &&
              row.nextAttemptAt > where.nextAttemptAt.lte
            )
              return false;
            if (where.updatedAt?.lt && row.updatedAt >= where.updatedAt.lt)
              return false;
            if (where.createdAt?.lt && row.createdAt >= where.createdAt.lt)
              return false;
            if (where.schoolId && row.schoolId !== where.schoolId) return false;
            return true;
          });
          matched = [...matched].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
          if (args.cursor?.id) {
            const index = matched.findIndex(
              (row) => row.id === args.cursor?.id,
            );
            matched = index >= 0 ? matched.slice(index + (args.skip ?? 0)) : [];
          }
          if (args.take) matched = matched.slice(0, args.take);
          return matched;
        },
      ),
      deleteMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) => {
        const ids = new Set(where.id.in);
        const before = rows.length;
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (ids.has(rows[index].id)) rows.splice(index, 1);
        }
        return { count: before - rows.length };
      }),
      count: jest.fn(() => 0),
      findFirst: jest.fn(() => null),
    },
    schoolEmailPreference: { findUnique: jest.fn().mockResolvedValue(null) },
    parentEmailPreference: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    school: {
      findUnique: jest.fn(() => ({
        name: 'Everest Youth Academy',
        email: 'office@school.test',
      })),
    },
    emailSystemState: {
      findUnique: jest.fn(() => null),
      upsert: jest.fn(({ create }: { create: unknown }) => create),
    },
  };
  const service = new EmailService(
    config() as never,
    prisma as never,
    new EmailPreferencesService(prisma as never),
  );
  return { prisma, service };
}

describe('email delivery', () => {
  beforeEach(() => {
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });
  });

  it('dispatches through the mapped mailbox and records a log', async () => {
    const { prisma, service } = memory();
    const result = await service.sendNow({
      to: 'parent@example.com',
      category: 'student_absence',
      templateId: 'student_absence',
      schoolId: 'school-a',
      idempotencyKey: 'attendance:1',
      vars: { childName: 'Liya', dateLabel: 'Nov 24', gradeSection: 'Grade 4' },
    });

    expect(result.sent).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: 'Chora', address: 'info@awuddigitals.com' },
        envelope: { from: 'info@awuddigitals.com', to: 'parent@example.com' },
        to: 'parent@example.com',
      }),
    );
    expect(prisma.rows[0]).toEqual(
      expect.objectContaining({
        recipient: 'parent@example.com',
        sender: 'info@awuddigitals.com',
        category: 'student_absence',
        status: 'SENT',
      }),
    );
    expect(JSON.stringify(prisma.rows)).not.toContain('info-secret');
  });

  it('rejects an invalid recipient before queueing', async () => {
    const { prisma, service } = memory();
    const result = await service.enqueue({
      to: 'not-an-email\nBcc: evil@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'bad-recipient',
    });
    expect(result).toEqual(
      expect.objectContaining({ queued: false, reason: 'Invalid recipient' }),
    );
    expect(prisma.emailDelivery.create).not.toHaveBeenCalled();
  });

  it('marks authentication failures as failed without retrying', async () => {
    mockSendMail.mockRejectedValue(
      new Error('Invalid login: 535 5.7.8 Authentication failed'),
    );
    const { prisma, service } = memory();
    const result = await service.sendNow({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'auth-fail',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });
    expect(result.sent).toBe(false);
    expect(result.reason).not.toContain('contact-secret');
    expect(prisma.rows[0].status).toBe('FAILED');

    await service.processDue();
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('retries a temporary SMTP failure with backoff and then sends', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('Connection timeout'));
    const { prisma, service } = memory();
    await service.enqueue({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'retry-me',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });

    await service.processDue();
    expect(prisma.rows[0].status).toBe('QUEUED');
    expect(prisma.rows[0].nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.rows[0].attempts).toBe(1);

    await service.processDue();
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    prisma.rows[0].nextAttemptAt = new Date(Date.now() - 1000);
    mockSendMail.mockResolvedValueOnce({ messageId: 'msg-2' });
    await service.processDue();
    expect(prisma.rows[0].status).toBe('SENT');
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });

  it('suppresses a duplicate send', async () => {
    const { prisma, service } = memory();
    const first = await service.enqueue({
      to: 'parent@example.com',
      category: 'student_late',
      templateId: 'student_late',
      idempotencyKey: 'attendance:same',
      vars: { childName: 'Liya' },
    });
    const second = await service.enqueue({
      to: 'parent@example.com',
      category: 'student_late',
      templateId: 'student_late',
      idempotencyKey: 'attendance:same',
      vars: { childName: 'Liya' },
    });
    expect(first.queued).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(prisma.emailDelivery.create).toHaveBeenCalledTimes(1);
  });

  it('does not queue mail when the school has turned that notice off', async () => {
    const { prisma, service } = memory();
    prisma.schoolEmailPreference.findUnique.mockResolvedValue({
      absenceEnabled: false,
      lateEnabled: true,
      examinationEnabled: true,
      announcementEnabled: true,
      paymentReminderEnabled: true,
      paymentConfirmationEnabled: true,
      reportCardEnabled: true,
    });
    await service.notifyParents({
      schoolId: 'school-a',
      preference: 'absenceEnabled',
      category: 'student_absence',
      templateId: 'student_absence',
      messages: [
        {
          parentId: 'parent-1',
          idempotencyKey: 'attendance:school-a',
          vars: { childName: 'Liya' },
        },
      ],
    });
    expect(prisma.emailDelivery.create).not.toHaveBeenCalled();

    prisma.schoolEmailPreference.findUnique.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([
      { id: 'parent-1', email: 'parent@example.com', firstName: 'Marta' },
    ]);
    await service.notifyParents({
      schoolId: 'school-b',
      preference: 'absenceEnabled',
      category: 'student_absence',
      templateId: 'student_absence',
      messages: [
        {
          parentId: 'parent-1',
          idempotencyKey: 'attendance:school-b',
          vars: { childName: 'Liya' },
        },
      ],
    });
    expect(prisma.emailDelivery.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-b',
          role: 'parent',
        }),
      }),
    );
  });

  it('skips a parent who turned email off', async () => {
    const { prisma, service } = memory();
    prisma.user.findMany.mockResolvedValue([
      { id: 'parent-1', email: 'parent@example.com', firstName: 'Marta' },
    ]);
    prisma.parentEmailPreference.findMany.mockResolvedValue([
      { userId: 'parent-1', enabled: false, absenceEnabled: true },
    ]);
    await service.notifyParents({
      schoolId: 'school-a',
      preference: 'absenceEnabled',
      category: 'student_absence',
      templateId: 'student_absence',
      messages: [
        {
          parentId: 'parent-1',
          idempotencyKey: 'attendance:off',
          vars: { childName: 'Liya' },
        },
      ],
    });
    expect(prisma.emailDelivery.create).not.toHaveBeenCalled();
  });

  it('redacts a mailbox password that appears in an SMTP error', async () => {
    mockSendMail.mockRejectedValue(
      new Error('535 authentication failed contact-secret'),
    );
    const { service } = memory();
    const result = await service.sendNow({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'secret-in-error',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });
    expect(result.reason).not.toContain('contact-secret');
    expect(result.reason).toContain('[redacted]');
  });

  it('requeues a claim that a crashed worker left in sending', async () => {
    const { prisma, service } = memory();
    await service.enqueue({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'stale-claim',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });
    prisma.rows[0].status = 'SENDING';
    prisma.rows[0].attempts = 1;
    prisma.rows[0].updatedAt = new Date(Date.now() - 3 * 60 * 1000);
    await service.processDue();
    expect(prisma.rows[0].status).toBe('SENT');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('fails a stale claim that has already used its attempts', async () => {
    const { prisma, service } = memory();
    await service.enqueue({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'stale-exhausted',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });
    prisma.rows[0].status = 'SENDING';
    prisma.rows[0].attempts = 5;
    prisma.rows[0].maxAttempts = 5;
    prisma.rows[0].updatedAt = new Date(Date.now() - 3 * 60 * 1000);
    await service.processDue();
    expect(prisma.rows[0].status).toBe('FAILED');
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('keeps a successful SMTP accept when the status write fails, then can deliver again', async () => {
    const { prisma, service } = memory();
    const update = prisma.emailDelivery.update.getMockImplementation();
    prisma.emailDelivery.update.mockRejectedValue(
      new Error('database unavailable'),
    );
    const result = await service.sendNow({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'accepted-then-db',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });
    expect(result.sent).toBe(true);
    expect(result.reason).toBe('Accepted by SMTP; delivery log update failed');
    expect(prisma.rows[0].status).toBe('SENDING');
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    prisma.emailDelivery.update.mockImplementation(update);
    prisma.rows[0].updatedAt = new Date(Date.now() - 3 * 60 * 1000);
    await service.processDue();
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(prisma.rows[0].status).toBe('SENT');
  });

  it('suppresses a duplicate immediate send', async () => {
    const { prisma, service } = memory();
    prisma.emailDelivery.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const result = await service.sendNow({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'race',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });
    expect(result.duplicate).toBe(true);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('sends a test only to the signed-in operator and only the test template', async () => {
    const { service } = memory();
    await expect(
      service.sendTest({
        to: 'other@example.com',
        actorEmail: 'owner@awuddigitals.com',
      }),
    ).rejects.toThrow(
      'Test messages can only be sent to the signed-in operator',
    );
    expect(mockSendMail).not.toHaveBeenCalled();

    const result = await service.sendTest({
      to: 'Owner@awuddigitals.com',
      actorEmail: 'owner@awuddigitals.com',
      mailboxId: 'contact',
    });
    expect(result.sent).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@awuddigitals.com',
        subject: 'Chora SMTP test',
      }),
    );
  });

  it('pages delivery logs without returning template variables', async () => {
    const { prisma, service } = memory();
    for (const key of ['a', 'b', 'c']) {
      await service.enqueue({
        to: 'parent@example.com',
        category: 'welcome',
        templateId: 'welcome',
        idempotencyKey: key,
        vars: {
          firstName: 'Sara',
          schoolName: 'Everest',
          actionUrl: 'https://chora.test/invite/secret',
        },
      });
    }
    prisma.rows[0].createdAt = new Date('2026-01-01T00:00:00Z');
    prisma.rows[1].createdAt = new Date('2026-01-02T00:00:00Z');
    prisma.rows[2].createdAt = new Date('2026-01-03T00:00:00Z');

    const page = await service.listLogs({ limit: 2 });
    expect(page.items.map((item) => item.id)).toEqual(['mail-3', 'mail-2']);
    expect(page.nextCursor).toBe('mail-2');
    expect(JSON.stringify(page)).not.toContain('secret');
    const query = prisma.emailDelivery.findMany.mock.calls.at(-1)?.[0] as {
      select: object;
    };
    expect(query.select).not.toHaveProperty('variables');

    const rest = await service.listLogs({
      limit: 2,
      cursor: page.nextCursor ?? undefined,
    });
    expect(rest.items.map((item) => item.id)).toEqual(['mail-1']);
    expect(rest.nextCursor).toBeNull();
  });

  it('does not report a connection when mailbox passwords are missing', async () => {
    const { service } = memory();
    const status = await service.providerStatus();
    expect(status.connection).toBe('not_tested');
    expect(JSON.stringify(status)).not.toContain('contact-secret');

    const bare = new EmailService(
      config({
        CHORA_CONTACT_EMAIL_PASSWORD: '',
        CHORA_SUPPORT_EMAIL_PASSWORD: '',
        CHORA_ADMIN_EMAIL_PASSWORD: '',
        CHORA_INFO_EMAIL_PASSWORD: '',
        CHORA_SALES_EMAIL_PASSWORD: '',
      }) as never,
      {
        emailSystemState: {
          findUnique: jest.fn(() => ({
            lastTestAt: new Date(),
            lastTestOk: true,
            lastTestError: null,
            lastTestMailbox: 'contact@awuddigitals.com',
          })),
        },
      } as never,
      {} as never,
    );
    const missing = await bare.providerStatus();
    expect(missing.connection).toBe('missing_credentials');
    expect(JSON.stringify(missing)).not.toMatch(/password/i);
  });

  it('deletes terminal rows older than 180 days and retries if the delete fails', async () => {
    const { prisma, service } = memory();
    await service.enqueue({
      to: 'parent@example.com',
      category: 'welcome',
      templateId: 'welcome',
      idempotencyKey: 'old-row',
      vars: { firstName: 'Sara', schoolName: 'Everest' },
    });
    prisma.rows[0].status = 'SENT';
    prisma.rows[0].createdAt = new Date(Date.now() - 181 * 24 * 60 * 60 * 1000);
    prisma.emailDelivery.deleteMany.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await expect(service.pruneOld()).rejects.toThrow('database unavailable');
    expect(prisma.rows).toHaveLength(1);

    const removed = await service.pruneOld();
    expect(removed).toBe(1);
    expect(prisma.rows).toHaveLength(0);
    expect(await service.pruneOld()).toBe(0);
  });
});
