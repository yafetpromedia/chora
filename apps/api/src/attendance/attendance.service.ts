import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceMode,
  AttendancePermissionStatus,
  AttendancePermissionType,
  AttendanceReason,
  AttendanceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { CreateAttendancePermissionDto } from './dto/create-attendance-permission.dto';
import { ReviewAttendancePermissionDto } from './dto/review-attendance-permission.dto';
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
    await this.teacherScope.assertHomeroomClassForAttendance(
      schoolId,
      userId,
      role,
      gradeId,
      sectionId,
    );
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
      const selectedGrade = await this.prisma.grade.findUnique({
        where: { id: dto.gradeId },
        select: { name: true },
      });
      const name = `${student.user.firstName} ${student.user.lastName}`;
      throw new BadRequestException(
        `${name} is in ${student.grade.name}, not ${selectedGrade?.name ?? 'the selected grade'}. Check the homeroom grade filter.`,
      );
    }

    if (dto.sectionId && student.sectionId !== dto.sectionId) {
      const selectedSection = await this.prisma.section.findUnique({
        where: { id: dto.sectionId },
        select: { name: true },
      });
      const name = `${student.user.firstName} ${student.user.lastName}`;
      const studentSection = student.section?.name ?? 'another section';
      throw new BadRequestException(
        `${name} is in ${studentSection}, not ${selectedSection?.name ?? 'the selected section'}. Check the section filter.`,
      );
    }

    const periodNumber = dto.periodNumber ?? 0;
    const day = parseDateOnly(dto.date);

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        schoolId,
        studentProfileId: student.id,
        date: day,
        periodNumber,
      },
      select: { status: true },
    });

    const alreadyPresent =
      existing != null &&
      (existing.status === AttendanceStatus.present ||
        existing.status === AttendanceStatus.late ||
        existing.status === AttendanceStatus.excused);

    if (!alreadyPresent) {
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
    }

    const record = alreadyPresent
      ? existing
      : await this.prisma.attendanceRecord.findFirst({
          where: {
            schoolId,
            studentProfileId: student.id,
            date: day,
            periodNumber,
          },
          select: { status: true },
        });

    return {
      studentProfileId: student.id,
      name: `${student.user.firstName} ${student.user.lastName}`,
      grade: student.grade.name,
      section: student.section?.name ?? null,
      cardCode: student.cardCode,
      status: record?.status ?? AttendanceStatus.present,
      alreadyMarked: alreadyPresent,
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
      if (role === 'parent') {
        await this.assertParentStudentAccess(userId, profile.id);
      }
      return profile.id;
    }

    if (role === 'parent') {
      const link = await this.prisma.parentStudent.findFirst({
        where: { parentId: userId, student: { schoolId } },
        select: { studentId: true },
      });
      if (!link) {
        throw new NotFoundException('No linked student found for this parent');
      }
      return link.studentId;
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

    const [records, students] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { schoolId, date: day, periodNumber: 0 },
        select: { studentProfileId: true, status: true },
      }),
      this.prisma.studentProfile.findMany({
        where: { schoolId },
        select: {
          id: true,
          grade: { select: { name: true } },
          section: { select: { name: true } },
        },
      }),
    ]);

    const statusByStudent = new Map(
      records.map((r) => [r.studentProfileId, r.status] as const),
    );
    const totalStudents = students.length;
    const present = students.filter((s) => {
      const status = statusByStudent.get(s.id);
      return (
        status === AttendanceStatus.present ||
        status === AttendanceStatus.late ||
        status === AttendanceStatus.excused
      );
    }).length;
    const marked = records.length;
    // Unmarked students count as not present (same as absent for rate).
    const todayRate =
      marked > 0 && totalStudents > 0
        ? Math.round((present / totalStudents) * 100)
        : null;

    const byGradeSection = new Map<
      string,
      { label: string; present: number; enrolled: number; marked: number }
    >();

    for (const s of students) {
      const g = s.grade.name;
      const sec = s.section?.name ?? '';
      const key = `${g}|${sec}`;
      const label = sec ? `${g}-${sec}` : g;
      const bucket = byGradeSection.get(key) ?? {
        label,
        present: 0,
        enrolled: 0,
        marked: 0,
      };
      bucket.enrolled += 1;
      const status = statusByStudent.get(s.id);
      if (status !== undefined) {
        bucket.marked += 1;
        if (
          status === AttendanceStatus.present ||
          status === AttendanceStatus.late ||
          status === AttendanceStatus.excused
        ) {
          bucket.present += 1;
        }
      }
      byGradeSection.set(key, bucket);
    }

    const gradeStats = [...byGradeSection.values()]
      .filter((b) => b.marked > 0)
      .map((b) => ({
        label: b.label,
        rate:
          b.enrolled > 0 ? Math.round((b.present / b.enrolled) * 100) : 0,
        marked: b.marked,
      }));

    const sorted = [...gradeStats].sort((a, b) => a.rate - b.rate);
    const mostAbsent = sorted[0] ?? null;
    const mostPunctual = sorted[sorted.length - 1] ?? null;

    return {
      date: day.toISOString().slice(0, 10),
      totalStudents,
      markedToday: marked,
      todayRate,
      presentToday: present,
      absentToday: Math.max(0, totalStudents - present),
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

  private formatPermissionRequest(row: {
    id: string;
    type: AttendancePermissionType;
    date: Date;
    reason: AttendanceReason | null;
    note: string | null;
    status: AttendancePermissionStatus;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    studentProfile: {
      id: string;
      gradeId: string;
      sectionId: string | null;
      user: { firstName: string; lastName: string };
      grade: { name: string };
      section: { name: string } | null;
    };
    requester: { firstName: string; lastName: string; role: string };
  }) {
    return {
      id: row.id,
      type: row.type,
      date: row.date.toISOString().slice(0, 10),
      reason: row.reason,
      note: row.note,
      status: row.status,
      reviewNote: row.reviewNote,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      studentProfileId: row.studentProfile.id,
      studentName: `${row.studentProfile.user.firstName} ${row.studentProfile.user.lastName}`.trim(),
      gradeName: row.studentProfile.grade.name,
      sectionName: row.studentProfile.section?.name ?? null,
      requestedBy: `${row.requester.firstName} ${row.requester.lastName}`.trim(),
      requestedByRole: row.requester.role,
    };
  }

  private async assertParentStudentAccess(
    parentId: string,
    studentProfileId: string,
  ) {
    const link = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: { parentId, studentId: studentProfileId },
      },
    });
    if (!link) {
      throw new BadRequestException('You are not linked to this student');
    }
  }

  private attendanceStatusForPermissionType(type: AttendancePermissionType) {
    if (type === AttendancePermissionType.LATE) {
      return AttendanceStatus.late;
    }
    if (type === AttendancePermissionType.ABSENCE) {
      return AttendanceStatus.absent;
    }
    return AttendanceStatus.excused;
  }

  async createPermissionRequest(
    schoolId: string,
    userId: string,
    role: string,
    dto: CreateAttendancePermissionDto,
  ) {
    let studentProfileId: string;

    if (role === 'student') {
      studentProfileId = await this.resolveStudentProfileId(
        schoolId,
        userId,
        role,
      );
    } else if (role === 'parent') {
      if (!dto.studentProfileId) {
        throw new BadRequestException('studentProfileId is required');
      }
      await this.assertParentStudentAccess(userId, dto.studentProfileId);
      studentProfileId = dto.studentProfileId;
    } else {
      throw new BadRequestException('Only students or parents can submit requests');
    }

    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
    });
    if (!profile) {
      throw new NotFoundException('Student not found');
    }

    const day = parseDateOnly(dto.date);
    const existing = await this.prisma.attendancePermissionRequest.findFirst({
      where: {
        schoolId,
        studentProfileId,
        date: day,
        status: AttendancePermissionStatus.PENDING,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'A pending permission request already exists for this date',
      );
    }

    const row = await this.prisma.attendancePermissionRequest.create({
      data: {
        schoolId,
        studentProfileId,
        requestedByUserId: userId,
        type: dto.type,
        date: day,
        reason: dto.reason ?? null,
        note: dto.note?.trim() || null,
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        requester: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return this.formatPermissionRequest(row);
  }

  async listMyPermissionRequests(
    schoolId: string,
    userId: string,
    role: string,
    studentProfileId?: string,
  ) {
    let profileId: string;
    if (role === 'student') {
      profileId = await this.resolveStudentProfileId(schoolId, userId, role);
    } else if (role === 'parent') {
      if (!studentProfileId) {
        throw new BadRequestException('studentProfileId is required');
      }
      await this.assertParentStudentAccess(userId, studentProfileId);
      profileId = studentProfileId;
    } else {
      throw new BadRequestException('Not supported for this role');
    }

    const rows = await this.prisma.attendancePermissionRequest.findMany({
      where: { schoolId, studentProfileId: profileId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        requester: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return rows.map((r) => this.formatPermissionRequest(r));
  }

  async listPermissionRequestsForTeacher(
    schoolId: string,
    userId: string,
    role: string,
    gradeId: string,
    sectionId: string | undefined,
    status?: AttendancePermissionStatus,
    date?: string,
  ) {
    await this.assertClassAccess(schoolId, userId, role, gradeId, sectionId);

    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId,
        ...(sectionId ? { sectionId } : {}),
      },
      select: { id: true },
    });

    const rows = await this.prisma.attendancePermissionRequest.findMany({
      where: {
        schoolId,
        studentProfileId: { in: students.map((s) => s.id) },
        ...(status ? { status } : {}),
        ...(date ? { date: parseDateOnly(date) } : {}),
      },
      orderBy: [{ status: 'asc' }, { date: 'asc' }, { createdAt: 'asc' }],
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        requester: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return rows.map((r) => this.formatPermissionRequest(r));
  }

  async reviewPermissionRequest(
    schoolId: string,
    userId: string,
    role: string,
    requestId: string,
    dto: ReviewAttendancePermissionDto,
  ) {
    if (
      dto.status !== AttendancePermissionStatus.APPROVED &&
      dto.status !== AttendancePermissionStatus.REJECTED
    ) {
      throw new BadRequestException('status must be APPROVED or REJECTED');
    }

    const existing = await this.prisma.attendancePermissionRequest.findFirst({
      where: { id: requestId, schoolId },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        requester: { select: { firstName: true, lastName: true, role: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Permission request not found');
    }
    if (existing.status !== AttendancePermissionStatus.PENDING) {
      throw new BadRequestException('This request was already reviewed');
    }

    await this.assertClassAccess(
      schoolId,
      userId,
      role,
      existing.studentProfile.gradeId,
      existing.studentProfile.sectionId,
    );

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.attendancePermissionRequest.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || null,
        },
        include: {
          studentProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              grade: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
          requester: { select: { firstName: true, lastName: true, role: true } },
        },
      });

      if (dto.status === AttendancePermissionStatus.APPROVED) {
        const markStatus = this.attendanceStatusForPermissionType(existing.type);
        const reason =
          markStatus === AttendanceStatus.absent
            ? (existing.reason ?? AttendanceReason.other)
            : existing.reason;

        await tx.attendanceRecord.upsert({
          where: {
            schoolId_studentProfileId_date_periodNumber: {
              schoolId,
              studentProfileId: existing.studentProfileId,
              date: existing.date,
              periodNumber: 0,
            },
          },
          create: {
            schoolId,
            studentProfileId: existing.studentProfileId,
            date: existing.date,
            periodNumber: 0,
            status: markStatus,
            reason: reason ?? null,
            recordedBy: userId,
          },
          update: {
            status: markStatus,
            reason: reason ?? null,
            recordedBy: userId,
          },
        });
      }

      return updated;
    });

    return this.formatPermissionRequest(row);
  }
}
