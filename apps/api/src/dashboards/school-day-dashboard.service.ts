import { Injectable } from '@nestjs/common';
import { AttendanceStatus, PaymentStatus } from '@prisma/client';
import { isWeekendDay } from '../common/school-calendar.util';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { TeacherDashboardService } from '../teachers/teacher-dashboard.service';

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class SchoolDayDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
    private readonly teacherDashboard: TeacherDashboardService,
  ) {}

  async getAdminDay(schoolId: string) {
    const today = todayUtc();

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    });

    const [
      schoolCalendar,
      currentTerm,
      totalStudents,
      todayRecords,
      pendingPayments,
      teachersTotal,
      classSubjects,
    ] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { weekendDays: true },
      }),
      this.prisma.academicTerm.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true, name: true },
      }),
      this.prisma.studentProfile.count({ where: { schoolId } }),
      this.prisma.attendanceRecord.findMany({
        where: { schoolId, date: today, periodNumber: 0 },
        select: { status: true, studentProfileId: true },
      }),
      this.prisma.payment.count({
        where: { schoolId, status: PaymentStatus.PENDING },
      }),
      this.prisma.user.count({ where: { schoolId, role: 'teacher' } }),
      this.prisma.classSubject.findMany({
        where: {
          schoolId,
          ...(currentYear ? { academicYearId: currentYear.id } : {}),
        },
        select: { id: true, gradeId: true, sectionId: true },
      }),
    ]);

    const todayIsWeekend = isWeekendDay(
      today,
      schoolCalendar?.weekendDays,
      true,
    );

    const markedStudentIds = new Set(
      todayRecords.map((r) => r.studentProfileId),
    );
    const presentToday = todayRecords.filter(
      (r) =>
        r.status === AttendanceStatus.present ||
        r.status === AttendanceStatus.late ||
        r.status === AttendanceStatus.excused,
    ).length;
    // Unmarked students count as not present for the school-day rate.
    const absentToday = Math.max(0, totalStudents - presentToday);
    const attendanceRate =
      todayRecords.length > 0 && totalStudents > 0
        ? Math.round((presentToday / totalStudents) * 100)
        : null;

    const classBuckets = new Map<
      string,
      { gradeId: string; sectionId: string | null }
    >();
    for (const cs of classSubjects) {
      const key = `${cs.gradeId}:${cs.sectionId ?? ''}`;
      if (!classBuckets.has(key)) {
        classBuckets.set(key, { gradeId: cs.gradeId, sectionId: cs.sectionId });
      }
    }

    let classesMarkedToday = 0;
    for (const bucket of classBuckets.values()) {
      const roster = await this.prisma.studentProfile.findMany({
        where: {
          schoolId,
          gradeId: bucket.gradeId,
          ...(bucket.sectionId ? { sectionId: bucket.sectionId } : {}),
        },
        select: { id: true },
      });
      if (roster.length === 0) continue;
      const allMarked = roster.every((s) => markedStudentIds.has(s.id));
      if (allMarked) classesMarkedToday += 1;
    }

    let financeSummary: {
      outstandingCents: number;
      collectedCents: number;
      unpaidStudents: number;
    } | null = null;
    try {
      const analytics = await this.finance.getAnalytics(schoolId);
      financeSummary = {
        outstandingCents: analytics.outstandingCents,
        collectedCents: analytics.collectedCents,
        unpaidStudents: analytics.unpaidStudents,
      };
    } catch {
      financeSummary = null;
    }

    const alerts: {
      type: string;
      label: string;
      count: number;
      href: string;
    }[] = [];
    if (pendingPayments > 0) {
      alerts.push({
        type: 'finance',
        label: 'Payments awaiting verification',
        count: pendingPayments,
        href: '/admin/finance',
      });
    }
    // Weekends are not school days — do not flag unmarked attendance.
    if (!todayIsWeekend && totalStudents > markedStudentIds.size) {
      alerts.push({
        type: 'attendance',
        label: 'Students not marked today',
        count: totalStudents - markedStudentIds.size,
        href: '/admin/attendance',
      });
    }

    const staffEligible = await this.prisma.user.count({
      where: {
        schoolId,
        role: { in: ['admin', 'staff', 'teacher'] },
        roleTemplateId: { not: null },
      },
    });
    const staffMarked = await this.prisma.staffAttendanceRecord.count({
      where: { schoolId, date: today },
    });
    if (!todayIsWeekend && staffEligible > staffMarked) {
      alerts.push({
        type: 'staff_attendance',
        label: 'Staff not marked today',
        count: staffEligible - staffMarked,
        href: '/admin/staff-attendance',
      });
    }

    const openConcerns = await this.prisma.attendanceConcern.count({
      where: {
        schoolId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
    });
    if (openConcerns > 0) {
      alerts.push({
        type: 'attendance_concerns',
        label: 'Open attendance concerns',
        count: openConcerns,
        href: '/admin/attendance/concerns',
      });
    }

    return {
      kind: 'admin_day' as const,
      date: today.toISOString().slice(0, 10),
      academicYear: currentYear,
      currentTerm,
      attendance: {
        rate: attendanceRate,
        marked: todayRecords.length,
        present: presentToday,
        absent: absentToday,
        totalStudents,
      },
      finance: {
        pendingPayments,
        ...financeSummary,
      },
      academics: {
        pendingResultApprovals: 0,
        currentTerm,
      },
      staff: {
        teachersTotal,
        classesActive: classBuckets.size,
        classesMarkedToday,
      },
      alerts: {
        total: alerts.reduce((s, a) => s + a.count, 0),
        items: alerts,
      },
    };
  }

  async getParentDay(parentId: string, schoolId: string) {
    const today = todayUtc();
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    });

    const children = await Promise.all(
      links.map(async (link) => {
        const profile = link.student;
        const todayRecord = await this.prisma.attendanceRecord.findFirst({
          where: {
            schoolId,
            studentProfileId: profile.id,
            date: today,
            periodNumber: 0,
          },
        });

        let outstandingCents = 0;
        try {
          const summary = await this.finance.getStudentFinanceSummary(
            schoolId,
            profile.id,
          );
          outstandingCents = summary.outstandingCents;
        } catch {
          outstandingCents = 0;
        }

        const term = await this.prisma.academicTerm.findFirst({
          where: { schoolId, isCurrent: true },
        });

        let performanceLabel: string | null = null;
        let overallAverage: number | null = null;
        if (term && profile.parentsCanViewResults) {
          const scores = await this.prisma.studentAssessmentScore.findMany({
            where: {
              studentProfileId: profile.id,
              assessment: { schoolId, termId: term.id },
            },
            include: { assessment: { select: { maxScore: true } } },
          });
          if (scores.length > 0) {
            const pct =
              scores.reduce(
                (s, sc) => s + (sc.score / sc.assessment.maxScore) * 100,
                0,
              ) / scores.length;
            overallAverage = Math.round(pct * 10) / 10;
            performanceLabel =
              pct >= 75 ? 'Good' : pct >= 50 ? 'Fair' : 'Needs support';
          }
        }

        return {
          profileId: profile.id,
          name: `${profile.user.firstName} ${profile.user.lastName}`,
          grade: profile.grade.name,
          section: profile.section?.name ?? null,
          attendanceToday: todayRecord?.status ?? 'not_marked',
          outstandingCents,
          overallAverage,
          performanceLabel,
          parentsCanViewResults: profile.parentsCanViewResults,
        };
      }),
    );

    const totalDueCents = children.reduce((s, c) => s + c.outstandingCents, 0);

    return {
      kind: 'parent_day' as const,
      date: today.toISOString().slice(0, 10),
      children,
      totalDueCents,
    };
  }

  async getTeacherDay(schoolId: string, userId: string) {
    const overview = await this.teacherDashboard.getOverview(schoolId, userId);
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    });

    const teachingSlots = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        teacherId: userId,
        ...(currentYear ? { academicYearId: currentYear.id } : {}),
      },
      include: {
        subject: { select: { name: true } },
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: [{ grade: { sortOrder: 'asc' } }, { subject: { name: 'asc' } }],
    });

    return {
      kind: 'teacher_day' as const,
      ...overview,
      academicYear: currentYear,
      teachingSlots: teachingSlots.map((cs) => ({
        classSubjectId: cs.id,
        label: `${cs.grade.name}${cs.section ? ` ${cs.section.name}` : ''} — ${cs.subject.name}`,
        gradeId: cs.grade.id,
        sectionId: cs.section?.id ?? null,
        subjectName: cs.subject.name,
      })),
    };
  }
}
