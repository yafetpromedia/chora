import { Injectable } from '@nestjs/common';
import { AttendanceStatus, UserRole } from '@prisma/client';
import { AttendanceService } from '../attendance/attendance.service';
import { StaffAttendanceService } from '../staff-attendance/staff-attendance.service';
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
    private readonly staffAttendance: StaffAttendanceService,
    private readonly finance: FinanceService,
  ) {}

  async getOverview(schoolId: string) {
    const [
      attendanceToday,
      staffAttendanceToday,
      finance,
      userCounts,
      totalStudents,
      trend,
    ] = await Promise.all([
      this.attendance.getAnalytics(schoolId),
      this.staffAttendance.summary(schoolId).catch(() => null),
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
      staffAttendanceToday: staffAttendanceToday
        ? {
            date: staffAttendanceToday.date,
            totalStaff: staffAttendanceToday.totalStaff,
            marked: staffAttendanceToday.marked,
            unmarked: staffAttendanceToday.unmarked,
            present: staffAttendanceToday.present,
            late: staffAttendanceToday.late,
            absent: staffAttendanceToday.absent,
            onLeave: staffAttendanceToday.on_leave,
          }
        : null,
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
    const totalStudents = await this.prisma.studentProfile.count({
      where: { schoolId },
    });
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
      const absent = marked > 0 ? Math.max(0, totalStudents - present) : 0;
      out.push({
        date: d.toISOString().slice(0, 10),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        rate:
          marked > 0 && totalStudents > 0
            ? Math.round((present / totalStudents) * 100)
            : null,
        marked,
        present,
        absent,
      });
    }
    return out;
  }

  private async gradeRatesToday(schoolId: string) {
    const d = dayUtc(0);
    const [students, records] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: { schoolId },
        select: {
          id: true,
          grade: { select: { name: true } },
          section: { select: { name: true } },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { schoolId, date: d, periodNumber: 0 },
        select: { studentProfileId: true, status: true },
      }),
    ]);

    const statusByStudent = new Map(
      records.map((r) => [r.studentProfileId, r.status] as const),
    );

    type Bucket = { present: number; enrolled: number; marked: number };
    const byGrade = new Map<string, Bucket>();
    const bySection = new Map<
      string,
      Bucket & { grade: string; section: string | null }
    >();

    for (const s of students) {
      const grade = s.grade.name;
      const section = s.section?.name ?? null;
      const sectionKey = `${grade}|${section ?? ''}`;

      const gradeBucket = byGrade.get(grade) ?? {
        present: 0,
        enrolled: 0,
        marked: 0,
      };
      gradeBucket.enrolled += 1;

      const sectionBucket = bySection.get(sectionKey) ?? {
        grade,
        section,
        present: 0,
        enrolled: 0,
        marked: 0,
      };
      sectionBucket.enrolled += 1;

      const status = statusByStudent.get(s.id);
      if (status !== undefined) {
        gradeBucket.marked += 1;
        sectionBucket.marked += 1;
        if (isPresent(status)) {
          gradeBucket.present += 1;
          sectionBucket.present += 1;
        }
      }

      byGrade.set(grade, gradeBucket);
      bySection.set(sectionKey, sectionBucket);
    }

    const sectionsByGrade = new Map<
      string,
      {
        section: string | null;
        label: string;
        rate: number;
        marked: number;
        enrolled: number;
        present: number;
        absent: number;
      }[]
    >();

    for (const b of bySection.values()) {
      if (b.marked === 0) continue;
      const list = sectionsByGrade.get(b.grade) ?? [];
      list.push({
        section: b.section,
        label: b.section ? `${b.grade}-${b.section}` : b.grade,
        rate: b.enrolled > 0 ? Math.round((b.present / b.enrolled) * 100) : 0,
        marked: b.marked,
        enrolled: b.enrolled,
        present: b.present,
        absent: Math.max(0, b.enrolled - b.present),
      });
      sectionsByGrade.set(b.grade, list);
    }

    for (const list of sectionsByGrade.values()) {
      list.sort(
        (a, b) =>
          a.rate - b.rate || (a.section ?? '').localeCompare(b.section ?? ''),
      );
    }

    return [...byGrade.entries()]
      .filter(([, b]) => b.marked > 0)
      .map(([grade, b]) => ({
        grade,
        rate: b.enrolled > 0 ? Math.round((b.present / b.enrolled) * 100) : 0,
        marked: b.marked,
        enrolled: b.enrolled,
        present: b.present,
        absent: Math.max(0, b.enrolled - b.present),
        sections: sectionsByGrade.get(grade) ?? [],
      }))
      .sort((a, b) => a.rate - b.rate || a.grade.localeCompare(b.grade));
  }
}
