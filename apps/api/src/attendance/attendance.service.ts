import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceMode,
  AttendanceReason,
  AttendanceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { parseCardScanPayload } from '../students/student-card.util';
import { TeacherScopeService } from '../teachers/teacher-scope.service';

function parseDateOnly(date: string): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly teacherScope: TeacherScopeService,
  ) {}

  private async assertClassAccess(
    schoolId: string,
    userId: string,
    role: string,
    gradeId: string,
    sectionId?: string | null,
  ) {
    const scopes = await this.teacherScope.getClassScopes(schoolId, userId, role);
    this.teacherScope.assertCanAccessClass(scopes, gradeId, sectionId);
  }

  async getSettings(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { attendanceMode: true },
    });
    return { mode: school?.attendanceMode ?? AttendanceMode.DAILY };
  }

  async updateSettings(schoolId: string, mode: AttendanceMode) {
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: { attendanceMode: mode },
      select: { attendanceMode: true },
    });
    return { mode: school.attendanceMode };
  }

  async getRoster(
    schoolId: string,
    userId: string,
    role: string,
    gradeId: string,
    sectionId: string | undefined,
    date: string,
    periodNumber: number,
  ) {
    await this.assertClassAccess(schoolId, userId, role, gradeId, sectionId);

    const day = parseDateOnly(date);
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId,
        ...(sectionId ? { sectionId } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        grade: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: { user: { firstName: 'asc' } },
    });

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        date: day,
        periodNumber,
        studentProfileId: { in: students.map((s) => s.id) },
      },
    });

    const byStudent = new Map(records.map((r) => [r.studentProfileId, r]));

    return students.map((s) => {
      const existing = byStudent.get(s.id);
      return {
        studentProfileId: s.id,
        userId: s.user.id,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        gradeName: s.grade.name,
        sectionName: s.section?.name ?? null,
        status: existing?.status ?? AttendanceStatus.present,
        reason: existing?.reason ?? null,
        recordId: existing?.id ?? null,
      };
    });
  }

  async bulkMark(
    dto: BulkAttendanceDto,
    schoolId: string,
    recordedBy: string,
    role: string,
  ) {
    await this.subscriptionsService.assertActive(schoolId);
    await this.assertClassAccess(
      schoolId,
      recordedBy,
      role,
      dto.gradeId,
      dto.sectionId,
    );

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { attendanceMode: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const periodNumber = dto.periodNumber ?? 0;
    const isDaily = periodNumber === 0;

    if (isDaily && school.attendanceMode === AttendanceMode.PERIOD) {
      throw new BadRequestException('This school uses period attendance only');
    }
    if (!isDaily && school.attendanceMode === AttendanceMode.DAILY) {
      throw new BadRequestException('This school uses daily attendance only');
    }
    if (!isDaily && !dto.subject?.trim()) {
      throw new BadRequestException('Subject is required for period attendance');
    }

    const day = parseDateOnly(dto.date);
    const profileIds = dto.records.map((r) => r.studentProfileId);

    const validStudents = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId: dto.gradeId,
        id: { in: profileIds },
        ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        grade: { select: { name: true } },
        section: { select: { name: true } },
        parents: { select: { parentId: true } },
      },
    });

    if (validStudents.length !== profileIds.length) {
      throw new BadRequestException('One or more students are invalid for this class');
    }

    const studentMap = new Map(validStudents.map((s) => [s.id, s]));

    await this.prisma.$transaction(
      dto.records.map((entry) => {
        const reason =
          entry.status === AttendanceStatus.absent && entry.reason
            ? (entry.reason as AttendanceReason)
            : null;

        return this.prisma.attendanceRecord.upsert({
          where: {
            schoolId_studentProfileId_date_periodNumber: {
              schoolId,
              studentProfileId: entry.studentProfileId,
              date: day,
              periodNumber,
            },
          },
          create: {
            schoolId,
            studentProfileId: entry.studentProfileId,
            date: day,
            periodNumber,
            subject: isDaily ? null : dto.subject?.trim() ?? null,
            status: entry.status as AttendanceStatus,
            reason,
            recordedBy,
          },
          update: {
            status: entry.status as AttendanceStatus,
            reason,
            subject: isDaily ? null : dto.subject?.trim() ?? null,
            recordedBy,
          },
        });
      }),
    );

    const alertStatuses: AttendanceStatus[] = [
      AttendanceStatus.absent,
      AttendanceStatus.late,
    ];

    for (const entry of dto.records) {
      if (!alertStatuses.includes(entry.status as AttendanceStatus)) {
        continue;
      }
      const student = studentMap.get(entry.studentProfileId);
      if (!student) continue;

      const sectionLabel = student.section?.name
        ? `-${student.section.name}`
        : '';
      const gradeSection = `${student.grade.name}${sectionLabel}`;
      const statusLabel =
        entry.status === AttendanceStatus.late ? 'late' : 'absent';
      const dateLabel = formatDateLabel(day);

      const title = `${student.user.firstName} was ${statusLabel} today`;
      const body = `Date: ${dateLabel}\nGrade: ${gradeSection}${
        !isDaily && dto.subject ? `\nClass: Period ${periodNumber} — ${dto.subject}` : ''
      }`;

      const parentIds = [...new Set(student.parents.map((p) => p.parentId))];
      if (parentIds.length === 0) continue;

      await this.prisma.parentNotification.createMany({
        data: parentIds.map((parentId) => ({
          schoolId,
          parentId,
          studentProfileId: student.id,
          title,
          body,
        })),
      });
    }

    return { saved: dto.records.length, date: dto.date, periodNumber };
  }

  async scanMark(
    dto: ScanAttendanceDto,
    schoolId: string,
    recordedBy: string,
    role: string,
  ) {
    await this.assertClassAccess(
      schoolId,
      recordedBy,
      role,
      dto.gradeId,
      dto.sectionId,
    );

    const cardCode = parseCardScanPayload(dto.code);
    if (!cardCode || cardCode.length < 4) {
      throw new BadRequestException('Invalid student card code');
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: { schoolId, cardCode },
      include: {
        user: { select: { firstName: true, lastName: true } },
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student card not found');
    }

    if (student.gradeId !== dto.gradeId) {
      throw new BadRequestException(
        `${student.user.firstName} ${student.user.lastName} is not in this grade`,
      );
    }

    if (dto.sectionId && student.sectionId !== dto.sectionId) {
      throw new BadRequestException(
        `${student.user.firstName} ${student.user.lastName} is not in this section`,
      );
    }

    const periodNumber = dto.periodNumber ?? 0;
    const bulkDto: BulkAttendanceDto = {
      gradeId: dto.gradeId,
      sectionId: dto.sectionId,
      date: dto.date,
      periodNumber,
      records: [
        {
          studentProfileId: student.id,
          status: 'present',
        },
      ],
    };

    await this.bulkMark(bulkDto, schoolId, recordedBy, role);

    const day = parseDateOnly(dto.date);
    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        schoolId,
        studentProfileId: student.id,
        date: day,
        periodNumber,
      },
    });

    return {
      studentProfileId: student.id,
      name: `${student.user.firstName} ${student.user.lastName}`,
      grade: student.grade.name,
      section: student.section?.name ?? null,
      cardCode: student.cardCode,
      status: record?.status ?? AttendanceStatus.present,
      scannedAt: new Date().toISOString(),
    };
  }

  async getStudentSummary(
    studentProfileId: string,
    schoolId: string,
    from?: string,
    to?: string,
  ) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        grade: { select: { name: true } },
        section: { select: { name: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Student not found');
    }

    const where: Prisma.AttendanceRecordWhereInput = {
      schoolId,
      studentProfileId,
      periodNumber: 0,
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = parseDateOnly(from);
      if (to) where.date.lte = parseDateOnly(to);
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      medical: 0,
    };
    for (const r of records) {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts] += 1;
      }
    }
    const total = records.length;
    const attended =
      counts.present + counts.late + counts.excused + counts.medical;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

    return {
      student: {
        profileId: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        grade: profile.grade.name,
        section: profile.section?.name ?? null,
      },
      rate,
      counts,
      total,
      recent: records.slice(0, 30).map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        reason: r.reason,
      })),
    };
  }

  async resolveStudentProfileId(
    schoolId: string,
    userId: string,
    role: string,
    requestedProfileId?: string,
  ): Promise<string> {
    if (role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (!profile || profile.schoolId !== schoolId) {
        throw new NotFoundException('Student profile not found');
      }
      return profile.id;
    }

    if (requestedProfileId) {
      let profile = await this.prisma.studentProfile.findFirst({
        where: { id: requestedProfileId, schoolId },
      });
      if (!profile) {
        profile = await this.prisma.studentProfile.findFirst({
          where: { userId: requestedProfileId, schoolId },
        });
      }
      if (!profile) {
        throw new NotFoundException('Student not found');
      }
      if (role === 'teacher') {
        await this.assertClassAccess(
          schoolId,
          userId,
          role,
          profile.gradeId,
          profile.sectionId,
        );
      }
      return profile.id;
    }

    throw new BadRequestException('studentProfileId is required');
  }

  async listByStudentProfile(studentProfileId: string, schoolId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentProfileId, periodNumber: 0 },
      orderBy: { date: 'desc' },
      take: 60,
    });
  }

  async getAnalytics(schoolId: string, date?: string) {
    const day = parseDateOnly(date ?? new Date().toISOString().slice(0, 10));

    const [records, totalStudents] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { schoolId, date: day, periodNumber: 0 },
        include: {
          studentProfile: {
            include: {
              grade: true,
              section: true,
            },
          },
        },
      }),
      this.prisma.studentProfile.count({ where: { schoolId } }),
    ]);

    const present = records.filter(
      (r) =>
        r.status === AttendanceStatus.present ||
        r.status === AttendanceStatus.late ||
        r.status === AttendanceStatus.excused,
    ).length;
    const marked = records.length;
    const todayRate =
      marked > 0 ? Math.round((present / marked) * 100) : null;

    const byGradeSection = new Map<
      string,
      { label: string; present: number; total: number }
    >();

    for (const r of records) {
      const g = r.studentProfile.grade.name;
      const s = r.studentProfile.section?.name ?? '';
      const key = `${g}|${s}`;
      const label = s ? `${g}-${s}` : g;
      const bucket = byGradeSection.get(key) ?? { label, present: 0, total: 0 };
      bucket.total += 1;
      if (
        r.status === AttendanceStatus.present ||
        r.status === AttendanceStatus.late ||
        r.status === AttendanceStatus.excused
      ) {
        bucket.present += 1;
      }
      byGradeSection.set(key, bucket);
    }

    const gradeStats = [...byGradeSection.values()]
      .map((b) => ({
        label: b.label,
        rate: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
        marked: b.total,
      }))
      .filter((b) => b.marked > 0);

    const sorted = [...gradeStats].sort((a, b) => a.rate - b.rate);
    const mostAbsent = sorted[0] ?? null;
    const mostPunctual = sorted[sorted.length - 1] ?? null;

    return {
      date: day.toISOString().slice(0, 10),
      totalStudents,
      markedToday: marked,
      todayRate,
      presentToday: present,
      absentToday: records.filter((r) => r.status === AttendanceStatus.absent)
        .length,
      mostAbsentGrade: mostAbsent,
      mostPunctualGrade: mostPunctual,
    };
  }

  async exportSchoolCsv(schoolId: string, from: string, to: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        periodNumber: 0,
        date: {
          gte: parseDateOnly(from),
          lte: parseDateOnly(to),
        },
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { studentProfile: { user: { firstName: 'asc' } } }],
    });

    const header =
      'Date,Student,Grade,Section,Status,Reason\n';
    const rows = records
      .map((r) => {
        const name = `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`;
        const grade = r.studentProfile.grade.name;
        const section = r.studentProfile.section?.name ?? '';
        const dateStr = r.date.toISOString().slice(0, 10);
        return `${dateStr},"${name}",${grade},${section},${r.status},${r.reason ?? ''}`;
      })
      .join('\n');

    return header + rows;
  }
}
