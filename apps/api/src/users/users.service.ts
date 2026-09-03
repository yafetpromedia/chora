import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { UserRole } from '../common/auth.types';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { isSchoolStudentIdLogin } from '../students/student-card.util';
import { isSchoolTeacherIdLogin } from '../teachers/staff-card.util';
import {
  buildContactEmail,
  isValidUsername,
  normalizeUsername,
} from './username.util';

export interface UserRecord {
  id: string;
  schoolId: string;
  role: UserRole;
  roleTemplateId: string | null;
  username: string;
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
    // SchoolsModule may init after UsersModule — ensure the demo school exists
    // before role templates / users so FK constraints succeed.
    await this.prisma.school.upsert({
      where: { id: 'school-addis' },
      create: {
        id: 'school-addis',
        name: 'Bright Side International School',
        slug: 'bright-side',
        joinCode: 'BRIGHT1',
        country: 'Ethiopia',
      },
      update: {},
    });

    const passwordHash = hashSync('Passw0rd!', 10);
    const users = [
      this.makeUserSeed(
        '1',
        'school-addis',
        'admin',
        'admin',
        'admin@eduos.local',
        passwordHash,
      ),
      this.makeUserSeed(
        '2',
        'school-addis',
        'teacher',
        'teacher',
        'teacher@eduos.local',
        passwordHash,
      ),
      this.makeUserSeed(
        '3',
        'school-addis',
        'student',
        'student',
        'student@eduos.local',
        passwordHash,
      ),
      this.makeUserSeed(
        '4',
        'school-addis',
        'parent',
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
          username: user.username,
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

  async findByUsername(
    schoolId: string,
    username: string,
  ): Promise<UserRecord | undefined> {
    const normalized = normalizeUsername(username);
    if (!normalized) return undefined;

    const user = await this.prisma.user.findUnique({
      where: {
        schoolId_username: { schoolId, username: normalized },
      },
    });
    return user ? this.toUserRecord(user) : undefined;
  }

  async findByLoginIdentifier(
    identifier: string,
    schoolId?: string,
  ): Promise<UserRecord | undefined> {
    const trimmed = identifier.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes('@')) {
      return this.findByEmail(trimmed);
    }

    const normalized = normalizeUsername(trimmed);

    if (schoolId) {
      const byUsername = await this.findByUsername(schoolId, normalized);
      if (byUsername) return byUsername;
    } else {
      const matches = await this.prisma.user.findMany({
        where: { username: normalized },
        take: 2,
      });
      if (matches.length === 1) {
        return this.toUserRecord(matches[0]!);
      }
      if (matches.length > 1) {
        throw new BadRequestException(
          'This username exists at more than one school. Enter your school code on the sign-in page.',
        );
      }
    }

    if (isSchoolStudentIdLogin(trimmed)) {
      const user = await this.prisma.user.findFirst({
        where: {
          role: PrismaUserRole.student,
          OR: [
            { username: normalized },
            { externalRef: trimmed.toUpperCase() },
          ],
          ...(schoolId ? { schoolId } : {}),
        },
      });
      return user ? this.toUserRecord(user) : undefined;
    }

    if (isSchoolTeacherIdLogin(trimmed)) {
      const user = await this.prisma.user.findFirst({
        where: {
          role: PrismaUserRole.teacher,
          OR: [
            { username: normalized },
            { externalRef: trimmed.toUpperCase() },
          ],
          ...(schoolId ? { schoolId } : {}),
        },
      });
      return user ? this.toUserRecord(user) : undefined;
    }

    return undefined;
  }

  async assertUsernameAvailable(
    schoolId: string,
    username: string,
    exceptUserId?: string,
  ): Promise<string> {
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      throw new BadRequestException(
        'Username must be 3–40 characters (letters, numbers, . _ -) or a school ID like STU-…',
      );
    }
    const taken = await this.prisma.user.findFirst({
      where: {
        schoolId,
        username: normalized,
        ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}),
      },
    });
    if (taken) {
      throw new ConflictException('Username already taken at this school');
    }
    return normalized;
  }

  async assertEmailAvailable(
    email: string,
    exceptUserId?: string,
  ): Promise<string> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Email is required');
    }
    const taken = await this.prisma.user.findFirst({
      where: {
        email: normalized,
        ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}),
      },
    });
    if (taken) {
      throw new ConflictException('Email already registered');
    }
    return normalized;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toUserRecord(user) : undefined;
  }

  async createUser(input: {
    username: string;
    email?: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    schoolId: string;
    schoolJoinCode?: string;
    roleTemplateId?: string;
    roleTemplateSlug?: string;
    externalRef?: string;
  }): Promise<UserRecord> {
    const username = normalizeUsername(input.username);
    if (!isValidUsername(username)) {
      throw new BadRequestException(
        'Username must be 3–40 characters (letters, numbers, . _ -) or a school ID like STU-…',
      );
    }

    const existingUsername = await this.findByUsername(
      input.schoolId,
      username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already taken at this school');
    }

    const joinCode =
      input.schoolJoinCode ??
      (
        await this.prisma.school.findUnique({
          where: { id: input.schoolId },
          select: { joinCode: true },
        })
      )?.joinCode;

    if (!joinCode) {
      throw new BadRequestException('School not found');
    }

    const email = (
      input.email?.trim() ||
      buildContactEmail(joinCode, username)
    ).toLowerCase();

    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
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
        username,
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
    username: string,
    email: string,
    passwordHash: string,
  ) {
    return {
      id,
      schoolId,
      role: role,
      username: normalizeUsername(username),
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
    username: string;
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
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash,
    };
  }
}
