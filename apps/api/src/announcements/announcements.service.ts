import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    @Optional() private readonly email?: EmailService,
  ) {}

  async create(
    dto: CreateAnnouncementDto,
    schoolId: string,
    createdBy: string,
  ) {
    await this.subscriptionsService.assertActive(schoolId);

    const created = await this.prisma.announcement.create({
      data: {
        schoolId,
        title: dto.title,
        body: dto.body,
        createdBy,
      },
    });
    try {
      await this.email?.notifySchoolParents({
        schoolId,
        preference: 'announcementEnabled',
        category: 'announcement',
        templateId: 'announcement',
        idempotencyPrefix: `announcement:${created.id}`,
        recipientUserId: created.recipientUserId,
        vars: {
          title: created.title,
          message: created.body.replace(/\s+/g, ' ').slice(0, 500),
        },
      });
    } catch {
      // The announcement is already saved.
    }
    return created;
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

  async dismissForUser(
    announcementId: string,
    schoolId: string,
    userId: string,
  ) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        schoolId,
        OR: [{ recipientUserId: null }, { recipientUserId: userId }],
      },
    });
    if (!announcement) {
      throw new NotFoundException('Notification not found');
    }

    // Personal inbox items can be removed entirely for that recipient.
    if (announcement.recipientUserId === userId) {
      await this.prisma.announcement.delete({ where: { id: announcementId } });
      return { announcementId, deleted: true };
    }

    await this.markRead(announcementId, userId);
    return { announcementId, deleted: false, read: true };
  }
}
