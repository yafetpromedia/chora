import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async mark(dto: MarkAttendanceDto, schoolId: string, recordedBy: string) {
    return this.prisma.attendanceRecord.upsert({
      where: {
        schoolId_studentId_date: {
          schoolId,
          studentId: dto.studentId,
          date: new Date(dto.date),
        },
      },
      create: {
        schoolId,
        studentId: dto.studentId,
        date: new Date(dto.date),
        status: dto.status,
        recordedBy,
      },
      update: {
        status: dto.status,
        recordedBy,
      },
    });
  }

  async listByStudent(studentId: string, schoolId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentId },
      orderBy: { date: 'desc' },
    });
  }
}
