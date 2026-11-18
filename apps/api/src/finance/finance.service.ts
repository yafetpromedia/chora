import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  StudentFeeStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ChapaService } from '../payments/chapa.service';
import { DEFAULT_FEE_TYPES } from './finance.constants';
import { AssignGradeFeesDto } from './dto/assign-grade-fees.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateFeeScheduleDto } from './dto/create-fee-schedule.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

export function computeAmountDue(
  totalCents: number,
  discountPercent: number,
  discountCents: number,
): number {
  const afterPercent = Math.round(totalCents * (1 - discountPercent / 100));
  return Math.max(0, afterPercent - discountCents);
}

export function formatEtb(cents: number): string {
  return (cents / 100).toLocaleString('en-ET', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

@Injectable()
export class FinanceService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly chapaService: ChapaService,
  ) {}

  async onModuleInit() {
    // Do not auto-seed demo finance records for a hardcoded school.
  }

  async seedDemoFinance(schoolId: string) {
    const year = await this.ensureCurrentYear(schoolId);
    await this.ensureDefaultFeeTypes(schoolId);

    const tuition = await this.prisma.feeType.findFirst({
      where: { schoolId, code: 'TUITION' },
    });
    const transport = await this.prisma.feeType.findFirst({
      where: { schoolId, code: 'TRANSPORT' },
    });
    if (!tuition || !transport) return;

    const grade1 = await this.prisma.grade.findFirst({
      where: { schoolId, name: 'Grade 1' },
    });

    if (grade1) {
      const existing = await this.prisma.feeSchedule.count({
        where: { schoolId, academicYearId: year.id, gradeId: grade1.id },
      });
      if (existing === 0) {
        await this.createSchedule(schoolId, {
          feeTypeId: tuition.id,
          academicYearId: year.id,
          gradeId: grade1.id,
          amountCents: 300_000,
          frequency: 'MONTHLY',
          installmentCount: 1,
          description: 'Grade 1 monthly tuition',
        });
        await this.createSchedule(schoolId, {
          feeTypeId: transport.id,
          academicYearId: year.id,
          gradeId: grade1.id,
          amountCents: 50_000,
          frequency: 'MONTHLY',
          installmentCount: 1,
        });

        const tuitionSchedule = await this.prisma.feeSchedule.findFirst({
          where: {
            schoolId,
            gradeId: grade1.id,
            feeTypeId: tuition.id,
          },
          include: { feeType: true },
        });
        if (tuitionSchedule) {
          const due = new Date();
          due.setMonth(due.getMonth() + 1);
          await this.assignGradeFees(schoolId, {
            feeScheduleId: tuitionSchedule.id,
            gradeId: grade1.id,
            dueDate: due.toISOString().slice(0, 10),
          });
        }
      }
    }
  }

  async ensureCurrentYear(schoolId: string) {
    let year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!year) {
      const now = new Date();
      const start = new Date(now.getFullYear(), 8, 1);
      const end = new Date(now.getFullYear() + 1, 6, 30);
      year = await this.prisma.academicYear.create({
        data: {
          schoolId,
          name: `${now.getFullYear()}/${now.getFullYear() + 1}`,
          startDate: start,
          endDate: end,
          isCurrent: true,
        },
      });
    }
    return year;
  }

  async ensureDefaultFeeTypes(schoolId: string) {
    for (const ft of DEFAULT_FEE_TYPES) {
      await this.prisma.feeType.upsert({
        where: { schoolId_code: { schoolId, code: ft.code } },
        create: { schoolId, code: ft.code, name: ft.name },
        update: { name: ft.name, isActive: true },
      });
    }
    return this.prisma.feeType.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listYears(schoolId: string) {
    return this.prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
    });
  }

  async createYear(schoolId: string, dto: CreateAcademicYearDto) {
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { schoolId },
        data: { isCurrent: false },
      });
    }
    return this.prisma.academicYear.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  listFeeTypes(schoolId: string) {
    return this.prisma.feeType.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  listSchedules(schoolId: string, academicYearId?: string) {
    return this.prisma.feeSchedule.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        feeType: true,
        academicYear: true,
        grade: { select: { id: true, name: true, sortOrder: true } },
      },
      orderBy: [{ grade: { sortOrder: 'asc' } }, { feeType: { name: 'asc' } }],
    });
  }

  private async resolveGradesInRange(
    schoolId: string,
    fromId?: string,
    toId?: string,
  ) {
    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, sortOrder: true },
    });
    if (grades.length === 0) {
      throw new BadRequestException('No grades configured for this school');
    }
    if (!fromId && !toId) {
      return grades;
    }
    const from = grades.find((g) => g.id === (fromId ?? toId));
    const to = grades.find((g) => g.id === (toId ?? fromId));
    if (!from || !to) {
      throw new BadRequestException('Invalid grade range');
    }
    const min = Math.min(from.sortOrder, to.sortOrder);
    const max = Math.max(from.sortOrder, to.sortOrder);
    return grades.filter((g) => g.sortOrder >= min && g.sortOrder <= max);
  }

  private scheduleCreateData(schoolId: string, dto: CreateFeeScheduleDto, gradeId: string | null) {
    return {
      schoolId,
      feeTypeId: dto.feeTypeId,
      academicYearId: dto.academicYearId,
      gradeId,
      sectionId: dto.sectionId ?? null,
      amountCents: dto.amountCents,
      frequency: dto.frequency ?? 'ONE_TIME',
      installmentCount: dto.installmentCount ?? 1,
      description: dto.description?.trim() ?? null,
    };
  }

  async createSchedule(schoolId: string, dto: CreateFeeScheduleDto) {
    const include = { feeType: true, grade: true } as const;

    if (dto.gradeFromId || dto.gradeToId) {
      const grades = await this.resolveGradesInRange(
        schoolId,
        dto.gradeFromId,
        dto.gradeToId,
      );
      const schedules = [];
      for (const grade of grades) {
        const row = await this.prisma.feeSchedule.create({
          data: this.scheduleCreateData(schoolId, dto, grade.id),
          include,
        });
        schedules.push(row);
      }
      return { created: schedules.length, schedules };
    }

    const row = await this.prisma.feeSchedule.create({
      data: this.scheduleCreateData(schoolId, dto, dto.gradeId ?? null),
      include,
    });
    return { created: 1, schedules: [row] };
  }

  async assignGradeFees(schoolId: string, dto: AssignGradeFeesDto) {
    await this.subscriptionsService.assertActive(schoolId);

    const schedule = await this.prisma.feeSchedule.findFirst({
      where: { id: dto.feeScheduleId, schoolId },
      include: { feeType: true },
    });
    if (!schedule) {
      throw new NotFoundException('Fee schedule not found');
    }

    let gradeIds: string[];
    if (dto.gradeFromId || dto.gradeToId) {
      const grades = await this.resolveGradesInRange(
        schoolId,
        dto.gradeFromId,
        dto.gradeToId,
      );
      gradeIds = grades.map((g) => g.id);
    } else if (dto.gradeId) {
      gradeIds = [dto.gradeId];
    } else {
      throw new BadRequestException('Select a grade or grade range');
    }

    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId: { in: gradeIds },
        ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
      },
    });

    const dueDate = new Date(dto.dueDate);
    let created = 0;

    for (const student of students) {
      const exists = await this.prisma.studentFee.findFirst({
        where: {
          studentProfileId: student.id,
          feeScheduleId: schedule.id,
        },
      });
      if (exists) continue;

      await this.createStudentFeeFromSchedule(
        schoolId,
        student.id,
        schedule,
        dueDate,
      );
      created += 1;
    }

    return {
      assigned: created,
      students: students.length,
      grades: gradeIds.length,
    };
  }

  private async createStudentFeeFromSchedule(
    schoolId: string,
    studentProfileId: string,
    schedule: {
      id: string;
      feeTypeId: string;
      academicYearId: string;
      amountCents: number;
      installmentCount: number;
      feeType: { name: string };
    },
    dueDate: Date,
    discountPercent = 0,
    discountCents = 0,
    isScholarship = false,
  ) {
    const amountDueCents = computeAmountDue(
      schedule.amountCents,
      discountPercent,
      discountCents,
    );
    const status = isScholarship
      ? StudentFeeStatus.SCHOLARSHIP
      : StudentFeeStatus.PENDING;

    const fee = await this.prisma.studentFee.create({
      data: {
        schoolId,
        studentProfileId,
        feeTypeId: schedule.feeTypeId,
        academicYearId: schedule.academicYearId,
        feeScheduleId: schedule.id,
        label: schedule.feeType.name,
        totalAmountCents: schedule.amountCents,
        discountPercent,
        discountCents,
        amountDueCents,
        dueDate,
        status,
        isScholarship,
      },
    });

    const count = schedule.installmentCount;
    if (count > 1) {
      const perInstallment = Math.floor(amountDueCents / count);
      const remainder = amountDueCents - perInstallment * count;
      for (let i = 0; i < count; i++) {
        const amount = perInstallment + (i === count - 1 ? remainder : 0);
        const instDue = new Date(dueDate);
        instDue.setMonth(instDue.getMonth() + i);
        await this.prisma.feeInstallment.create({
          data: {
            studentFeeId: fee.id,
            number: i + 1,
            amountCents: amount,
            dueDate: instDue,
            status,
          },
        });
      }
    }

    return fee;
  }

  async recalcFeeStatus(studentFeeId: string) {
    const fee = await this.prisma.studentFee.findUnique({
      where: { id: studentFeeId },
      include: { installments: true },
    });
    if (!fee) return;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let status: StudentFeeStatus;
    if (fee.isScholarship && fee.paidAmountCents === 0) {
      status = StudentFeeStatus.SCHOLARSHIP;
    } else if (fee.paidAmountCents >= fee.amountDueCents) {
      status = StudentFeeStatus.PAID;
    } else if (fee.paidAmountCents > 0) {
      status = StudentFeeStatus.PARTIAL;
    } else if (fee.dueDate < today) {
      status = StudentFeeStatus.OVERDUE;
    } else {
      status = StudentFeeStatus.PENDING;
    }

    await this.prisma.studentFee.update({
      where: { id: studentFeeId },
      data: { status },
    });

    for (const inst of fee.installments) {
      let instStatus: StudentFeeStatus;
      if (inst.paidAmountCents >= inst.amountCents) {
        instStatus = StudentFeeStatus.PAID;
      } else if (inst.paidAmountCents > 0) {
        instStatus = StudentFeeStatus.PARTIAL;
      } else if (inst.dueDate < today) {
        instStatus = StudentFeeStatus.OVERDUE;
      } else {
        instStatus = StudentFeeStatus.PENDING;
      }
      await this.prisma.feeInstallment.update({
        where: { id: inst.id },
        data: { status: instStatus },
      });
    }
  }

  async getStudentFinanceSummary(schoolId: string, studentProfileId: string) {
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

    const fees = await this.prisma.studentFee.findMany({
      where: { schoolId, studentProfileId },
      include: {
        feeType: true,
        installments: { orderBy: { number: 'asc' } },
      },
      orderBy: { dueDate: 'desc' },
    });

    const payments = await this.prisma.payment.findMany({
      where: { schoolId, studentProfileId, status: PaymentStatus.COMPLETED },
      orderBy: { paidAt: 'desc' },
      take: 20,
    });

    const totalDue = fees.reduce((s, f) => s + f.amountDueCents, 0);
    const totalPaid = fees.reduce((s, f) => s + f.paidAmountCents, 0);
    const outstanding = totalDue - totalPaid;

    return {
      student: {
        profileId: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        grade: profile.grade.name,
        section: profile.section?.name ?? null,
      },
      totalDueCents: totalDue,
      totalPaidCents: totalPaid,
      outstandingCents: outstanding,
      fees: fees.map((f) => ({
        id: f.id,
        label: f.label,
        feeType: f.feeType.name,
        totalAmountCents: f.totalAmountCents,
        amountDueCents: f.amountDueCents,
        paidAmountCents: f.paidAmountCents,
        balanceCents: f.amountDueCents - f.paidAmountCents,
        dueDate: f.dueDate,
        status: f.status,
        discountPercent: f.discountPercent,
        discountCents: f.discountCents,
        isScholarship: f.isScholarship,
        installments: f.installments,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amountCents: p.amountCents,
        method: p.method,
        paidAt: p.paidAt,
        reference: p.reference,
      })),
    };
  }

  async recordPayment(
    schoolId: string,
    dto: RecordPaymentDto,
    recordedBy: string,
  ) {
    await this.subscriptionsService.assertActive(schoolId);

    const allocSum = dto.allocations.reduce((s, a) => s + a.amountCents, 0);
    if (allocSum !== dto.amountCents) {
      throw new BadRequestException(
        'Allocation total must match payment amount',
      );
    }

    const receiptNumber = await this.nextReceiptNumber(schoolId);

    const touchedFeeIds = new Set<string>();

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          schoolId,
          studentProfileId: dto.studentProfileId,
          receiptNumber,
          amountCents: dto.amountCents,
          method: dto.method as PaymentMethod,
          status: PaymentStatus.COMPLETED,
          reference: dto.reference?.trim() ?? null,
          notes: dto.notes?.trim() ?? null,
          recordedBy,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });

      for (const alloc of dto.allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: p.id,
            studentFeeId: alloc.studentFeeId ?? null,
            installmentId: alloc.installmentId ?? null,
            amountCents: alloc.amountCents,
          },
        });

        if (alloc.installmentId) {
          const inst = await tx.feeInstallment.findUnique({
            where: { id: alloc.installmentId },
          });
          if (inst) {
            await tx.feeInstallment.update({
              where: { id: inst.id },
              data: {
                paidAmountCents: inst.paidAmountCents + alloc.amountCents,
              },
            });
            await tx.studentFee.update({
              where: { id: inst.studentFeeId },
              data: { paidAmountCents: { increment: alloc.amountCents } },
            });
            touchedFeeIds.add(inst.studentFeeId);
          }
        } else if (alloc.studentFeeId) {
          await tx.studentFee.update({
            where: { id: alloc.studentFeeId },
            data: { paidAmountCents: { increment: alloc.amountCents } },
          });
          touchedFeeIds.add(alloc.studentFeeId);
        }
      }

      return p;
    });

    for (const feeId of touchedFeeIds) {
      await this.recalcFeeStatus(feeId);
    }

    return this.getPaymentReceipt(schoolId, payment.id);
  }

  async getPaymentReceipt(schoolId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
          },
        },
        allocations: {
          include: {
            studentFee: { include: { feeType: true } },
            installment: true,
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const summary = await this.getStudentFinanceSummary(
      schoolId,
      payment.studentProfileId,
    );

    return {
      receiptNumber: payment.receiptNumber,
      studentName: `${payment.studentProfile.user.firstName} ${payment.studentProfile.user.lastName}`,
      grade: payment.studentProfile.grade.name,
      amountCents: payment.amountCents,
      method: payment.method,
      paidAt: payment.paidAt,
      reference: payment.reference,
      balanceRemainingCents: summary.outstandingCents,
      allocations: payment.allocations,
    };
  }

  private async nextReceiptNumber(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `C1-${year}-`;
    const last = await this.prisma.payment.findFirst({
      where: {
        schoolId,
        receiptNumber: { startsWith: prefix },
      },
      orderBy: { receiptNumber: 'desc' },
    });
    let seq = 1;
    if (last) {
      const part = last.receiptNumber.slice(prefix.length);
      seq = parseInt(part, 10) + 1;
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  async getAnalytics(schoolId: string, month?: string) {
    const now = month ? new Date(`${month}-01`) : new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [fees, paymentsInMonth, allPayments] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { schoolId },
        select: {
          amountDueCents: true,
          paidAmountCents: true,
          status: true,
          studentProfileId: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          schoolId,
          status: PaymentStatus.COMPLETED,
          paidAt: { gte: start, lte: end },
        },
        _sum: { amountCents: true },
      }),
      this.prisma.payment.findMany({
        where: { schoolId, status: PaymentStatus.COMPLETED },
        select: { studentProfileId: true },
      }),
    ]);

    const expectedRevenue = fees.reduce((s, f) => s + f.amountDueCents, 0);
    const collected = fees.reduce((s, f) => s + f.paidAmountCents, 0);
    const outstanding = expectedRevenue - collected;

    const paidStudentIds = new Set(
      fees.filter((f) => f.status === StudentFeeStatus.PAID).map((f) => f.studentProfileId),
    );
    const studentsWithFees = new Set(fees.map((f) => f.studentProfileId));
    const overdueCount = fees.filter(
      (f) => f.status === StudentFeeStatus.OVERDUE,
    ).length;

    const paidProfiles = new Set(allPayments.map((p) => p.studentProfileId));

    return {
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      expectedRevenueCents: expectedRevenue,
      collectedCents: collected,
      outstandingCents: outstanding,
      collectedThisMonthCents: paymentsInMonth._sum.amountCents ?? 0,
      paidStudents: paidProfiles.size,
      unpaidStudents: Math.max(0, studentsWithFees.size - paidProfiles.size),
      overdueFeesCount: overdueCount,
    };
  }

  async exportCsv(schoolId: string, from: string, to: string) {
    const fees = await this.prisma.studentFee.findMany({
      where: {
        schoolId,
        dueDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
          },
        },
        feeType: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const header =
      'Student,Grade,Fee,Amount Due (ETB),Paid (ETB),Balance (ETB),Due Date,Status\n';
    const rows = fees
      .map((f) => {
        const name = `${f.studentProfile.user.firstName} ${f.studentProfile.user.lastName}`;
        const balance = (f.amountDueCents - f.paidAmountCents) / 100;
        return `"${name}",${f.studentProfile.grade.name},${f.feeType.name},${f.amountDueCents / 100},${f.paidAmountCents / 100},${balance},${f.dueDate.toISOString().slice(0, 10)},${f.status}`;
      })
      .join('\n');
    return header + rows;
  }

  async sendReminders(schoolId: string, daysBeforeDue = 3) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const target = new Date(today);
    target.setDate(target.getDate() + daysBeforeDue);

    const fees = await this.prisma.studentFee.findMany({
      where: {
        schoolId,
        dueDate: target,
        status: { in: [StudentFeeStatus.PENDING, StudentFeeStatus.PARTIAL, StudentFeeStatus.OVERDUE] },
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            parents: { select: { parentId: true } },
          },
        },
        feeType: true,
      },
    });

    let sent = 0;
    for (const fee of fees) {
      const balance = fee.amountDueCents - fee.paidAmountCents;
      const parentIds = [...new Set(fee.studentProfile.parents.map((p) => p.parentId))];
      if (parentIds.length === 0) continue;

      const title = `Fee reminder: ${fee.feeType.name}`;
      const body = `Tuition/fee for ${fee.studentProfile.user.firstName} is due in ${daysBeforeDue} days.\n\nOutstanding balance: ${formatEtb(balance)} ETB`;

      await this.prisma.parentNotification.createMany({
        data: parentIds.map((parentId) => ({
          schoolId,
          parentId,
          studentProfileId: fee.studentProfileId,
          title,
          body,
        })),
      });
      sent += parentIds.length;
    }

    return { remindersSent: sent, feesDue: fees.length };
  }

  async parentOverview(parentId: string, schoolId: string) {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
          },
        },
      },
    });

    const children = await Promise.all(
      links
        .filter((l) => l.student.schoolId === schoolId)
        .map(async (l) => {
          const summary = await this.getStudentFinanceSummary(
            schoolId,
            l.student.id,
          );
          return {
            profileId: l.student.id,
            name: summary.student.name,
            grade: summary.student.grade,
            outstandingCents: summary.outstandingCents,
            totalPaidCents: summary.totalPaidCents,
          };
        }),
    );

    const totalDue = children.reduce((s, c) => s + c.outstandingCents, 0);

    return { totalDueCents: totalDue, children };
  }

  async parentFeesDue(parentId: string, schoolId: string, studentProfileId: string) {
    await this.assertParentAccess(parentId, studentProfileId);
    const [summary, school, pendingPayments] = await Promise.all([
      this.getStudentFinanceSummary(schoolId, studentProfileId),
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          bankName: true,
          bankAccountHolder: true,
          bankAccountNumber: true,
          telebirrNumber: true,
          telebirrAccountName: true,
          paymentInstructions: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          schoolId,
          studentProfileId,
          status: PaymentStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          receiptNumber: true,
          amountCents: true,
          method: true,
          reference: true,
          createdAt: true,
        },
      }),
    ]);

    const dueItems = summary.fees
      .filter((f) => f.balanceCents > 0)
      .map((f) => ({
        id: f.id,
        label: f.label,
        amountCents: f.balanceCents,
        dueDate: f.dueDate,
        status: f.status,
      }));

    const hasBank =
      !!school?.bankName?.trim() && !!school?.bankAccountNumber?.trim();
    const hasTelebirr = !!school?.telebirrNumber?.trim();
    const chapaEnabled = this.chapaService.isLiveEnabled();
    const methods = [
      ...(hasTelebirr ? (['TELEBIRR'] as const) : []),
      ...(hasBank ? (['BANK_TRANSFER'] as const) : []),
      ...(chapaEnabled ? (['CHAPA'] as const) : []),
    ];

    const note =
      school?.paymentInstructions?.trim() ||
      (hasTelebirr
        ? 'Send the fee with Telebirr (or bank transfer), then submit the transaction ID and a screenshot. Finance verifies and issues a receipt.'
        : 'Transfer to the school account below, then submit your reference number and payment screenshot. Finance will verify and issue a receipt.');

    return {
      student: summary.student,
      items: dueItems,
      totalDueCents: dueItems.reduce((s, i) => s + i.amountCents, 0),
      pendingSubmissions: pendingPayments,
      paymentInstructions: {
        methods,
        note,
        steps: [
          'Choose Telebirr or CBE / bank transfer.',
          'Send the fee, then open the Successful / Thank you receipt.',
          'Copy the Transaction Number (Telebirr, e.g. DHR97D11WZ) or Transaction ID (CBE, e.g. FT26239YHGVN).',
          'Upload a screenshot of that receipt and submit.',
          'Finance matches the screenshot, then issues the school receipt.',
        ],
        bank: hasBank
          ? {
              bankName: school!.bankName!,
              accountHolder: school!.bankAccountHolder ?? school!.bankName!,
              accountNumber: school!.bankAccountNumber!,
            }
          : null,
        telebirr: hasTelebirr
          ? {
              number: school!.telebirrNumber!,
              accountName:
                school!.telebirrAccountName?.trim() ||
                school!.bankAccountHolder?.trim() ||
                'School Telebirr',
            }
          : null,
      },
    };
  }

  async initializeChapaPayment(
    parentId: string,
    schoolId: string,
    studentProfileId: string,
    amountCents: number,
  ) {
    if (!this.chapaService.isLiveEnabled()) {
      throw new BadRequestException('Chapa online payments are not enabled');
    }

    await this.assertParentAccess(parentId, studentProfileId);
    await this.subscriptionsService.assertActive(schoolId);

    const [parent, school, summary] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: parentId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      }),
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      }),
      this.getStudentFinanceSummary(schoolId, studentProfileId),
    ]);

    if (!parent) {
      throw new NotFoundException('Parent account not found');
    }
    if (amountCents > summary.outstandingCents) {
      throw new BadRequestException(
        `Amount cannot exceed outstanding balance (${formatEtb(summary.outstandingCents)})`,
      );
    }

    const receiptNumber = await this.nextReceiptNumber(schoolId);
    const txRef = `C1-${receiptNumber}`;

    const payment = await this.prisma.payment.create({
      data: {
        schoolId,
        studentProfileId,
        receiptNumber,
        amountCents,
        method: PaymentMethod.CHAPA,
        status: PaymentStatus.PENDING,
        reference: txRef,
        submittedBy: parentId,
        notes: 'Chapa online payment — awaiting confirmation',
      },
    });

    const webAppUrl = process.env.WEB_APP_URL?.trim() || 'http://localhost:3000';
    const apiUrl = process.env.API_PUBLIC_URL?.trim() || 'http://localhost:3001';
    const phone = this.normalizeEthiopianPhone(parent.phone);

    let checkout_url: string;
    try {
      ({ checkout_url } = await this.chapaService.initializeTransaction({
      amount: String(amountCents / 100),
      currency: 'ETB',
      email: parent.email,
      first_name: parent.firstName,
      last_name: parent.lastName,
      ...(phone ? { phone_number: phone } : {}),
      tx_ref: txRef,
      callback_url: `${apiUrl}/payments/chapa/callback`,
      return_url: `${webAppUrl}/parent/fees?chapa_return=1&tx_ref=${encodeURIComponent(txRef)}`,
      customization: {
        title: school?.name ?? 'School fee payment',
        description: `Fee payment for ${summary.student.name}`,
      },
    }));
    } catch (err) {
      await this.prisma.payment.delete({ where: { id: payment.id } });
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Chapa checkout could not be started',
      );
    }

    return {
      checkoutUrl: checkout_url,
      txRef,
      receiptNumber,
      message: 'Redirecting to Chapa checkout…',
    };
  }

  async verifyChapaPaymentForParent(parentId: string, txRef: string) {
    const payment = await this.findChapaPaymentByTxRef(txRef, parentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        status: 'COMPLETED',
        receiptNumber: payment.receiptNumber,
        message: 'Payment confirmed. Receipt is ready.',
        receipt: await this.getPaymentReceipt(payment.schoolId, payment.id),
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is no longer pending');
    }

    const receipt = await this.completeChapaPayment(txRef);
    return {
      status: 'COMPLETED',
      receiptNumber: payment.receiptNumber,
      message: 'Payment confirmed. Thank you!',
      receipt,
    };
  }

  async completeChapaPayment(txRef: string) {
    const payment = await this.findChapaPaymentByTxRef(txRef);
    if (!payment) {
      throw new NotFoundException('Chapa payment not found');
    }
    if (payment.status === PaymentStatus.COMPLETED) {
      return this.getPaymentReceipt(payment.schoolId, payment.id);
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not pending');
    }

    const verified = await this.chapaService.verifyTransaction(txRef);
    if (verified.status !== 'success') {
      throw new BadRequestException('Chapa payment was not successful');
    }

    const paidCents = Math.round(parseFloat(verified.amount) * 100);
    if (paidCents !== payment.amountCents) {
      throw new BadRequestException('Paid amount does not match expected fee');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        reference: `${txRef}|${verified.reference}`,
        notes: `Chapa payment confirmed (ref ${verified.reference})`,
      },
    });

    return this.approvePendingPayment(
      payment.schoolId,
      payment.id,
      payment.submittedBy ?? 'chapa',
    );
  }

  private findChapaPaymentByTxRef(txRef: string, parentId?: string) {
    return this.prisma.payment.findFirst({
      where: {
        method: PaymentMethod.CHAPA,
        ...(parentId ? { submittedBy: parentId } : {}),
        OR: [
          { reference: txRef },
          { reference: { startsWith: `${txRef}|` } },
        ],
      },
    });
  }

  private normalizeEthiopianPhone(phone: string | null | undefined): string | null {
    if (!phone?.trim()) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && /^0[79]/.test(digits)) return digits;
    if (digits.length === 12 && digits.startsWith('251')) {
      return `0${digits.slice(3)}`;
    }
    return null;
  }

  async submitParentPayment(
    parentId: string,
    schoolId: string,
    studentProfileId: string,
    input: {
      amountCents: number;
      reference: string;
      method?: 'BANK_TRANSFER' | 'TELEBIRR';
      proofUrl?: string;
      notes?: string;
    },
  ) {
    await this.assertParentAccess(parentId, studentProfileId);
    await this.subscriptionsService.assertActive(schoolId);

    const method =
      input.method === 'TELEBIRR'
        ? PaymentMethod.TELEBIRR
        : PaymentMethod.BANK_TRANSFER;

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        bankName: true,
        bankAccountNumber: true,
        telebirrNumber: true,
      },
    });
    if (method === PaymentMethod.TELEBIRR && !school?.telebirrNumber?.trim()) {
      throw new BadRequestException(
        'This school has not published a Telebirr number yet',
      );
    }
    if (
      method === PaymentMethod.BANK_TRANSFER &&
      !(school?.bankName?.trim() && school?.bankAccountNumber?.trim())
    ) {
      throw new BadRequestException(
        'This school has not published a bank account yet',
      );
    }
    if (!input.proofUrl?.trim()) {
      throw new BadRequestException(
        'Upload the Successful / Thank you receipt screenshot',
      );
    }
    const proof = input.proofUrl.trim();
    if (
      !/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(proof) &&
      !/^https:\/\//i.test(proof)
    ) {
      throw new BadRequestException('Receipt must be an image upload or an https link');
    }

    const summary = await this.getStudentFinanceSummary(
      schoolId,
      studentProfileId,
    );
    if (input.amountCents > summary.outstandingCents) {
      throw new BadRequestException(
        `Amount cannot exceed outstanding balance (${formatEtb(summary.outstandingCents)})`,
      );
    }

    const receiptNumber = await this.nextReceiptNumber(schoolId);
    const methodLabel =
      method === PaymentMethod.TELEBIRR ? 'Telebirr' : 'bank transfer';

    const payment = await this.prisma.payment.create({
      data: {
        schoolId,
        studentProfileId,
        receiptNumber,
        amountCents: input.amountCents,
        method,
        status: PaymentStatus.PENDING,
        reference: input.reference.trim(),
        proofUrl: input.proofUrl?.trim() || null,
        submittedBy: parentId,
        notes:
          input.notes?.trim() ||
          `Parent ${methodLabel} — awaiting finance verification`,
      },
    });

    return {
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      status: 'PENDING',
      message:
        'Payment submitted for verification. You will receive an in-app notification when finance approves it.',
    };
  }

  /** @deprecated use submitParentPayment */
  async createPendingPayment(
    parentId: string,
    schoolId: string,
    studentProfileId: string,
    amountCents: number,
    method: PaymentMethod,
  ) {
    return this.submitParentPayment(parentId, schoolId, studentProfileId, {
      amountCents,
      reference: `PAY-${Date.now()}`,
      notes: `Method: ${method}`,
    });
  }

  async listPendingPayments(schoolId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { schoolId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
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

    return rows.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amountCents: p.amountCents,
      method: p.method,
      reference: p.reference,
      proofUrl: p.proofUrl,
      notes: p.notes,
      submittedAt: p.createdAt,
      student: {
        profileId: p.studentProfileId,
        name: `${p.studentProfile.user.firstName} ${p.studentProfile.user.lastName}`,
        grade: p.studentProfile.grade.name,
        section: p.studentProfile.section?.name ?? null,
      },
    }));
  }

  async approvePendingPayment(
    schoolId: string,
    paymentId: string,
    recordedBy: string,
  ) {
    await this.subscriptionsService.assertActive(schoolId);

    const pending = await this.prisma.payment.findFirst({
      where: { id: paymentId, schoolId, status: PaymentStatus.PENDING },
    });
    if (!pending) {
      throw new NotFoundException('Pending payment not found');
    }

    const summary = await this.getStudentFinanceSummary(
      schoolId,
      pending.studentProfileId,
    );
    const allocations = this.buildAutoAllocations(
      summary.fees.filter((f) => f.balanceCents > 0),
      pending.amountCents,
    );

    if (allocations.length === 0) {
      throw new BadRequestException('No outstanding fees to apply this payment to');
    }

    const allocSum = allocations.reduce((s, a) => s + a.amountCents, 0);
    if (allocSum !== pending.amountCents) {
      throw new BadRequestException(
        'Payment amount does not match allocatable fee balances',
      );
    }

    const touchedFeeIds = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: pending.id },
        data: {
          status: PaymentStatus.COMPLETED,
          recordedBy,
          paidAt: new Date(),
        },
      });

      for (const alloc of allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: pending.id,
            studentFeeId: alloc.studentFeeId,
            amountCents: alloc.amountCents,
          },
        });
        await tx.studentFee.update({
          where: { id: alloc.studentFeeId },
          data: { paidAmountCents: { increment: alloc.amountCents } },
        });
        touchedFeeIds.add(alloc.studentFeeId);
      }
    });

    for (const feeId of touchedFeeIds) {
      await this.recalcFeeStatus(feeId);
    }

    await this.notifyParentPaymentApproved(
      schoolId,
      pending.studentProfileId,
      pending.amountCents,
      pending.receiptNumber,
    );

    return this.getPaymentReceipt(schoolId, pending.id);
  }

  async rejectPendingPayment(
    schoolId: string,
    paymentId: string,
    recordedBy: string,
    reason?: string,
  ) {
    const pending = await this.prisma.payment.findFirst({
      where: { id: paymentId, schoolId, status: PaymentStatus.PENDING },
    });
    if (!pending) {
      throw new NotFoundException('Pending payment not found');
    }

    await this.prisma.payment.update({
      where: { id: pending.id },
      data: {
        status: PaymentStatus.FAILED,
        recordedBy,
        notes: reason?.trim()
          ? `Rejected: ${reason.trim()}`
          : 'Rejected by finance office',
      },
    });

    return { id: pending.id, status: 'FAILED' };
  }

  private buildAutoAllocations(
    fees: { id: string; balanceCents: number; dueDate: Date | string }[],
    amountCents: number,
  ): { studentFeeId: string; amountCents: number }[] {
    const sorted = [...fees].sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
    let remaining = amountCents;
    const allocations: { studentFeeId: string; amountCents: number }[] = [];
    for (const fee of sorted) {
      if (remaining <= 0) break;
      const alloc = Math.min(remaining, fee.balanceCents);
      if (alloc > 0) {
        allocations.push({ studentFeeId: fee.id, amountCents: alloc });
        remaining -= alloc;
      }
    }
    if (remaining > 0) {
      throw new BadRequestException(
        'Payment amount exceeds outstanding fee balances',
      );
    }
    return allocations;
  }

  private async notifyParentPaymentApproved(
    schoolId: string,
    studentProfileId: string,
    amountCents: number,
    receiptNumber: string,
  ) {
    const links = await this.prisma.parentStudent.findMany({
      where: { studentId: studentProfileId },
      select: { parentId: true },
    });
    if (links.length === 0) return;

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const name = student
      ? `${student.user.firstName} ${student.user.lastName}`
      : 'your child';

    await this.prisma.parentNotification.createMany({
      data: links.map((l) => ({
        schoolId,
        parentId: l.parentId,
        studentProfileId,
        title: 'Payment confirmed',
        body: `${formatEtb(amountCents)} for ${name} was verified.\nReceipt #: ${receiptNumber}`,
      })),
    });
  }

  private async assertParentAccess(parentId: string, studentProfileId: string) {
    const link = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: { parentId, studentId: studentProfileId },
      },
    });
    if (!link) {
      throw new NotFoundException('Student not linked to this parent');
    }
  }

  async assertParentCanViewStudent(
    role: string,
    userId: string,
    schoolId: string,
    studentProfileId: string,
  ) {
    if (role === 'admin' || role === 'teacher') return;
    if (role === 'student') {
      const profile = await this.prisma.studentProfile.findFirst({
        where: { id: studentProfileId, userId, schoolId },
      });
      if (!profile) throw new NotFoundException('Student not found');
      return;
    }
    if (role === 'parent') {
      await this.assertParentAccess(userId, studentProfileId);
      return;
    }
    throw new NotFoundException('Not allowed');
  }
}
