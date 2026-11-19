import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StaffAttendanceStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseTeacherCardScanPayload } from '../teachers/staff-card.util';
import {
  BulkMarkUnmarkedDto,
  CorrectStaffAttendanceDto,
  ManualStaffAttendanceDto,
  StaffAttendanceSettingsDto,
  StaffCheckInDto,
  StaffCheckOutDto,
  StaffDepartmentDto,
  StaffScanDto,
} from './dto/staff-attendance.dto';
import { computeCheckoutMetrics, minutesBetween } from './staff-hours.util';
import {
  classifyStaffScanPayload,
  formatStaffQrPayload,
} from './staff-qr-payload.util';

function parseDateOnly(date: string): Date {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseHhMm(value: string): { hours: number; minutes: number } {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) {
    throw new BadRequestException(`Invalid time: ${value}`);
  }
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

/** Combine YYYY-MM-DD + HH:mm into a UTC Date (wall-clock stored as UTC). */
function combineDateAndTime(day: Date, hhmm: string): Date {
  const { hours, minutes } = parseHhMm(hhmm);
  const out = new Date(day);
  out.setUTCHours(hours, minutes, 0, 0);
  return out;
}

function resolveInstant(
  day: Date,
  value: string | undefined,
  fallback: Date,
): Date {
  if (!value?.trim()) return fallback;
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return combineDateAndTime(day, trimmed);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid timestamp');
  }
  return parsed;
}

function formatTimeLabel(d: Date | null | undefined): string {
  if (!d) return '';
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const STAFF_ROLES: UserRole[] = [
  UserRole.admin,
  UserRole.staff,
  UserRole.teacher,
];

@Injectable()
export class StaffAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        staffCheckInTime: true,
        staffCheckOutTime: true,
        staffGraceMinutes: true,
        staffOvertimeEnabled: true,
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return {
      checkInTime: school.staffCheckInTime,
      checkOutTime: school.staffCheckOutTime,
      graceMinutes: school.staffGraceMinutes,
      overtimeEnabled: school.staffOvertimeEnabled,
    };
  }

  async updateSettings(schoolId: string, dto: StaffAttendanceSettingsDto) {
    const data: Prisma.SchoolUpdateInput = {};
    if (dto.checkInTime) data.staffCheckInTime = dto.checkInTime;
    if (dto.checkOutTime) data.staffCheckOutTime = dto.checkOutTime;
    if (dto.graceMinutes !== undefined) {
      data.staffGraceMinutes = dto.graceMinutes;
    }
    if (dto.overtimeEnabled !== undefined) {
      data.staffOvertimeEnabled = dto.overtimeEnabled;
    }
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data,
      select: {
        staffCheckInTime: true,
        staffCheckOutTime: true,
        staffGraceMinutes: true,
        staffOvertimeEnabled: true,
      },
    });
    return {
      checkInTime: school.staffCheckInTime,
      checkOutTime: school.staffCheckOutTime,
      graceMinutes: school.staffGraceMinutes,
      overtimeEnabled: school.staffOvertimeEnabled,
    };
  }

  private async assertStaffUser(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        role: { in: STAFF_ROLES },
        roleTemplateId: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        roleTemplate: { select: { slug: true, name: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('Staff member not found in this school');
    }
    return user;
  }

  private async schoolHours(schoolId: string) {
    return this.getSettings(schoolId);
  }

  private computeCheckInStatus(
    checkInAt: Date,
    expectedCheckIn: Date,
    graceMinutes: number,
  ): { status: StaffAttendanceStatus; lateMinutes: number } {
    const graceEnd = new Date(
      expectedCheckIn.getTime() + graceMinutes * 60_000,
    );
    if (checkInAt.getTime() <= graceEnd.getTime()) {
      return { status: StaffAttendanceStatus.present, lateMinutes: 0 };
    }
    const lateMinutes = minutesBetween(expectedCheckIn, checkInAt);
    return { status: StaffAttendanceStatus.late, lateMinutes };
  }

  async listDay(
    schoolId: string,
    opts: {
      date: string;
      group?: string;
      department?: string;
      status?: string;
      roleTemplateSlug?: string;
      search?: string;
    },
  ) {
    const day = parseDateOnly(opts.date);
    const users = await this.loadStaffUsers(schoolId, {
      group: opts.group,
      department: opts.department,
      roleTemplateSlug: opts.roleTemplateSlug,
      search: opts.search,
    });

    const records = await this.prisma.staffAttendanceRecord.findMany({
      where: { schoolId, date: day },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
      },
    });
    const byUser = new Map(records.map((r) => [r.userId, r]));

    let rows = users.map((u) => {
      const record = byUser.get(u.id);
      return this.formatDayRow(u, record ?? null, day);
    });

    if (opts.status) {
      if (opts.status === 'unmarked') {
        rows = rows.filter((r) => !r.recordId);
      } else {
        rows = rows.filter((r) => r.status === opts.status);
      }
    }

    const summary = {
      present: rows.filter((r) => r.status === 'present').length,
      late: rows.filter((r) => r.status === 'late').length,
      absent: rows.filter((r) => r.status === 'absent').length,
      half_day: rows.filter((r) => r.status === 'half_day').length,
      on_leave: rows.filter((r) => r.status === 'on_leave').length,
      excused: rows.filter((r) => r.status === 'excused').length,
      unmarked: rows.filter((r) => !r.recordId).length,
      totalStaff: users.length,
    };

    return {
      date: dateKey(day),
      settings: await this.schoolHours(schoolId),
      summary,
      rows,
    };
  }

  async bulkMarkUnmarked(
    schoolId: string,
    actorId: string,
    dto: BulkMarkUnmarkedDto,
  ) {
    const day = parseDateOnly(dto.date);
    const status = (dto.status ?? 'absent') as StaffAttendanceStatus;
    const users = await this.loadStaffUsers(schoolId, {
      group: dto.group,
      department: dto.department,
      search: dto.search,
    });
    const existing = await this.prisma.staffAttendanceRecord.findMany({
      where: {
        schoolId,
        date: day,
        userId: { in: users.map((u) => u.id) },
      },
      select: { userId: true },
    });
    const markedIds = new Set(existing.map((r) => r.userId));
    const onLeaveIds = await this.userIdsWithApprovedLeave(
      schoolId,
      day,
      users.map((u) => u.id),
    );
    const unmarked = users.filter(
      (u) => !markedIds.has(u.id) && !onLeaveIds.has(u.id),
    );

    if (unmarked.length === 0) {
      return { marked: 0, status, date: dateKey(day) };
    }

    const hours = await this.schoolHours(schoolId);
    const expectedCheckIn = combineDateAndTime(day, hours.checkInTime);
    const expectedCheckOut = combineDateAndTime(day, hours.checkOutTime);
    const reason =
      dto.reason?.trim() ||
      (status === StaffAttendanceStatus.absent
        ? 'Bulk mark unmarked as absent'
        : `Bulk mark unmarked as ${status}`);

    await this.prisma.staffAttendanceRecord.createMany({
      data: unmarked.map((u) => ({
        schoolId,
        userId: u.id,
        date: day,
        status,
        expectedCheckInAt: expectedCheckIn,
        expectedCheckOutAt: expectedCheckOut,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        overtimeMinutes: 0,
        reason,
        recordedById: actorId,
      })),
    });

    return {
      marked: unmarked.length,
      status,
      date: dateKey(day),
      employeeNames: unmarked
        .slice(0, 8)
        .map((u) => `${u.firstName} ${u.lastName}`.trim()),
    };
  }

  async getHistory(
    schoolId: string,
    userId: string,
    from?: string,
    to?: string,
  ) {
    await this.assertStaffUser(schoolId, userId);
    const where: Prisma.StaffAttendanceRecordWhereInput = {
      schoolId,
      userId,
    };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = parseDateOnly(from);
      if (to) where.date.lte = parseDateOnly(to);
    }
    const records = await this.prisma.staffAttendanceRecord.findMany({
      where,
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
        corrections: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            changedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    return records.map((r) => this.formatRecord(r));
  }

  async getRecord(schoolId: string, id: string) {
    const record = await this.prisma.staffAttendanceRecord.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            roleTemplate: { select: { slug: true, name: true } },
          },
        },
        recordedBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
        corrections: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    return this.formatRecord(record);
  }

  async scan(schoolId: string, actorId: string, dto: StaffScanDto) {
    const user = await this.resolveStaffFromScanCode(schoolId, dto.code);
    const day = parseDateOnly(dto.date);
    const mode = dto.mode ?? 'auto';

    const existing = await this.prisma.staffAttendanceRecord.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId: user.id,
          date: day,
        },
      },
    });

    const name = `${user.firstName} ${user.lastName}`.trim();
    const action =
      mode === 'check_in'
        ? 'check_in'
        : mode === 'check_out'
          ? 'check_out'
          : !existing?.checkInAt
            ? 'check_in'
            : !existing?.checkOutAt
              ? 'check_out'
              : 'done';

    if (action === 'done' && existing) {
      return {
        action: 'already_complete' as const,
        userId: user.id,
        name,
        department: this.departmentLabel(user.role, user.roleTemplate?.slug),
        roleName: user.roleTemplate?.name ?? user.role,
        record: await this.getRecord(schoolId, existing.id),
        alreadyMarked: true,
        scannedAt: new Date().toISOString(),
        message: `${name} already checked in and out today`,
      };
    }

    if (action === 'check_in') {
      if (existing?.checkInAt) {
        return {
          action: 'already_checked_in' as const,
          userId: user.id,
          name,
          department: this.departmentLabel(user.role, user.roleTemplate?.slug),
          roleName: user.roleTemplate?.name ?? user.role,
          record: await this.getRecord(schoolId, existing.id),
          alreadyMarked: true,
          scannedAt: new Date().toISOString(),
          message: `${name} already checked in`,
        };
      }
      const record = await this.checkIn(schoolId, actorId, {
        userId: user.id,
        date: dto.date,
      });
      return {
        action: 'check_in' as const,
        userId: user.id,
        name,
        department: this.departmentLabel(user.role, user.roleTemplate?.slug),
        roleName: user.roleTemplate?.name ?? user.role,
        record,
        alreadyMarked: false,
        scannedAt: new Date().toISOString(),
        message:
          record.status === 'late'
            ? `${name} checked in — late (${record.lateMinutes} min)`
            : `${name} checked in`,
      };
    }

    if (!existing?.checkInAt) {
      throw new BadRequestException(
        `${name} has not checked in yet — scan check-in first`,
      );
    }
    if (existing.checkOutAt) {
      return {
        action: 'already_checked_out' as const,
        userId: user.id,
        name,
        department: this.departmentLabel(user.role, user.roleTemplate?.slug),
        roleName: user.roleTemplate?.name ?? user.role,
        record: await this.getRecord(schoolId, existing.id),
        alreadyMarked: true,
        scannedAt: new Date().toISOString(),
        message: `${name} already checked out`,
      };
    }

    const record = await this.checkOut(schoolId, actorId, {
      userId: user.id,
      date: dto.date,
    });
    return {
      action: 'check_out' as const,
      userId: user.id,
      name,
      department: this.departmentLabel(user.role, user.roleTemplate?.slug),
      roleName: user.roleTemplate?.name ?? user.role,
      record,
      alreadyMarked: false,
      scannedAt: new Date().toISOString(),
      message: `${name} checked out`,
    };
  }

  private async resolveStaffFromScanCode(schoolId: string, raw: string) {
    const trimmed = raw.trim();
    const classified = classifyStaffScanPayload(trimmed);

    if (classified.kind === 'student_card') {
      throw new BadRequestException(
        'That looks like a student ID card. Use a staff/teacher card.',
      );
    }

    if (classified.kind === 'staff_credential') {
      const token = classified.token?.trim() ?? '';
      if (!token) {
        throw new BadRequestException('Invalid staff QR code');
      }
      const cred = await this.prisma.staffQrCredential.findFirst({
        where: { schoolId, token, active: true },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              roleTemplateId: true,
              roleTemplate: { select: { slug: true, name: true } },
            },
          },
        },
      });
      if (!cred?.user?.roleTemplateId) {
        throw new NotFoundException(
          'Staff QR not found or deactivated. Ask an admin to reissue it.',
        );
      }
      if (!STAFF_ROLES.includes(cred.user.role)) {
        throw new BadRequestException('Card holder is not school staff');
      }
      return cred.user;
    }

    const fromPayload = parseTeacherCardScanPayload(trimmed);
    const normalized = (fromPayload ?? trimmed)
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');

    if (!normalized || normalized.length < 4) {
      throw new BadRequestException('Invalid staff card code');
    }

    const cardCandidates = Array.from(
      new Set(
        [
          fromPayload,
          normalized,
          normalized.replace(/-/g, ''),
          normalized.replace(/^TCH-/, ''),
        ].filter((v): v is string => Boolean(v && v.length >= 4)),
      ),
    );

    const byCard = await this.prisma.teacherProfile.findFirst({
      where: {
        schoolId,
        cardCode: { in: cardCandidates },
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            roleTemplateId: true,
            roleTemplate: { select: { slug: true, name: true } },
          },
        },
      },
    });

    if (byCard?.user?.roleTemplateId) {
      if (!STAFF_ROLES.includes(byCard.user.role)) {
        throw new BadRequestException('Card holder is not school staff');
      }
      return byCard.user;
    }

    // Typed teacher ID (TCH-…) or externalRef fallback
    const byRef = await this.prisma.user.findFirst({
      where: {
        schoolId,
        role: { in: STAFF_ROLES },
        roleTemplateId: { not: null },
        OR: [
          { externalRef: { equals: normalized, mode: 'insensitive' } },
          {
            teacherProfile: {
              cardCode: normalized.replace(/^TCH-/, ''),
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        roleTemplate: { select: { slug: true, name: true } },
      },
    });

    if (!byRef) {
      throw new NotFoundException(
        'Staff card not found. Issue an ID card from Teachers, or type the card code.',
      );
    }
    return byRef;
  }

  async checkIn(schoolId: string, actorId: string, dto: StaffCheckInDto) {
    await this.assertStaffUser(schoolId, dto.userId);
    const day = parseDateOnly(dto.date);
    const existing = await this.prisma.staffAttendanceRecord.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId: dto.userId,
          date: day,
        },
      },
    });
    if (existing?.checkInAt) {
      throw new ConflictException(
        'Check-in already recorded for this employee and date',
      );
    }

    const hours = await this.schoolHours(schoolId);
    const expectedCheckIn = combineDateAndTime(day, hours.checkInTime);
    const expectedCheckOut = combineDateAndTime(day, hours.checkOutTime);
    const checkInAt = resolveInstant(day, dto.checkInAt, new Date());
    const { status, lateMinutes } = this.computeCheckInStatus(
      checkInAt,
      expectedCheckIn,
      hours.graceMinutes,
    );

    if (existing) {
      const updated = await this.prisma.staffAttendanceRecord.update({
        where: { id: existing.id },
        data: {
          status,
          checkInAt,
          expectedCheckInAt: expectedCheckIn,
          expectedCheckOutAt: expectedCheckOut,
          lateMinutes,
          updatedById: actorId,
        },
        include: this.recordInclude(),
      });
      return this.formatRecord(updated);
    }

    const created = await this.prisma.staffAttendanceRecord.create({
      data: {
        schoolId,
        userId: dto.userId,
        date: day,
        status,
        checkInAt,
        expectedCheckInAt: expectedCheckIn,
        expectedCheckOutAt: expectedCheckOut,
        lateMinutes,
        recordedById: actorId,
      },
      include: this.recordInclude(),
    });
    return this.formatRecord(created);
  }

  async checkOut(schoolId: string, actorId: string, dto: StaffCheckOutDto) {
    await this.assertStaffUser(schoolId, dto.userId);
    const day = parseDateOnly(dto.date);
    const existing = await this.prisma.staffAttendanceRecord.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId: dto.userId,
          date: day,
        },
      },
    });
    if (!existing) {
      throw new BadRequestException(
        'No attendance record found — check in first',
      );
    }
    if (existing.checkOutAt) {
      throw new ConflictException(
        'Check-out already recorded for this employee and date',
      );
    }

    const hours = await this.schoolHours(schoolId);
    const expectedCheckOut =
      existing.expectedCheckOutAt ??
      combineDateAndTime(day, hours.checkOutTime);
    const checkOutAt = resolveInstant(day, dto.checkOutAt, new Date());
    if (existing.checkInAt && checkOutAt < existing.checkInAt) {
      throw new BadRequestException('Check-out cannot be before check-in');
    }
    const { workedMinutes, earlyDepartureMinutes, overtimeMinutes } =
      computeCheckoutMetrics(
        existing.checkInAt,
        checkOutAt,
        expectedCheckOut,
        hours.overtimeEnabled,
      );

    let status = existing.status;
    if (
      status === StaffAttendanceStatus.present ||
      status === StaffAttendanceStatus.late
    ) {
      const expectedSpan = minutesBetween(
        existing.expectedCheckInAt ??
          combineDateAndTime(day, hours.checkInTime),
        expectedCheckOut,
      );
      if (
        workedMinutes != null &&
        expectedSpan > 0 &&
        workedMinutes < expectedSpan * 0.5
      ) {
        status = StaffAttendanceStatus.half_day;
      }
    }

    const updated = await this.prisma.staffAttendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkOutAt,
        expectedCheckOutAt: expectedCheckOut,
        workedMinutes,
        earlyDepartureMinutes,
        overtimeMinutes,
        status,
        updatedById: actorId,
      },
      include: this.recordInclude(),
    });
    return this.formatRecord(updated);
  }

  async upsertManual(
    schoolId: string,
    actorId: string,
    dto: ManualStaffAttendanceDto,
  ) {
    await this.assertStaffUser(schoolId, dto.userId);
    const day = parseDateOnly(dto.date);
    const hours = await this.schoolHours(schoolId);
    const expectedCheckIn = combineDateAndTime(day, hours.checkInTime);
    const expectedCheckOut = combineDateAndTime(day, hours.checkOutTime);

    const status = dto.status;
    const checkInAt = dto.checkInAt
      ? resolveInstant(day, dto.checkInAt, new Date())
      : null;
    const checkOutAt = dto.checkOutAt
      ? resolveInstant(day, dto.checkOutAt, new Date())
      : null;

    let lateMinutes = 0;
    let earlyDepartureMinutes = 0;
    let workedMinutes: number | null = null;
    let overtimeMinutes = 0;
    let finalStatus = status;

    if (
      checkInAt &&
      (status === StaffAttendanceStatus.present ||
        status === StaffAttendanceStatus.late)
    ) {
      const computed = this.computeCheckInStatus(
        checkInAt,
        expectedCheckIn,
        hours.graceMinutes,
      );
      lateMinutes = computed.lateMinutes;
      if (status === StaffAttendanceStatus.present) {
        finalStatus = computed.status;
      }
    }

    if (checkOutAt) {
      const metrics = computeCheckoutMetrics(
        checkInAt,
        checkOutAt,
        expectedCheckOut,
        hours.overtimeEnabled,
      );
      workedMinutes = metrics.workedMinutes;
      earlyDepartureMinutes = metrics.earlyDepartureMinutes;
      overtimeMinutes = metrics.overtimeMinutes;
    }

    const existing = await this.prisma.staffAttendanceRecord.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId: dto.userId,
          date: day,
        },
      },
    });

    if (existing) {
      const previousStatus = existing.status;
      const updated = await this.prisma.$transaction(async (tx) => {
        const row = await tx.staffAttendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: finalStatus,
            checkInAt,
            checkOutAt,
            expectedCheckInAt: expectedCheckIn,
            expectedCheckOutAt: expectedCheckOut,
            lateMinutes,
            earlyDepartureMinutes,
            workedMinutes,
            overtimeMinutes,
            reason: dto.reason ?? null,
            notes: dto.notes ?? null,
            updatedById: actorId,
          },
          include: this.recordInclude(),
        });
        if (
          previousStatus !== finalStatus ||
          existing.checkInAt?.getTime() !== checkInAt?.getTime() ||
          existing.checkOutAt?.getTime() !== checkOutAt?.getTime()
        ) {
          await tx.staffAttendanceCorrection.create({
            data: {
              schoolId,
              recordId: existing.id,
              previousStatus,
              newStatus: finalStatus,
              previousCheckInAt: existing.checkInAt,
              newCheckInAt: checkInAt,
              previousCheckOutAt: existing.checkOutAt,
              newCheckOutAt: checkOutAt,
              reason: dto.reason ?? 'Manual update',
              changedById: actorId,
            },
          });
        }
        return row;
      });
      return this.formatRecord(updated);
    }

    const created = await this.prisma.staffAttendanceRecord.create({
      data: {
        schoolId,
        userId: dto.userId,
        date: day,
        status: finalStatus,
        checkInAt,
        checkOutAt,
        expectedCheckInAt: expectedCheckIn,
        expectedCheckOutAt: expectedCheckOut,
        lateMinutes,
        earlyDepartureMinutes,
        workedMinutes,
        overtimeMinutes,
        reason: dto.reason ?? null,
        notes: dto.notes ?? null,
        recordedById: actorId,
      },
      include: this.recordInclude(),
    });
    return this.formatRecord(created);
  }

  async correct(
    schoolId: string,
    actorId: string,
    recordId: string,
    dto: CorrectStaffAttendanceDto,
  ) {
    const existing = await this.prisma.staffAttendanceRecord.findFirst({
      where: { id: recordId, schoolId },
    });
    if (!existing) throw new NotFoundException('Attendance record not found');

    const day = existing.date;
    const hours = await this.schoolHours(schoolId);
    const expectedCheckIn =
      existing.expectedCheckInAt ?? combineDateAndTime(day, hours.checkInTime);
    const expectedCheckOut =
      existing.expectedCheckOutAt ??
      combineDateAndTime(day, hours.checkOutTime);

    const status = dto.status;
    const checkInAt =
      dto.checkInAt === null
        ? null
        : dto.checkInAt !== undefined
          ? resolveInstant(day, dto.checkInAt, new Date())
          : existing.checkInAt;
    const checkOutAt =
      dto.checkOutAt === null
        ? null
        : dto.checkOutAt !== undefined
          ? resolveInstant(day, dto.checkOutAt, new Date())
          : existing.checkOutAt;

    let lateMinutes = existing.lateMinutes;
    let earlyDepartureMinutes = existing.earlyDepartureMinutes;
    let workedMinutes = existing.workedMinutes;
    let overtimeMinutes = existing.overtimeMinutes;

    if (
      checkInAt &&
      (status === StaffAttendanceStatus.present ||
        status === StaffAttendanceStatus.late)
    ) {
      const computed = this.computeCheckInStatus(
        checkInAt,
        expectedCheckIn,
        hours.graceMinutes,
      );
      lateMinutes = computed.lateMinutes;
    } else if (
      status === StaffAttendanceStatus.absent ||
      status === StaffAttendanceStatus.on_leave ||
      status === StaffAttendanceStatus.excused
    ) {
      lateMinutes = 0;
    }

    if (checkOutAt) {
      const metrics = computeCheckoutMetrics(
        checkInAt,
        checkOutAt,
        expectedCheckOut,
        hours.overtimeEnabled,
      );
      workedMinutes = metrics.workedMinutes;
      earlyDepartureMinutes = metrics.earlyDepartureMinutes;
      overtimeMinutes = metrics.overtimeMinutes;
    } else {
      workedMinutes = null;
      earlyDepartureMinutes = 0;
      overtimeMinutes = 0;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.staffAttendanceCorrection.create({
        data: {
          schoolId,
          recordId: existing.id,
          previousStatus: existing.status,
          newStatus: status,
          previousCheckInAt: existing.checkInAt,
          newCheckInAt: checkInAt,
          previousCheckOutAt: existing.checkOutAt,
          newCheckOutAt: checkOutAt,
          reason: dto.reason ?? 'Correction',
          changedById: actorId,
        },
      });
      return tx.staffAttendanceRecord.update({
        where: { id: existing.id },
        data: {
          status,
          checkInAt,
          checkOutAt,
          overtimeMinutes,
          lateMinutes,
          earlyDepartureMinutes,
          workedMinutes,
          reason: dto.reason ?? existing.reason,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          updatedById: actorId,
        },
        include: this.recordInclude(),
      });
    });

    return this.formatRecord(updated);
  }

  async summary(schoolId: string, date?: string) {
    const day = parseDateOnly(date ?? new Date().toISOString().slice(0, 10));
    const [totalStaff, records] = await Promise.all([
      this.prisma.user.count({
        where: {
          schoolId,
          role: { in: STAFF_ROLES },
          roleTemplateId: { not: null },
        },
      }),
      this.prisma.staffAttendanceRecord.findMany({
        where: { schoolId, date: day },
        select: { status: true },
      }),
    ]);

    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0,
      excused: 0,
    };
    for (const r of records) {
      counts[r.status] += 1;
    }

    return {
      date: dateKey(day),
      totalStaff,
      marked: records.length,
      unmarked: Math.max(0, totalStaff - records.length),
      ...counts,
    };
  }

  async exportCsv(schoolId: string, from: string, to: string, group?: string) {
    const roleFilter =
      group === 'teachers'
        ? UserRole.teacher
        : group === 'staff'
          ? { in: [UserRole.admin, UserRole.staff] as UserRole[] }
          : { in: STAFF_ROLES };

    const records = await this.prisma.staffAttendanceRecord.findMany({
      where: {
        schoolId,
        date: {
          gte: parseDateOnly(from),
          lte: parseDateOnly(to),
        },
        user: { role: roleFilter },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
            roleTemplate: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { user: { firstName: 'asc' } }],
    });

    const header =
      'Date,Employee,Role,Department,Status,Check-in,Check-out,Late minutes,Early departure,Worked minutes,Reason,Notes\n';
    const rows = records
      .map((r) => {
        const name = `${r.user.firstName} ${r.user.lastName}`.trim();
        const role = r.user.roleTemplate?.name ?? r.user.role;
        const dept = this.departmentLabel(
          r.user.role,
          r.user.roleTemplate?.slug,
        );
        const dateStr = dateKey(r.date);
        const reason = (r.reason ?? '').replace(/"/g, '""');
        const notes = (r.notes ?? '').replace(/"/g, '""');
        return [
          dateStr,
          `"${name}"`,
          `"${role}"`,
          `"${dept}"`,
          r.status,
          formatTimeLabel(r.checkInAt),
          formatTimeLabel(r.checkOutAt),
          r.lateMinutes,
          r.earlyDepartureMinutes,
          r.workedMinutes ?? '',
          `"${reason}"`,
          `"${notes}"`,
        ].join(',');
      })
      .join('\n');

    return header + rows;
  }

  private recordInclude() {
    return {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          roleTemplate: { select: { slug: true, name: true } },
        },
      },
      recordedBy: { select: { firstName: true, lastName: true } },
      updatedBy: { select: { firstName: true, lastName: true } },
      corrections: {
        orderBy: { createdAt: 'desc' as const },
        take: 20,
        include: {
          changedBy: { select: { firstName: true, lastName: true } },
        },
      },
    };
  }

  private departmentKey(
    role: string,
    slug?: string | null,
  ): StaffDepartmentDto {
    if (role === 'teacher') return 'teachers';
    if (slug === 'reception' || slug === 'attendance_officer') {
      return 'support';
    }
    if (
      slug === 'registrar' ||
      slug === 'finance_officer' ||
      slug === 'academic_director' ||
      slug === 'principal' ||
      role === 'admin'
    ) {
      return 'administrative';
    }
    return 'other';
  }

  private departmentLabel(role: string, slug?: string | null): string {
    const key = this.departmentKey(role, slug);
    if (key === 'teachers') return 'Teachers';
    if (key === 'support') return 'Support Staff';
    if (key === 'administrative') return 'Administrative Staff';
    return 'Other School Staff';
  }

  private async loadStaffUsers(
    schoolId: string,
    opts: {
      group?: string;
      department?: string;
      roleTemplateSlug?: string;
      search?: string;
    },
  ) {
    const roleFilter =
      opts.department === 'teachers' || opts.group === 'teachers'
        ? UserRole.teacher
        : opts.group === 'staff'
          ? { in: [UserRole.admin, UserRole.staff] as UserRole[] }
          : opts.department === 'administrative' ||
              opts.department === 'support' ||
              opts.department === 'other'
            ? { in: [UserRole.admin, UserRole.staff] as UserRole[] }
            : { in: STAFF_ROLES };

    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: roleFilter,
        roleTemplateId: { not: null },
        ...(opts.roleTemplateSlug
          ? { roleTemplate: { slug: opts.roleTemplateSlug } }
          : {}),
        ...(opts.search?.trim()
          ? {
              OR: [
                {
                  firstName: {
                    contains: opts.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: opts.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: opts.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        roleTemplate: { select: { slug: true, name: true } },
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });

    if (!opts.department) return users;
    return users.filter(
      (u) =>
        this.departmentKey(u.role, u.roleTemplate?.slug) === opts.department,
    );
  }

  private formatDayRow(
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      roleTemplate: { slug: string; name: string } | null;
    },
    record: {
      id: string;
      status: StaffAttendanceStatus;
      checkInAt: Date | null;
      checkOutAt: Date | null;
      lateMinutes: number;
      earlyDepartureMinutes: number;
      workedMinutes: number | null;
      reason: string | null;
      notes: string | null;
      recordedBy: { firstName: string; lastName: string };
      updatedBy: { firstName: string; lastName: string } | null;
    } | null,
    day: Date,
  ) {
    return {
      userId: user.id,
      employeeName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      portalRole: user.role,
      roleName: user.roleTemplate?.name ?? user.role,
      roleTemplateSlug: user.roleTemplate?.slug ?? null,
      department: this.departmentLabel(user.role, user.roleTemplate?.slug),
      date: dateKey(day),
      recordId: record?.id ?? null,
      status: record?.status ?? null,
      checkInAt: record?.checkInAt?.toISOString() ?? null,
      checkOutAt: record?.checkOutAt?.toISOString() ?? null,
      checkInLabel: formatTimeLabel(record?.checkInAt),
      checkOutLabel: formatTimeLabel(record?.checkOutAt),
      lateMinutes: record?.lateMinutes ?? 0,
      earlyDepartureMinutes: record?.earlyDepartureMinutes ?? 0,
      workedMinutes: record?.workedMinutes ?? null,
      reason: record?.reason ?? null,
      notes: record?.notes ?? null,
      recordedBy: record
        ? `${record.recordedBy.firstName} ${record.recordedBy.lastName}`.trim()
        : null,
      updatedBy: record?.updatedBy
        ? `${record.updatedBy.firstName} ${record.updatedBy.lastName}`.trim()
        : null,
    };
  }

  private formatRecord(record: {
    id: string;
    schoolId: string;
    userId: string;
    date: Date;
    status: StaffAttendanceStatus;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    expectedCheckInAt: Date | null;
    expectedCheckOutAt: Date | null;
    lateMinutes: number;
    earlyDepartureMinutes: number;
    workedMinutes: number | null;
    overtimeMinutes?: number;
    reason: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      roleTemplate: { slug: string; name: string } | null;
    };
    recordedBy: { firstName: string; lastName: string };
    updatedBy: { firstName: string; lastName: string } | null;
    corrections?: Array<{
      id: string;
      previousStatus: StaffAttendanceStatus;
      newStatus: StaffAttendanceStatus;
      previousCheckInAt: Date | null;
      newCheckInAt: Date | null;
      previousCheckOutAt: Date | null;
      newCheckOutAt: Date | null;
      reason: string | null;
      createdAt: Date;
      changedBy: { firstName: string; lastName: string };
    }>;
  }) {
    return {
      id: record.id,
      userId: record.userId,
      date: dateKey(record.date),
      status: record.status,
      checkInAt: record.checkInAt?.toISOString() ?? null,
      checkOutAt: record.checkOutAt?.toISOString() ?? null,
      checkInLabel: formatTimeLabel(record.checkInAt),
      checkOutLabel: formatTimeLabel(record.checkOutAt),
      expectedCheckInLabel: formatTimeLabel(record.expectedCheckInAt),
      expectedCheckOutLabel: formatTimeLabel(record.expectedCheckOutAt),
      lateMinutes: record.lateMinutes,
      earlyDepartureMinutes: record.earlyDepartureMinutes,
      workedMinutes: record.workedMinutes,
      overtimeMinutes: record.overtimeMinutes ?? 0,
      reason: record.reason,
      notes: record.notes,
      employeeName: record.user
        ? `${record.user.firstName} ${record.user.lastName}`.trim()
        : undefined,
      portalRole: record.user?.role,
      roleName: record.user?.roleTemplate?.name ?? record.user?.role,
      department: record.user
        ? this.departmentLabel(record.user.role, record.user.roleTemplate?.slug)
        : undefined,
      recordedBy:
        `${record.recordedBy.firstName} ${record.recordedBy.lastName}`.trim(),
      updatedBy: record.updatedBy
        ? `${record.updatedBy.firstName} ${record.updatedBy.lastName}`.trim()
        : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      corrections: (record.corrections ?? []).map((c) => ({
        id: c.id,
        previousStatus: c.previousStatus,
        newStatus: c.newStatus,
        previousCheckInLabel: formatTimeLabel(c.previousCheckInAt),
        newCheckInLabel: formatTimeLabel(c.newCheckInAt),
        previousCheckOutLabel: formatTimeLabel(c.previousCheckOutAt),
        newCheckOutLabel: formatTimeLabel(c.newCheckOutAt),
        reason: c.reason,
        changedBy: `${c.changedBy.firstName} ${c.changedBy.lastName}`.trim(),
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  /** Users with an approved leave covering this calendar day. */
  async userIdsWithApprovedLeave(
    schoolId: string,
    day: Date,
    userIds?: string[],
  ): Promise<Set<string>> {
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        schoolId,
        status: 'approved',
        startDate: { lte: day },
        endDate: { gte: day },
        ...(userIds?.length ? { userId: { in: userIds } } : {}),
      },
      select: { userId: true },
    });
    return new Set(leaves.map((l) => l.userId));
  }

  async getMeSummary(
    schoolId: string,
    userId: string,
    from?: string,
    to?: string,
  ) {
    await this.assertStaffUser(schoolId, userId);
    const history = await this.getHistory(schoolId, userId, from, to);
    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0,
      excused: 0,
    };
    let lateMinutes = 0;
    let workedMinutes = 0;
    let overtimeMinutes = 0;
    for (const r of history) {
      counts[r.status] += 1;
      lateMinutes += r.lateMinutes;
      workedMinutes += r.workedMinutes ?? 0;
      overtimeMinutes += r.overtimeMinutes ?? 0;
    }
    const expectedDays = history.filter((r) => r.status !== 'on_leave').length;
    const attended =
      counts.present + counts.late + counts.half_day + counts.excused;
    const rate =
      expectedDays > 0 ? Math.round((attended / expectedDays) * 100) : null;
    return {
      rate,
      counts,
      totalRecords: history.length,
      lateMinutes,
      workedMinutes,
      overtimeMinutes,
      recent: history.slice(0, 30),
    };
  }

  async hoursSummary(
    schoolId: string,
    from: string,
    to: string,
    opts?: { department?: string; userId?: string },
  ) {
    const fromDay = parseDateOnly(from);
    const toDay = parseDateOnly(to);
    const users = opts?.userId
      ? [await this.assertStaffUser(schoolId, opts.userId)].map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          roleTemplate: u.roleTemplate,
          email: '',
        }))
      : await this.loadStaffUsers(schoolId, { department: opts?.department });

    const records = await this.prisma.staffAttendanceRecord.findMany({
      where: {
        schoolId,
        date: { gte: fromDay, lte: toDay },
        userId: { in: users.map((u) => u.id) },
      },
    });
    const byUser = new Map<string, typeof records>();
    for (const r of records) {
      const list = byUser.get(r.userId) ?? [];
      list.push(r);
      byUser.set(r.userId, list);
    }
    const hours = await this.schoolHours(schoolId);
    const expectedDayMinutes = minutesBetween(
      combineDateAndTime(fromDay, hours.checkInTime),
      combineDateAndTime(fromDay, hours.checkOutTime),
    );

    return users.map((u) => {
      const rows = byUser.get(u.id) ?? [];
      const workDays = rows.filter((r) => r.status !== 'on_leave').length;
      return {
        userId: u.id,
        employeeName: `${u.firstName} ${u.lastName}`.trim(),
        department: this.departmentLabel(u.role, u.roleTemplate?.slug),
        expectedMinutes: workDays * expectedDayMinutes,
        workedMinutes: rows.reduce((s, r) => s + (r.workedMinutes ?? 0), 0),
        lateMinutes: rows.reduce((s, r) => s + r.lateMinutes, 0),
        earlyDepartureMinutes: rows.reduce(
          (s, r) => s + r.earlyDepartureMinutes,
          0,
        ),
        overtimeMinutes: rows.reduce((s, r) => s + r.overtimeMinutes, 0),
        absenceDays: rows.filter((r) => r.status === 'absent').length,
        leaveDays: rows.filter((r) => r.status === 'on_leave').length,
      };
    });
  }

  async exportPayrollCsv(
    schoolId: string,
    from: string,
    to: string,
    department?: string,
  ) {
    const rows = await this.hoursSummary(schoolId, from, to, { department });
    const header =
      'Employee ID,Employee Name,Period,Expected Hours,Worked Hours,Late Minutes,Early Departure,Absence Days,Leave Days,Overtime Minutes\n';
    const body = rows
      .map((r) => {
        const expectedH = (r.expectedMinutes / 60).toFixed(2);
        const workedH = (r.workedMinutes / 60).toFixed(2);
        return [
          r.userId,
          `"${r.employeeName}"`,
          `"${from} to ${to}"`,
          expectedH,
          workedH,
          r.lateMinutes,
          r.earlyDepartureMinutes,
          r.absenceDays,
          r.leaveDays,
          r.overtimeMinutes,
        ].join(',');
      })
      .join('\n');
    return header + body;
  }

  async analytics(
    schoolId: string,
    from: string,
    to: string,
    opts?: { department?: string; userId?: string },
  ) {
    const fromDay = parseDateOnly(from);
    const toDay = parseDateOnly(to);
    const users = opts?.userId
      ? [{ id: opts.userId }]
      : await this.loadStaffUsers(schoolId, { department: opts?.department });
    const userIds = users.map((u) => u.id);
    const records = await this.prisma.staffAttendanceRecord.findMany({
      where: {
        schoolId,
        date: { gte: fromDay, lte: toDay },
        userId: { in: userIds },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            roleTemplate: { select: { slug: true, name: true } },
          },
        },
      },
    });

    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0,
      excused: 0,
    };
    let lateMinutes = 0;
    let workedMinutes = 0;
    let overtimeMinutes = 0;
    const byUser = new Map<
      string,
      { name: string; lateMinutes: number; absent: number }
    >();

    for (const r of records) {
      counts[r.status] += 1;
      lateMinutes += r.lateMinutes;
      workedMinutes += r.workedMinutes ?? 0;
      overtimeMinutes += r.overtimeMinutes;
      const name = `${r.user.firstName} ${r.user.lastName}`.trim();
      const agg = byUser.get(r.userId) ?? {
        name,
        lateMinutes: 0,
        absent: 0,
      };
      agg.lateMinutes += r.lateMinutes;
      if (r.status === 'absent') agg.absent += 1;
      byUser.set(r.userId, agg);
    }

    const expectedDays = records.filter((r) => r.status !== 'on_leave').length;
    const attended =
      counts.present + counts.late + counts.half_day + counts.excused;
    const rate =
      expectedDays > 0 ? Math.round((attended / expectedDays) * 100) : null;

    const trendMap = new Map<string, typeof counts>();
    for (const r of records) {
      const key = dateKey(r.date);
      const bucket = trendMap.get(key) ?? {
        present: 0,
        late: 0,
        absent: 0,
        half_day: 0,
        on_leave: 0,
        excused: 0,
      };
      bucket[r.status] += 1;
      trendMap.set(key, bucket);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, c]) => ({ date, ...c }));

    const mostLate = [...byUser.values()]
      .filter((u) => u.lateMinutes > 0)
      .sort((a, b) => b.lateMinutes - a.lateMinutes)
      .slice(0, 10);
    const mostAbsent = [...byUser.values()]
      .filter((u) => u.absent > 0)
      .sort((a, b) => b.absent - a.absent)
      .slice(0, 10);

    return {
      from,
      to,
      totalStaff: userIds.length,
      markedRecords: records.length,
      rate,
      counts,
      lateMinutes,
      workedMinutes,
      overtimeMinutes,
      leaveDays: counts.on_leave,
      trend,
      mostLate,
      mostAbsent,
    };
  }

  async issueQr(schoolId: string, userId: string) {
    await this.assertStaffUser(schoolId, userId);
    const token = this.generateQrToken();
    const row = await this.prisma.staffQrCredential.upsert({
      where: { userId },
      create: { schoolId, userId, token, active: true },
      update: { token, active: true, rotatedAt: new Date(), schoolId },
    });
    return this.formatQr(row);
  }

  async rotateQr(schoolId: string, userId: string) {
    return this.issueQr(schoolId, userId);
  }

  async setQrActive(schoolId: string, userId: string, active: boolean) {
    await this.assertStaffUser(schoolId, userId);
    const existing = await this.prisma.staffQrCredential.findFirst({
      where: { schoolId, userId },
    });
    if (!existing)
      throw new NotFoundException('No QR credential for this user');
    const row = await this.prisma.staffQrCredential.update({
      where: { userId },
      data: { active, rotatedAt: active ? existing.rotatedAt : new Date() },
    });
    return this.formatQr(row);
  }

  async getQr(schoolId: string, userId: string) {
    await this.assertStaffUser(schoolId, userId);
    const row = await this.prisma.staffQrCredential.findFirst({
      where: { schoolId, userId },
    });
    if (!row) return null;
    return this.formatQr(row);
  }

  private generateQrToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(28);
    let out = '';
    for (let i = 0; i < 28; i++) {
      out += chars[bytes[i] % chars.length];
    }
    return out;
  }

  private formatQr(row: {
    id: string;
    userId: string;
    token: string;
    active: boolean;
    rotatedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      userId: row.userId,
      active: row.active,
      payload: formatStaffQrPayload(row.token),
      rotatedAt: row.rotatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
