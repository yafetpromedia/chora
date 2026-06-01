import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherScopeService } from './teacher-scope.service';

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class TeacherDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherScope: TeacherScopeService,
  ) {}

  async getOverview(schoolId: string, userId: string) {
    const today = todayUtc();
    const dateLabel = today.toISOString().slice(0, 10);

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    });

    const [profile, grades, announcements, currentTerm] = await Promise.all([
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

    const attendancePending: {
      gradeId: string;
      sectionId: string | null;
      label: string;
      studentCount: number;
      markedCount: number;
      pendingCount: number;
    }[] = [];

    for (const bucket of classBuckets) {
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

      const scopes = await this.teacherScope.getClassScopes(
        schoolId,
        userId,
        'teacher',
      );

      const allowedSubjects = classSubjects.filter((cs) => {
        if (cs.teacherId === userId) return true;
        if (scopes === null) return true;
        try {
          this.teacherScope.assertCanAccessClass(
            scopes,
            cs.gradeId,
            cs.sectionId,
          );
          return true;
        } catch {
          return false;
        }
      });

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
      date: dateLabel,
      academicYear: currentYear,
      announcements,
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
    };
  }
}
