import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AttendanceStatus } from '@prisma/client';
import { TeacherScopeService } from '../teachers/teacher-scope.service';
import { ResultWorkflowService } from './result-workflow.service';
import {
  DEFAULT_GRADING_BANDS,
  scoreToLetter,
  weightedTermAverage,
  type GradingBand,
} from './grading.util';
import { BulkScoresDto } from './dto/bulk-scores.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import {
  ageFromDateOfBirth,
  buildGradeSectionLabel,
  buildReportCardHtml,
  buildSubjectGridRows,
  buildSummaryFromGrid,
  formatGenderLabel,
  type ReportCardMode,
  type ReportCardPrintPayload,
  type ReportCardPromotion,
} from './report-card-html.util';

const DEFAULT_SUBJECTS = [
  { code: 'MATH', name: 'Mathematics' },
  { code: 'ENG', name: 'English' },
  { code: 'AMH', name: 'Amharic' },
  { code: 'SCI', name: 'Science' },
  { code: 'SOC', name: 'Social Studies' },
];

@Injectable()
export class AcademicsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly teacherScope: TeacherScopeService,
    private readonly workflow: ResultWorkflowService,
  ) {}

  private async assertTeacherClassSubject(
    schoolId: string,
    userId: string,
    role: string,
    gradeId: string,
    sectionId: string | null,
  ) {
    const scopes = await this.teacherScope.getClassScopes(schoolId, userId, role);
    this.teacherScope.assertCanAccessClass(scopes, gradeId, sectionId);
  }

  async onModuleInit() {
    await this.seedDemoAcademics('school-addis');
  }

  async seedDemoAcademics(schoolId: string) {
    await this.ensureGradingScale(schoolId);

    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!year) return;

    for (const s of DEFAULT_SUBJECTS) {
      await this.prisma.subject.upsert({
        where: { schoolId_code: { schoolId, code: s.code } },
        create: { schoolId, code: s.code, name: s.name },
        update: { name: s.name },
      });
    }

    const termCount = await this.prisma.academicTerm.count({
      where: { schoolId, academicYearId: year.id },
    });
    if (termCount > 0) return;

    const terms = [
      { name: 'Term 1', sortOrder: 0, months: 0 },
      { name: 'Term 2', sortOrder: 1, months: 4 },
      { name: 'Term 3', sortOrder: 2, months: 8 },
    ];
    for (const t of terms) {
      const start = new Date(year.startDate);
      start.setMonth(start.getMonth() + t.months);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 3);
      await this.prisma.academicTerm.create({
        data: {
          schoolId,
          academicYearId: year.id,
          name: t.name,
          sortOrder: t.sortOrder,
          startDate: start,
          endDate: end,
          isCurrent: t.sortOrder === 0,
        },
      });
    }

    const grade1 = await this.prisma.grade.findFirst({
      where: { schoolId, name: 'Grade 1' },
    });
    const math = await this.prisma.subject.findFirst({
      where: { schoolId, code: 'MATH' },
    });
    const eng = await this.prisma.subject.findFirst({
      where: { schoolId, code: 'ENG' },
    });
    const teacher = await this.prisma.user.findFirst({
      where: { schoolId, role: 'teacher' },
    });
    const term1 = await this.prisma.academicTerm.findFirst({
      where: { schoolId, academicYearId: year.id, name: 'Term 1' },
    });

    if (!grade1 || !math || !eng || !term1) return;

    let classMath = await this.prisma.classSubject.findFirst({
      where: {
        schoolId,
        subjectId: math.id,
        gradeId: grade1.id,
        academicYearId: year.id,
      },
    });
    if (!classMath) {
      classMath = await this.prisma.classSubject.create({
        data: {
          schoolId,
          subjectId: math.id,
          gradeId: grade1.id,
          academicYearId: year.id,
          teacherId: teacher?.id ?? null,
        },
      });
    }

  }

  async ensureGradingScale(schoolId: string) {
    const existing = await this.prisma.gradingScale.findFirst({
      where: { schoolId, isDefault: true },
      include: { bands: true },
    });
    if (existing && existing.bands.length > 0) return existing;

    const scale = await this.prisma.gradingScale.create({
      data: {
        schoolId,
        name: 'Default',
        isDefault: true,
        bands: {
          create: DEFAULT_GRADING_BANDS.map((b) => ({
            letter: b.letter,
            minScore: b.minScore,
            maxScore: b.maxScore,
          })),
        },
      },
      include: { bands: true },
    });
    return scale;
  }

  private async getBands(schoolId: string): Promise<GradingBand[]> {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { schoolId, isDefault: true },
      include: { bands: { orderBy: { minScore: 'desc' } } },
    });
    if (!scale?.bands.length) {
      return DEFAULT_GRADING_BANDS;
    }
    return scale.bands.map((b) => ({
      letter: b.letter,
      minScore: b.minScore,
      maxScore: b.maxScore,
    }));
  }

  listTerms(schoolId: string, academicYearId?: string) {
    return this.prisma.academicTerm.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: { academicYear: { select: { name: true } } },
    });
  }

  async createTerm(schoolId: string, dto: CreateTermDto) {
    if (dto.isCurrent) {
      await this.prisma.academicTerm.updateMany({
        where: { schoolId },
        data: { isCurrent: false },
      });
    }
    return this.prisma.academicTerm.create({
      data: {
        schoolId,
        academicYearId: dto.academicYearId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  async updateTerm(schoolId: string, termId: string, dto: UpdateTermDto) {
    const existing = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
    });
    if (!existing) {
      throw new NotFoundException('Term not found');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (dto.isCurrent) {
      await this.prisma.academicTerm.updateMany({
        where: { schoolId, id: { not: termId } },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicTerm.update({
      where: { id: termId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.startDate !== undefined ? { startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
      },
      include: { academicYear: { select: { name: true } } },
    });
  }

  async deleteTerm(schoolId: string, termId: string) {
    const existing = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
    });
    if (!existing) {
      throw new NotFoundException('Term not found');
    }

    const [assessments, sheets, reports] = await Promise.all([
      this.prisma.assessment.count({ where: { termId } }),
      this.prisma.classSubjectTermSheet.count({ where: { termId } }),
      this.prisma.studentTermReport.count({ where: { termId } }),
    ]);

    if (assessments > 0 || sheets > 0 || reports > 0) {
      throw new BadRequestException(
        'This term has results or report data. Remove scores and unlink data before deleting.',
      );
    }

    await this.prisma.academicTerm.delete({ where: { id: termId } });
    return { deleted: true, id: termId };
  }

  listSubjects(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  createSubject(schoolId: string, dto: CreateSubjectDto) {
    return this.prisma.subject.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        isSystem: false,
        isCustomized: true,
      },
    });
  }

  async updateSubject(
    schoolId: string,
    subjectId: string,
    dto: { name?: string },
  ) {
    const existing = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });
    if (!existing) {
      throw new NotFoundException('Subject not found');
    }

    const name = dto.name?.trim();
    const data: {
      name?: string;
      isCustomized?: boolean;
    } = {};

    if (name) {
      data.name = name;
      if (existing.isSystem && name !== existing.name) {
        data.isCustomized = true;
      }
    }

    return this.prisma.subject.update({
      where: { id: subjectId },
      data,
    });
  }

  async listClassSubjects(
    schoolId: string,
    academicYearId?: string,
    userId?: string,
    role?: string,
  ) {
    const rows = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        subject: true,
        grade: true,
        section: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!userId || !role || role !== 'teacher') {
      return rows;
    }

    const visible: typeof rows = [];
    for (const cs of rows) {
      const ok = await this.teacherScope.canViewClassSubject(
        schoolId,
        userId,
        role,
        cs,
      );
      if (ok) visible.push(cs);
    }
    return visible;
  }

  createClassSubject(schoolId: string, dto: CreateClassSubjectDto) {
    return this.prisma.classSubject.create({
      data: {
        schoolId,
        subjectId: dto.subjectId,
        academicYearId: dto.academicYearId,
        gradeId: dto.gradeId,
        sectionId: dto.sectionId ?? null,
        teacherId: dto.teacherId ?? null,
        assessmentTemplateId: dto.assessmentTemplateId ?? null,
      },
      include: { subject: true, grade: true, section: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateClassSubject(
    schoolId: string,
    classSubjectId: string,
    data: {
      teacherId?: string | null;
      assessmentTemplateId?: string | null;
      weeklySessions?: number;
    },
  ) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
    });
    if (!cs) throw new NotFoundException('Class subject not found');

    if (data.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: data.teacherId, schoolId, role: 'teacher' },
      });
      if (!teacher) throw new BadRequestException('Teacher not found');
    }

    if (data.weeklySessions !== undefined) {
      if (data.weeklySessions < 1 || data.weeklySessions > 2) {
        throw new BadRequestException('Weekly sessions must be 1 or 2');
      }
    }

    return this.prisma.classSubject.update({
      where: { id: classSubjectId },
      data: {
        ...(data.teacherId !== undefined ? { teacherId: data.teacherId } : {}),
        ...(data.assessmentTemplateId !== undefined
          ? { assessmentTemplateId: data.assessmentTemplateId }
          : {}),
        ...(data.weeklySessions !== undefined
          ? { weeklySessions: data.weeklySessions }
          : {}),
      },
      include: {
        subject: true,
        grade: true,
        section: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listClassSubjectsByGrade(schoolId: string, gradeId: string, sectionId?: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    return this.prisma.classSubject.findMany({
      where: {
        schoolId,
        gradeId,
        ...(sectionId ? { sectionId } : {}),
        ...(year ? { academicYearId: year.id } : {}),
      },
      include: {
        subject: true,
        grade: true,
        section: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        assessmentTemplate: { select: { id: true, name: true } },
      },
      orderBy: { subject: { name: 'asc' } },
    });
  }

  async listAssessments(
    schoolId: string,
    termId: string,
    classSubjectId?: string,
    userId?: string,
    role?: string,
  ) {
    const rows = await this.prisma.assessment.findMany({
      where: {
        schoolId,
        termId,
        ...(classSubjectId ? { classSubjectId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: { classSubject: { include: { subject: true, grade: true, section: true } } },
    });

    if (!userId || role !== 'teacher') {
      return rows;
    }

    const allowed = await this.listClassSubjects(
      schoolId,
      undefined,
      userId,
      role,
    );
    const allowedIds = new Set(allowed.map((c) => c.id));
    return rows.filter((a) => allowedIds.has(a.classSubjectId));
  }

  async createAssessment(
    schoolId: string,
    dto: CreateAssessmentDto,
    userId?: string,
    role?: string,
  ) {
    if (userId && role === 'teacher') {
      await this.teacherScope.assertCanEditClassSubjectScores(
        schoolId,
        userId,
        role,
        dto.classSubjectId,
      );
    }

    return this.prisma.assessment.create({
      data: {
        schoolId,
        termId: dto.termId,
        classSubjectId: dto.classSubjectId,
        name: dto.name.trim(),
        maxScore: dto.maxScore ?? 100,
        weightPercent: dto.weightPercent ?? 100,
      },
    });
  }

  async getScoreGrid(
    schoolId: string,
    assessmentId: string,
    userId?: string,
    role?: string,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      include: {
        classSubject: { include: { grade: true, section: true, subject: true } },
        term: true,
      },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const cs = assessment.classSubject;
    if (userId && role === 'teacher') {
      await this.assertTeacherClassSubject(
        schoolId,
        userId,
        role,
        cs.gradeId,
        cs.sectionId,
      );
    }
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId: cs.gradeId,
        ...(cs.sectionId ? { sectionId: cs.sectionId } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { firstName: 'asc' } },
    });

    const scores = await this.prisma.studentAssessmentScore.findMany({
      where: { assessmentId },
    });
    const scoreMap = new Map(scores.map((s) => [s.studentProfileId, s.score]));

    return {
      assessment,
      students: students.map((s) => ({
        studentProfileId: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        score: scoreMap.get(s.id) ?? null,
      })),
    };
  }

  async bulkSaveScores(
    schoolId: string,
    dto: BulkScoresDto,
    userId?: string,
    role?: string,
  ) {
    await this.subscriptionsService.assertActive(schoolId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: dto.assessmentId, schoolId },
      include: { classSubject: true },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (userId && role === 'teacher') {
      await this.teacherScope.assertCanEditClassSubjectScores(
        schoolId,
        userId,
        role,
        assessment.classSubjectId,
      );
    }

    if (dto.scores.some((s) => s.score > assessment.maxScore)) {
      throw new BadRequestException(
        `Score cannot exceed max ${assessment.maxScore}`,
      );
    }

    await this.prisma.$transaction(
      dto.scores.map((entry) =>
        this.prisma.studentAssessmentScore.upsert({
          where: {
            assessmentId_studentProfileId: {
              assessmentId: dto.assessmentId,
              studentProfileId: entry.studentProfileId,
            },
          },
          create: {
            assessmentId: dto.assessmentId,
            studentProfileId: entry.studentProfileId,
            score: entry.score,
          },
          update: { score: entry.score },
        }),
      ),
    );

    return { saved: dto.scores.length };
  }

  async buildReportCard(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    viewerRole?: string,
  ) {
    if (viewerRole) {
      await this.workflow.assertAllClassSubjectsPublished(
        schoolId,
        studentProfileId,
        termId,
        viewerRole,
      );
    }

    const bands = await this.getBands(schoolId);

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

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, logoUrl: true },
    });

    const term = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
      include: { academicYear: true },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const termReport = await this.prisma.studentTermReport.findUnique({
      where: {
        studentProfileId_termId: { studentProfileId, termId },
      },
    });

    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        studentProfileId,
        periodNumber: 0,
        date: { gte: term.startDate, lte: term.endDate },
      },
    });
    const attTotal = attendanceRecords.length;
    const attPresent = attendanceRecords.filter(
      (r) =>
        r.status === AttendanceStatus.present ||
        r.status === AttendanceStatus.late ||
        r.status === AttendanceStatus.excused,
    ).length;
    const attendanceRate =
      attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;

    const subjectResults = await this.computeSubjectResults(
      schoolId,
      studentProfileId,
      termId,
      profile.gradeId,
      profile.sectionId,
      term.academicYearId,
      bands,
    );

    const overall =
      subjectResults.length > 0
        ? Math.round(
            (subjectResults.reduce((s, r) => s + r.average, 0) /
              subjectResults.length) *
              10,
          ) / 10
        : null;

    const classmates = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId: profile.gradeId,
        ...(profile.sectionId ? { sectionId: profile.sectionId } : {}),
      },
      select: { id: true },
    });

    const classAverages: { id: string; avg: number }[] = [];
    for (const cm of classmates) {
      const subs = await this.computeSubjectResults(
        schoolId,
        cm.id,
        termId,
        profile.gradeId,
        profile.sectionId,
        term.academicYearId,
        bands,
      );
      if (subs.length > 0) {
        const avg =
          subs.reduce((s, r) => s + r.average, 0) / subs.length;
        classAverages.push({ id: cm.id, avg });
      }
    }
    classAverages.sort((a, b) => b.avg - a.avg);
    const rank =
      overall != null
        ? classAverages.findIndex((c) => c.id === studentProfileId) + 1
        : null;

    return {
      school: { name: school?.name ?? 'School', logoUrl: school?.logoUrl ?? null },
      student: {
        profileId: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        studentId: profile.user.externalRef,
        grade: profile.grade.name,
        section: profile.section?.name ?? null,
      },
      term: {
        id: term.id,
        name: term.name,
        academicYear: term.academicYear.name,
      },
      subjects: subjectResults,
      overallAverage: overall,
      overallLetter: overall != null ? scoreToLetter(overall, bands) : null,
      rank: rank && rank > 0 ? rank : null,
      classSize: classmates.length,
      attendance: {
        rate: attendanceRate,
        present: attPresent,
        total: attTotal,
      },
      teacherComment: termReport?.teacherComment ?? null,
      principalComment: termReport?.principalComment ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  async upsertStudentTermReport(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    data: { teacherComment?: string; principalComment?: string },
  ) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
    });
    if (!profile) throw new NotFoundException('Student not found');

    return this.prisma.studentTermReport.upsert({
      where: {
        studentProfileId_termId: { studentProfileId, termId },
      },
      create: {
        schoolId,
        studentProfileId,
        termId,
        teacherComment: data.teacherComment?.trim() ?? null,
        principalComment: data.principalComment?.trim() ?? null,
      },
      update: {
        ...(data.teacherComment !== undefined
          ? { teacherComment: data.teacherComment.trim() || null }
          : {}),
        ...(data.principalComment !== undefined
          ? { principalComment: data.principalComment.trim() || null }
          : {}),
      },
    });
  }

  async getTermSubjectResults(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    gradeId: string,
    sectionId: string | null,
    academicYearId: string,
  ) {
    const bands = await this.getBands(schoolId);
    return this.computeSubjectResults(
      schoolId,
      studentProfileId,
      termId,
      gradeId,
      sectionId,
      academicYearId,
      bands,
    );
  }

  private async computeSubjectResults(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    gradeId: string,
    sectionId: string | null,
    academicYearId: string,
    bands: GradingBand[],
  ) {
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        gradeId,
        academicYearId,
        ...(sectionId ? { sectionId } : {}),
      },
      include: { subject: true },
    });

    const subjectResults: Array<{
      subject: string;
      assessments: {
        name: string;
        score: number;
        maxScore: number;
        weightPercent: number;
      }[];
      average: number;
      letter: string;
    }> = [];

    for (const cs of classSubjects) {
      const assessments = await this.prisma.assessment.findMany({
        where: { termId, classSubjectId: cs.id },
        include: {
          scores: { where: { studentProfileId } },
        },
        orderBy: { sortOrder: 'asc' },
      });

      const items = assessments
        .filter((a) => a.scores.length > 0)
        .map((a) => ({
          name: a.name,
          score: a.scores[0].score,
          maxScore: a.maxScore,
          weightPercent: a.weightPercent,
        }));

      const avg = weightedTermAverage(items);
      if (avg === null) continue;

      subjectResults.push({
        subject: cs.subject.name,
        assessments: items,
        average: avg,
        letter: scoreToLetter(avg, bands),
      });
    }

    return subjectResults;
  }

  renderReportCardHtml(printPayload: ReportCardPrintPayload) {
    return buildReportCardHtml(printPayload);
  }

  async buildReportCardHtmlDocument(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    viewerRole?: string,
    mode: ReportCardMode = 'term',
  ) {
    const report = await this.buildReportCard(
      schoolId,
      studentProfileId,
      termId,
      viewerRole,
    );
    const printPayload = await this.buildReportCardPrintPayload(
      schoolId,
      studentProfileId,
      termId,
      report,
      mode,
    );
    return this.renderReportCardHtml(printPayload);
  }

  async buildReportCardPrintPayload(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    report: Awaited<ReturnType<AcademicsService['buildReportCard']>>,
    mode: ReportCardMode = 'term',
  ): Promise<ReportCardPrintPayload> {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true, externalRef: true } },
        grade: { select: { name: true } },
        section: { select: { name: true } },
      },
    });
    if (!profile) throw new NotFoundException('Student not found');

    const school = (await this.prisma.school.findUnique({
      where: { id: schoolId },
    })) as {
      name: string;
      logoUrl: string | null;
      address: string | null;
      email: string | null;
      phone: string | null;
      reportCardTitle?: string | null;
      reportCardTagline?: string | null;
    } | null;

    const term = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
      include: { academicYear: true },
    });
    if (!term) throw new NotFoundException('Term not found');

    const bands = await this.getBands(schoolId);
    const yearTerms = await this.prisma.academicTerm.findMany({
      where: { schoolId, academicYearId: term.academicYearId },
      orderBy: { sortOrder: 'asc' },
    });

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
    const subjects = classSubjects.map((cs) => cs.subject.name);

    const termAverages: Array<Array<number | null>> = [];
    for (const yt of yearTerms) {
      const results = await this.computeSubjectResults(
        schoolId,
        studentProfileId,
        yt.id,
        profile.gradeId,
        profile.sectionId,
        term.academicYearId,
        bands,
      );
      const bySubject = new Map(results.map((r) => [r.subject, r.average]));
      termAverages.push(subjects.map((name) => bySubject.get(name) ?? null));
    }

    while (termAverages.length < 4) {
      termAverages.push(subjects.map(() => null));
    }

    const subjectGrid = buildSubjectGridRows(subjects, termAverages);

    const yearStart = yearTerms[0]?.startDate ?? term.startDate;
    const yearEnd = yearTerms[yearTerms.length - 1]?.endDate ?? term.endDate;
    const absentDays = await this.prisma.attendanceRecord.count({
      where: {
        schoolId,
        studentProfileId,
        periodNumber: 0,
        status: AttendanceStatus.absent,
        date: { gte: yearStart, lte: yearEnd },
      },
    });

    const termReports = await this.prisma.studentTermReport.findMany({
      where: {
        schoolId,
        studentProfileId,
        termId: { in: yearTerms.map((t) => t.id) },
      },
    });
    const commentByTerm = new Map(termReports.map((r) => [r.termId, r]));

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: {
        studentProfileId_academicYearId: {
          studentProfileId,
          academicYearId: term.academicYearId,
        },
      },
      include: { grade: { select: { name: true } } },
    });

    const nextEnrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        studentProfileId,
        academicYear: {
          startDate: { gt: term.academicYear.startDate },
        },
      },
      include: {
        grade: { select: { name: true } },
      },
      orderBy: { academicYear: { startDate: 'asc' } },
    });

    let promotion: ReportCardPromotion | null = null;
    if (
      enrollment &&
      (enrollment.promotionOutcome === 'PROMOTED' ||
        enrollment.promotionOutcome === 'GRADUATED' ||
        enrollment.promotionOutcome === 'RETAINED' ||
        enrollment.promotionOutcome === 'PASSED')
    ) {
      const enrolled = enrollment;
      const outcome = enrolled.promotionOutcome as ReportCardPromotion['outcome'];
      const nextGradeLabel =
        outcome === 'PROMOTED'
          ? (nextEnrollment?.grade.name ??
              enrolled.promotionNote?.trim() ??
              profile.grade.name)
          : outcome === 'RETAINED'
            ? enrolled.grade.name
            : null;
      const label =
        outcome === 'PROMOTED'
          ? nextGradeLabel
            ? `Promoted to ${nextGradeLabel}`
            : 'Promoted to next grade'
          : outcome === 'GRADUATED'
            ? 'Graduated'
            : outcome === 'RETAINED'
              ? `Retained in ${enrolled.grade.name}`
              : 'Passed';
      promotion = { outcome, label, nextGradeLabel };
    }

    const semester1Comment =
      commentByTerm.get(yearTerms[1]?.id ?? '')?.teacherComment ??
      commentByTerm.get(yearTerms[0]?.id ?? '')?.teacherComment ??
      null;
    const semester2Comment =
      commentByTerm.get(yearTerms[3]?.id ?? '')?.teacherComment ??
      commentByTerm.get(yearTerms[2]?.id ?? '')?.teacherComment ??
      null;
    const cumulativeComment =
      report.principalComment ??
      commentByTerm.get(yearTerms[yearTerms.length - 1]?.id ?? '')?.principalComment ??
      report.teacherComment ??
      null;

    const termSubjects = report.subjects.map((s) => ({
      subject: s.subject,
      average: s.average,
      letter: s.letter,
    }));

    const termAbsentDays = await this.prisma.attendanceRecord.count({
      where: {
        schoolId,
        studentProfileId,
        periodNumber: 0,
        status: AttendanceStatus.absent,
        date: { gte: term.startDate, lte: term.endDate },
      },
    });

    const emptyCol = { total: null as number | null, average: null as number | null };
    const termOnlySummary =
      mode === 'term'
        ? {
            term1: emptyCol,
            term2: emptyCol,
            semester1: emptyCol,
            term3: emptyCol,
            term4: emptyCol,
            semester2: emptyCol,
            cumulative: {
              total: null,
              average: report.overallAverage,
            },
            absentDays: termAbsentDays,
            conduct: report.overallLetter,
            rank: report.rank,
            classSize: report.classSize,
            attendanceRate: report.attendance.rate,
          }
        : buildSummaryFromGrid(
            subjectGrid,
            absentDays,
            report.overallLetter,
            report.rank,
            report.classSize,
            report.attendance.rate,
          );

    return {
      mode,
      school: {
        name: school?.name ?? report.school.name,
        logoUrl: school?.logoUrl ?? report.school.logoUrl ?? null,
        address: school?.address ?? null,
        email: school?.email ?? null,
        phone: school?.phone ?? null,
        headerTitle: school?.reportCardTitle ?? null,
        headerTagline: school?.reportCardTagline ?? null,
      },
      student: {
        name: report.student.name,
        number:
          profile.user.externalRef ??
          profile.fan ??
          profile.fcn ??
          profile.cardCode ??
          null,
        sex: formatGenderLabel(profile.gender),
        age: ageFromDateOfBirth(profile.dateOfBirth),
        gradeLabel: buildGradeSectionLabel(
          enrollment?.grade.name ?? profile.grade.name,
          profile.section?.name ?? null,
        ),
        academicYear: term.academicYear.name,
        cardCode: profile.cardCode,
        photoUrl: profile.photoUrl ?? null,
      },
      termName: term.name,
      promotion: mode === 'annual' ? promotion : null,
      promotionText: mode === 'annual' ? (promotion?.label ?? null) : null,
      subjectGrid: mode === 'annual' ? subjectGrid : [],
      termSubjects: mode === 'term' ? termSubjects : [],
      summary: termOnlySummary,
      remarks: {
        teacher: report.teacherComment,
        principal: report.principalComment,
        semester1: semester1Comment,
        semester2: semester2Comment,
        cumulative: cumulativeComment,
      },
      generatedAt: report.generatedAt,
    };
  }

  async exportResultsCsv(
    schoolId: string,
    termId: string,
    gradeId?: string,
  ) {
    const term = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
      include: { academicYear: { select: { id: true, name: true } } },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const bands = await this.getBands(schoolId);
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        ...(gradeId ? { gradeId } : {}),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            externalRef: true,
          },
        },
        grade: { select: { id: true, name: true } },
        section: { select: { name: true } },
      },
      orderBy: [
        { grade: { sortOrder: 'asc' } },
        { section: { name: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });

    const escape = (value: string | number | null | undefined) => {
      const text = value == null ? '' : String(value);
      if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = 'Student,Student ID,Grade,Section,Subject,Average,Letter';
    const lines: string[] = [header];

    for (const student of students) {
      const results = await this.computeSubjectResults(
        schoolId,
        student.id,
        termId,
        student.grade.id,
        student.sectionId,
        term.academicYearId,
        bands,
      );
      const name = `${student.user.firstName} ${student.user.lastName}`.trim();
      const studentId = student.user.externalRef ?? student.id;
      const grade = student.grade.name;
      const section = student.section?.name ?? '';

      if (results.length === 0) {
        lines.push(
          [
            escape(name),
            escape(studentId),
            escape(grade),
            escape(section),
            '',
            '',
            '',
          ].join(','),
        );
        continue;
      }

      for (const result of results) {
        lines.push(
          [
            escape(name),
            escape(studentId),
            escape(grade),
            escape(section),
            escape(result.subject),
            escape(result.average),
            escape(result.letter),
          ].join(','),
        );
      }
    }

    return lines.join('\n');
  }

  async listStudentReleasedScores(
    schoolId: string,
    studentProfileId: string,
    termId?: string,
  ) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
    });
    if (!profile) {
      throw new NotFoundException('Student not found');
    }

    const rows = await this.prisma.studentAssessmentScore.findMany({
      where: {
        studentProfileId,
        assessment: {
          schoolId,
          ...(termId ? { termId } : {}),
        },
      },
      include: {
        assessment: {
          include: {
            term: {
              select: {
                id: true,
                name: true,
                academicYear: { select: { name: true } },
              },
            },
            classSubject: {
              include: {
                subject: { select: { name: true } },
                grade: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => {
      const cs = row.assessment.classSubject;
      const section = cs.section?.name ? ` ${cs.section.name}` : '';
      return {
        id: row.id,
        assessmentId: row.assessmentId,
        assessmentName: row.assessment.name,
        subject: cs.subject.name,
        classLabel: `${cs.grade.name}${section}`,
        score: row.score,
        maxScore: row.assessment.maxScore,
        weightPercent: row.assessment.weightPercent,
        percentage: Math.round((row.score / row.assessment.maxScore) * 100),
        termId: row.assessment.term.id,
        termName: row.assessment.term.name,
        academicYear: row.assessment.term.academicYear.name,
        releasedAt: row.updatedAt.toISOString(),
      };
    });
  }

  async getReportCardAvailability(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    role: string,
  ) {
    if (role === 'admin' || role === 'staff' || role === 'teacher') {
      return { published: true, termId };
    }

    try {
      await this.workflow.assertAllClassSubjectsPublished(
        schoolId,
        studentProfileId,
        termId,
        role,
      );
      return { published: true, termId };
    } catch {
      return { published: false, termId };
    }
  }

  async resolveProfileId(
    role: string,
    userId: string,
    schoolId: string,
    requested?: string,
  ): Promise<string> {
    if (role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (!profile || profile.schoolId !== schoolId) {
        throw new NotFoundException('Student profile not found');
      }
      return profile.id;
    }
    if (!requested) {
      throw new NotFoundException('studentProfileId is required');
    }
    await this.assertCanViewStudent(role, userId, schoolId, requested);
    return requested;
  }

  async assertCanViewStudent(
    role: string,
    userId: string,
    schoolId: string,
    studentProfileId: string,
  ) {
    if (role === 'admin' || role === 'staff') return;

    if (role === 'teacher') {
      const profile = await this.prisma.studentProfile.findFirst({
        where: { id: studentProfileId, schoolId },
      });
      if (!profile) {
        throw new NotFoundException('Student not found');
      }
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
      return;
    }
    if (role === 'student') {
      const p = await this.prisma.studentProfile.findFirst({
        where: { id: studentProfileId, userId, schoolId },
      });
      if (!p) throw new NotFoundException('Student not found');
      return;
    }
    if (role === 'parent') {
      const link = await this.prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: { parentId: userId, studentId: studentProfileId },
        },
      });
      if (!link) throw new NotFoundException('Not allowed');
      return;
    }
    throw new NotFoundException('Not allowed');
  }
}
