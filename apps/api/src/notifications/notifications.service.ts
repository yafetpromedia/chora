import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForParent(parentId: string, schoolId: string) {
    return this.prisma.parentNotification.findMany({
      where: { parentId, schoolId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    });
  }

  async markRead(notificationId: string, parentId: string) {
    return this.prisma.parentNotification.updateMany({
      where: { id: notificationId, parentId },
      data: { readAt: new Date() },
    });
  }

  unreadCount(parentId: string, schoolId: string) {
    return this.prisma.parentNotification.count({
      where: { parentId, schoolId, readAt: null },
    });
  }

  listForStaff(userId: string, schoolId: string) {
    return this.prisma.staffNotification.findMany({
      where: { userId, schoolId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCountForStaff(userId: string, schoolId: string) {
    return this.prisma.staffNotification.count({
      where: { userId, schoolId, readAt: null },
    });
  }

  async markStaffRead(notificationId: string, userId: string) {
    const result = await this.prisma.staffNotification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
    return { ok: true };
  }

  async markAllStaffRead(userId: string, schoolId: string) {
    const result = await this.prisma.staffNotification.updateMany({
      where: { userId, schoolId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
