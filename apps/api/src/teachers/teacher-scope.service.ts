import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ClassScope = {
  gradeId: string;
  sectionId: string | null;
};

@Injectable()
export class TeacherScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** `null` = unrestricted (admin / staff). Empty array = no classes assigned. */
  async getClassScopes(
    schoolId: string,
    userId: string,
    portalRole: string,
  ): Promise<ClassScope[] | null> {
    if (portalRole === UserRole.admin || portalRole === UserRole.staff) {
      return null;
    }

    if (portalRole !== UserRole.teacher) {
      return [];
    }

    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: { assignments: true },
    });

    if (!profile || profile.schoolId !== schoolId) {
      return [];
    }

    const scopes: ClassScope[] = [];

    if (profile.homeroomGradeId) {
      scopes.push({
        gradeId: profile.homeroomGradeId,
        sectionId: profile.homeroomSectionId,
      });
    }

    for (const a of profile.assignments) {
      if (!a.isHomeroom) {
        scopes.push({ gradeId: a.gradeId, sectionId: a.sectionId });
      }
    }

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        teacherId: userId,
        ...(currentYear ? { academicYearId: currentYear.id } : {}),
      },
      select: { gradeId: true, sectionId: true },
    });
    for (const cs of classSubjects) {
      scopes.push({ gradeId: cs.gradeId, sectionId: cs.sectionId });
    }

    return this.dedupeScopes(scopes);
  }

  /**
   * Teachers may view a class-subject if they teach it, or if it belongs to
   * their homeroom class (review-only). Teaching one subject in a class must
   * not unlock every other subject in that class.
   */
  async canViewClassSubject(
    schoolId: string,
    userId: string,
    role: string,
    classSubject: {
      teacherId: string | null;
      gradeId: string;
      sectionId: string | null;
    },
  ): Promise<boolean> {
    if (role === UserRole.admin || role === UserRole.staff) {
      return true;
    }
    if (role !== UserRole.teacher) {
      return false;
    }
    if (classSubject.teacherId === userId) {
      return true;
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
      return false;
    }
    if (profile.homeroomGradeId !== classSubject.gradeId) {
      return false;
    }
    if (
      profile.homeroomSectionId &&
      classSubject.sectionId &&
      profile.homeroomSectionId !== classSubject.sectionId
    ) {
      return false;
    }
    return true;
  }

  async assertCanViewClassSubject(
    schoolId: string,
    userId: string,
    role: string,
    classSubject: {
      teacherId: string | null;
      gradeId: string;
      sectionId: string | null;
    },
  ) {
    const ok = await this.canViewClassSubject(
      schoolId,
      userId,
      role,
      classSubject,
    );
    if (!ok) {
      throw new ForbiddenException(
        'You can only open subjects you teach (or your homeroom class)',
      );
    }
  }

  /** Homeroom teacher for this grade/section (admins/staff always true). */
  async isHomeroomForClass(
    schoolId: string,
    userId: string,
    role: string,
    gradeId: string,
    sectionId: string | null,
  ): Promise<boolean> {
    if (role === UserRole.admin || role === UserRole.staff) {
      return true;
    }
    if (role !== UserRole.teacher) {
      return false;
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
      return false;
    }
    if (profile.homeroomGradeId !== gradeId) {
      return false;
    }
    if (
      profile.homeroomSectionId &&
      sectionId &&
      profile.homeroomSectionId !== sectionId
    ) {
      return false;
    }
    return true;
  }

  /** Subject teacher assigned on ClassSubject — homeroom teachers may view but not edit. */
  async canEditClassSubjectScores(
    schoolId: string,
    userId: string,
    role: string,
    classSubjectId: string,
  ): Promise<boolean> {
    if (role === UserRole.admin || role === UserRole.staff) {
      return true;
    }
    if (role !== UserRole.teacher) {
      return false;
    }

    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
      select: { teacherId: true },
    });
    return cs?.teacherId === userId;
  }

  async assertCanEditClassSubjectScores(
    schoolId: string,
    userId: string,
    role: string,
    classSubjectId: string,
  ) {
    if (role !== UserRole.teacher) {
      return;
    }

    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
      select: { teacherId: true },
    });
    if (!cs) {
      throw new NotFoundException('Class subject not found');
    }

    if (cs.teacherId !== userId) {
      throw new ForbiddenException(
        'Only the assigned subject teacher can enter or change scores',
      );
    }
  }

  async assertHomeroomTeacher(schoolId: string, userId: string, role: string) {
    if (role !== UserRole.teacher) {
      return;
    }

    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { schoolId: true, homeroomGradeId: true },
    });

    if (!profile || profile.schoolId !== schoolId || !profile.homeroomGradeId) {
      throw new ForbiddenException(
        'Only homeroom teachers can mark attendance',
      );
    }
  }

  assertCanAccessClass(
    scopes: ClassScope[] | null,
    gradeId: string,
    sectionId?: string | null,
  ) {
    if (scopes === null) {
      return;
    }

    const section = sectionId || null;
    const allowed = scopes.some((s) => {
      if (s.gradeId !== gradeId) {
        return false;
      }
      if (!section) {
        return true;
      }
      if (!s.sectionId) {
        return true;
      }
      return s.sectionId === section;
    });

    if (!allowed) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }

  /** Homeroom grade/section only — used for attendance marking. */
  async listHomeroomGradesForTeacher(schoolId: string, userId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: {
        schoolId: true,
        homeroomGradeId: true,
        homeroomSectionId: true,
      },
    });

    if (!profile || profile.schoolId !== schoolId || !profile.homeroomGradeId) {
      return [];
    }

    const grade = await this.prisma.grade.findFirst({
      where: { schoolId, id: profile.homeroomGradeId },
      include: { sections: { orderBy: { name: 'asc' } } },
    });

    if (!grade) {
      return [];
    }

    const sections = profile.homeroomSectionId
      ? grade.sections.filter((s) => s.id === profile.homeroomSectionId)
      : grade.sections;

    return [{ ...grade, sections }];
  }

  async assertHomeroomClassForAttendance(
    schoolId: string,
    userId: string,
    role: string,
    gradeId: string,
    sectionId?: string | null,
  ) {
    await this.assertHomeroomTeacher(schoolId, userId, role);

    if (role !== UserRole.teacher) {
      return;
    }

    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { homeroomGradeId: true, homeroomSectionId: true },
    });

    if (!profile?.homeroomGradeId || profile.homeroomGradeId !== gradeId) {
      throw new ForbiddenException(
        'Attendance is only for your homeroom class',
      );
    }

    if (
      profile.homeroomSectionId &&
      sectionId &&
      profile.homeroomSectionId !== sectionId
    ) {
      throw new ForbiddenException(
        'Attendance is only for your homeroom section',
      );
    }
  }

  async listGradesForTeacher(schoolId: string, userId: string) {
    const scopes = await this.getClassScopes(
      schoolId,
      userId,
      UserRole.teacher,
    );
    if (scopes === null) {
      return this.prisma.grade.findMany({
        where: { schoolId },
        include: { sections: { orderBy: { name: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      });
    }

    if (scopes.length === 0) {
      return [];
    }

    const gradeIds = [...new Set(scopes.map((s) => s.gradeId))];
    const grades = await this.prisma.grade.findMany({
      where: { schoolId, id: { in: gradeIds } },
      include: { sections: { orderBy: { name: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    return grades.map((g) => {
      const allowedSections = scopes
        .filter((s) => s.gradeId === g.id && s.sectionId)
        .map((s) => s.sectionId!);
      const hasGradeWide = scopes.some(
        (s) => s.gradeId === g.id && !s.sectionId,
      );
      return {
        ...g,
        sections: hasGradeWide
          ? g.sections
          : g.sections.filter((sec) => allowedSections.includes(sec.id)),
      };
    });
  }

  private dedupeScopes(scopes: ClassScope[]): ClassScope[] {
    const key = (s: ClassScope) => `${s.gradeId}:${s.sectionId ?? '*'}`;
    const map = new Map<string, ClassScope>();
    for (const s of scopes) {
      map.set(key(s), s);
    }
    return [...map.values()];
  }
}
