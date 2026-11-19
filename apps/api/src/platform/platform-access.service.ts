import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PLATFORM_PERMISSION_CATALOG,
  normalizeRoleGrants,
  parseStoredRolePermissions,
  type PlatformPermissionKey,
} from '../common/permissions/platform-permissions';
import { MailService } from '../common/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Actor = { id: string; email: string; role: PlatformRole };

@Injectable()
export class PlatformAccessService implements OnModuleInit {
  private cache: Record<PlatformRole, PlatformPermissionKey[]> = {
    ...DEFAULT_ROLE_PERMISSIONS,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  resolveForRole(role: PlatformRole): PlatformPermissionKey[] {
    return [...(this.cache[role] ?? DEFAULT_ROLE_PERMISSIONS[role])];
  }

  async refreshCache() {
    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
      select: { rolePermissions: true },
    });
    this.cache = parseStoredRolePermissions(settings?.rolePermissions);
  }

  async getAccessControl() {
    await this.refreshCache();
    const users = await this.prisma.platformUser.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        inviteToken: true,
        inviteExpiresAt: true,
        createdAt: true,
      },
    });

    return {
      catalog: PLATFORM_PERMISSION_CATALOG,
      roles: (
        [PlatformRole.OWNER, PlatformRole.SUPPORT, PlatformRole.SALES] as const
      ).map((id) => ({
        id,
        title:
          id === 'OWNER' ? 'Owner' : id === 'SUPPORT' ? 'Support' : 'Sales',
        description:
          id === 'OWNER'
            ? 'Full platform control — billing, tenants, and policy.'
            : id === 'SUPPORT'
              ? 'Day-to-day school assistance, support inbox, and suspend access.'
              : 'Onboard new schools and monitor the tenant pipeline.',
        editable: id !== PlatformRole.OWNER,
        grants: this.resolveForRole(id),
      })),
      operators: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        invitePending: Boolean(
          u.inviteToken &&
          u.inviteExpiresAt &&
          u.inviteExpiresAt.getTime() > Date.now(),
        ),
        createdAt: u.createdAt,
        permissions: this.resolveForRole(u.role),
      })),
    };
  }

  async listAuditLogs(limit = 50) {
    const take = Math.min(Math.max(limit, 1), 200);
    return this.prisma.platformAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async updateRoleGrants(
    actor: Actor,
    input: {
      SUPPORT?: string[];
      SALES?: string[];
    },
  ) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can edit role grants');
    }

    const next = {
      OWNER: [...DEFAULT_ROLE_PERMISSIONS.OWNER],
      SUPPORT: normalizeRoleGrants(
        PlatformRole.SUPPORT,
        input.SUPPORT ?? this.cache.SUPPORT,
      ),
      SALES: normalizeRoleGrants(
        PlatformRole.SALES,
        input.SALES ?? this.cache.SALES,
      ),
    };

    await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        rolePermissions: next,
      },
      update: {
        rolePermissions: next,
      },
    });

    this.cache = next;
    await this.writeAudit(actor, 'ROLE_GRANTS_UPDATED', null, null, {
      SUPPORT: next.SUPPORT,
      SALES: next.SALES,
    });
    return this.getAccessControl();
  }

  async updateOperatorRole(actor: Actor, userId: string, role: PlatformRole) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException(
        'Only platform owners can change operator roles',
      );
    }

    const target = await this.prisma.platformUser.findUnique({
      where: { id: userId },
    });
    if (!target) {
      throw new NotFoundException('Operator not found');
    }

    if (target.id === actor.id && role !== PlatformRole.OWNER) {
      throw new BadRequestException('You cannot remove your own owner role');
    }

    if (target.role === PlatformRole.OWNER && role !== PlatformRole.OWNER) {
      const ownerCount = await this.prisma.platformUser.count({
        where: { role: PlatformRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'At least one platform owner is required',
        );
      }
    }

    const previousRole = target.role;
    await this.prisma.platformUser.update({
      where: { id: userId },
      data: { role },
    });

    await this.writeAudit(
      actor,
      'OPERATOR_ROLE_CHANGED',
      target.id,
      target.email,
      {
        from: previousRole,
        to: role,
      },
    );

    return this.getAccessControl();
  }

  async createOperator(
    actor: Actor,
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: PlatformRole;
    },
  ) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can create operators');
    }

    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.prisma.platformUser.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('An operator with this email already exists');
    }

    const created = await this.prisma.platformUser.create({
      data: {
        email,
        passwordHash: hashSync(input.password, 10),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role,
        isActive: true,
      },
    });

    await this.writeAudit(
      actor,
      'OPERATOR_CREATED',
      created.id,
      created.email,
      {
        role: created.role,
      },
    );

    return this.getAccessControl();
  }

  async inviteOperator(
    actor: Actor,
    input: {
      email: string;
      firstName: string;
      lastName: string;
      role: PlatformRole;
    },
  ) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can invite operators');
    }

    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.prisma.platformUser.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('An operator with this email already exists');
    }

    const token = randomBytes(24).toString('base64url');
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const placeholderHash = hashSync(randomBytes(32).toString('hex'), 10);

    const created = await this.prisma.platformUser.create({
      data: {
        email,
        passwordHash: placeholderHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role,
        isActive: true,
        inviteToken: token,
        inviteExpiresAt,
      },
    });

    const inviteUrl = this.buildInviteUrl(token);
    const mailResult = await this.sendInviteEmail({
      to: email,
      firstName: created.firstName,
      inviteUrl,
      role: created.role,
      actorName: actor.email,
    });

    await this.writeAudit(
      actor,
      'OPERATOR_INVITED',
      created.id,
      created.email,
      {
        role: created.role,
        emailSent: mailResult.sent,
        expiresAt: inviteExpiresAt.toISOString(),
      },
    );

    return {
      ...(await this.getAccessControl()),
      inviteUrl,
      emailSent: mailResult.sent,
      emailError: mailResult.reason,
    };
  }

  async resendInvite(actor: Actor, userId: string) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can resend invites');
    }

    const target = await this.prisma.platformUser.findUnique({
      where: { id: userId },
    });
    if (!target) {
      throw new NotFoundException('Operator not found');
    }

    const token = randomBytes(24).toString('base64url');
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.prisma.platformUser.update({
      where: { id: userId },
      data: { inviteToken: token, inviteExpiresAt },
    });

    const inviteUrl = this.buildInviteUrl(token);
    const mailResult = await this.sendInviteEmail({
      to: target.email,
      firstName: target.firstName,
      inviteUrl,
      role: target.role,
      actorName: actor.email,
    });

    await this.writeAudit(
      actor,
      'OPERATOR_INVITE_RESENT',
      target.id,
      target.email,
      {
        emailSent: mailResult.sent,
        expiresAt: inviteExpiresAt.toISOString(),
      },
    );

    return {
      ...(await this.getAccessControl()),
      inviteUrl,
      emailSent: mailResult.sent,
      emailError: mailResult.reason,
    };
  }

  async setOperatorActive(actor: Actor, userId: string, isActive: boolean) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException(
        'Only platform owners can activate or deactivate operators',
      );
    }

    if (userId === actor.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const target = await this.prisma.platformUser.findUnique({
      where: { id: userId },
    });
    if (!target) {
      throw new NotFoundException('Operator not found');
    }

    if (!isActive && target.role === PlatformRole.OWNER) {
      await this.assertNotLastActiveOwner(target.id);
    }

    await this.prisma.platformUser.update({
      where: { id: userId },
      data: { isActive },
    });

    await this.writeAudit(
      actor,
      isActive ? 'OPERATOR_ACTIVATED' : 'OPERATOR_DEACTIVATED',
      target.id,
      target.email,
      { role: target.role },
    );

    return this.getAccessControl();
  }

  async deleteOperator(actor: Actor, userId: string) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can remove operators');
    }

    if (userId === actor.id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const target = await this.prisma.platformUser.findUnique({
      where: { id: userId },
    });
    if (!target) {
      throw new NotFoundException('Operator not found');
    }

    if (target.role === PlatformRole.OWNER) {
      const ownerCount = await this.prisma.platformUser.count({
        where: { role: PlatformRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'At least one platform owner is required',
        );
      }
    }

    await this.prisma.platformUser.delete({ where: { id: userId } });
    await this.writeAudit(actor, 'OPERATOR_DELETED', target.id, target.email, {
      role: target.role,
    });
    return this.getAccessControl();
  }

  async getInvitePreview(token: string) {
    const user = await this.findValidInvite(token);
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      expiresAt: user.inviteExpiresAt,
    };
  }

  async acceptInvite(token: string, password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.findValidInvite(token);
    await this.prisma.platformUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashSync(password, 10),
        inviteToken: null,
        inviteExpiresAt: null,
        isActive: true,
      },
    });

    await this.writeAudit(
      { id: user.id, email: user.email, role: user.role },
      'OPERATOR_INVITE_ACCEPTED',
      user.id,
      user.email,
      { role: user.role },
    );

    return { ok: true, email: user.email };
  }

  private async findValidInvite(token: string) {
    const normalized = token.trim();
    if (!normalized) {
      throw new BadRequestException('Invite token is required');
    }

    const user = await this.prisma.platformUser.findUnique({
      where: { inviteToken: normalized },
    });
    if (!user || !user.inviteExpiresAt) {
      throw new NotFoundException('Invite link is invalid or has expired');
    }
    if (user.inviteExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invite link has expired');
    }
    if (!user.isActive) {
      throw new BadRequestException('This operator account is deactivated');
    }
    return user;
  }

  private async assertNotLastActiveOwner(excludeId: string) {
    const activeOwners = await this.prisma.platformUser.count({
      where: {
        role: PlatformRole.OWNER,
        isActive: true,
        id: { not: excludeId },
      },
    });
    if (activeOwners < 1) {
      throw new BadRequestException(
        'At least one active platform owner is required',
      );
    }
  }

  private buildInviteUrl(token: string) {
    const base =
      process.env.WEB_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    return `${base}/platform/invite/${token}`;
  }

  private async sendInviteEmail(input: {
    to: string;
    firstName: string;
    inviteUrl: string;
    role: PlatformRole;
    actorName: string;
  }) {
    const roleLabel =
      input.role === 'OWNER'
        ? 'Owner'
        : input.role === 'SUPPORT'
          ? 'Support'
          : 'Sales';
    return this.mail.send({
      to: input.to,
      subject: 'You are invited to the Chora platform console',
      text: [
        `Hi ${input.firstName},`,
        '',
        `${input.actorName} invited you as a ${roleLabel} operator on Chora.`,
        '',
        'Open this link to set your password (expires in 7 days):',
        input.inviteUrl,
        '',
        'If you did not expect this invite, you can ignore this email.',
      ].join('\n'),
    });
  }

  private async writeAudit(
    actor: Actor,
    action: string,
    targetId: string | null,
    targetEmail: string | null,
    meta?: Record<string, unknown>,
  ) {
    await this.prisma.platformAuditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action,
        targetId,
        targetEmail,
        meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
