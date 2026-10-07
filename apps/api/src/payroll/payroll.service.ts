import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AbsenceDeductionMethod,
  CompensationCalcMethod,
  CompensationComponentType,
  LeaveRequestStatus,
  OvertimeApprovalStatus,
  PayFrequency,
  PayrollAdjustmentType,
  PayrollLineKind,
  PayrollPayMethod,
  PayrollPaymentStatus,
  PayrollRunStatus,
  Prisma,
  StaffAttendanceStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEmployeeCompensationDto,
  CreatePayrollPeriodDto,
  PayrollAdjustmentDto,
  PayrollSettingsDto,
  RecordPayrollPaymentDto,
  ReviewOvertimeDto,
  UpsertCompensationComponentDto,
} from './payroll.dto';
import {
  dailyFromMonthly,
  minutesToHourCents,
  percentOfCents,
  sumCents,
} from './money.util';
import {
  deductionCalendarDays,
  leaveDaysInPeriod,
  toUtcDateKey,
} from './payroll-leave.util';

function parseDate(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DEFAULT_COMPONENTS: Array<{
  code: string;
  name: string;
  type: CompensationComponentType;
  method: CompensationCalcMethod;
}> = [
  {
    code: 'BASIC',
    name: 'Basic Salary',
    type: CompensationComponentType.EARNING,
    method: CompensationCalcMethod.FIXED_AMOUNT,
  },
  {
    code: 'TRANSPORT',
    name: 'Transport Allowance',
    type: CompensationComponentType.EARNING,
    method: CompensationCalcMethod.FIXED_AMOUNT,
  },
  {
    code: 'HOUSING',
    name: 'Housing Allowance',
    type: CompensationComponentType.EARNING,
    method: CompensationCalcMethod.PERCENTAGE_OF_BASIC,
  },
  {
    code: 'MEAL',
    name: 'Meal Allowance',
    type: CompensationComponentType.EARNING,
    method: CompensationCalcMethod.FIXED_AMOUNT,
  },
  {
    code: 'NIGHT',
    name: 'Night Shift Allowance',
    type: CompensationComponentType.EARNING,
    method: CompensationCalcMethod.FIXED_AMOUNT,
  },
  {
    code: 'OT',
    name: 'Overtime',
    type: CompensationComponentType.EARNING,
    method: CompensationCalcMethod.PER_HOUR,
  },
  {
    code: 'TAX',
    name: 'Income Tax',
    type: CompensationComponentType.DEDUCTION,
    method: CompensationCalcMethod.FIXED_AMOUNT,
  },
  {
    code: 'PENSION',
    name: 'Pension',
    type: CompensationComponentType.DEDUCTION,
    method: CompensationCalcMethod.PERCENTAGE_OF_BASIC,
  },
];

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Settings & components ─────────────────────────────────────────────

  async getSettings(schoolId: string) {
    return this.prisma.payrollSettings.upsert({
      where: { schoolId },
      create: { schoolId },
      update: {},
    });
  }

  async updateSettings(schoolId: string, dto: PayrollSettingsDto) {
    await this.getSettings(schoolId);
    return this.prisma.payrollSettings.update({
      where: { schoolId },
      data: {
        currency: dto.currency,
        workingDaysPerMonth: dto.workingDaysPerMonth,
        overtimeEnabled: dto.overtimeEnabled,
        overtimeMultiplierBp: dto.overtimeMultiplierBp,
        overtimeApprovalRequired: dto.overtimeApprovalRequired,
        absenceDeductionMethod: dto.absenceDeductionMethod,
        absenceFixedDays: dto.absenceFixedDays,
        // Never silently enable statutory without verified rules.
        statutoryActive: dto.statutoryActive === true ? false : false,
      },
    });
  }

  async ensureComponents(schoolId: string) {
    for (const c of DEFAULT_COMPONENTS) {
      await this.prisma.compensationComponent.upsert({
        where: { schoolId_code: { schoolId, code: c.code } },
        create: { schoolId, ...c },
        update: {},
      });
    }
  }

  async listComponents(schoolId: string) {
    await this.ensureComponents(schoolId);
    return this.prisma.compensationComponent.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Versioned statutory packs. Brackets are placeholders only —
   * calculation stays off until MoF-verified (statutoryActive forced false).
   */
  async listRuleSets(schoolId: string) {
    await this.ensureInactiveRulePack(schoolId);
    return this.prisma.payrollRuleSet.findMany({
      where: { OR: [{ schoolId }, { schoolId: null }] },
      include: {
        taxBrackets: { orderBy: { sortOrder: 'asc' } },
        contributions: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async ensureInactiveRulePack(schoolId: string) {
    const code = 'ET-PLACEHOLDER-INACTIVE';
    const existing = await this.prisma.payrollRuleSet.findFirst({
      where: { schoolId, code },
    });
    if (existing) return existing;
    return this.prisma.payrollRuleSet.create({
      data: {
        schoolId,
        code,
        name: 'Ethiopia statutory (inactive — verify before use)',
        effectiveFrom: new Date('2026-01-01'),
        active: false,
        taxBrackets: {
          create: [
            {
              minCents: 0,
              maxCents: 60000,
              rateBp: 0,
              deductionCents: 0,
              sortOrder: 1,
            },
            {
              minCents: 60001,
              maxCents: null,
              rateBp: 0,
              deductionCents: 0,
              sortOrder: 2,
            },
          ],
        },
        contributions: {
          create: [
            {
              code: 'PENSION',
              name: 'Pension (inactive)',
              employeeRateBp: 0,
              employerRateBp: 0,
              basis: 'GROSS',
              active: false,
            },
          ],
        },
      },
    });
  }

  createComponent(schoolId: string, dto: UpsertCompensationComponentDto) {
    return this.prisma.compensationComponent.create({
      data: {
        schoolId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        type: dto.type,
        method: dto.method ?? CompensationCalcMethod.FIXED_AMOUNT,
        taxable: dto.taxable ?? true,
        recurring: dto.recurring ?? true,
        active: dto.active ?? true,
      },
    });
  }

  async updateComponent(
    schoolId: string,
    id: string,
    dto: UpsertCompensationComponentDto,
  ) {
    const row = await this.prisma.compensationComponent.findFirst({
      where: { id, schoolId },
    });
    if (!row) throw new NotFoundException('Component not found');
    return this.prisma.compensationComponent.update({
      where: { id },
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        type: dto.type,
        method: dto.method,
        taxable: dto.taxable,
        recurring: dto.recurring,
        active: dto.active,
      },
    });
  }

  // ── Compensation history ──────────────────────────────────────────────

  async listCompensation(schoolId: string, userId: string) {
    return this.prisma.employeeCompensation.findMany({
      where: { schoolId, userId },
      include: {
        lines: { include: { component: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async getEffectiveCompensation(
    schoolId: string,
    userId: string,
    asOf: Date,
  ) {
    return this.prisma.employeeCompensation.findFirst({
      where: {
        schoolId,
        userId,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
      include: { lines: { include: { component: true } } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createCompensation(
    schoolId: string,
    actorId: string,
    userId: string,
    dto: CreateEmployeeCompensationDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
      },
    });
    if (!user) throw new NotFoundException('Employee not found');

    const from = parseDate(dto.effectiveFrom);
    const prev = await this.prisma.employeeCompensation.findFirst({
      where: { schoolId, userId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (dto.lines?.length) {
      for (const line of dto.lines) {
        const component = await this.prisma.compensationComponent.findFirst({
          where: { id: line.componentId, schoolId },
          select: { id: true },
        });
        if (!component) {
          throw new BadRequestException(
            'Compensation component not found in this school',
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (prev) {
        const end = new Date(from.getTime() - 86400000);
        await tx.employeeCompensation.update({
          where: { id: prev.id },
          data: { effectiveTo: end },
        });
      }
      const created = await tx.employeeCompensation.create({
        data: {
          schoolId,
          userId,
          payFrequency: dto.payFrequency,
          basicAmountCents: dto.basicAmountCents,
          hourlyRateCents: dto.hourlyRateCents,
          dailyRateCents: dto.dailyRateCents,
          effectiveFrom: from,
          reason: dto.reason.trim(),
          approvedById: actorId,
          lines: dto.lines?.length
            ? {
                create: dto.lines.map((l) => ({
                  componentId: l.componentId,
                  amountCents: l.amountCents,
                  percentBp: l.percentBp,
                })),
              }
            : undefined,
        },
        include: { lines: { include: { component: true } } },
      });
      await this.audit(tx, schoolId, actorId, 'EmployeeCompensation', created.id, 'created', null, created, dto.reason);
      return created;
    });
  }

  // ── Periods & runs ────────────────────────────────────────────────────

  listPeriods(schoolId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { schoolId },
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, status: true, calculatedAt: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  createPeriod(schoolId: string, dto: CreatePayrollPeriodDto) {
    const start = parseDate(dto.startDate);
    const end = parseDate(dto.endDate);
    if (end < start) throw new BadRequestException('Invalid period range');
    return this.prisma.payrollPeriod.create({
      data: {
        schoolId,
        label: dto.label.trim(),
        startDate: start,
        endDate: end,
        payDate: parseDate(dto.payDate),
      },
    });
  }

  async createRun(schoolId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, schoolId },
    });
    if (!period) throw new NotFoundException('Period not found');
    return this.prisma.payrollRun.create({
      data: {
        schoolId,
        periodId,
        status: PayrollRunStatus.DRAFT,
        statutoryActive: false,
      },
    });
  }

  async getRun(schoolId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, schoolId },
      include: {
        period: true,
        snapshots: {
          include: { lines: true, payment: true, payslip: true },
          orderBy: { employeeName: 'asc' },
        },
        adjustments: true,
      },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async calculate(schoolId: string, actorId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, schoolId },
      include: { period: true, adjustments: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (
      run.status !== PayrollRunStatus.DRAFT &&
      run.status !== PayrollRunStatus.CALCULATED &&
      run.status !== PayrollRunStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Payroll cannot be recalculated in this status');
    }

    const settings = await this.getSettings(schoolId);
    await this.ensureComponents(schoolId);
    const rulePack = await this.ensureInactiveRulePack(schoolId);

    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
        roleTemplateId: { not: null },
        OR: [
          { employeeProfile: null },
          {
            employeeProfile: {
              employmentStatus: {
                in: ['ACTIVE', 'ON_LEAVE'],
              },
            },
          },
        ],
      },
      include: {
        employeeProfile: {
          include: { hrDepartment: true, hrPosition: true },
        },
      },
    });

    const asOf = run.period.endDate;
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      select: {
        name: true,
        logoUrl: true,
        address: true,
        phone: true,
        email: true,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.payrollRun.update({
        where: { id: runId },
        data: { status: PayrollRunStatus.CALCULATING },
      });
      await tx.payrollEmployeeSnapshot.deleteMany({ where: { runId } });

      for (const user of users) {
        const comp = await tx.employeeCompensation.findFirst({
          where: {
            schoolId,
            userId: user.id,
            effectiveFrom: { lte: asOf },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
          },
          include: { lines: { include: { component: true } } },
          orderBy: { effectiveFrom: 'desc' },
        });
        if (!comp) continue;

        const att = await tx.staffAttendanceRecord.findMany({
          where: {
            schoolId,
            userId: user.id,
            date: { gte: run.period.startDate, lte: run.period.endDate },
          },
        });

        const overtimeMinutes = settings.overtimeEnabled
          ? att.reduce((s, r) => s + (r.overtimeMinutes ?? 0), 0)
          : 0;

        let approvedOtMinutes = overtimeMinutes;
        if (settings.overtimeApprovalRequired && overtimeMinutes > 0) {
          const approval = await tx.overtimeApproval.findUnique({
            where: {
              schoolId_userId_periodStart_periodEnd: {
                schoolId,
                userId: user.id,
                periodStart: run.period.startDate,
                periodEnd: run.period.endDate,
              },
            },
          });
          if (!approval) {
            await tx.overtimeApproval.create({
              data: {
                schoolId,
                runId,
                userId: user.id,
                periodStart: run.period.startDate,
                periodEnd: run.period.endDate,
                overtimeMinutes,
                status: OvertimeApprovalStatus.PENDING,
              },
            });
            approvedOtMinutes = 0;
          } else if (approval.status !== OvertimeApprovalStatus.APPROVED) {
            approvedOtMinutes = 0;
          } else {
            approvedOtMinutes = approval.overtimeMinutes;
          }
        }

        const leaves = await tx.leaveRequest.findMany({
          where: {
            schoolId,
            userId: user.id,
            status: LeaveRequestStatus.approved,
            startDate: { lte: run.period.endDate },
            endDate: { gte: run.period.startDate },
          },
          include: { leaveType: true },
        });

        const paidLeaveKeys = new Set<string>();
        const unpaidLeaveKeys = new Set<string>();
        for (const lv of leaves) {
          const keys = leaveDaysInPeriod(
            lv.startDate,
            lv.endDate,
            run.period.startDate,
            run.period.endDate,
          );
          for (const k of keys) {
            if (lv.leaveType.isPaid) paidLeaveKeys.add(k);
            else unpaidLeaveKeys.add(k);
          }
        }
        const leaveDaysPaid = paidLeaveKeys.size;
        const leaveDaysUnpaid = unpaidLeaveKeys.size;

        const absenceKeys = att
          .filter((r) => r.status === StaffAttendanceStatus.absent)
          .map((r) => toUtcDateKey(r.date));
        const absenceDays = new Set(absenceKeys).size;

        const earningLines: Array<{
          kind: PayrollLineKind;
          code: string;
          label: string;
          amountCents: number;
        }> = [];
        const deductionLines: typeof earningLines = [];
        const employerLines: typeof earningLines = [];

        // Basic / frequency earnings
        let basicCents = comp.basicAmountCents;
        if (comp.payFrequency === PayFrequency.HOURLY) {
          const worked = att.reduce((s, r) => s + (r.workedMinutes ?? 0), 0);
          basicCents = minutesToHourCents(
            worked,
            comp.hourlyRateCents ?? 0,
            10_000,
          );
        } else if (comp.payFrequency === PayFrequency.DAILY) {
          // Present-style days + paid leave; never count unpaid leave as worked,
          // and never count on_leave as both worked and a deduction.
          const payableKeys = new Set<string>();
          for (const r of att) {
            const key = toUtcDateKey(r.date);
            if (unpaidLeaveKeys.has(key)) continue;
            if (
              r.status === StaffAttendanceStatus.present ||
              r.status === StaffAttendanceStatus.late ||
              r.status === StaffAttendanceStatus.half_day ||
              r.status === StaffAttendanceStatus.excused
            ) {
              payableKeys.add(key);
            }
          }
          for (const k of paidLeaveKeys) payableKeys.add(k);
          basicCents = (comp.dailyRateCents ?? 0) * payableKeys.size;
        }

        earningLines.push({
          kind: PayrollLineKind.EARNING,
          code: 'BASIC',
          label: 'Basic Salary',
          amountCents: basicCents,
        });

        for (const line of comp.lines) {
          if (!line.component.active || !line.component.recurring) continue;
          if (line.component.code === 'BASIC' || line.component.code === 'OT')
            continue;
          let amount = 0;
          if (
            line.component.method === CompensationCalcMethod.PERCENTAGE_OF_BASIC
          ) {
            amount = percentOfCents(basicCents, line.percentBp ?? 0);
          } else {
            amount = line.amountCents ?? 0;
          }
          const target =
            line.component.type === CompensationComponentType.EARNING
              ? earningLines
              : deductionLines;
          target.push({
            kind:
              line.component.type === CompensationComponentType.EARNING
                ? PayrollLineKind.EARNING
                : PayrollLineKind.DEDUCTION,
            code: line.component.code,
            label: line.component.name,
            amountCents: amount,
          });
        }

        // Overtime from attendance (uses attendance overtimeMinutes; rate from compensation)
        if (approvedOtMinutes > 0) {
          const hourlyCents =
            comp.hourlyRateCents ??
            Math.round(
              dailyFromMonthly(basicCents, settings.workingDaysPerMonth) / 8,
            );
          const otCents = minutesToHourCents(
            approvedOtMinutes,
            hourlyCents,
            settings.overtimeMultiplierBp,
          );
          if (otCents > 0) {
            earningLines.push({
              kind: PayrollLineKind.EARNING,
              code: 'OT',
              label: 'Overtime',
              amountCents: otCents,
            });
          }
        }

        // Absence / unpaid leave deductions only when school policy enables them.
        // NO_DEDUCTION ⇒ neither absence nor unpaid leave auto-reduces salary.
        const deductPolicyEnabled =
          settings.absenceDeductionMethod !==
          AbsenceDeductionMethod.NO_DEDUCTION;
        if (deductPolicyEnabled) {
          const deductKeys = deductionCalendarDays({
            absenceDateKeys: absenceKeys,
            unpaidLeaveDateKeys: unpaidLeaveKeys,
            deductUnpaidLeave: true,
          });
          if (deductKeys.size > 0) {
            const divisor =
              settings.absenceDeductionMethod ===
              AbsenceDeductionMethod.MONTHLY_DIVIDED_BY_FIXED_DAYS
                ? settings.absenceFixedDays
                : settings.workingDaysPerMonth;
            const daily = dailyFromMonthly(basicCents, divisor);
            deductionLines.push({
              kind: PayrollLineKind.DEDUCTION,
              code: 'ABSENCE',
              label: 'Absence / unpaid leave deduction',
              amountCents: daily * deductKeys.size,
            });
          }
        }

        // Adjustments
        for (const adj of run.adjustments.filter((a) => a.userId === user.id)) {
          const earnTypes: PayrollAdjustmentType[] = [
            PayrollAdjustmentType.BONUS,
            PayrollAdjustmentType.ALLOWANCE,
            PayrollAdjustmentType.REIMBURSEMENT,
            PayrollAdjustmentType.CORRECTION,
          ];
          const isEarn = earnTypes.includes(adj.type);
          const bucket = isEarn && adj.amountCents >= 0 ? earningLines : deductionLines;
          bucket.push({
            kind: isEarn && adj.amountCents >= 0
              ? PayrollLineKind.EARNING
              : PayrollLineKind.DEDUCTION,
            code: `ADJ_${adj.type}`,
            label: `${adj.type}: ${adj.reason}`.slice(0, 120),
            amountCents: Math.abs(adj.amountCents),
          });
        }

        // Statutory tax/pension remain inactive until a verified rule pack is enabled.

        const grossCents = sumCents(earningLines.map((l) => l.amountCents));
        const deductionCents = sumCents(
          deductionLines.map((l) => l.amountCents),
        );
        const employerCostCents =
          grossCents + sumCents(employerLines.map((l) => l.amountCents));
        const netCents = Math.max(0, grossCents - deductionCents);

        const snapshot = await tx.payrollEmployeeSnapshot.create({
          data: {
            schoolId,
            runId,
            userId: user.id,
            employeeCode:
              user.employeeProfile?.employeeCode ?? user.id.slice(0, 8),
            employeeName: `${user.firstName} ${user.lastName}`.trim(),
            positionName: user.employeeProfile?.hrPosition?.name ?? null,
            departmentName: user.employeeProfile?.hrDepartment?.name ?? null,
            payFrequency: comp.payFrequency,
            basicCents,
            grossCents,
            deductionCents,
            netCents,
            employerCostCents,
            overtimeMinutes: approvedOtMinutes,
            absenceDays,
            leaveDaysPaid,
            leaveDaysUnpaid,
            lines: {
              create: [...earningLines, ...deductionLines, ...employerLines],
            },
          },
        });

        const payload = {
          schoolId,
          schoolName: school?.name ?? null,
          schoolLogoUrl: school?.logoUrl ?? null,
          schoolAddress: school?.address ?? null,
          schoolPhone: school?.phone ?? null,
          schoolEmail: school?.email ?? null,
          employeeName: snapshot.employeeName,
          employeeCode: snapshot.employeeCode,
          position: snapshot.positionName,
          department: snapshot.departmentName,
          period: run.period.label,
          payDate: dateKey(run.period.payDate),
          earnings: earningLines,
          deductions: deductionLines,
          employer: employerLines,
          grossCents,
          deductionCents,
          netCents,
          employerCostCents,
          statutoryActive: false,
        };

        await tx.payslip.create({
          data: {
            schoolId,
            snapshotId: snapshot.id,
            userId: user.id,
            periodLabel: run.period.label,
            payDate: run.period.payDate,
            payloadJson: JSON.stringify(payload),
          },
        });

        await tx.payrollPayment.create({
          data: {
            schoolId,
            snapshotId: snapshot.id,
            userId: user.id,
            amountCents: netCents,
            status: PayrollPaymentStatus.UNPAID,
          },
        });
      }

      await tx.payrollRun.update({
        where: { id: runId },
        data: {
          status: PayrollRunStatus.CALCULATED,
          calculatedAt: new Date(),
          statutoryActive: false,
          // Snapshot associated pack for history; tax amounts remain inactive.
          ruleSetId: rulePack.id,
        },
      });
      await this.audit(
        tx,
        schoolId,
        actorId,
        'PayrollRun',
        runId,
        'calculated',
        null,
        { status: 'CALCULATED', ruleSetId: rulePack.id, statutoryActive: false },
        null,
      );
    });

    return this.getRun(schoolId, runId);
  }

  async addAdjustment(
    schoolId: string,
    actorId: string,
    runId: string,
    dto: PayrollAdjustmentDto,
  ) {
    const run = await this.assertEditableRun(schoolId, runId);
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Adjustment reason is required');
    }
    const employee = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
      },
      select: { id: true },
    });
    if (!employee) {
      throw new BadRequestException('Employee not found in this school');
    }
    const row = await this.prisma.payrollAdjustment.create({
      data: {
        schoolId,
        runId: run.id,
        userId: dto.userId,
        type: dto.type,
        amountCents: dto.amountCents,
        reason: dto.reason.trim(),
        createdById: actorId,
      },
    });
    await this.audit(
      this.prisma,
      schoolId,
      actorId,
      'PayrollAdjustment',
      row.id,
      'created',
      null,
      row,
      dto.reason,
    );
    return row;
  }

  async approve(schoolId: string, actorId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, schoolId },
    });
    if (!run) throw new NotFoundException('Run not found');
    if (
      run.status !== PayrollRunStatus.CALCULATED &&
      run.status !== PayrollRunStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Only calculated payroll can be approved');
    }
    const updated = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: PayrollRunStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: actorId,
      },
    });
    await this.audit(
      this.prisma,
      schoolId,
      actorId,
      'PayrollRun',
      runId,
      'approved',
      run,
      updated,
      null,
    );
    return updated;
  }

  async close(
    schoolId: string,
    actorId: string,
    runId: string,
    opts?: { force?: boolean; reason?: string },
  ) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, schoolId },
    });
    if (!run) throw new NotFoundException('Run not found');
    if (
      run.status !== PayrollRunStatus.APPROVED &&
      run.status !== PayrollRunStatus.PAID
    ) {
      throw new BadRequestException('Approve or pay payroll before closing');
    }
    const unpaid = await this.prisma.payrollPayment.count({
      where: {
        schoolId,
        snapshot: { runId },
        status: { not: PayrollPaymentStatus.PAID },
      },
    });
    if (unpaid > 0 && !opts?.force) {
      throw new BadRequestException(
        `${unpaid} employee payment(s) still unpaid. Pay all employees or force-close with a reason.`,
      );
    }
    if (unpaid > 0 && opts?.force && !opts.reason?.trim()) {
      throw new BadRequestException('Force-close requires a reason');
    }
    const updated = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.CLOSED, closedAt: new Date() },
    });
    await this.audit(
      this.prisma,
      schoolId,
      actorId,
      'PayrollRun',
      runId,
      unpaid > 0 ? 'force_closed' : 'closed',
      run,
      updated,
      opts?.reason?.trim() ?? null,
    );
    return updated;
  }

  async recordPayment(
    schoolId: string,
    actorId: string,
    snapshotId: string,
    dto: RecordPayrollPaymentDto,
  ) {
    const snap = await this.prisma.payrollEmployeeSnapshot.findFirst({
      where: { id: snapshotId, schoolId },
      include: { run: true, payment: true },
    });
    if (!snap) throw new NotFoundException('Snapshot not found');
    if (
      snap.run.status !== PayrollRunStatus.APPROVED &&
      snap.run.status !== PayrollRunStatus.PAID
    ) {
      throw new BadRequestException('Payroll must be approved before payment');
    }
    const before = snap.payment;
    const nextStatus = dto.status ?? PayrollPaymentStatus.PAID;
    const payment = await this.prisma.payrollPayment.update({
      where: { snapshotId },
      data: {
        method: dto.method ?? PayrollPayMethod.BANK_TRANSFER,
        reference: dto.reference,
        notes: dto.notes,
        status: nextStatus,
        paidAt:
          nextStatus === PayrollPaymentStatus.PAID ? new Date() : before?.paidAt,
        recordedById: actorId,
        amountCents: snap.netCents,
      },
    });

    await this.audit(
      this.prisma,
      schoolId,
      actorId,
      'PayrollPayment',
      payment.id,
      `status_${nextStatus.toLowerCase()}`,
      before
        ? {
            status: before.status,
            method: before.method,
            amountCents: before.amountCents,
            reference: before.reference,
          }
        : null,
      {
        status: payment.status,
        method: payment.method,
        amountCents: payment.amountCents,
        reference: payment.reference,
        runId: snap.runId,
        userId: snap.userId,
        snapshotId: snap.id,
      },
      dto.notes ?? null,
    );

    const unpaid = await this.prisma.payrollPayment.count({
      where: {
        schoolId,
        snapshot: { runId: snap.runId },
        status: { not: PayrollPaymentStatus.PAID },
      },
    });
    if (unpaid === 0) {
      await this.prisma.payrollRun.update({
        where: { id: snap.runId },
        data: { status: PayrollRunStatus.PAID },
      });
    }
    return payment;
  }

  async reviewOvertime(
    schoolId: string,
    actorId: string,
    approvalId: string,
    dto: ReviewOvertimeDto,
  ) {
    const row = await this.prisma.overtimeApproval.findFirst({
      where: { id: approvalId, schoolId },
    });
    if (!row) throw new NotFoundException('Overtime approval not found');
    return this.prisma.overtimeApproval.update({
      where: { id: approvalId },
      data: {
        status: dto.status,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });
  }

  listOvertimeApprovals(schoolId: string, status?: string) {
    return this.prisma.overtimeApproval.findMany({
      where: {
        schoolId,
        ...(status ? { status: status as OvertimeApprovalStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // ── Payslips ──────────────────────────────────────────────────────────

  async listMyPayslips(schoolId: string, userId: string) {
    return this.prisma.payslip.findMany({
      where: { schoolId, userId },
      orderBy: { payDate: 'desc' },
      take: 48,
      select: {
        id: true,
        periodLabel: true,
        payDate: true,
        createdAt: true,
        snapshot: {
          select: {
            netCents: true,
            grossCents: true,
            deductionCents: true,
            employeeName: true,
          },
        },
      },
    });
  }

  async getPayslip(
    schoolId: string,
    payslipId: string,
    actorId: string,
    canManage: boolean,
  ) {
    const row = await this.prisma.payslip.findFirst({
      where: { id: payslipId, schoolId },
      include: {
        snapshot: { include: { lines: true, payment: true } },
      },
    });
    if (!row) throw new NotFoundException('Payslip not found');
    if (!canManage && row.userId !== actorId) {
      throw new ForbiddenException('Cannot view another employee payslip');
    }
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      select: {
        name: true,
        logoUrl: true,
        address: true,
        phone: true,
        email: true,
      },
    });
    const payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
    const branded: Record<string, unknown> = {
      ...payload,
      schoolName: school?.name ?? null,
      schoolLogoUrl: school?.logoUrl ?? null,
      schoolAddress: school?.address ?? null,
      schoolPhone: school?.phone ?? null,
      schoolEmail: school?.email ?? null,
    };
    if (!canManage) {
      delete branded.employerCostCents;
      delete branded.employer;
    }
    return {
      ...row,
      payload: branded,
    };
  }

  // ── Reports ───────────────────────────────────────────────────────────

  async summaryReport(schoolId: string, runId: string) {
    const run = await this.getRun(schoolId, runId);
    const byDept = new Map<
      string,
      { department: string; count: number; gross: number; deductions: number; net: number }
    >();
    for (const s of run.snapshots) {
      const key = s.departmentName ?? 'Unassigned';
      const row = byDept.get(key) ?? {
        department: key,
        count: 0,
        gross: 0,
        deductions: 0,
        net: 0,
      };
      row.count += 1;
      row.gross += s.grossCents;
      row.deductions += s.deductionCents;
      row.net += s.netCents;
      byDept.set(key, row);
    }
    return {
      runId,
      status: run.status,
      period: run.period,
      totals: {
        employees: run.snapshots.length,
        grossCents: sumCents(run.snapshots.map((s) => s.grossCents)),
        deductionCents: sumCents(run.snapshots.map((s) => s.deductionCents)),
        netCents: sumCents(run.snapshots.map((s) => s.netCents)),
        employerCostCents: sumCents(
          run.snapshots.map((s) => s.employerCostCents),
        ),
        paidCents: sumCents(
          run.snapshots
            .filter((s) => s.payment?.status === PayrollPaymentStatus.PAID)
            .map((s) => s.netCents),
        ),
      },
      byDepartment: [...byDept.values()],
      employees: run.snapshots.map((s) => ({
        userId: s.userId,
        name: s.employeeName,
        code: s.employeeCode,
        department: s.departmentName,
        position: s.positionName,
        grossCents: s.grossCents,
        deductionCents: s.deductionCents,
        netCents: s.netCents,
        paymentStatus: s.payment?.status ?? 'UNPAID',
      })),
    };
  }

  async exportCsv(schoolId: string, runId: string) {
    const report = await this.summaryReport(schoolId, runId);
    const header =
      'Employee Code,Name,Department,Position,Gross Cents,Deductions Cents,Net Cents,Payment Status\n';
    const rows = report.employees
      .map((e) =>
        [
          e.code,
          `"${e.name.replace(/"/g, '""')}"`,
          `"${(e.department ?? '').replace(/"/g, '""')}"`,
          `"${(e.position ?? '').replace(/"/g, '""')}"`,
          e.grossCents,
          e.deductionCents,
          e.netCents,
          e.paymentStatus,
        ].join(','),
      )
      .join('\n');
    return header + rows;
  }

  dashboard(schoolId: string) {
    return this.prisma.payrollRun.findFirst({
      where: { schoolId, status: { not: PayrollRunStatus.CANCELLED } },
      orderBy: { createdAt: 'desc' },
      include: {
        period: true,
        snapshots: { select: { grossCents: true, deductionCents: true, netCents: true, employerCostCents: true, payment: true } },
      },
    }).then(async (run) => {
      if (!run) {
        return {
          current: null,
          totals: {
            employees: 0,
            grossCents: 0,
            deductionCents: 0,
            netCents: 0,
            employerCostCents: 0,
            paidCents: 0,
            unpaidCents: 0,
          },
        };
      }
      const paid = run.snapshots.filter(
        (s) => s.payment?.status === PayrollPaymentStatus.PAID,
      );
      const unpaid = run.snapshots.filter(
        (s) => s.payment?.status !== PayrollPaymentStatus.PAID,
      );
      return {
        current: {
          runId: run.id,
          status: run.status,
          label: run.period.label,
          startDate: dateKey(run.period.startDate),
          endDate: dateKey(run.period.endDate),
        },
        totals: {
          employees: run.snapshots.length,
          grossCents: sumCents(run.snapshots.map((s) => s.grossCents)),
          deductionCents: sumCents(run.snapshots.map((s) => s.deductionCents)),
          netCents: sumCents(run.snapshots.map((s) => s.netCents)),
          employerCostCents: sumCents(
            run.snapshots.map((s) => s.employerCostCents),
          ),
          paidCents: sumCents(paid.map((s) => s.netCents)),
          unpaidCents: sumCents(unpaid.map((s) => s.netCents)),
        },
      };
    });
  }

  // ── helpers ───────────────────────────────────────────────────────────

  private async assertEditableRun(schoolId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, schoolId },
    });
    if (!run) throw new NotFoundException('Run not found');
    if (
      run.status === PayrollRunStatus.APPROVED ||
      run.status === PayrollRunStatus.PAID ||
      run.status === PayrollRunStatus.CLOSED
    ) {
      throw new BadRequestException('Payroll is locked');
    }
    return run;
  }

  private async audit(
    db: Prisma.TransactionClient | PrismaService,
    schoolId: string,
    actorId: string | null,
    entity: string,
    entityId: string,
    action: string,
    before: unknown,
    after: unknown,
    reason: string | null,
  ) {
    await db.payrollAuditEvent.create({
      data: {
        schoolId,
        actorId,
        entity,
        entityId,
        action,
        beforeJson: before ? JSON.stringify(before) : null,
        afterJson: after ? JSON.stringify(after) : null,
        reason,
      },
    });
  }
}
