import { ForbiddenException, Injectable } from '@nestjs/common';
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
      scopes.push({ gradeId: a.gradeId, sectionId: a.sectionId });
    }

    return this.dedupeScopes(scopes);
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
      throw new ForbiddenException(
        'You do not have access to this class',
      );
    }
  }

  async listGradesForTeacher(schoolId: string, userId: string) {
    const scopes = await this.getClassScopes(schoolId, userId, UserRole.teacher);
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
      const hasGradeWide = scopes.some((s) => s.gradeId === g.id && !s.sectionId);
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
