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
      },
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

    const scopes = await this.teacherScope.getClassScopes(schoolId, userId, role);
    if (scopes === null) {
      return rows;
    }

    return rows.filter((cs) => {
      if (cs.teacherId === userId) {
        return true;
      }
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
    data: { teacherId?: string | null; assessmentTemplateId?: string | null },
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

    return this.prisma.classSubject.update({
      where: { id: classSubjectId },
      data: {
        ...(data.teacherId !== undefined ? { teacherId: data.teacherId } : {}),
        ...(data.assessmentTemplateId !== undefined
          ? { assessmentTemplateId: data.assessmentTemplateId }
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
      const cs = await this.prisma.classSubject.findFirst({
        where: { id: dto.classSubjectId, schoolId },
      });
      if (!cs) {
        throw new NotFoundException('Class subject not found');
      }
      await this.assertTeacherClassSubject(
        schoolId,
        userId,
        role,
        cs.gradeId,
        cs.sectionId,
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
      await this.assertTeacherClassSubject(
        schoolId,
        userId,
        role,
        assessment.classSubject.gradeId,
        assessment.classSubject.sectionId,
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

  buildReportCardHtml(
    report: Awaited<ReturnType<AcademicsService['buildReportCard']>>,
  ) {
    const rows = report.subjects
      .map(
        (s) => `
      <tr>
        <td>${s.subject}</td>
        <td>${s.assessments.map((a) => `${a.name}: ${a.score}/${a.maxScore}`).join('<br/>')}</td>
        <td><strong>${s.average}%</strong></td>
        <td><strong>${s.letter}</strong></td>
      </tr>`,
      )
      .join('');

    const logo = report.school.logoUrl
      ? `<img src="${report.school.logoUrl}" alt="" style="max-height:56px;margin-bottom:0.5rem"/>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Report Card — ${report.student.name}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; color: #1a2e2e; }
    h1 { color: #2a6f6f; margin: 0; font-size: 1.5rem; }
    .meta { color: #666; margin: 0.5rem 0 1.5rem; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #e8f4f4; }
    .summary { background: #f4f9f9; padding: 1rem; border-radius: 8px; margin-top: 1.5rem; }
    .comment { margin-top: 1rem; font-size: 0.95rem; }
    .sig { margin-top: 2.5rem; display: flex; justify-content: space-between; }
    .sig div { border-top: 1px solid #333; width: 40%; padding-top: 0.25rem; font-size: 0.85rem; }
    @media print { body { margin: 0.5in; } }
  </style>
</head>
<body>
  ${logo}
  <h1>${report.school.name}</h1>
  <p class="meta">Official Report Card · ${report.term.academicYear} · ${report.term.name}</p>
  <p><strong>${report.student.name}</strong><br/>
  ${report.student.grade}${report.student.section ? ` · Section ${report.student.section}` : ''}
  ${report.student.studentId ? `<br/>ID: ${report.student.studentId}` : ''}</p>
  <table>
    <thead><tr><th>Subject</th><th>Assessments</th><th>Average</th><th>Grade</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">No scores recorded yet.</td></tr>'}</tbody>
  </table>
  <div class="summary">
    <p><strong>Overall average:</strong> ${report.overallAverage ?? '—'}% 
    ${report.overallLetter ? `(${report.overallLetter})` : ''}</p>
    ${report.rank ? `<p><strong>Class rank:</strong> ${report.rank} of ${report.classSize}</p>` : ''}
    ${report.attendance.rate != null ? `<p><strong>Attendance:</strong> ${report.attendance.rate}% (${report.attendance.present}/${report.attendance.total} days)</p>` : ''}
    ${report.teacherComment ? `<div class="comment"><strong>Teacher comment:</strong><br/>${report.teacherComment}</div>` : ''}
    ${report.principalComment ? `<div class="comment"><strong>Principal comment:</strong><br/>${report.principalComment}</div>` : ''}
    <div class="sig">
      <div>Homeroom teacher signature</div>
      <div>Principal signature</div>
    </div>
    <p style="font-size:0.8rem;color:#888;margin-top:1rem">Generated ${new Date(report.generatedAt).toLocaleString()}</p>
  </div>
</body>
</html>`;
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
