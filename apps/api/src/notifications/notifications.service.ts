import { Injectable } from '@nestjs/common';
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
}
