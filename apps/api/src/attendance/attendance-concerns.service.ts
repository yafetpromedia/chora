import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceConcernResolution,
  AttendanceConcernStatus,
  AttendanceConcernType,
  AttendancePermissionStatus,
  AttendanceStatus,
  ObservedAttendanceStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceConcernDto } from './dto/create-attendance-concern.dto';
import { ResolveAttendanceConcernDto } from './dto/resolve-attendance-concern.dto';
import { computeAbsentDifference } from './attendance-concerns.util';

const OPEN_STATUSES: AttendanceConcernStatus[] = [
  AttendanceConcernStatus.OPEN,
  AttendanceConcernStatus.UNDER_REVIEW,
];

function parseDateOnly(date: string): Date {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function todayUtcDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekdayFromDate(date: Date) {
  const map = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ] as const;
  return map[date.getUTCDay()];
}

function displayName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

@Injectable()
export class AttendanceConcernsService {
  constructor(private readonly prisma: PrismaService) {}

  async myClassesToday(schoolId: string, userId: string, role: string) {
    if (role !== UserRole.teacher && role !== UserRole.admin) {
      throw new ForbiddenException();
    }

    const day = todayUtcDate();
    const weekday = weekdayFromDate(day);

    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    });
    if (!year) {
      return { date: day.toISOString().slice(0, 10), slots: [] };
    }

    const tt = await this.prisma.timetable.findFirst({
      where: { academicYearId: year.id, isPublished: true },
      select: { id: true },
    });
    if (!tt) {
      return { date: day.toISOString().slice(0, 10), slots: [] };
    }

    const where: Prisma.TimetableEntryWhereInput = {
      timetableId: tt.id,
      schoolId,
      weekday: weekday,
      ...(role === UserRole.teacher ? { teacherUserId: userId } : {}),
    };

    const entries = await this.prisma.timetableEntry.findMany({
      where,
      include: {
        period: true,
        subject: true,
        grade: true,
        section: true,
        room: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ period: { sortOrder: 'asc' } }],
    });

    const contexts = await Promise.all(
      entries.map(async (e) => {
        const summary = await this.officialSummary(
          schoolId,
          e.gradeId,
          e.sectionId,
          day,
        );
        return {
          timetableEntryId: e.id,
          period: {
            id: e.period.id,
            number: e.period.number,
            label: e.period.label,
            startTime: e.period.startTime,
            endTime: e.period.endTime,
          },
          subject: {
            id: e.subject.id,
            name: e.subject.name,
            code: e.subject.code,
          },
          grade: { id: e.grade.id, name: e.grade.name },
          section: e.section
            ? { id: e.section.id, name: e.section.name }
            : null,
          room: e.room ? { id: e.room.id, name: e.room.name } : null,
          teacher: e.teacher
            ? { id: e.teacher.id, name: displayName(e.teacher) }
            : null,
          officialAttendance: summary,
        };
      }),
    );

    return {
      date: day.toISOString().slice(0, 10),
      academicYear: year,
      slots: contexts,
    };
  }

  async getClassContext(
    schoolId: string,
    userId: string,
    role: string,
    timetableEntryId: string,
    dateStr?: string,
  ) {
    const entry = await this.loadEntryForReporter(
      schoolId,
      userId,
      role,
      timetableEntryId,
    );
    const day = dateStr ? parseDateOnly(dateStr) : todayUtcDate();
    const summary = await this.officialSummary(
      schoolId,
      entry.gradeId,
      entry.sectionId,
      day,
    );
    const roster = await this.readOnlyRoster(
      schoolId,
      entry.gradeId,
      entry.sectionId,
      day,
    );

    return {
      date: day.toISOString().slice(0, 10),
      timetableEntryId: entry.id,
      period: {
        id: entry.period.id,
        number: entry.period.number,
        label: entry.period.label,
        startTime: entry.period.startTime,
        endTime: entry.period.endTime,
      },
      subject: {
        id: entry.subject.id,
        name: entry.subject.name,
        code: entry.subject.code,
      },
      grade: { id: entry.grade.id, name: entry.grade.name },
      section: entry.section
        ? { id: entry.section.id, name: entry.section.name }
        : null,
      room: entry.room ? { id: entry.room.id, name: entry.room.name } : null,
      teacher: entry.teacher
        ? { id: entry.teacher.id, name: displayName(entry.teacher) }
        : null,
      officialAttendance: summary,
      roster,
      message: summary.submitted
        ? null
        : 'Official attendance has not been submitted yet.',
    };
  }

  async createConcern(
    schoolId: string,
    userId: string,
    role: string,
    dto: CreateAttendanceConcernDto,
  ) {
    const entry = await this.loadEntryForReporter(
      schoolId,
      userId,
      role,
      dto.timetableEntryId,
    );
    const day = dto.date ? parseDateOnly(dto.date) : todayUtcDate();
    this.validateConcernPayload(dto);

    const summary = await this.officialSummary(
      schoolId,
      entry.gradeId,
      entry.sectionId,
      day,
    );

    let officialStudentStatus: AttendanceStatus | null = null;
    if (dto.studentProfileId) {
      const student = await this.prisma.studentProfile.findFirst({
        where: {
          id: dto.studentProfileId,
          schoolId,
          gradeId: entry.gradeId,
          ...(entry.sectionId ? { sectionId: entry.sectionId } : {}),
        },
        select: { id: true },
      });
      if (!student) {
        throw new BadRequestException('Student is not in this section');
      }
      const record = await this.prisma.attendanceRecord.findFirst({
        where: {
          schoolId,
          studentProfileId: dto.studentProfileId,
          date: day,
          periodNumber: 0,
        },
        select: { status: true },
      });
      officialStudentStatus = record?.status ?? null;
    }

    if (!dto.acknowledgeDuplicate) {
      const duplicate = await this.prisma.attendanceConcern.findFirst({
        where: {
          schoolId,
          reportedByUserId: userId,
          timetableEntryId: entry.id,
          date: day,
          concernType: dto.concernType,
          studentProfileId: dto.studentProfileId ?? null,
          status: { in: OPEN_STATUSES },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException({
          message:
            'A similar open concern already exists for this class. Confirm to submit again.',
          concernId: duplicate.id,
          code: 'DUPLICATE_CONCERN',
        });
      }
    }

    const observedAbsent = dto.observedAbsentCount ?? null;
    const difference = computeAbsentDifference(
      summary.absentCount,
      observedAbsent,
      summary.submitted,
    );

    const created = await this.prisma.attendanceConcern.create({
      data: {
        schoolId,
        date: day,
        gradeId: entry.gradeId,
        sectionId: entry.sectionId,
        subjectId: entry.subjectId,
        timetableEntryId: entry.id,
        periodNumber: entry.period.number,
        periodLabel: entry.period.label,
        subjectNameSnapshot: entry.subject.name,
        reportedByUserId: userId,
        officialPresentCount: summary.presentCount,
        officialAbsentCount: summary.absentCount,
        officialLateCount: summary.lateCount,
        officialExcusedCount: summary.excusedCount,
        officialSubmitted: summary.submitted,
        totalStudents: summary.totalStudents,
        observedPresentCount: dto.observedPresentCount ?? null,
        observedAbsentCount: observedAbsent,
        difference,
        concernType: dto.concernType,
        studentProfileId: dto.studentProfileId ?? null,
        officialStudentStatus,
        observedStudentStatus: dto.observedStudentStatus ?? null,
        description: dto.description?.trim() || null,
        status: AttendanceConcernStatus.OPEN,
      },
    });

    await this.audit(
      schoolId,
      created.id,
      userId,
      'created',
      null,
      created,
      dto.description,
    );

    await this.notifyHomeroomOrAdmins(schoolId, created.id, {
      gradeName: entry.grade.name,
      sectionName: entry.section?.name ?? null,
      subjectName: entry.subject.name,
      concernType: dto.concernType,
      reporterName: await this.userName(userId),
      difference,
      studentProfileId: dto.studentProfileId,
      observedAbsent,
      officialAbsent: summary.absentCount,
      officialSubmitted: summary.submitted,
      gradeId: entry.gradeId,
      sectionId: entry.sectionId,
    });

    // Never mutate AttendanceRecord here — observation only.
    return this.getConcern(schoolId, userId, role, created.id);
  }

  async listConcerns(
    schoolId: string,
    userId: string,
    role: string,
    query: {
      date?: string;
      gradeId?: string;
      sectionId?: string;
      status?: AttendanceConcernStatus;
      concernType?: AttendanceConcernType;
      reportedByUserId?: string;
      subjectId?: string;
      mine?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const scope = await this.reviewScope(schoolId, userId, role);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));

    const where: Prisma.AttendanceConcernWhereInput = { schoolId };

    if (query.mine === '1' || query.mine === 'true') {
      where.reportedByUserId = userId;
    } else if (scope.mode === 'homeroom') {
      where.gradeId = scope.gradeId;
      if (scope.sectionId) where.sectionId = scope.sectionId;
    } else if (scope.mode === 'none') {
      where.reportedByUserId = userId;
    }

    if (query.date) where.date = parseDateOnly(query.date);
    if (query.gradeId && scope.mode === 'school') where.gradeId = query.gradeId;
    if (query.sectionId && scope.mode === 'school') {
      where.sectionId = query.sectionId;
    }
    if (query.status) where.status = query.status;
    if (query.concernType) where.concernType = query.concernType;
    if (query.reportedByUserId && scope.mode === 'school') {
      where.reportedByUserId = query.reportedByUserId;
    }
    if (query.subjectId) where.subjectId = query.subjectId;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.attendanceConcern.count({ where }),
      this.prisma.attendanceConcern.findMany({
        where,
        include: this.concernInclude(),
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => this.formatConcern(r)),
    };
  }

  async summaryForHomeroom(schoolId: string, userId: string, role: string) {
    const scope = await this.reviewScope(schoolId, userId, role);
    const day = todayUtcDate();
    const whereBase: Prisma.AttendanceConcernWhereInput = { schoolId };

    if (scope.mode === 'homeroom') {
      whereBase.gradeId = scope.gradeId;
      if (scope.sectionId) whereBase.sectionId = scope.sectionId;
    } else if (scope.mode === 'none') {
      return {
        open: 0,
        resolved: 0,
        today: 0,
        items: [],
      };
    }

    const [open, resolved, today, items] = await Promise.all([
      this.prisma.attendanceConcern.count({
        where: { ...whereBase, status: { in: OPEN_STATUSES } },
      }),
      this.prisma.attendanceConcern.count({
        where: {
          ...whereBase,
          status: {
            in: [
              AttendanceConcernStatus.RESOLVED,
              AttendanceConcernStatus.DISMISSED,
            ],
          },
        },
      }),
      this.prisma.attendanceConcern.count({
        where: { ...whereBase, date: day },
      }),
      this.prisma.attendanceConcern.findMany({
        where: { ...whereBase, status: { in: OPEN_STATUSES } },
        include: this.concernInclude(),
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
      }),
    ]);

    return {
      open,
      resolved,
      today,
      items: items.map((r) => this.formatConcern(r)),
    };
  }

  async getConcern(schoolId: string, userId: string, role: string, id: string) {
    const row = await this.prisma.attendanceConcern.findFirst({
      where: { id, schoolId },
      include: this.concernInclude(),
    });
    if (!row) throw new NotFoundException('Concern not found');
    await this.assertCanViewConcern(schoolId, userId, role, row);

    let leaveContext: Array<{
      type: string;
      status: string;
      note: string | null;
    }> = [];
    if (row.studentProfileId) {
      const perms = await this.prisma.attendancePermissionRequest.findMany({
        where: {
          schoolId,
          studentProfileId: row.studentProfileId,
          date: row.date,
          status: AttendancePermissionStatus.APPROVED,
        },
        select: { type: true, status: true, note: true },
      });
      leaveContext = perms.map((p) => ({
        type: p.type,
        status: p.status,
        note: p.note,
      }));
    }

    const indicators: string[] = [];
    if (
      row.studentProfileId &&
      row.officialStudentStatus === AttendanceStatus.present &&
      (row.observedStudentStatus === ObservedAttendanceStatus.MISSING ||
        row.observedStudentStatus === ObservedAttendanceStatus.LEFT_CLASS)
    ) {
      indicators.push('Classroom attendance concern');
    }
    if (
      row.studentProfileId &&
      row.officialStudentStatus === AttendanceStatus.absent &&
      row.observedStudentStatus === ObservedAttendanceStatus.PRESENT
    ) {
      indicators.push('Attendance inconsistency');
    }

    return {
      ...this.formatConcern(row),
      leaveContext,
      indicators,
    };
  }

  async markUnderReview(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    const row = await this.loadForReview(schoolId, userId, role, id);
    if (
      row.status === AttendanceConcernStatus.RESOLVED ||
      row.status === AttendanceConcernStatus.DISMISSED
    ) {
      throw new BadRequestException('Concern is already closed');
    }
    if (row.status === AttendanceConcernStatus.UNDER_REVIEW) {
      return this.getConcern(schoolId, userId, role, id);
    }

    const updated = await this.prisma.attendanceConcern.update({
      where: { id },
      data: {
        status: AttendanceConcernStatus.UNDER_REVIEW,
        reviewedAt: new Date(),
      },
    });
    await this.audit(schoolId, id, userId, 'reviewed', row, updated, null);
    return this.getConcern(schoolId, userId, role, id);
  }

  async resolve(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
    dto: ResolveAttendanceConcernDto,
  ) {
    const row = await this.loadForReview(schoolId, userId, role, id);
    if (
      row.status === AttendanceConcernStatus.RESOLVED ||
      row.status === AttendanceConcernStatus.DISMISSED
    ) {
      throw new BadRequestException('Concern is already closed');
    }

    const updated = await this.prisma.attendanceConcern.update({
      where: { id },
      data: {
        status: AttendanceConcernStatus.RESOLVED,
        resolution: dto.resolution,
        resolutionNote: dto.resolutionNote?.trim() || null,
        resolvedByUserId: userId,
        resolvedAt: new Date(),
        reviewedAt: row.reviewedAt ?? new Date(),
      },
    });

    await this.audit(
      schoolId,
      id,
      userId,
      'resolved',
      row,
      updated,
      dto.resolutionNote,
    );

    // Official attendance is never auto-changed. CORRECTED_OFFICIAL only records intent.
    return this.getConcern(schoolId, userId, role, id);
  }

  async dismiss(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
    dto: ResolveAttendanceConcernDto,
  ) {
    const row = await this.loadForReview(schoolId, userId, role, id);
    if (
      row.status === AttendanceConcernStatus.RESOLVED ||
      row.status === AttendanceConcernStatus.DISMISSED
    ) {
      throw new BadRequestException('Concern is already closed');
    }

    const updated = await this.prisma.attendanceConcern.update({
      where: { id },
      data: {
        status: AttendanceConcernStatus.DISMISSED,
        resolution:
          dto.resolution ?? AttendanceConcernResolution.DUPLICATE_OR_INCORRECT,
        resolutionNote: dto.resolutionNote?.trim() || null,
        resolvedByUserId: userId,
        resolvedAt: new Date(),
        reviewedAt: row.reviewedAt ?? new Date(),
      },
    });

    await this.audit(
      schoolId,
      id,
      userId,
      'dismissed',
      row,
      updated,
      dto.resolutionNote,
    );
    return this.getConcern(schoolId, userId, role, id);
  }

  // ─── internals ─────────────────────────────────────────────

  private validateConcernPayload(dto: CreateAttendanceConcernDto) {
    if (dto.concernType === AttendanceConcernType.COUNT_MISMATCH) {
      if (dto.observedAbsentCount == null) {
        throw new BadRequestException(
          'Observed absent count is required for count mismatch',
        );
      }
    }
    if (
      dto.concernType === AttendanceConcernType.STUDENT_APPEARS_ABSENT ||
      dto.concernType === AttendanceConcernType.STUDENT_APPEARS_PRESENT ||
      dto.concernType === AttendanceConcernType.STUDENT_LEFT_CLASS
    ) {
      if (!dto.studentProfileId) {
        throw new BadRequestException(
          'A student must be selected for this concern type',
        );
      }
      if (!dto.observedStudentStatus) {
        throw new BadRequestException('Observed status is required');
      }
    }
  }

  private async loadEntryForReporter(
    schoolId: string,
    userId: string,
    role: string,
    timetableEntryId: string,
  ) {
    const entry = await this.prisma.timetableEntry.findFirst({
      where: { id: timetableEntryId, schoolId },
      include: {
        period: true,
        subject: true,
        grade: true,
        section: true,
        room: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!entry) {
      throw new NotFoundException('Timetable class not found');
    }
    if (role === UserRole.teacher && entry.teacherUserId !== userId) {
      throw new ForbiddenException(
        'You can only report concerns for your scheduled classes',
      );
    }
    if (
      role !== UserRole.teacher &&
      role !== UserRole.admin &&
      role !== UserRole.staff
    ) {
      throw new ForbiddenException();
    }
    return entry;
  }

  private async officialSummary(
    schoolId: string,
    gradeId: string,
    sectionId: string | null,
    day: Date,
  ) {
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId,
        ...(sectionId ? { sectionId } : {}),
      },
      select: { id: true },
    });
    const ids = students.map((s) => s.id);
    const records = ids.length
      ? await this.prisma.attendanceRecord.findMany({
          where: {
            schoolId,
            date: day,
            periodNumber: 0,
            studentProfileId: { in: ids },
          },
          select: { status: true },
        })
      : [];

    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      medical: 0,
    };
    for (const r of records) {
      counts[r.status] += 1;
    }

    return {
      totalStudents: ids.length,
      submitted: records.length > 0,
      markedCount: records.length,
      presentCount: counts.present + counts.late,
      absentCount: counts.absent,
      lateCount: counts.late,
      excusedCount: counts.excused + counts.medical,
      unmarkedCount: Math.max(0, ids.length - records.length),
    };
  }

  private async readOnlyRoster(
    schoolId: string,
    gradeId: string,
    sectionId: string | null,
    day: Date,
  ) {
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId,
        ...(sectionId ? { sectionId } : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { user: { firstName: 'asc' } },
    });
    if (students.length === 0) {
      return [];
    }

    const studentIds = students.map((s) => s.id);
    const [records, leaveRows] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          schoolId,
          date: day,
          periodNumber: 0,
          studentProfileId: { in: studentIds },
        },
        select: { studentProfileId: true, status: true },
      }),
      this.prisma.attendancePermissionRequest.findMany({
        where: {
          schoolId,
          date: day,
          studentProfileId: { in: studentIds },
          status: AttendancePermissionStatus.APPROVED,
        },
        select: { studentProfileId: true, type: true },
      }),
    ]);
    const byId = new Map(records.map((r) => [r.studentProfileId, r.status]));
    const leaveByStudent = new Map<string, string[]>();
    for (const row of leaveRows) {
      const list = leaveByStudent.get(row.studentProfileId) ?? [];
      list.push(row.type);
      leaveByStudent.set(row.studentProfileId, list);
    }

    return students.map((s) => {
      const officialStatus = byId.get(s.id) ?? null;
      const approvedLeave = leaveByStudent.get(s.id) ?? [];
      const hints: string[] = [];
      if (approvedLeave.length > 0) {
        hints.push(`Approved leave: ${approvedLeave.join(', ')}`);
      }
      if (
        officialStatus === AttendanceStatus.absent &&
        approvedLeave.length === 0
      ) {
        hints.push('Marked absent on official roll');
      }
      if (
        officialStatus === AttendanceStatus.present ||
        officialStatus === AttendanceStatus.late
      ) {
        hints.push('Officially present for the day');
      }
      // Campus gate presence sessions are not stored yet — avoid accusing students.
      return {
        studentProfileId: s.id,
        name: displayName(s.user),
        officialStatus,
        approvedLeave,
        hints,
      };
    });
  }

  private async reviewScope(
    schoolId: string,
    userId: string,
    role: string,
  ): Promise<
    | { mode: 'school' }
    | { mode: 'homeroom'; gradeId: string; sectionId: string | null }
    | { mode: 'none' }
  > {
    if (role === UserRole.admin || role === UserRole.staff) {
      return { mode: 'school' };
    }
    if (role !== UserRole.teacher) {
      return { mode: 'none' };
    }
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: {
        schoolId: true,
        homeroomGradeId: true,
        homeroomSectionId: true,
      },
    });
    if (!profile || profile.schoolId !== schoolId || !profile.homeroomGradeId) {
      return { mode: 'none' };
    }
    return {
      mode: 'homeroom',
      gradeId: profile.homeroomGradeId,
      sectionId: profile.homeroomSectionId,
    };
  }

  private async assertCanViewConcern(
    schoolId: string,
    userId: string,
    role: string,
    row: {
      reportedByUserId: string;
      gradeId: string;
      sectionId: string | null;
    },
  ) {
    if (row.reportedByUserId === userId) return;
    const scope = await this.reviewScope(schoolId, userId, role);
    if (scope.mode === 'school') return;
    if (scope.mode === 'homeroom') {
      if (scope.gradeId !== row.gradeId) {
        throw new ForbiddenException();
      }
      if (
        scope.sectionId &&
        row.sectionId &&
        scope.sectionId !== row.sectionId
      ) {
        throw new ForbiddenException();
      }
      return;
    }
    throw new ForbiddenException();
  }

  private async loadForReview(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    const row = await this.prisma.attendanceConcern.findFirst({
      where: { id, schoolId },
    });
    if (!row) throw new NotFoundException('Concern not found');

    const scope = await this.reviewScope(schoolId, userId, role);
    if (scope.mode === 'school') return row;
    if (scope.mode === 'homeroom') {
      if (scope.gradeId !== row.gradeId) {
        throw new ForbiddenException(
          'You can only review concerns for your homeroom',
        );
      }
      if (
        scope.sectionId &&
        row.sectionId &&
        scope.sectionId !== row.sectionId
      ) {
        throw new ForbiddenException(
          'You can only review concerns for your homeroom section',
        );
      }
      return row;
    }
    throw new ForbiddenException('Not authorized to review this concern');
  }

  private async notifyHomeroomOrAdmins(
    schoolId: string,
    concernId: string,
    ctx: {
      gradeName: string;
      sectionName: string | null;
      subjectName: string;
      concernType: AttendanceConcernType;
      reporterName: string;
      difference: number | null;
      studentProfileId?: string;
      observedAbsent: number | null;
      officialAbsent: number | null;
      officialSubmitted: boolean;
      gradeId: string;
      sectionId: string | null;
    },
  ) {
    const sectionLabel = ctx.sectionName
      ? `${ctx.gradeName} ${ctx.sectionName}`
      : ctx.gradeName;

    const body =
      ctx.concernType === AttendanceConcernType.COUNT_MISMATCH
        ? ctx.officialSubmitted
          ? `${ctx.subjectName} teacher reports ${ctx.observedAbsent ?? '?'} students missing, while official attendance shows ${ctx.officialAbsent ?? 0} absent.`
          : `${ctx.subjectName} teacher reports an attendance observation (official roll not submitted yet).`
        : `${ctx.reporterName} reported an attendance concern during ${ctx.subjectName}.`;

    const title = `Attendance concern — ${sectionLabel}`;
    const link = `/teacher/attendance/concerns/${concernId}`;

    const profiles = await this.prisma.teacherProfile.findMany({
      where: { schoolId, homeroomGradeId: ctx.gradeId },
      select: { userId: true, homeroomSectionId: true },
    });

    const recipients = new Set<string>();
    for (const p of profiles) {
      if (
        p.homeroomSectionId &&
        ctx.sectionId &&
        p.homeroomSectionId !== ctx.sectionId
      ) {
        continue;
      }
      recipients.add(p.userId);
    }

    if (recipients.size === 0) {
      const officers = await this.prisma.user.findMany({
        where: {
          schoolId,
          OR: [
            { role: UserRole.admin },
            {
              roleTemplate: {
                permissions: {
                  some: {
                    permissionKey: {
                      in: [
                        'attendance.concerns.review',
                        'attendance.manage',
                        'attendance.analytics',
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
        select: { id: true },
        take: 20,
      });
      for (const o of officers) recipients.add(o.id);
    }

    if (recipients.size === 0) return;

    await this.prisma.staffNotification.createMany({
      data: [...recipients].map((uid) => ({
        schoolId,
        userId: uid,
        title,
        body: `${body} Review concern.`,
        link,
        kind: 'ATTENDANCE_CONCERN',
        entityId: concernId,
      })),
    });
  }

  private async userName(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return u ? displayName(u) : 'Teacher';
  }

  private async audit(
    schoolId: string,
    concernId: string,
    actorId: string | null,
    action: string,
    before: unknown,
    after: unknown,
    reason: string | null | undefined,
  ) {
    await this.prisma.attendanceConcernAuditEvent.create({
      data: {
        schoolId,
        concernId,
        actorId,
        action,
        beforeJson: before ? JSON.stringify(before) : null,
        afterJson: after ? JSON.stringify(after) : null,
        reason: reason ?? null,
      },
    });
  }

  private concernInclude() {
    return {
      grade: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
      reportedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      resolvedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      studentProfile: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    } as const;
  }

  private formatConcern(
    row: Prisma.AttendanceConcernGetPayload<{
      include: ReturnType<AttendanceConcernsService['concernInclude']>;
    }>,
  ) {
    return {
      id: row.id,
      schoolId: row.schoolId,
      category: row.category,
      date: row.date.toISOString().slice(0, 10),
      grade: row.grade,
      section: row.section,
      subject: row.subject
        ? row.subject
        : row.subjectNameSnapshot
          ? { id: row.subjectId, name: row.subjectNameSnapshot, code: null }
          : null,
      timetableEntryId: row.timetableEntryId,
      periodNumber: row.periodNumber,
      periodLabel: row.periodLabel,
      reportedBy: {
        id: row.reportedBy.id,
        name: displayName(row.reportedBy),
      },
      officialPresentCount: row.officialPresentCount,
      officialAbsentCount: row.officialAbsentCount,
      officialLateCount: row.officialLateCount,
      officialExcusedCount: row.officialExcusedCount,
      officialSubmitted: row.officialSubmitted,
      totalStudents: row.totalStudents,
      observedPresentCount: row.observedPresentCount,
      observedAbsentCount: row.observedAbsentCount,
      difference: row.difference,
      concernType: row.concernType,
      student: row.studentProfile
        ? {
            id: row.studentProfile.id,
            name: displayName(row.studentProfile.user),
          }
        : null,
      officialStudentStatus: row.officialStudentStatus,
      observedStudentStatus: row.observedStudentStatus,
      description: row.description,
      status: row.status,
      resolution: row.resolution,
      resolutionNote: row.resolutionNote,
      resolvedBy: row.resolvedBy
        ? { id: row.resolvedBy.id, name: displayName(row.resolvedBy) }
        : null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
