import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { compare } from 'bcrypt';
import { AuthUser } from '../common/auth.types';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JoinSchoolDto } from './dto/join-school.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JoinInviteDto } from './dto/join-invite.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { InvitesService } from '../schools/invites.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly invitesService: InvitesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerSchool(dto: RegisterSchoolDto) {
    const school = await this.schoolsService.createSchool({
      name: dto.schoolName,
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

    const payload: AuthUser = {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const tokens = await this.issueTokens(payload);
    return {
      ...tokens,
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        joinCode: school.joinCode,
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

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      schoolId,
      externalRef: dto.externalRef?.trim() || undefined,
    });

    const payload: AuthUser = {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const tokens = await this.issueTokens(payload);
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

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      schoolId: school.id,
      externalRef: dto.externalRef?.trim() || undefined,
    });

    const payload: AuthUser = {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const tokens = await this.issueTokens(payload);
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

    const authUser: AuthUser = {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return this.issueTokens(authUser);
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

    const payload: AuthUser = {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return this.issueTokens(payload);
  }

  async validateUserById(id: string): Promise<AuthUser | null> {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const payload = await this.jwtService.verifyAsync<AuthUser>(
      dto.refreshToken,
      {
        secret: refreshSecret,
      },
    );

    const user = await this.validateUserById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueTokens(user);
  }

  private async issueTokens(payload: AuthUser) {
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
