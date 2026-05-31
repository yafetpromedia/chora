import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UpsertResultDto } from './dto/upsert-result.dto';

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async upsert(dto: UpsertResultDto, schoolId: string, updatedBy: string) {
    await this.subscriptionsService.assertActive(schoolId);

    return this.prisma.resultRecord.upsert({
      where: {
        schoolId_studentId_subject: {
          schoolId,
          studentId: dto.studentId,
          subject: dto.subject,
        },
      },
      create: {
        schoolId,
        studentId: dto.studentId,
        subject: dto.subject,
        score: dto.score,
        updatedBy,
      },
      update: {
        score: dto.score,
        updatedBy,
      },
    });
  }

  async listByStudent(studentId: string, schoolId: string) {
    return this.prisma.resultRecord.findMany({
      where: { schoolId, studentId },
      orderBy: { subject: 'asc' },
    });
  }
}
