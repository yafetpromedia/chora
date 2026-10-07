import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaveRequestStatus,
  Prisma,
  StaffAttendanceStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { permissionMatches } from '../common/permissions/permission-catalog';
import {
  CreateLeaveRequestDto,
  ReviewLeaveRequestDto,
  UpsertLeaveBalanceDto,
} from './dto/leave.dto';

const DEFAULT_LEAVE_TYPES: Array<{
  slug: string;
  name: string;
  annualAllocationDays?: number;
  sortOrder: number;
}> = [
  { slug: 'annual', name: 'Annual Leave', annualAllocationDays: 20, sortOrder: 1 },
  { slug: 'sick', name: 'Sick Leave', annualAllocationDays: 10, sortOrder: 2 },
  { slug: 'emergency', name: 'Emergency Leave', sortOrder: 3 },
  { slug: 'maternity', name: 'Maternity Leave', sortOrder: 4 },
  { slug: 'paternity', name: 'Paternity Leave', sortOrder: 5 },
  { slug: 'personal', name: 'Personal Leave', sortOrder: 6 },
  { slug: 'official', name: 'Official Assignment', sortOrder: 7 },
  { slug: 'other', name: 'Other', sortOrder: 8 },
];

function parseDateOnly(date: string): Date {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Count weekdays (Mon–Fri) inclusive between two UTC dates. */
export function countWeekdays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function eachWeekday(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureLeaveTypes(schoolId: string) {
    for (const t of DEFAULT_LEAVE_TYPES) {
      await this.prisma.leaveType.upsert({
        where: { schoolId_slug: { schoolId, slug: t.slug } },
        create: {
          schoolId,
          slug: t.slug,
          name: t.name,
          sortOrder: t.sortOrder,
          annualAllocationDays: t.annualAllocationDays ?? null,
          isPaid: true,
          countsTowardBalance: t.annualAllocationDays != null,
        },
        update: { name: t.name, sortOrder: t.sortOrder },
      });
    }
    return this.listTypes(schoolId);
  }

  async listTypes(schoolId: string) {
    await this.ensureLeaveTypes(schoolId);
    return this.prisma.leaveType.findMany({
      where: { schoolId, active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listRequests(
    schoolId: string,
    opts: {
      status?: string;
      userId?: string;
      leaveTypeId?: string;
      from?: string;
      to?: string;
      mineOnly?: boolean;
      actorId?: string;
    },
  ) {
    const where: Prisma.LeaveRequestWhereInput = { schoolId };
    if (opts.mineOnly && opts.actorId) where.userId = opts.actorId;
    else if (opts.userId) where.userId = opts.userId;
    if (opts.status) where.status = opts.status as LeaveRequestStatus;
    if (opts.leaveTypeId) where.leaveTypeId = opts.leaveTypeId;
    if (opts.from || opts.to) {
      where.AND = [
        opts.from ? { endDate: { gte: parseDateOnly(opts.from) } } : {},
        opts.to ? { startDate: { lte: parseDateOnly(opts.to) } } : {},
      ];
    }
    const rows = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            roleTemplate: { select: { name: true, slug: true } },
          },
        },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return rows.map((r) => this.formatRequest(r));
  }

  async createRequest(
    schoolId: string,
    actorId: string,
    actorRole: string,
    dto: CreateLeaveRequestDto,
    actorPermissions: string[] = [],
  ) {
    const targetUserId = dto.userId ?? actorId;
    if (dto.userId && dto.userId !== actorId) {
      const canCreateForOthers =
        actorRole === UserRole.admin ||
        permissionMatches(actorPermissions, ['leave.manage']);
      if (!canCreateForOthers) {
        throw new ForbiddenException('Cannot create leave for another user');
      }
    }

    const staff = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
        roleTemplateId: { not: null },
      },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, schoolId, active: true },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const start = parseDateOnly(dto.startDate);
    const end = parseDateOnly(dto.endDate);
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }
    const days = countWeekdays(start, end);
    if (days < 1) {
      throw new BadRequestException(
        'Leave must include at least one weekday (weekends are excluded)',
      );
    }

    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        schoolId,
        userId: targetUserId,
        status: { in: [LeaveRequestStatus.pending, LeaveRequestStatus.approved] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'Overlapping pending or approved leave already exists',
      );
    }

    const created = await this.prisma.leaveRequest.create({
      data: {
        schoolId,
        userId: targetUserId,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason.trim(),
        notes: dto.notes?.trim() || null,
        attachmentUrl: dto.attachmentUrl?.trim() || null,
      },
      include: {
        leaveType: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            roleTemplate: { select: { name: true, slug: true } },
          },
        },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
    });
    return this.formatRequest(created);
  }

  async review(
    schoolId: string,
    actorId: string,
    requestId: string,
    dto: ReviewLeaveRequestDto,
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, schoolId },
      include: { leaveType: true },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== LeaveRequestStatus.pending) {
      throw new BadRequestException('Only pending requests can be reviewed');
    }
    if (request.userId === actorId) {
      throw new ForbiddenException('You cannot approve your own leave request');
    }

    const status =
      dto.status === 'approved'
        ? LeaveRequestStatus.approved
        : LeaveRequestStatus.rejected;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status,
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || null,
        },
        include: {
          leaveType: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              roleTemplate: { select: { name: true, slug: true } },
            },
          },
          reviewedBy: { select: { firstName: true, lastName: true } },
        },
      });

      if (status === LeaveRequestStatus.approved) {
        await this.applyApprovedLeaveAttendance(
          tx,
          schoolId,
          request.userId,
          request.startDate,
          request.endDate,
          actorId,
          request.leaveType.name,
        );
        if (request.leaveType.countsTowardBalance) {
          const year = request.startDate.getUTCFullYear();
          await tx.leaveBalance.upsert({
            where: {
              schoolId_userId_leaveTypeId_year: {
                schoolId,
                userId: request.userId,
                leaveTypeId: request.leaveTypeId,
                year,
              },
            },
            create: {
              schoolId,
              userId: request.userId,
              leaveTypeId: request.leaveTypeId,
              year,
              allocated: request.leaveType.annualAllocationDays ?? 0,
              used: request.days,
            },
            update: { used: { increment: request.days } },
          });
        }
      }
      return row;
    });

    return this.formatRequest(updated);
  }

  async cancel(
    schoolId: string,
    actorId: string,
    actorRole: string,
    requestId: string,
    actorPermissions: string[] = [],
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, schoolId },
      include: { leaveType: true },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    const isOwner = request.userId === actorId;
    const canManageLeave =
      actorRole === UserRole.admin ||
      permissionMatches(actorPermissions, ['leave.manage']) ||
      permissionMatches(actorPermissions, ['leave.approve']);

    if (
      request.status !== LeaveRequestStatus.pending &&
      request.status !== LeaveRequestStatus.approved
    ) {
      throw new BadRequestException('This leave request cannot be cancelled');
    }

    if (request.status === LeaveRequestStatus.approved) {
      if (!canManageLeave) {
        throw new ForbiddenException(
          'Only leave managers can cancel approved leave',
        );
      }
    } else if (!isOwner && !canManageLeave) {
      throw new ForbiddenException('Cannot cancel this leave request');
    }

    const wasApproved = request.status === LeaveRequestStatus.approved;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: LeaveRequestStatus.cancelled,
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote: wasApproved
            ? 'Cancelled after approval'
            : 'Cancelled by requester',
        },
        include: {
          leaveType: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              roleTemplate: { select: { name: true, slug: true } },
            },
          },
          reviewedBy: { select: { firstName: true, lastName: true } },
        },
      });

      if (wasApproved) {
        await this.clearLeaveAttendance(
          tx,
          schoolId,
          request.userId,
          request.startDate,
          request.endDate,
          actorId,
        );
        if (request.leaveType.countsTowardBalance) {
          const year = request.startDate.getUTCFullYear();
          const bal = await tx.leaveBalance.findUnique({
            where: {
              schoolId_userId_leaveTypeId_year: {
                schoolId,
                userId: request.userId,
                leaveTypeId: request.leaveTypeId,
                year,
              },
            },
          });
          if (bal) {
            await tx.leaveBalance.update({
              where: { id: bal.id },
              data: { used: Math.max(0, bal.used - request.days) },
            });
          }
        }
      }
      return row;
    });

    return this.formatRequest(updated);
  }

  async listBalances(schoolId: string, userId?: string, year?: number) {
    const y = year ?? new Date().getUTCFullYear();
    await this.ensureLeaveTypes(schoolId);
    const types = await this.prisma.leaveType.findMany({
      where: { schoolId, active: true, countsTowardBalance: true },
    });
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        schoolId,
        year: y,
        ...(userId ? { userId } : {}),
      },
      include: {
        leaveType: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return {
      year: y,
      types,
      balances: balances.map((b) => ({
        id: b.id,
        userId: b.userId,
        employeeName: `${b.user.firstName} ${b.user.lastName}`.trim(),
        leaveTypeId: b.leaveTypeId,
        leaveTypeName: b.leaveType.name,
        year: b.year,
        allocated: b.allocated,
        used: b.used,
        remaining: Math.max(0, b.allocated - b.used),
      })),
    };
  }

  async upsertBalance(schoolId: string, dto: UpsertLeaveBalanceDto) {
    const row = await this.prisma.leaveBalance.upsert({
      where: {
        schoolId_userId_leaveTypeId_year: {
          schoolId,
          userId: dto.userId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
      create: {
        schoolId,
        userId: dto.userId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        allocated: dto.allocated,
        used: 0,
      },
      update: { allocated: dto.allocated },
      include: {
        leaveType: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return {
      id: row.id,
      userId: row.userId,
      employeeName: `${row.user.firstName} ${row.user.lastName}`.trim(),
      leaveTypeId: row.leaveTypeId,
      leaveTypeName: row.leaveType.name,
      year: row.year,
      allocated: row.allocated,
      used: row.used,
      remaining: Math.max(0, row.allocated - row.used),
    };
  }

  private async applyApprovedLeaveAttendance(
    tx: Prisma.TransactionClient,
    schoolId: string,
    userId: string,
    start: Date,
    end: Date,
    actorId: string,
    leaveTypeName: string,
  ) {
    const school = await tx.school.findUnique({
      where: { id: schoolId },
      select: {
        staffCheckInTime: true,
        staffCheckOutTime: true,
      },
    });
    for (const day of eachWeekday(start, end)) {
      const existing = await tx.staffAttendanceRecord.findUnique({
        where: {
          schoolId_userId_date: { schoolId, userId, date: day },
        },
      });
      if (existing) {
        if (existing.status === StaffAttendanceStatus.on_leave) continue;
        await tx.staffAttendanceCorrection.create({
          data: {
            schoolId,
            recordId: existing.id,
            previousStatus: existing.status,
            newStatus: StaffAttendanceStatus.on_leave,
            previousCheckInAt: existing.checkInAt,
            newCheckInAt: null,
            previousCheckOutAt: existing.checkOutAt,
            newCheckOutAt: null,
            reason: `Approved leave: ${leaveTypeName}`,
            changedById: actorId,
          },
        });
        await tx.staffAttendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: StaffAttendanceStatus.on_leave,
            checkInAt: null,
            checkOutAt: null,
            lateMinutes: 0,
            earlyDepartureMinutes: 0,
            workedMinutes: null,
            overtimeMinutes: 0,
            reason: leaveTypeName,
            updatedById: actorId,
          },
        });
      } else {
        const expectedIn = new Date(day);
        const [ih, im] = (school?.staffCheckInTime ?? '08:00')
          .split(':')
          .map(Number);
        expectedIn.setUTCHours(ih ?? 8, im ?? 0, 0, 0);
        const expectedOut = new Date(day);
        const [oh, om] = (school?.staffCheckOutTime ?? '17:00')
          .split(':')
          .map(Number);
        expectedOut.setUTCHours(oh ?? 17, om ?? 0, 0, 0);
        await tx.staffAttendanceRecord.create({
          data: {
            schoolId,
            userId,
            date: day,
            status: StaffAttendanceStatus.on_leave,
            expectedCheckInAt: expectedIn,
            expectedCheckOutAt: expectedOut,
            reason: leaveTypeName,
            recordedById: actorId,
          },
        });
      }
    }
  }

  private async clearLeaveAttendance(
    tx: Prisma.TransactionClient,
    schoolId: string,
    userId: string,
    start: Date,
    end: Date,
    actorId: string,
  ) {
    for (const day of eachWeekday(start, end)) {
      const existing = await tx.staffAttendanceRecord.findUnique({
        where: {
          schoolId_userId_date: { schoolId, userId, date: day },
        },
      });
      if (!existing || existing.status !== StaffAttendanceStatus.on_leave) {
        continue;
      }
      await tx.staffAttendanceCorrection.create({
        data: {
          schoolId,
          recordId: existing.id,
          previousStatus: existing.status,
          newStatus: StaffAttendanceStatus.absent,
          reason: 'Leave cancelled',
          changedById: actorId,
        },
      });
      await tx.staffAttendanceRecord.update({
        where: { id: existing.id },
        data: {
          status: StaffAttendanceStatus.absent,
          reason: 'Leave cancelled — mark corrected if needed',
          updatedById: actorId,
        },
      });
    }
  }

  private formatRequest(r: {
    id: string;
    userId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    days: number;
    reason: string;
    notes: string | null;
    attachmentUrl: string | null;
    status: LeaveRequestStatus;
    reviewedAt: Date | null;
    reviewNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    leaveType: { id: string; name: string; slug: string };
    user: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      roleTemplate: { name: string; slug: string } | null;
    };
    reviewedBy: { firstName: string; lastName: string } | null;
  }) {
    return {
      id: r.id,
      userId: r.userId,
      employeeName: `${r.user.firstName} ${r.user.lastName}`.trim(),
      roleName: r.user.roleTemplate?.name ?? r.user.role,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: r.leaveType.name,
      leaveTypeSlug: r.leaveType.slug,
      startDate: dateKey(r.startDate),
      endDate: dateKey(r.endDate),
      days: r.days,
      reason: r.reason,
      notes: r.notes,
      attachmentUrl: r.attachmentUrl,
      status: r.status,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reviewNote: r.reviewNote,
      reviewedBy: r.reviewedBy
        ? `${r.reviewedBy.firstName} ${r.reviewedBy.lastName}`.trim()
        : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
