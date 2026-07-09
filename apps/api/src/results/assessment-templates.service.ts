import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ClassworkType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherScopeService } from '../teachers/teacher-scope.service';
import { ResultWorkflowService } from './result-workflow.service';
import { CreateAssessmentTemplateDto } from './dto/create-assessment-template.dto';
import { weightedTermAverage } from './grading.util';

function columnKey(name: string) {
  return name.trim().toLowerCase();
}

function assertWeightsSumTo100(
  components: { weightPercent: number }[],
) {
  const total = components.reduce((s, c) => s + c.weightPercent, 0);
  if (total !== 100) {
    throw new BadRequestException(
      `Component weights must total 100% (currently ${total}%)`,
    );
  }
}

@Injectable()
export class AssessmentTemplatesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherScope: TeacherScopeService,
    private readonly workflow: ResultWorkflowService,
  ) {}

  async onModuleInit() {
    const schools = await this.prisma.school.findMany({
      select: { id: true },
    });
    for (const school of schools) {
      await this.seedDemoTemplates(school.id);
    }
  }

  async seedDemoTemplates(schoolId: string) {
    const existing = await this.prisma.assessmentTemplate.count({
      where: { schoolId },
    });
    if (existing > 0) return;

    const primary = await this.create(schoolId, {
      name: 'Primary (Grades 1–4)',
      description: 'Activity-based primary assessment',
      components: [
        { name: 'Activity', weightPercent: 10, maxScore: 10, sortOrder: 0 },
        { name: 'Worksheet', weightPercent: 10, maxScore: 10, sortOrder: 1 },
        { name: 'Class Participation', weightPercent: 10, maxScore: 10, sortOrder: 2 },
        { name: 'Mid Exam', weightPercent: 20, maxScore: 20, sortOrder: 3 },
        { name: 'Final Exam', weightPercent: 50, maxScore: 50, sortOrder: 4 },
      ],
    });

    const middle = await this.create(schoolId, {
      name: 'Middle School (Grades 5–8)',
      description: 'Balanced continuous assessment',
      components: [
        { name: 'Assignment', weightPercent: 15, maxScore: 15, sortOrder: 0 },
        { name: 'Quiz', weightPercent: 15, maxScore: 15, sortOrder: 1 },
        { name: 'Group Work', weightPercent: 10, maxScore: 10, sortOrder: 2 },
        { name: 'Mid Exam', weightPercent: 20, maxScore: 20, sortOrder: 3 },
        { name: 'Final Exam', weightPercent: 40, maxScore: 40, sortOrder: 4 },
      ],
    });

    await this.create(schoolId, {
      name: 'Secondary (Grades 9–12)',
      description: 'Exam-focused secondary assessment',
      components: [
        { name: 'Assignment', weightPercent: 15, maxScore: 15, sortOrder: 0 },
        { name: 'Project', weightPercent: 10, maxScore: 10, sortOrder: 1 },
        { name: 'Mid Exam', weightPercent: 25, maxScore: 25, sortOrder: 2 },
        { name: 'Final Exam', weightPercent: 50, maxScore: 50, sortOrder: 3 },
      ],
    });

    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
    });

    for (const g of grades) {
      const n = this.parseGradeNumber(g.name);
      if (n == null) continue;
      const templateId =
        n <= 4 ? primary.id : n <= 8 ? middle.id : null;
      if (!templateId) continue;
      const existing = await this.prisma.assessmentTemplateGrade.findFirst({
        where: { templateId, gradeId: g.id, subjectId: null },
      });
      if (!existing) {
        await this.prisma.assessmentTemplateGrade.create({
          data: { templateId, gradeId: g.id, subjectId: null },
        });
      }
    }
  }

  private parseGradeNumber(name: string): number | null {
    const m = name.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  async list(schoolId: string) {
    const templates = await this.prisma.assessmentTemplate.findMany({
      where: { schoolId },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        gradeLinks: {
          include: {
            grade: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        _count: { select: { classSubjects: true } },
      },
      orderBy: { name: 'asc' },
    });

    return templates.map((t) => this.formatTemplate(t));
  }

  async getById(schoolId: string, id: string) {
    const t = await this.prisma.assessmentTemplate.findFirst({
      where: { id, schoolId },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        gradeLinks: {
          include: {
            grade: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Assessment template not found');
    return this.formatTemplate(t);
  }

  async create(schoolId: string, dto: CreateAssessmentTemplateDto) {
    assertWeightsSumTo100(dto.components);

    const template = await this.prisma.assessmentTemplate.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        components: {
          create: dto.components.map((c, i) => ({
            name: c.name.trim(),
            weightPercent: c.weightPercent,
            maxScore: c.maxScore ?? 100,
            sortOrder: c.sortOrder ?? i,
          })),
        },
      },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        gradeLinks: {
          include: {
            grade: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    return this.formatTemplate(template);
  }

  async update(
    schoolId: string,
    templateId: string,
    dto: {
      name?: string;
      description?: string;
      components?: {
        name: string;
        weightPercent: number;
        maxScore?: number;
        sortOrder?: number;
      }[];
    },
  ) {
    const existing = await this.prisma.assessmentTemplate.findFirst({
      where: { id: templateId, schoolId },
      include: { components: true },
    });
    if (!existing) throw new NotFoundException('Assessment template not found');

    if (dto.components) {
      assertWeightsSumTo100(dto.components);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.assessmentTemplate.update({
        where: { id: templateId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
        },
      });

      if (dto.components) {
        await tx.assessmentTemplateComponent.deleteMany({
          where: { templateId },
        });
        await tx.assessmentTemplateComponent.createMany({
          data: dto.components.map((c, i) => ({
            templateId,
            name: c.name.trim(),
            weightPercent: c.weightPercent,
            maxScore: c.maxScore ?? 100,
            sortOrder: c.sortOrder ?? i,
          })),
        });
      }
    });

    return this.getById(schoolId, templateId);
  }

  async remove(schoolId: string, templateId: string) {
    const existing = await this.prisma.assessmentTemplate.findFirst({
      where: { id: templateId, schoolId },
      include: { _count: { select: { classSubjects: true } } },
    });
    if (!existing) throw new NotFoundException('Assessment template not found');
    if (existing._count.classSubjects > 0) {
      throw new BadRequestException(
        'Cannot delete template while it is assigned to class subjects',
      );
    }
    await this.prisma.assessmentTemplate.delete({
      where: { id: templateId },
    });
    return { deleted: true, id: templateId };
  }

  async assignToGrade(
    schoolId: string,
    templateId: string,
    gradeId: string,
    subjectId?: string,
  ) {
    const template = await this.prisma.assessmentTemplate.findFirst({
      where: { id: templateId, schoolId },
    });
    if (!template) throw new NotFoundException('Template not found');

    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    if (subjectId) {
      const subject = await this.prisma.subject.findFirst({
        where: { id: subjectId, schoolId },
      });
      if (!subject) throw new NotFoundException('Subject not found');
    }

    const existing = await this.prisma.assessmentTemplateGrade.findFirst({
      where: {
        templateId,
        gradeId,
        subjectId: subjectId ?? null,
      },
    });
    if (existing) {
      await this.prisma.assessmentTemplateGrade.update({
        where: { id: existing.id },
        data: { templateId },
      });
    } else {
      await this.prisma.assessmentTemplateGrade.create({
        data: { templateId, gradeId, subjectId: subjectId ?? null },
      });
    }

    return this.getById(schoolId, templateId);
  }

  async assignToClassSubject(
    schoolId: string,
    classSubjectId: string,
    templateId: string,
  ) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
    });
    if (!cs) throw new NotFoundException('Class subject not found');

    const template = await this.prisma.assessmentTemplate.findFirst({
      where: { id: templateId, schoolId },
    });
    if (!template) throw new NotFoundException('Template not found');

    await this.prisma.classSubject.update({
      where: { id: classSubjectId },
      data: { assessmentTemplateId: templateId },
    });

    return { classSubjectId, templateId };
  }

  async resolveTemplateForClassSubject(
    schoolId: string,
    classSubjectId: string,
  ) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
      include: {
        assessmentTemplate: { include: { components: { orderBy: { sortOrder: 'asc' } } } },
        subject: true,
        grade: true,
      },
    });
    if (!cs) throw new NotFoundException('Class subject not found');

    if (cs.assessmentTemplate) {
      return cs.assessmentTemplate;
    }

    const subjectSpecific = await this.prisma.assessmentTemplateGrade.findFirst({
      where: {
        gradeId: cs.gradeId,
        subjectId: cs.subjectId,
        template: { schoolId },
      },
      include: {
        template: { include: { components: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (subjectSpecific) return subjectSpecific.template;

    const gradeWide = await this.prisma.assessmentTemplateGrade.findFirst({
      where: {
        gradeId: cs.gradeId,
        subjectId: null,
        template: { schoolId },
      },
      include: {
        template: { include: { components: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (gradeWide) return gradeWide.template;

    return null;
  }

  /** Match classwork type to the assessment template component max (e.g. Assignment /10). */
  async resolveClassworkMaxScore(
    schoolId: string,
    classSubjectId: string,
    type: ClassworkType,
  ): Promise<number> {
    const template = await this.resolveTemplateForClassSubject(
      schoolId,
      classSubjectId,
    );
    if (!template) return 10;

    const target =
      type === ClassworkType.ASSIGNMENT ? 'assignment' : 'worksheet';
    const component = template.components.find(
      (c) => c.name.trim().toLowerCase() === target,
    );
    return component?.maxScore ?? 10;
  }

  async syncTermAssessments(
    schoolId: string,
    termId: string,
    classSubjectId: string,
  ) {
    const term = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
    });
    if (!term) throw new NotFoundException('Term not found');

    const template = await this.resolveTemplateForClassSubject(
      schoolId,
      classSubjectId,
    );
    if (!template) {
      return { synced: 0, message: 'No assessment template assigned' };
    }

    let synced = 0;
    for (const comp of template.components) {
      const existing = await this.prisma.assessment.findUnique({
        where: {
          termId_classSubjectId_name: {
            termId,
            classSubjectId,
            name: comp.name,
          },
        },
      });
      if (existing) continue;

      await this.prisma.assessment.create({
        data: {
          schoolId,
          termId,
          classSubjectId,
          name: comp.name,
          maxScore: comp.maxScore,
          weightPercent: comp.weightPercent,
          sortOrder: comp.sortOrder,
        },
      });
      synced += 1;
    }

    return {
      synced,
      templateName: template.name,
      components: template.components.length,
    };
  }

  async getScoreMatrix(
    schoolId: string,
    termId: string,
    classSubjectId: string,
    userId?: string,
    role?: string,
  ) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
      include: {
        subject: true,
        grade: true,
        section: true,
      },
    });
    if (!cs) throw new NotFoundException('Class subject not found');

    if (userId && role === 'teacher') {
      const scopes = await this.teacherScope.getClassScopes(
        schoolId,
        userId,
        role,
      );
      this.teacherScope.assertCanAccessClass(
        scopes,
        cs.gradeId,
        cs.sectionId,
      );
    }

    await this.syncTermAssessments(schoolId, termId, classSubjectId);
    const workflowSheet = await this.workflow.getOrCreateSheet(
      schoolId,
      termId,
      classSubjectId,
    );

    const template = await this.resolveTemplateForClassSubject(
      schoolId,
      classSubjectId,
    );

    const assessments = await this.prisma.assessment.findMany({
      where: { termId, classSubjectId, schoolId },
      orderBy: { sortOrder: 'asc' },
      include: {
        scores: true,
      },
    });

    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId: cs.gradeId,
        ...(cs.sectionId ? { sectionId: cs.sectionId } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { firstName: 'asc' } },
    });

    const canEditScores =
      !userId || !role
        ? true
        : await this.teacherScope.canEditClassSubjectScores(
            schoolId,
            userId,
            role,
            classSubjectId,
          );

    return {
      workflow: workflowSheet,
      canEditScores,
      classSubject: {
        id: cs.id,
        subject: cs.subject.name,
        grade: cs.grade.name,
        section: cs.section?.name ?? null,
      },
      template: template
        ? {
            id: template.id,
            name: template.name,
            components: template.components.map((c) => ({
              name: c.name,
              weightPercent: c.weightPercent,
              maxScore: c.maxScore,
            })),
          }
        : null,
      assessments: assessments.map((a) => ({
        id: a.id,
        name: a.name,
        maxScore: a.maxScore,
        weightPercent: a.weightPercent,
        sortOrder: a.sortOrder,
        entryLocked: a.entryLocked,
      })),
      students: students.map((s) => ({
        studentProfileId: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        scores: assessments.map((a) => {
          const sc = a.scores.find((x) => x.studentProfileId === s.id);
          return {
            assessmentId: a.id,
            score: sc?.score ?? null,
          };
        }),
      })),
    };
  }

  async saveScoreMatrix(
    schoolId: string,
    termId: string,
    classSubjectId: string,
    entries: { studentProfileId: string; assessmentId: string; score: number }[],
    userId?: string,
    role?: string,
  ) {
    await this.workflow.assertCanSaveScores(
      schoolId,
      termId,
      classSubjectId,
      role,
    );
    if (userId && role) {
      await this.teacherScope.assertCanEditClassSubjectScores(
        schoolId,
        userId,
        role,
        classSubjectId,
      );
    }
    await this.getScoreMatrix(schoolId, termId, classSubjectId, userId, role);

    const assessmentIds = [...new Set(entries.map((e) => e.assessmentId))];
    const assessments = await this.prisma.assessment.findMany({
      where: {
        id: { in: assessmentIds },
        schoolId,
        termId,
        classSubjectId,
      },
    });
    const assessmentById = new Map(assessments.map((a) => [a.id, a]));

    for (const entry of entries) {
      const assessment = assessmentById.get(entry.assessmentId);
      if (!assessment) {
        throw new BadRequestException('Invalid assessment in matrix');
      }
      if (role === 'teacher' && assessment.entryLocked) {
        throw new BadRequestException(
          `${assessment.name} is locked. Ask academic office to unlock it.`,
        );
      }
      if (entry.score > assessment.maxScore) {
        throw new BadRequestException(`Score cannot exceed ${assessment.maxScore}`);
      }
    }

    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.studentAssessmentScore.upsert({
          where: {
            assessmentId_studentProfileId: {
              assessmentId: entry.assessmentId,
              studentProfileId: entry.studentProfileId,
            },
          },
          create: {
            assessmentId: entry.assessmentId,
            studentProfileId: entry.studentProfileId,
            score: entry.score,
          },
          update: { score: entry.score },
        }),
      ),
    );

    return { saved: entries.length };
  }

  async getStudentSubjectMatrix(
    schoolId: string,
    termId: string,
    studentProfileId: string,
    userId?: string,
    role?: string,
  ) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true, externalRef: true } },
        grade: { select: { name: true } },
        section: { select: { name: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Student not found');
    }

    const term = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
      select: {
        id: true,
        name: true,
        academicYearId: true,
      },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    if (userId && role === 'teacher') {
      const scopes = await this.teacherScope.getClassScopes(
        schoolId,
        userId,
        role,
      );
      this.teacherScope.assertCanAccessClass(
        scopes,
        profile.gradeId,
        profile.sectionId,
      );
    }

    if (userId && role === 'parent') {
      const link = await this.prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: { parentId: userId, studentId: studentProfileId },
        },
      });
      if (!link) {
        throw new NotFoundException('Not allowed');
      }
    }

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        gradeId: profile.gradeId,
        academicYearId: term.academicYearId,
        ...(profile.sectionId ? { sectionId: profile.sectionId } : {}),
      },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    type ColumnMeta = {
      key: string;
      name: string;
      maxScore: number;
      weightPercent: number;
      sortOrder: number;
    };
    const columnMap = new Map<string, ColumnMeta>();

    type SubjectRow = {
      classSubjectId: string;
      subject: string;
      templateName: string | null;
      workflowStatus: string;
      canEditScores: boolean;
      cells: {
        columnKey: string;
        assessmentId: string | null;
        score: number | null;
        maxScore: number | null;
        weightPercent: number | null;
        entryLocked: boolean;
      }[];
      total: number | null;
    };

    const subjects: SubjectRow[] = [];
    type AssessmentWithScores = {
      id: string;
      name: string;
      maxScore: number;
      weightPercent: number;
      sortOrder: number;
      entryLocked: boolean;
      scores: { score: number }[];
    };
    const assessmentsByClass = new Map<string, AssessmentWithScores[]>();

    for (const cs of classSubjects) {
      await this.syncTermAssessments(schoolId, termId, cs.id);
      const workflowSheet = await this.workflow.getOrCreateSheet(
        schoolId,
        termId,
        cs.id,
      );
      const template = await this.resolveTemplateForClassSubject(
        schoolId,
        cs.id,
      );

      const assessments = await this.prisma.assessment.findMany({
        where: { termId, classSubjectId: cs.id, schoolId },
        orderBy: { sortOrder: 'asc' },
        include: {
          scores: { where: { studentProfileId } },
        },
      });

      assessmentsByClass.set(cs.id, assessments);

      for (const a of assessments) {
        const key = columnKey(a.name);
        const existing = columnMap.get(key);
        if (!existing) {
          columnMap.set(key, {
            key,
            name: a.name,
            maxScore: a.maxScore,
            weightPercent: a.weightPercent,
            sortOrder: a.sortOrder,
          });
        } else {
          existing.maxScore = Math.max(existing.maxScore, a.maxScore);
          existing.sortOrder = Math.min(existing.sortOrder, a.sortOrder);
        }
      }

      const canEditScores =
        !userId || !role
          ? true
          : await this.teacherScope.canEditClassSubjectScores(
              schoolId,
              userId,
              role,
              cs.id,
            );

      const averageItems = assessments
        .filter((a) => a.scores.length > 0)
        .filter(
          (a) =>
            (role !== 'student' && role !== 'parent') || a.entryLocked,
        )
        .map((a) => ({
          score: a.scores[0].score,
          maxScore: a.maxScore,
          weightPercent: a.weightPercent,
        }));

      subjects.push({
        classSubjectId: cs.id,
        subject: cs.subject.name,
        templateName: template?.name ?? null,
        workflowStatus: workflowSheet.status,
        canEditScores,
        cells: [],
        total: weightedTermAverage(averageItems),
      });
    }

    const columns = [...columnMap.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );

    for (let i = 0; i < subjects.length; i++) {
      const assessments = assessmentsByClass.get(subjects[i].classSubjectId) ?? [];
      const byKey = new Map(
        assessments.map((a) => [columnKey(a.name), a] as const),
      );

      subjects[i].cells = columns.map((col) => {
        const a = byKey.get(col.key);
        if (!a) {
          return {
            columnKey: col.key,
            assessmentId: null,
            score: null,
            maxScore: null,
            weightPercent: null,
            entryLocked: true,
          };
        }
        return {
          columnKey: col.key,
          assessmentId: a.id,
          score:
            role === 'student' || role === 'parent'
              ? a.entryLocked
                ? (a.scores[0]?.score ?? null)
                : null
              : (a.scores[0]?.score ?? null),
          maxScore: a.maxScore,
          weightPercent: a.weightPercent,
          entryLocked: a.entryLocked,
        };
      });
    }

    return {
      term: { id: term.id, name: term.name },
      student: {
        id: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
        grade: profile.grade.name,
        section: profile.section?.name ?? null,
        studentId: profile.user.externalRef,
      },
      assessmentCount: columns.length,
      columns: columns.map(({ key, name, maxScore, weightPercent, sortOrder }) => ({
        key,
        name,
        maxScore,
        weightPercent,
        sortOrder,
      })),
      subjects,
    };
  }

  async saveStudentSubjectMatrix(
    schoolId: string,
    termId: string,
    studentProfileId: string,
    entries: {
      classSubjectId: string;
      assessmentId: string;
      score: number;
    }[],
    userId?: string,
    role?: string,
  ) {
    const byClass = new Map<
      string,
      { studentProfileId: string; assessmentId: string; score: number }[]
    >();

    for (const entry of entries) {
      const list = byClass.get(entry.classSubjectId) ?? [];
      list.push({
        studentProfileId,
        assessmentId: entry.assessmentId,
        score: entry.score,
      });
      byClass.set(entry.classSubjectId, list);
    }

    let saved = 0;
    for (const [classSubjectId, classEntries] of byClass) {
      const result = await this.saveScoreMatrix(
        schoolId,
        termId,
        classSubjectId,
        classEntries,
        userId,
        role,
      );
      saved += result.saved;
    }

    return { saved };
  }

  async setAssessmentEntryLock(
    schoolId: string,
    assessmentId: string,
    entryLocked: boolean,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { entryLocked },
      select: {
        id: true,
        name: true,
        entryLocked: true,
        termId: true,
        classSubjectId: true,
      },
    });

    return updated;
  }

  private formatTemplate(t: {
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    components: {
      id: string;
      name: string;
      weightPercent: number;
      maxScore: number;
      sortOrder: number;
    }[];
    gradeLinks: {
      id: string;
      gradeId: string;
      subjectId: string | null;
      grade: { id: string; name: string };
      subject: { id: string; name: string } | null;
    }[];
    _count?: { classSubjects: number };
  }) {
    const weightTotal = t.components.reduce((s, c) => s + c.weightPercent, 0);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      isDefault: t.isDefault,
      weightTotal,
      components: t.components,
      gradeAssignments: t.gradeLinks.map((l) => ({
        id: l.id,
        gradeId: l.gradeId,
        gradeName: l.grade.name,
        subjectId: l.subjectId,
        subjectName: l.subject?.name ?? null,
        scope: l.subjectId ? 'subject' : 'grade',
      })),
      classSubjectCount: t._count?.classSubjects ?? 0,
    };
  }
}
