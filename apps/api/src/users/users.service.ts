import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { UserRole } from '../common/auth.types';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { isSchoolStudentIdLogin } from '../students/student-card.util';

export interface UserRecord {
  id: string;
  schoolId: string;
  role: UserRole;
  roleTemplateId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}

const DEFAULT_TEMPLATE_BY_ROLE: Record<string, string> = {
  admin: 'school_admin',
  teacher: 'subject_teacher',
};

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async onModuleInit() {
    const passwordHash = hashSync('Passw0rd!', 10);
    const users = [
      this.makeUserSeed(
        '1',
        'school-addis',
        'admin',
        'admin@eduos.local',
        passwordHash,
      ),
      this.makeUserSeed(
        '2',
        'school-addis',
        'teacher',
        'teacher@eduos.local',
        passwordHash,
      ),
      this.makeUserSeed(
        '3',
        'school-addis',
        'student',
        'student@eduos.local',
        passwordHash,
      ),
      this.makeUserSeed(
        '4',
        'school-addis',
        'parent',
        'parent@eduos.local',
        passwordHash,
      ),
    ];

    for (const user of users) {
      await this.permissionsService.ensureSchoolRoleTemplates(user.schoolId);
      const templateSlug =
        user.role === 'teacher' ? 'homeroom_teacher' : DEFAULT_TEMPLATE_BY_ROLE[user.role];
      const template = templateSlug
        ? await this.prisma.roleTemplate.findFirst({
            where: { schoolId: user.schoolId, slug: templateSlug },
          })
        : null;

      await this.prisma.user.upsert({
        where: { email: user.email },
        create: {
          ...user,
          roleTemplateId: template?.id ?? null,
        },
        update: {
          schoolId: user.schoolId,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          roleTemplateId: template?.id ?? undefined,
        },
      });
      if (user.role === 'teacher') {
        await this.ensureTeacherProfile(user.id, user.schoolId);
      }
    }
  }

  private async ensureTeacherProfile(userId: string, schoolId: string) {
    await this.prisma.teacherProfile.upsert({
      where: { userId },
      create: { userId, schoolId },
      update: { schoolId },
    });
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? this.toUserRecord(user) : undefined;
  }

  async findByLoginIdentifier(
    identifier: string,
  ): Promise<UserRecord | undefined> {
    const trimmed = identifier.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('@')) {
      return this.findByEmail(trimmed);
    }

    if (isSchoolStudentIdLogin(trimmed)) {
      const user = await this.prisma.user.findFirst({
        where: {
          role: PrismaUserRole.student,
          externalRef: trimmed.toUpperCase(),
        },
      });
      return user ? this.toUserRecord(user) : undefined;
    }

    return this.findByEmail(trimmed);
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toUserRecord(user) : undefined;
  }

  async createUser(input: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    schoolId: string;
    roleTemplateId?: string;
    roleTemplateSlug?: string;
    externalRef?: string;
  }): Promise<UserRecord> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    await this.permissionsService.ensureSchoolRoleTemplates(input.schoolId);

    let roleTemplateId = input.roleTemplateId ?? null;
    if (!roleTemplateId && input.roleTemplateSlug) {
      const tpl = await this.prisma.roleTemplate.findFirst({
        where: { schoolId: input.schoolId, slug: input.roleTemplateSlug },
      });
      roleTemplateId = tpl?.id ?? null;
    }
    if (!roleTemplateId && DEFAULT_TEMPLATE_BY_ROLE[input.role]) {
      const tpl = await this.prisma.roleTemplate.findFirst({
        where: {
          schoolId: input.schoolId,
          slug: DEFAULT_TEMPLATE_BY_ROLE[input.role],
        },
      });
      roleTemplateId = tpl?.id ?? null;
    }

    const template = roleTemplateId
      ? await this.prisma.roleTemplate.findUnique({ where: { id: roleTemplateId } })
      : null;

    const passwordHash = hashSync(
      input.password ?? randomBytes(32).toString('hex'),
      10,
    );

    const user = await this.prisma.user.create({
      data: {
        id: `u_${randomBytes(8).toString('hex')}`,
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: template?.portalRole ?? input.role,
        roleTemplateId,
        schoolId: input.schoolId,
        externalRef: input.externalRef ?? null,
        passwordHash,
      },
    });

    if (user.role === 'teacher') {
      await this.ensureTeacherProfile(user.id, input.schoolId);
    }

    return this.toUserRecord(user);
  }

  private makeUserSeed(
    id: string,
    schoolId: string,
    role: UserRole,
    email: string,
    passwordHash: string,
  ) {
    return {
      id,
      schoolId,
      role: role,
      email,
      firstName: role,
      lastName: 'user',
      passwordHash,
    };
  }

  private toUserRecord(user: {
    id: string;
    schoolId: string;
    role: PrismaUserRole;
    roleTemplateId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): UserRecord {
    return {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role as UserRole,
      roleTemplateId: user.roleTemplateId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash,
    };
  }
}
