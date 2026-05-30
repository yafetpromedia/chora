import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateAnnouncementDto,
    schoolId: string,
    createdBy: string,
  ) {
    return this.prisma.announcement.create({
      data: {
        schoolId,
        title: dto.title,
        body: dto.body,
        createdBy,
      },
    });
  }

  async list(schoolId: string) {
    return this.prisma.announcement.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
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
}
