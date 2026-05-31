import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { compare, hashSync } from 'bcrypt';
import { AuthUser } from '../common/auth.types';
import { PermissionsService } from '../permissions/permissions.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JoinSchoolDto } from './dto/join-school.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JoinInviteDto } from './dto/join-invite.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InvitesService } from '../schools/invites.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly invitesService: InvitesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  async getProfile(actor: AuthUser) {
    const user = await this.prisma.user.findFirst({
      where: { id: actor.id, schoolId: actor.schoolId },
      include: {
        roleTemplate: { select: { slug: true, name: true } },
        studentProfile: {
          include: {
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        teacherProfile: {
          include: {
            homeroomGrade: { select: { name: true } },
            homeroomSection: { select: { name: true } },
          },
        },
        parentLinks: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true } },
                grade: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: actor.schoolId },
      select: { id: true, name: true, joinCode: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const resolved = await this.permissionsService.resolveForUser(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        externalRef: user.externalRef,
        roleTemplateSlug: resolved.roleTemplateSlug,
        roleTemplateName: resolved.roleTemplateName,
        permissions: resolved.permissions,
        createdAt: user.createdAt,
      },
      school,
      student:
        user.studentProfile ?
          {
            grade: user.studentProfile.grade.name,
            section: user.studentProfile.section?.name ?? null,
            fan: user.studentProfile.fan,
            dateOfBirth: user.studentProfile.dateOfBirth,
          }
        : null,
      teacher:
        user.teacherProfile ?
          {
            homeroomGrade: user.teacherProfile.homeroomGrade?.name ?? null,
            homeroomSection: user.teacherProfile.homeroomSection?.name ?? null,
          }
        : null,
      children: user.parentLinks.map((link) => ({
        name: `${link.student.user.firstName} ${link.student.user.lastName}`.trim(),
        grade: link.student.grade.name,
        section: link.student.section?.name ?? null,
      })),
    };
  }

  async updateProfile(actor: AuthUser, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: actor.id, schoolId: actor.schoolId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      passwordHash?: string;
    } = {};

    if (dto.firstName?.trim()) data.firstName = dto.firstName.trim();
    if (dto.lastName?.trim()) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim() || null;
    }
    if (dto.newPassword) {
      data.passwordHash = hashSync(dto.newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return this.getProfile(actor);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data,
    });

    return this.getProfile(actor);
  }

  async registerSchool(dto: RegisterSchoolDto) {
    const school = await this.schoolsService.createSchool({
      name: dto.schoolName,
      schoolType: dto.schoolType,
      address: dto.address,
      email: dto.schoolEmail,
      logoUrl: dto.logoUrl,
      country: dto.country,
      phone: dto.phone,
    });

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      role: 'admin',
      schoolId: school.id,
    });

    const payload = await this.toSchoolPayload(user);

    const tokens = await this.issueSchoolTokens(payload);
    return {
      ...tokens,
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        joinCode: school.joinCode,
        setupComplete: school.setupComplete,
      },
    };
  }

  async joinInvite(dto: JoinInviteDto) {
    const { schoolId, role } = await this.invitesService.consumeInvite(
      dto.inviteToken,
    );

    if (role === 'student' && !dto.externalRef?.trim()) {
      throw new BadRequestException('Student ID is required for student accounts');
    }

    const school = await this.schoolsService.findById(schoolId);
    if (!school) {
      throw new BadRequestException('School no longer exists');
    }

    await this.subscriptionsService.assertCanAddUser(schoolId, role);

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      schoolId,
      externalRef: dto.externalRef?.trim() || undefined,
    });

    const payload = await this.toSchoolPayload(user);

    const tokens = await this.issueSchoolTokens(payload);
    return {
      ...tokens,
      school: {
        id: school.id,
        name: school.name,
        joinCode: school.joinCode,
      },
    };
  }

  async joinSchool(dto: JoinSchoolDto) {
    const school = await this.schoolsService.findByJoinCode(dto.schoolCode);

    if (dto.role === 'student' && !dto.externalRef?.trim()) {
      throw new BadRequestException('Student ID is required for student accounts');
    }

    await this.subscriptionsService.assertCanAddUser(school.id, dto.role);

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      schoolId: school.id,
      externalRef: dto.externalRef?.trim() || undefined,
    });

    const payload = await this.toSchoolPayload(user);

    const tokens = await this.issueSchoolTokens(payload);
    return {
      ...tokens,
      school: {
        id: school.id,
        name: school.name,
        joinCode: school.joinCode,
      },
    };
  }

  async googleLogin(dto: GoogleAuthDto) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Google sign-in is not configured');
    }

    const client = new OAuth2Client(clientId);
    let payload: { email?: string };
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.credential,
        audience: clientId,
      });
      payload = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload.email) {
      throw new UnauthorizedException('Google account has no email');
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException(
        'No account found. Register your school or join with a school code.',
      );
    }

    return this.issueSchoolTokens(await this.toSchoolPayload(user));
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSchoolTokens(await this.toSchoolPayload(user));
  }

  async validateUserById(id: string): Promise<AuthUser | null> {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }

    return await this.toSchoolPayload(user);
  }

  async refresh(dto: RefreshTokenDto) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const payload = await this.jwtService.verifyAsync<{ id: string; scope?: string }>(
      dto.refreshToken,
      {
        secret: refreshSecret,
      },
    );

    if (payload.scope === 'platform') {
      throw new UnauthorizedException('Use platform refresh endpoint');
    }

    const user = await this.validateUserById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueSchoolTokens(user);
  }

  async toSchoolPayload(user: {
    id: string;
    schoolId: string;
    role: AuthUser['role'];
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthUser> {
    const resolved = await this.permissionsService.resolveForUser(user.id);
    return {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      permissions: resolved.permissions,
      roleTemplateSlug: resolved.roleTemplateSlug,
      roleTemplateName: resolved.roleTemplateName,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      scope: 'school',
    };
  }

  async issueSchoolTokens(payload: AuthUser) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const refreshExpiresIn = Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRY_SECONDS', '604800'),
    );

    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken: await this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
      user: payload,
    };
  }
}

