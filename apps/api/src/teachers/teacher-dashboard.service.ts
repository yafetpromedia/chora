import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  ClassworkStatus,
  ClassworkSubmissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimetableService } from '../timetable/timetable.service';
import { TeacherScopeService } from './teacher-scope.service';

function todayUtc(offsetDays = 0): Date {
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
export class TeacherDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherScope: TeacherScopeService,
    private readonly timetable: TimetableService,
  ) {}

  async getOverview(schoolId: string, userId: string) {
    const today = todayUtc();
    const dateLabel = today.toISOString().slice(0, 10);

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    });

    const [user, profile, grades, announcements, currentTerm] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.teacherProfile.findUnique({
        where: { userId },
        include: {
          homeroomGrade: { select: { id: true, name: true } },
          homeroomSection: { select: { id: true, name: true } },
          assignments: {
            include: {
              grade: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              subject: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      this.teacherScope.listGradesForTeacher(schoolId, userId),
      this.prisma.announcement.count({ where: { schoolId } }),
      this.prisma.academicTerm.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true, name: true },
      }),
    ]);

    const classBuckets: {
      gradeId: string;
      sectionId: string | null;
      label: string;
      studentCount: number;
      isHomeroom: boolean;
    }[] = [];

    for (const grade of grades) {
      const sections =
        grade.sections.length > 0
          ? grade.sections
          : [{ id: null as string | null, name: '' }];
      for (const section of sections) {
        const label = section.id
          ? `${grade.name} · ${section.name}`
          : grade.name;
        const studentCount = await this.prisma.studentProfile.count({
          where: {
            schoolId,
            gradeId: grade.id,
            ...(section.id ? { sectionId: section.id } : {}),
          },
        });
        const isHomeroom =
          profile?.homeroomGradeId === grade.id &&
          (profile.homeroomSectionId == null ||
            profile.homeroomSectionId === section.id);
        classBuckets.push({
          gradeId: grade.id,
          sectionId: section.id,
          label,
          studentCount,
          isHomeroom,
        });
      }
    }

    const canTakeAttendance = !!profile?.homeroomGradeId;

    const attendancePending: {
      gradeId: string;
      sectionId: string | null;
      label: string;
      studentCount: number;
      markedCount: number;
      pendingCount: number;
    }[] = [];

    const homeroomBuckets = canTakeAttendance
      ? classBuckets.filter((b) => b.isHomeroom)
      : [];

    for (const bucket of homeroomBuckets) {
      if (bucket.studentCount === 0) continue;

      const studentIds = await this.prisma.studentProfile.findMany({
        where: {
          schoolId,
          gradeId: bucket.gradeId,
          ...(bucket.sectionId ? { sectionId: bucket.sectionId } : {}),
        },
        select: { id: true },
      });
      const ids = studentIds.map((s) => s.id);
      const markedCount = await this.prisma.attendanceRecord.count({
        where: {
          schoolId,
          date: today,
          periodNumber: 0,
          studentProfileId: { in: ids },
        },
      });
      const pendingCount = bucket.studentCount - markedCount;
      if (pendingCount > 0) {
        attendancePending.push({
          gradeId: bucket.gradeId,
          sectionId: bucket.sectionId,
          label: bucket.label,
          studentCount: bucket.studentCount,
          markedCount,
          pendingCount,
        });
      }
    }

    const resultsPending: {
      assessmentId: string;
      name: string;
      classLabel: string;
      totalStudents: number;
      scoredCount: number;
      missingCount: number;
    }[] = [];

    if (currentTerm) {
      const classSubjects = await this.prisma.classSubject.findMany({
        where: { schoolId },
        include: {
          subject: true,
          grade: true,
          section: true,
        },
      });

      const allowedSubjects: typeof classSubjects = [];
      for (const cs of classSubjects) {
        const ok = await this.teacherScope.canViewClassSubject(
          schoolId,
          userId,
          'teacher',
          cs,
        );
        if (ok) allowedSubjects.push(cs);
      }

      const assessments = await this.prisma.assessment.findMany({
        where: {
          schoolId,
          termId: currentTerm.id,
          classSubjectId: { in: allowedSubjects.map((c) => c.id) },
        },
        include: {
          classSubject: {
            include: { subject: true, grade: true, section: true },
          },
          scores: { select: { studentProfileId: true } },
        },
      });

      for (const a of assessments) {
        const cs = a.classSubject;
        const totalStudents = await this.prisma.studentProfile.count({
          where: {
            schoolId,
            gradeId: cs.gradeId,
            ...(cs.sectionId ? { sectionId: cs.sectionId } : {}),
          },
        });
        if (totalStudents === 0) continue;

        const scoredCount = a.scores.length;
        const missingCount = totalStudents - scoredCount;
        if (missingCount > 0) {
          const sectionLabel = cs.section?.name ? ` · ${cs.section.name}` : '';
          resultsPending.push({
            assessmentId: a.id,
            name: a.name,
            classLabel: `${cs.grade.name}${sectionLabel} · ${cs.subject.name}`,
            totalStudents,
            scoredCount,
            missingCount,
          });
        }
      }
    }

    const todaySchedule = await this.timetable.getScheduleForUser(
      schoolId,
      userId,
      UserRole.teacher,
    );

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

    const analytics = await this.buildAnalytics(
      schoolId,
      userId,
      canTakeAttendance ? homeroomBuckets : [],
      teachingSlots,
      resultsPending,
      attendancePending,
      currentTerm,
      canTakeAttendance,
    );

    return {
      teacherName: user
        ? `${user.firstName} ${user.lastName}`.trim()
        : 'Teacher',
      canTakeAttendance,
      date: dateLabel,
      academicYear: currentYear,
      announcements,
      analytics,
      classesToday: classBuckets.length,
      attendancePendingCount: attendancePending.length,
      resultsPendingCount: resultsPending.length,
      homeroom: profile?.homeroomGrade
        ? {
            gradeName: profile.homeroomGrade.name,
            sectionName: profile.homeroomSection?.name ?? null,
          }
        : null,
      assignments: (profile?.assignments ?? []).map((a) => ({
        gradeName: a.grade.name,
        sectionName: a.section?.name ?? null,
        subjectName: a.subject?.name ?? null,
        isHomeroom: a.isHomeroom,
      })),
      classes: classBuckets,
      attendancePending,
      resultsPending,
      currentTerm: currentTerm
        ? { id: currentTerm.id, name: currentTerm.name }
        : null,
      teachingSlots: teachingSlots.map((cs) => ({
        classSubjectId: cs.id,
        label: `${cs.grade.name}${cs.section ? ` ${cs.section.name}` : ''} — ${cs.subject.name}`,
        gradeId: cs.grade.id,
        sectionId: cs.section?.id ?? null,
        subjectName: cs.subject.name,
      })),
      todaySchedule,
    };
  }

  private async buildAnalytics(
    schoolId: string,
    userId: string,
    classBuckets: {
      gradeId: string;
      sectionId: string | null;
      studentCount: number;
    }[],
    teachingSlots: {
      id: string;
      grade: { id: string; name: string };
      section: { id: string; name: string } | null;
      subject: { name: string };
    }[],
    resultsPending: { missingCount: number }[],
    attendancePending: unknown[],
    currentTerm: { id: string; name: string } | null,
    canTakeAttendance: boolean,
  ) {
    const rosterProfiles =
      teachingSlots.length > 0
        ? await this.prisma.studentProfile.findMany({
            where: {
              schoolId,
              OR: teachingSlots.map((cs) => ({
                gradeId: cs.grade.id,
                ...(cs.section?.id ? { sectionId: cs.section.id } : {}),
              })),
            },
            select: { id: true },
          })
        : [];
    const totalStudents = new Set(rosterProfiles.map((p) => p.id)).size;

    const homeroomProfiles =
      canTakeAttendance && classBuckets.length > 0
        ? await this.prisma.studentProfile.findMany({
            where: {
              schoolId,
              OR: classBuckets.map((b) => ({
                gradeId: b.gradeId,
                ...(b.sectionId ? { sectionId: b.sectionId } : {}),
              })),
            },
            select: { id: true },
          })
        : [];
    const homeroomStudentIds = homeroomProfiles.map((s) => s.id);

    let markedToday = 0;
    let presentToday = 0;
    const attendanceTrend: {
      date: string;
      weekday: string;
      rate: number | null;
      marked: number;
      present: number;
    }[] = [];

    if (canTakeAttendance) {
      const today = todayUtc();
      const todayRecords =
        homeroomStudentIds.length > 0
          ? await this.prisma.attendanceRecord.findMany({
              where: {
                schoolId,
                date: today,
                periodNumber: 0,
                studentProfileId: { in: homeroomStudentIds },
              },
              select: { status: true },
            })
          : [];
      markedToday = todayRecords.length;
      presentToday = todayRecords.filter((r) => isPresent(r.status)).length;

      for (let i = 6; i >= 0; i--) {
        const d = todayUtc(i);
        const records =
          homeroomStudentIds.length > 0
            ? await this.prisma.attendanceRecord.findMany({
                where: {
                  schoolId,
                  date: d,
                  periodNumber: 0,
                  studentProfileId: { in: homeroomStudentIds },
                },
                select: { status: true },
              })
            : [];
        const marked = records.length;
        const present = records.filter((r) => isPresent(r.status)).length;
        attendanceTrend.push({
          date: d.toISOString().slice(0, 10),
          weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
          rate: marked > 0 ? Math.round((present / marked) * 100) : null,
          marked,
          present,
        });
      }
    }

    let gradingTotal = 0;
    let gradingComplete = 0;
    let missingScores = resultsPending.reduce((s, r) => s + r.missingCount, 0);

    if (currentTerm && teachingSlots.length > 0) {
      const assessments = await this.prisma.assessment.findMany({
        where: {
          schoolId,
          termId: currentTerm.id,
          classSubjectId: { in: teachingSlots.map((s) => s.id) },
        },
        include: { scores: { select: { studentProfileId: true } } },
      });
      gradingTotal = assessments.length;
      for (const a of assessments) {
        const cs = teachingSlots.find((t) => t.id === a.classSubjectId);
        if (!cs) continue;
        const totalStudentsInClass = await this.prisma.studentProfile.count({
          where: {
            schoolId,
            gradeId: cs.grade.id,
            ...(cs.section?.id ? { sectionId: cs.section.id } : {}),
          },
        });
        if (
          totalStudentsInClass > 0 &&
          a.scores.length >= totalStudentsInClass
        ) {
          gradingComplete += 1;
        }
      }
    }

    const classSubjectIds = teachingSlots.map((s) => s.id);
    const classworkRows =
      classSubjectIds.length > 0
        ? await this.prisma.classworkAssignment.findMany({
            where: {
              schoolId,
              classSubjectId: { in: classSubjectIds },
            },
            include: {
              submissions: {
                where: {
                  status: {
                    in: [
                      ClassworkSubmissionStatus.SUBMITTED,
                      ClassworkSubmissionStatus.LATE,
                    ],
                  },
                  score: null,
                },
                select: { id: true },
              },
            },
          })
        : [];

    const classPerformance: {
      classSubjectId: string;
      label: string;
      averageScore: number | null;
      assessedCount: number;
    }[] = [];

    if (currentTerm) {
      for (const cs of teachingSlots.slice(0, 6)) {
        const scores = await this.prisma.studentAssessmentScore.findMany({
          where: {
            assessment: {
              schoolId,
              termId: currentTerm.id,
              classSubjectId: cs.id,
            },
          },
          select: { score: true },
        });
        const avg =
          scores.length > 0
            ? Math.round(
                scores.reduce((s, r) => s + r.score, 0) / scores.length,
              )
            : null;
        classPerformance.push({
          classSubjectId: cs.id,
          label: `${cs.grade.name}${cs.section ? ` ${cs.section.name}` : ''} · ${cs.subject.name}`,
          averageScore: avg,
          assessedCount: scores.length,
        });
      }
    }

    const gradingProgress =
      gradingTotal > 0
        ? Math.round((gradingComplete / gradingTotal) * 100)
        : null;

    return {
      totalStudents,
      subjectsTeaching: teachingSlots.length,
      classesCount: classBuckets.length,
      attendanceToday: {
        marked: markedToday,
        present: presentToday,
        total: canTakeAttendance
          ? classBuckets.reduce((s, b) => s + b.studentCount, 0)
          : 0,
        rate:
          canTakeAttendance && markedToday > 0
            ? Math.round((presentToday / markedToday) * 100)
            : null,
        pendingClasses: canTakeAttendance ? attendancePending.length : 0,
      },
      attendanceTrend,
      grading: {
        termName: currentTerm?.name ?? null,
        totalAssessments: gradingTotal,
        completeAssessments: gradingComplete,
        progressPct: gradingProgress,
        missingScores,
      },
      classwork: {
        published: classworkRows.filter((r) => r.status === ClassworkStatus.PUBLISHED)
          .length,
        draft: classworkRows.filter((r) => r.status === ClassworkStatus.DRAFT)
          .length,
        submissionsToGrade: classworkRows.reduce(
          (s, r) => s + r.submissions.length,
          0,
        ),
      },
      classPerformance,
    };
  }
}
