import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { AuthUser, UserRole } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';

export interface UserRecord extends AuthUser {
  passwordHash: string;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

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
      await this.prisma.user.upsert({
        where: { email: user.email },
        create: user,
        update: {
          schoolId: user.schoolId,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    }
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? this.toUserRecord(user) : undefined;
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
    externalRef?: string;
  }): Promise<UserRecord> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

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
        role: input.role,
        schoolId: input.schoolId,
        externalRef: input.externalRef ?? null,
        passwordHash,
      },
    });

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
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): UserRecord {
    return {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash,
    };
  }
}
