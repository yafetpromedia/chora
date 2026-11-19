import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashSync, compare } from 'bcrypt';
import { PlatformAuthUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAccessService } from './platform-access.service';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly platformAccess: PlatformAccessService,
  ) {}

  /**
   * Explicit operator bootstrap only — never called from Nest startup.
   * Use scripts/runtime-bootstrap.mjs with CHORA_ALLOW_RUNTIME_BOOTSTRAP=1.
   */
  async ensurePlatformOwnerFromEnv() {
    const email = this.configService
      .get<string>('PLATFORM_OWNER_EMAIL')
      ?.trim()
      .toLowerCase();
    const password = this.configService.get<string>('PLATFORM_OWNER_PASSWORD');
    if (!email || !password) {
      return { created: false, reason: 'missing_env' as const };
    }

    const existing = await this.prisma.platformUser.findUnique({
      where: { email },
    });
    if (existing) {
      return { created: false, reason: 'already_exists' as const };
    }

    await this.prisma.platformUser.create({
      data: {
        email,
        passwordHash: hashSync(password, 10),
        firstName:
          this.configService.get<string>('PLATFORM_OWNER_FIRST_NAME')?.trim() ||
          'Platform',
        lastName:
          this.configService.get<string>('PLATFORM_OWNER_LAST_NAME')?.trim() ||
          'Owner',
        role: 'OWNER',
        isActive: true,
      },
    });
    return { created: true, reason: 'created' as const };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.platformUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.inviteToken) {
      throw new UnauthorizedException(
        'Accept your email invite and set a password before signing in',
      );
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.platformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = this.toPayload(user);
    return this.issueTokens(payload);
  }

  async validateById(id: string): Promise<PlatformAuthUser | null> {
    const user = await this.prisma.platformUser.findUnique({ where: { id } });
    if (!user || !user.isActive) {
      return null;
    }
    return this.toPayload(user);
  }

  async getProfile(user: PlatformAuthUser) {
    const row = await this.prisma.platformUser.findUnique({
      where: { id: user.id },
    });
    if (!row || !row.isActive) {
      throw new UnauthorizedException('User not found');
    }
    return {
      user: {
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        permissions: this.platformAccess.resolveForRole(row.role),
        createdAt: row.createdAt,
        lastLoginAt: row.lastLoginAt,
      },
    };
  }

  async updateProfile(
    user: PlatformAuthUser,
    dto: {
      email?: string;
      firstName?: string;
      lastName?: string;
      newPassword?: string;
    },
  ) {
    const row = await this.prisma.platformUser.findUnique({
      where: { id: user.id },
    });
    if (!row || !row.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      passwordHash?: string;
    } = {};
    if (dto.email?.trim()) {
      const normalized = dto.email.trim().toLowerCase();
      if (normalized !== row.email) {
        const taken = await this.prisma.platformUser.findUnique({
          where: { email: normalized },
        });
        if (taken) {
          throw new ConflictException('Email already registered');
        }
        data.email = normalized;
      }
    }
    if (dto.firstName?.trim()) data.firstName = dto.firstName.trim();
    if (dto.lastName?.trim()) data.lastName = dto.lastName.trim();
    if (dto.newPassword) {
      data.passwordHash = hashSync(dto.newPassword, 10);
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.platformUser.update({
        where: { id: row.id },
        data,
      });
    }

    return this.getProfile(user);
  }

  private toPayload(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'OWNER' | 'SUPPORT' | 'SALES';
  }): PlatformAuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: this.platformAccess.resolveForRole(user.role),
      scope: 'platform',
    };
  }

  private async issueTokens(user: PlatformAuthUser) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
    const refreshExpiresIn = Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRY_SECONDS', '604800'),
    );

    return {
      accessToken: await this.jwtService.signAsync(user),
      refreshToken: await this.jwtService.signAsync(user, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
      user,
    };
  }
}
