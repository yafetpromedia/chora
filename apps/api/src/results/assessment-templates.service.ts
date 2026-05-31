import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherScopeService } from '../teachers/teacher-scope.service';
import { ResultWorkflowService } from './result-workflow.service';
import { CreateAssessmentTemplateDto } from './dto/create-assessment-template.dto';

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
    await this.seedDemoTemplates('school-addis');
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

    return {
      workflow: workflowSheet,
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
    await this.workflow.assertEditable(schoolId, termId, classSubjectId);
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
    const maxById = new Map(assessments.map((a) => [a.id, a.maxScore]));

    for (const entry of entries) {
      const max = maxById.get(entry.assessmentId);
      if (max == null) {
        throw new BadRequestException('Invalid assessment in matrix');
      }
      if (entry.score > max) {
        throw new BadRequestException(`Score cannot exceed ${max}`);
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
