import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashSync, compare } from 'bcrypt';
import { PlatformAuthUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAccessService } from './platform-access.service';

@Injectable()
export class PlatformAuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly platformAccess: PlatformAccessService,
  ) {}

  async onModuleInit() {
    const email = 'platform@campusone.local';
    const existing = await this.prisma.platformUser.findUnique({
      where: { email },
    });
    if (!existing) {
      await this.prisma.platformUser.create({
        data: {
          email,
          passwordHash: hashSync('Passw0rd!', 10),
          firstName: 'CampusOne',
          lastName: 'Platform',
          role: 'OWNER',
        },
      });
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.platformUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = this.toPayload(user);
    return this.issueTokens(payload);
  }

  async validateById(id: string): Promise<PlatformAuthUser | null> {
    const user = await this.prisma.platformUser.findUnique({ where: { id } });
    return user ? this.toPayload(user) : null;
  }

  async getProfile(user: PlatformAuthUser) {
    const row = await this.prisma.platformUser.findUnique({
      where: { id: user.id },
    });
    if (!row) {
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
      },
    };
  }

  async updateProfile(
    user: PlatformAuthUser,
    dto: { firstName?: string; lastName?: string; newPassword?: string },
  ) {
    const row = await this.prisma.platformUser.findUnique({
      where: { id: user.id },
    });
    if (!row) {
      throw new UnauthorizedException('User not found');
    }

    const data: {
      firstName?: string;
      lastName?: string;
      passwordHash?: string;
    } = {};
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
