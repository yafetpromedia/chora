import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(
    dto: CreateAnnouncementDto,
    schoolId: string,
    createdBy: string,
  ) {
    await this.subscriptionsService.assertActive(schoolId);

    return this.prisma.announcement.create({
      data: {
        schoolId,
        title: dto.title,
        body: dto.body,
        createdBy,
      },
    });
  }

  async list(schoolId: string, userId?: string) {
    const visibility = userId
      ? {
          OR: [{ recipientUserId: null }, { recipientUserId: userId }],
        }
      : { recipientUserId: null };

    if (!userId) {
      const rows = await this.prisma.announcement.findMany({
        where: { schoolId, ...visibility },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        createdAt: row.createdAt,
        readAt: null,
        isRead: false,
      }));
    }

    const rows = await this.prisma.announcement.findMany({
      where: { schoolId, ...visibility },
      orderBy: { createdAt: 'desc' },
      include: {
        reads: {
          where: { userId },
          select: { readAt: true },
          take: 1,
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      readAt: row.reads[0]?.readAt ?? null,
      isRead: row.reads.length > 0,
    }));
  }

  async markRead(announcementId: string, userId: string) {
    await this.prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId,
        },
      },
      create: {
        announcementId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });

    return { announcementId, userId, read: true };
  }

  async unreadCount(schoolId: string, userId: string) {
    const count = await this.prisma.announcement.count({
      where: {
        schoolId,
        OR: [{ recipientUserId: null }, { recipientUserId: userId }],
        reads: {
          none: { userId },
        },
      },
    });
    return { count };
  }

  async markAllRead(schoolId: string, userId: string) {
    const unread = await this.prisma.announcement.findMany({
      where: {
        schoolId,
        OR: [{ recipientUserId: null }, { recipientUserId: userId }],
        reads: { none: { userId } },
      },
      select: { id: true },
    });
    if (unread.length === 0) return { updated: 0 };
    const now = new Date();
    await this.prisma.announcementRead.createMany({
      data: unread.map((a) => ({
        announcementId: a.id,
        userId,
        readAt: now,
      })),
      skipDuplicates: true,
    });
    return { updated: unread.length };
  }
}
