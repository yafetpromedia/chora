import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserRole as PrismaUserRole } from '@prisma/client';
import type { JoinRole } from '../auth/dto/join-school.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SchoolsService } from './schools.service';
import { CreateInviteDto } from './dto/create-invite.dto';

export type InvitePreview = {
  valid: boolean;
  token: string;
  schoolName: string;
  role: JoinRole;
  label: string | null;
  expiresAt: string | null;
};

export type InviteCreated = {
  id: string;
  token: string;
  role: JoinRole;
  label: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  inviteUrl: string;
};

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolsService: SchoolsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async createInvite(
    schoolId: string,
    createdBy: string,
    dto: CreateInviteDto,
  ): Promise<InviteCreated> {
    const school = await this.schoolsService.findById(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    await this.subscriptionsService.assertActive(schoolId);

    const expiresInDays = dto.expiresInDays ?? 14;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const token = await this.generateUniqueToken();

    const invite = await this.prisma.schoolInvite.create({
      data: {
        schoolId,
        token,
        role: dto.role as PrismaUserRole,
        label: dto.label?.trim() || null,
        expiresAt,
        maxUses: dto.maxUses ?? null,
        createdBy,
      },
    });

    return {
      id: invite.id,
      token: invite.token,
      role: invite.role as JoinRole,
      label: invite.label,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      maxUses: invite.maxUses,
      inviteUrl: this.buildInviteUrl(invite.token),
    };
  }

  async listInvites(schoolId: string) {
    const invites = await this.prisma.schoolInvite.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return invites.map((invite) => ({
      id: invite.id,
      token: invite.token,
      role: invite.role,
      label: invite.label,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      inviteUrl: this.buildInviteUrl(invite.token),
      createdAt: invite.createdAt.toISOString(),
    }));
  }

  async getInvitePreview(token: string): Promise<InvitePreview> {
    const invite = await this.prisma.schoolInvite.findUnique({
      where: { token },
      include: { school: true },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    const valid = this.isInviteValid(invite);
    if (!valid) {
      return {
        valid: false,
        token: invite.token,
        schoolName: invite.school.name,
        role: invite.role as JoinRole,
        label: invite.label,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
      };
    }

    return {
      valid: true,
      token: invite.token,
      schoolName: invite.school.name,
      role: invite.role as JoinRole,
      label: invite.label,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
    };
  }

  async consumeInvite(token: string): Promise<{
    schoolId: string;
    role: JoinRole;
  }> {
    const invite = await this.prisma.schoolInvite.findUnique({
      where: { token },
    });

    if (!invite || !this.isInviteValid(invite)) {
      throw new BadRequestException('This invitation is invalid or has expired');
    }

    if (invite.role === 'admin') {
      throw new BadRequestException('Invalid invitation role');
    }

    await this.prisma.schoolInvite.update({
      where: { id: invite.id },
      data: { useCount: { increment: 1 } },
    });

    return {
      schoolId: invite.schoolId,
      role: invite.role as JoinRole,
    };
  }

  private isInviteValid(invite: {
    expiresAt: Date | null;
    maxUses: number | null;
    useCount: number;
  }): boolean {
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return false;
    }
    if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
      return false;
    }
    return true;
  }

  private async generateUniqueToken(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const token = randomBytes(12).toString('base64url');
      const existing = await this.prisma.schoolInvite.findUnique({
        where: { token },
      });
      if (!existing) {
        return token;
      }
    }
    throw new BadRequestException('Could not generate invitation link');
  }

  private buildInviteUrl(token: string): string {
    const base =
      process.env.WEB_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    return `${base}/invite/${token}`;
  }
}
