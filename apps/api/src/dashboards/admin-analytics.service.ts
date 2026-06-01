import { Injectable } from '@nestjs/common';
import { AttendanceStatus, UserRole } from '@prisma/client';
import { AttendanceService } from '../attendance/attendance.service';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';

function dayUtc(offsetDays = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d;
}

function isPresent(status: AttendanceStatus) {
  return (
    status === AttendanceStatus.present ||
    status === AttendanceStatus.late ||
    status === AttendanceStatus.excused
  );
}

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendance: AttendanceService,
    private readonly finance: FinanceService,
  ) {}

  async getOverview(schoolId: string) {
    const [attendanceToday, finance, userCounts, totalStudents, trend] =
      await Promise.all([
        this.attendance.getAnalytics(schoolId),
        this.finance.getAnalytics(schoolId).catch(() => null),
        this.prisma.user.groupBy({
          by: ['role'],
          where: { schoolId },
          _count: { _all: true },
        }),
        this.prisma.studentProfile.count({ where: { schoolId } }),
        this.buildAttendanceTrend(schoolId, 7),
      ]);

    const byRole = Object.fromEntries(
      userCounts.map((r) => [r.role, r._count._all]),
    ) as Record<string, number>;

    const gradeRates = await this.gradeRatesToday(schoolId);

    const collected = finance?.collectedCents ?? 0;
    const outstanding = finance?.outstandingCents ?? 0;
    const financeTotal = collected + outstanding;

    return {
      attendanceToday: {
        rate: attendanceToday.todayRate,
        marked: attendanceToday.markedToday,
        present: attendanceToday.presentToday,
        absent: attendanceToday.absentToday,
        totalStudents: attendanceToday.totalStudents || totalStudents,
      },
      attendanceTrend: trend,
      gradeAttendance: gradeRates,
      enrollment: {
        students: totalStudents,
        teachers: byRole[UserRole.teacher] ?? 0,
        parents: byRole[UserRole.parent] ?? 0,
        staff: byRole[UserRole.staff] ?? 0,
        admins: byRole[UserRole.admin] ?? 0,
        portalTotal:
          (byRole[UserRole.admin] ?? 0) +
          (byRole[UserRole.staff] ?? 0) +
          (byRole[UserRole.teacher] ?? 0) +
          (byRole[UserRole.student] ?? 0) +
          (byRole[UserRole.parent] ?? 0),
      },
      finance: finance
        ? {
            collectedCents: finance.collectedCents,
            outstandingCents: finance.outstandingCents,
            expectedCents: finance.expectedRevenueCents,
            collectedThisMonthCents: finance.collectedThisMonthCents,
            paidStudents: finance.paidStudents,
            unpaidStudents: finance.unpaidStudents,
            overdueFeesCount: finance.overdueFeesCount,
            collectionRate:
              financeTotal > 0
                ? Math.round((collected / financeTotal) * 100)
                : 0,
          }
        : null,
      insights: {
        mostAbsentGrade: attendanceToday.mostAbsentGrade,
        mostPunctualGrade: attendanceToday.mostPunctualGrade,
      },
    };
  }

  private async buildAttendanceTrend(schoolId: string, days: number) {
    const out: {
      date: string;
      weekday: string;
      rate: number | null;
      marked: number;
      present: number;
      absent: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = dayUtc(i);
      const records = await this.prisma.attendanceRecord.findMany({
        where: { schoolId, date: d, periodNumber: 0 },
        select: { status: true },
      });
      const marked = records.length;
      const present = records.filter((r) => isPresent(r.status)).length;
      const absent = records.filter(
        (r) => r.status === AttendanceStatus.absent,
      ).length;
      out.push({
        date: d.toISOString().slice(0, 10),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        rate: marked > 0 ? Math.round((present / marked) * 100) : null,
        marked,
        present,
        absent,
      });
    }
    return out;
  }

  private async gradeRatesToday(schoolId: string) {
    const d = dayUtc(0);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, date: d, periodNumber: 0 },
      include: {
        studentProfile: {
          include: { grade: { select: { name: true } } },
        },
      },
    });

    const byGrade = new Map<string, { present: number; total: number }>();
    for (const r of records) {
      const name = r.studentProfile.grade.name;
      const bucket = byGrade.get(name) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if (isPresent(r.status)) bucket.present += 1;
      byGrade.set(name, bucket);
    }

    return [...byGrade.entries()]
      .map(([grade, b]) => ({
        grade,
        rate: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
        marked: b.total,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 6);
  }
}
