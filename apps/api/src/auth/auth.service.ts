import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
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
import { VerifyStudentEnrollmentDto } from './dto/verify-student-enrollment.dto';
import { InvitesService } from '../schools/invites.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PlatformSettingsService } from '../platform/platform-settings.service';
import { normalizeUsername } from '../users/username.util';
import { UserRole as PrismaUserRole } from '@prisma/client';

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
    private readonly platformSettings: PlatformSettingsService,
    @Optional() private readonly email?: EmailService,
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
        username: user.username,
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
      student: user.studentProfile
        ? {
            grade: user.studentProfile.grade.name,
            section: user.studentProfile.section?.name ?? null,
            fan: user.studentProfile.fan,
            dateOfBirth: user.studentProfile.dateOfBirth,
            parentsCanViewResults: user.studentProfile.parentsCanViewResults,
          }
        : null,
      teacher: user.teacherProfile
        ? {
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
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      passwordHash?: string;
    } = {};

    if (dto.username?.trim()) {
      data.username = await this.usersService.assertUsernameAvailable(
        actor.schoolId,
        dto.username,
        actor.id,
      );
    }
    if (dto.email?.trim()) {
      data.email = await this.usersService.assertEmailAvailable(
        dto.email,
        actor.id,
      );
    }
    if (dto.firstName?.trim()) data.firstName = dto.firstName.trim();
    if (dto.lastName?.trim()) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim() || null;
    }
    if (dto.newPassword) {
      data.passwordHash = hashSync(dto.newPassword, 10);
    }

    const hasUserUpdates = Object.keys(data).length > 0;
    const hasPrivacyUpdate =
      actor.role === 'student' && dto.parentsCanViewResults !== undefined;

    if (!hasUserUpdates && !hasPrivacyUpdate) {
      return this.getProfile(actor);
    }

    if (hasUserUpdates) {
      await this.prisma.user.update({
        where: { id: user.id },
        data,
      });
    }

    if (dto.newPassword && user.role === 'student') {
      await this.prisma.studentProfile.updateMany({
        where: { userId: user.id },
        data: { portalTempPassword: null },
      });
    }

    if (dto.newPassword) {
      await this.email?.enqueueSafe({
        to: user.email,
        category: 'password_change',
        templateId: 'password_change',
        schoolId: user.schoolId,
        idempotencyKey: `password-change:${user.id}:${Date.now()}`,
        vars: { firstName: data.firstName ?? user.firstName },
      });
    }

    if (hasPrivacyUpdate) {
      await this.prisma.studentProfile.updateMany({
        where: { userId: user.id, schoolId: actor.schoolId },
        data: { parentsCanViewResults: dto.parentsCanViewResults },
      });
    }

    return this.getProfile(actor);
  }

  async getPublicPlatformConfig() {
    const settings = await this.platformSettings.getSettings();
    return {
      platformName: settings.platformName,
      allowSelfRegistration: settings.allowSelfRegistration,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      welcomeMessage: settings.welcomeMessage,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      defaultCountry: settings.defaultCountry,
      defaultTrialDays: settings.defaultTrialDays,
      landingHeroImageUrl: settings.landingHeroImageUrl,
      demoVideoUrl: settings.demoVideoUrl,
      demoVideoThumbnailUrl: settings.demoVideoThumbnailUrl,
      productDocsUrl: settings.productDocsUrl,
      productDocsThumbnailUrl: settings.productDocsThumbnailUrl,
      socialInstagramUrl: settings.socialInstagramUrl,
      socialFacebookUrl: settings.socialFacebookUrl,
      socialLinkedinUrl: settings.socialLinkedinUrl,
      socialYoutubeUrl: settings.socialYoutubeUrl,
      socialTiktokUrl: settings.socialTiktokUrl,
      socialGithubUrl: settings.socialGithubUrl,
    };
  }

  async registerSchool(dto: RegisterSchoolDto) {
    const settings = await this.platformSettings.getSettings();
    if (settings.maintenanceMode) {
      throw new ForbiddenException(
        settings.maintenanceMessage?.trim() ||
          'New school registration is temporarily unavailable.',
      );
    }
    if (!settings.allowSelfRegistration) {
      throw new ForbiddenException(
        'Self-service school registration is disabled. Contact Chora support.',
      );
    }

    const school = await this.schoolsService.createSchool({
      name: dto.schoolName,
      schoolType: dto.schoolType,
      address: dto.address,
      email: dto.schoolEmail,
      logoUrl: dto.logoUrl,
      country: dto.country,
      phone: dto.phone,
      curriculumPackageKey: dto.curriculumPackageKey,
      gradePreset: dto.gradePreset,
    });

    const user = await this.usersService.createUser({
      username: dto.username,
      email: dto.email,
      password: dto.password,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      role: 'admin',
      schoolId: school.id,
      schoolJoinCode: school.joinCode,
    });
    await this.sendAccountOpened(user, school.name, true);

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
        logoUrl: school.logoUrl,
        primaryColor: school.primaryColor,
        accentColor: school.accentColor,
        accentDeep: school.accentDeep,
      },
    };
  }

  async joinInvite(dto: JoinInviteDto) {
    const { schoolId, role } = await this.invitesService.consumeInvite(
      dto.inviteToken,
    );

    if (
      role === 'student' &&
      !dto.externalRef?.trim() &&
      !dto.username?.trim()
    ) {
      throw new BadRequestException(
        'Student ID is required for student accounts',
      );
    }

    const school = await this.schoolsService.findById(schoolId);
    if (!school) {
      throw new BadRequestException('School no longer exists');
    }

    await this.subscriptionsService.assertCanAddUser(schoolId, role);

    const studentId = dto.externalRef?.trim();
    const user = await this.usersService.createUser({
      username: role === 'student' && studentId ? studentId : dto.username,
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      schoolId,
      schoolJoinCode: school.joinCode,
      externalRef: studentId || undefined,
    });
    await this.sendAccountOpened(user, school.name, false);

    const payload = await this.toSchoolPayload(user);

    const tokens = await this.issueSchoolTokens(payload);
    return {
      ...tokens,
      school: {
        id: school.id,
        name: school.name,
        joinCode: school.joinCode,
        logoUrl: school.logoUrl,
        primaryColor: school.primaryColor,
        accentColor: school.accentColor,
        accentDeep: school.accentDeep,
      },
    };
  }

  async joinSchool(dto: JoinSchoolDto) {
    if (dto.role !== 'student') {
      throw new ForbiddenException(
        'Teachers and parents must join using an invite link from your school admin.',
      );
    }

    const school = await this.schoolsService.findByJoinCode(dto.schoolCode);
    const studentId = dto.externalRef?.trim();
    if (!studentId) {
      throw new BadRequestException(
        'Student ID is required for student accounts',
      );
    }

    await this.verifyEnrolledStudent(
      school.id,
      studentId,
      dto.firstName,
      dto.lastName,
    );

    throw new ConflictException(
      'Your portal account is ready. Sign in with your school code, student ID, and password from your school admin.',
    );
  }

  async verifyStudentEnrollment(dto: VerifyStudentEnrollmentDto) {
    const school = await this.schoolsService.findByJoinCode(dto.schoolCode);
    const student = await this.verifyEnrolledStudent(
      school.id,
      dto.studentId,
      dto.firstName,
      dto.lastName,
    );

    return {
      schoolName: school.name,
      joinCode: school.joinCode,
      studentId: student.externalRef ?? student.username,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      message:
        'You are enrolled. Sign in with your school code, student ID, and password from your admin.',
    };
  }

  private appUrl() {
    return this.configService.get<string>('WEB_APP_URL')?.replace(/\/$/, '') ?? '';
  }

  private async sendAccountOpened(
    user: { id: string; email: string; firstName: string; schoolId: string },
    schoolName: string,
    trial: boolean,
  ) {
    const actionUrl = this.appUrl();
    await this.email?.enqueueSafe({
      to: user.email,
      category: 'welcome',
      templateId: 'welcome',
      schoolId: user.schoolId,
      idempotencyKey: `welcome:${user.id}`,
      vars: { firstName: user.firstName, schoolName, actionUrl },
    });
    if (!trial) return;
    await this.email?.enqueueSafe({
      to: user.email,
      category: 'trial_activation',
      templateId: 'trial_activation',
      schoolId: user.schoolId,
      idempotencyKey: `trial:${user.schoolId}`,
      vars: { firstName: user.firstName, schoolName, actionUrl },
    });
  }

  private async verifyEnrolledStudent(
    schoolId: string,
    studentId: string,
    firstName: string,
    lastName: string,
  ) {
    const normalizedId = studentId.trim().toUpperCase();
    const student = await this.prisma.user.findFirst({
      where: {
        schoolId,
        role: PrismaUserRole.student,
        studentProfile: { isNot: null },
        OR: [
          { externalRef: normalizedId },
          { username: normalizeUsername(normalizedId) },
        ],
      },
    });

    if (!student) {
      throw new BadRequestException(
        'Student ID not recognized. Ask your school admin to enroll you first.',
      );
    }

    const fn = firstName.trim().toLowerCase();
    const ln = lastName.trim().toLowerCase();
    if (
      student.firstName.trim().toLowerCase() !== fn ||
      student.lastName.trim().toLowerCase() !== ln
    ) {
      throw new BadRequestException(
        'Your name does not match school records for this Student ID.',
      );
    }

    return student;
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
    const school = await this.schoolsService.findByJoinCode(dto.schoolCode);

    const user = await this.usersService.findByLoginIdentifier(
      dto.username,
      school.id,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.schoolId !== school.id) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSchoolTokens(await this.toSchoolPayload(user));
  }

  async validateSchoolCode(code: string) {
    const school = await this.schoolsService.findByJoinCode(code);
    return {
      name: school.name,
      joinCode: school.joinCode,
      logoUrl: school.logoUrl,
      primaryColor: school.primaryColor,
      accentColor: school.accentColor,
      accentDeep: school.accentDeep,
    };
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
    const payload = await this.jwtService.verifyAsync<{
      id: string;
      scope?: string;
    }>(dto.refreshToken, {
      secret: refreshSecret,
    });

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
    username: string;
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
      username: user.username,
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

    const school = await this.prisma.school.findUnique({
      where: { id: payload.schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        joinCode: true,
        setupComplete: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        accentDeep: true,
      },
    });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken: await this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
      user: payload,
      school: school
        ? {
            id: school.id,
            name: school.name,
            slug: school.slug,
            joinCode: school.joinCode,
            setupComplete: school.setupComplete,
            logoUrl: school.logoUrl,
            primaryColor: school.primaryColor,
            accentColor: school.accentColor,
            accentDeep: school.accentDeep,
          }
        : undefined,
    };
  }
}
