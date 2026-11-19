import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ALL_PERMISSION_KEYS,
  expandPermissionPatterns,
  PermissionKey,
  PERMISSION_META,
} from '../common/permissions/permission-catalog';
import { DEFAULT_ROLE_TEMPLATES } from '../common/permissions/role-template.defaults';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedPermissionCatalog();
    const schools = await this.prisma.school.findMany({ select: { id: true } });
    for (const school of schools) {
      await this.ensureSchoolRoleTemplates(school.id);
    }
    await this.migrateLegacyStaffRoles();
  }

  async seedPermissionCatalog() {
    for (const meta of PERMISSION_META) {
      await this.prisma.permissionDefinition.upsert({
        where: { key: meta.key },
        create: {
          key: meta.key,
          label: meta.label,
          category: meta.category,
          description: meta.description,
        },
        // Preserve operator-customized metadata on existing rows.
        update: {},
      });
    }
  }

  async ensureSchoolRoleTemplates(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!school) {
      return;
    }

    for (const tpl of DEFAULT_ROLE_TEMPLATES) {
      const patterns =
        tpl.permissionPatterns[0] === '*'
          ? ALL_PERMISSION_KEYS
          : expandPermissionPatterns(tpl.permissionPatterns);

      const existing = await this.prisma.roleTemplate.findFirst({
        where: { schoolId, slug: tpl.slug },
      });

      if (!existing) {
        const template = await this.prisma.roleTemplate.create({
          data: {
            schoolId,
            slug: tpl.slug,
            name: tpl.name,
            description: tpl.description,
            portalRole: tpl.portalRole,
            isSystem: true,
          },
        });
        await this.prisma.roleTemplatePermission.createMany({
          data: patterns.map((permissionKey) => ({
            roleTemplateId: template.id,
            permissionKey,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  /** Map deprecated SchoolStaffRole enum to role templates. */
  private async migrateLegacyStaffRoles() {
    const map: Record<string, string> = {
      SCHOOL_ADMIN: 'school_admin',
      VICE_PRINCIPAL: 'academic_director',
      FINANCE_OFFICER: 'finance_officer',
      HOMEROOM_TEACHER: 'homeroom_teacher',
      SUBJECT_TEACHER: 'subject_teacher',
    };

    const users = await this.prisma.user.findMany({
      where: { staffRole: { not: null }, roleTemplateId: null },
      select: { id: true, schoolId: true, staffRole: true, role: true },
    });

    for (const user of users) {
      const slug = user.staffRole ? map[user.staffRole] : null;
      if (!slug) continue;
      const template = await this.prisma.roleTemplate.findFirst({
        where: { schoolId: user.schoolId, slug },
      });
      if (template) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { roleTemplateId: template.id },
        });
      }
    }

    const adminsWithoutTemplate = await this.prisma.user.findMany({
      where: { role: UserRole.admin, roleTemplateId: null },
      select: { id: true, schoolId: true },
    });
    for (const user of adminsWithoutTemplate) {
      const template = await this.prisma.roleTemplate.findFirst({
        where: { schoolId: user.schoolId, slug: 'school_admin' },
      });
      if (template) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { roleTemplateId: template.id },
        });
      }
    }

    const teachersWithoutTemplate = await this.prisma.user.findMany({
      where: { role: UserRole.teacher, roleTemplateId: null },
      select: { id: true, schoolId: true },
    });
    for (const user of teachersWithoutTemplate) {
      const template = await this.prisma.roleTemplate.findFirst({
        where: { schoolId: user.schoolId, slug: 'subject_teacher' },
      });
      if (template) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { roleTemplateId: template.id },
        });
      }
    }
  }

  async resolveForUser(userId: string): Promise<{
    permissions: PermissionKey[];
    roleTemplateSlug: string | null;
    roleTemplateName: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleTemplate: { include: { permissions: true } },
        permissionGrants: true,
      },
    });

    if (!user) {
      return {
        permissions: [],
        roleTemplateSlug: null,
        roleTemplateName: null,
      };
    }

    const set = new Set<PermissionKey>();

    for (const p of user.roleTemplate?.permissions ?? []) {
      if (ALL_PERMISSION_KEYS.includes(p.permissionKey as PermissionKey)) {
        set.add(p.permissionKey as PermissionKey);
      }
    }

    for (const grant of user.permissionGrants) {
      const key = grant.permissionKey as PermissionKey;
      if (!ALL_PERMISSION_KEYS.includes(key)) continue;
      if (grant.granted) {
        set.add(key);
      } else {
        set.delete(key);
      }
    }

    if (set.size === 0 && user.role === UserRole.admin) {
      return {
        permissions: [...ALL_PERMISSION_KEYS],
        roleTemplateSlug: 'school_admin',
        roleTemplateName: 'School admin',
      };
    }

    return {
      permissions: [...set],
      roleTemplateSlug: user.roleTemplate?.slug ?? null,
      roleTemplateName: user.roleTemplate?.name ?? null,
    };
  }

  async listTemplates(schoolId: string) {
    await this.ensureSchoolRoleTemplates(schoolId);
    const templates = await this.prisma.roleTemplate.findMany({
      where: { schoolId },
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
    return templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      portalRole: t.portalRole,
      isSystem: t.isSystem,
      permissions: t.permissions.map((p) => p.permissionKey),
    }));
  }

  listCatalog() {
    return Promise.resolve(PERMISSION_META);
  }

  async assignTemplate(
    userId: string,
    schoolId: string,
    roleTemplateId: string,
  ) {
    const template = await this.prisma.roleTemplate.findFirst({
      where: { id: roleTemplateId, schoolId },
    });
    if (!template) {
      throw new NotFoundException('Role template not found');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roleTemplateId: template.id,
        role: template.portalRole,
      },
    });
    return this.resolveForUser(userId);
  }

  private assertCanManageStaffPermissions(
    actorUserId: string,
    targetUserId: string,
  ) {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException(
        'You cannot change your own permissions. Another school admin must manage your access.',
      );
    }
  }

  async getStaffPermissions(
    userId: string,
    schoolId: string,
    actorUserId: string,
  ) {
    this.assertCanManageStaffPermissions(actorUserId, userId);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
      include: {
        roleTemplate: { include: { permissions: true } },
        permissionGrants: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Staff member not found');
    }

    const resolved = await this.resolveForUser(userId);
    return {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      roleTemplateSlug: user.roleTemplate?.slug ?? null,
      roleTemplateName: user.roleTemplate?.name ?? null,
      templatePermissions:
        user.roleTemplate?.permissions.map((p) => p.permissionKey) ?? [],
      grants: user.permissionGrants.map((g) => ({
        permissionKey: g.permissionKey,
        granted: g.granted,
      })),
      effectivePermissions: resolved.permissions,
    };
  }

  async setPermissionGrants(
    userId: string,
    schoolId: string,
    actorUserId: string,
    grants: { permissionKey: string; granted: boolean }[],
  ) {
    this.assertCanManageStaffPermissions(actorUserId, userId);
    const target = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('Staff member not found');
    }
    for (const g of grants) {
      await this.prisma.userPermissionGrant.upsert({
        where: {
          userId_permissionKey: { userId, permissionKey: g.permissionKey },
        },
        create: {
          userId,
          permissionKey: g.permissionKey,
          granted: g.granted,
        },
        update: { granted: g.granted },
      });
    }
    return this.resolveForUser(userId);
  }
}
