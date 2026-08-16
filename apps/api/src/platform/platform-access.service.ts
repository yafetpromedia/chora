import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { hashSync } from 'bcrypt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PLATFORM_PERMISSION_CATALOG,
  normalizeRoleGrants,
  parseStoredRolePermissions,
  type PlatformPermissionKey,
} from '../common/permissions/platform-permissions';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformAccessService implements OnModuleInit {
  private cache: Record<PlatformRole, PlatformPermissionKey[]> = {
    ...DEFAULT_ROLE_PERMISSIONS,
  };

  constructor(private readonly prisma: PrismaService) {}

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
        createdAt: true,
      },
    });

    return {
      catalog: PLATFORM_PERMISSION_CATALOG,
      roles: (
        [
          PlatformRole.OWNER,
          PlatformRole.SUPPORT,
          PlatformRole.SALES,
        ] as const
      ).map((id) => ({
        id,
        title: id === 'OWNER' ? 'Owner' : id === 'SUPPORT' ? 'Support' : 'Sales',
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
        ...u,
        permissions: this.resolveForRole(u.role),
      })),
    };
  }

  async updateRoleGrants(
    actorRole: PlatformRole,
    input: {
      SUPPORT?: string[];
      SALES?: string[];
    },
  ) {
    if (actorRole !== PlatformRole.OWNER) {
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
        rolePermissions: next as object,
      },
      update: {
        rolePermissions: next as object,
      },
    });

    this.cache = next;
    return this.getAccessControl();
  }

  async updateOperatorRole(
    actor: { id: string; role: PlatformRole },
    userId: string,
    role: PlatformRole,
  ) {
    if (actor.role !== PlatformRole.OWNER) {
      throw new ForbiddenException('Only platform owners can change operator roles');
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
        throw new BadRequestException('At least one platform owner is required');
      }
    }

    await this.prisma.platformUser.update({
      where: { id: userId },
      data: { role },
    });

    return this.getAccessControl();
  }

  async createOperator(
    actorRole: PlatformRole,
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: PlatformRole;
    },
  ) {
    if (actorRole !== PlatformRole.OWNER) {
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

    await this.prisma.platformUser.create({
      data: {
        email,
        passwordHash: hashSync(input.password, 10),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role,
      },
    });

    return this.getAccessControl();
  }
}
