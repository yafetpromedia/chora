import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResultWorkflowStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherScopeService } from '../teachers/teacher-scope.service';

@Injectable()
export class ResultWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherScope: TeacherScopeService,
  ) {}

  async getOrCreateSheet(
    schoolId: string,
    termId: string,
    classSubjectId: string,
  ) {
    const existing = await this.prisma.classSubjectTermSheet.findUnique({
      where: { termId_classSubjectId: { termId, classSubjectId } },
      include: {
        submitter: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });
    if (existing) return this.formatSheet(existing);

    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
    });
    if (!cs) throw new NotFoundException('Class subject not found');

    const created = await this.prisma.classSubjectTermSheet.create({
      data: {
        schoolId,
        termId,
        classSubjectId,
        status: ResultWorkflowStatus.DRAFT,
      },
      include: {
        submitter: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });
    return this.formatSheet(created);
  }

  async assertEditable(
    schoolId: string,
    termId: string,
    classSubjectId: string,
  ) {
    const sheet = await this.getOrCreateSheet(schoolId, termId, classSubjectId);
    if (
      sheet.status === ResultWorkflowStatus.SUBMITTED ||
      sheet.status === ResultWorkflowStatus.APPROVED ||
      sheet.status === ResultWorkflowStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        `Scores are locked while status is ${sheet.status}. Request unlock from academic office.`,
      );
    }
    return sheet;
  }

  async submit(
    schoolId: string,
    termId: string,
    classSubjectId: string,
    userId: string,
    role: string,
  ) {
    await this.assertTeacherAccess(schoolId, classSubjectId, userId, role);
    const sheet = await this.getOrCreateSheet(schoolId, termId, classSubjectId);

    if (sheet.status !== ResultWorkflowStatus.DRAFT) {
      throw new BadRequestException('Only draft sheets can be submitted');
    }

    const updated = await this.prisma.classSubjectTermSheet.update({
      where: { id: sheet.id },
      data: {
        status: ResultWorkflowStatus.SUBMITTED,
        submittedBy: userId,
        submittedAt: new Date(),
      },
      include: {
        submitter: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });
    return this.formatSheet(updated);
  }

  async approve(
    schoolId: string,
    termId: string,
    classSubjectId: string,
    userId: string,
    notes?: string,
  ) {
    const sheet = await this.getOrCreateSheet(schoolId, termId, classSubjectId);
    if (sheet.status !== ResultWorkflowStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted sheets can be approved');
    }

    const updated = await this.prisma.classSubjectTermSheet.update({
      where: { id: sheet.id },
      data: {
        status: ResultWorkflowStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
        reviewerNotes: notes?.trim() ?? null,
      },
      include: {
        submitter: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });
    return this.formatSheet(updated);
  }

  async publish(
    schoolId: string,
    termId: string,
    classSubjectId: string,
    userId: string,
  ) {
    const sheet = await this.getOrCreateSheet(schoolId, termId, classSubjectId);
    if (
      sheet.status !== ResultWorkflowStatus.APPROVED &&
      sheet.status !== ResultWorkflowStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Sheet must be approved (or submitted) before publishing',
      );
    }

    const updated = await this.prisma.classSubjectTermSheet.update({
      where: { id: sheet.id },
      data: {
        status: ResultWorkflowStatus.PUBLISHED,
        publishedBy: userId,
        publishedAt: new Date(),
        ...(sheet.status === ResultWorkflowStatus.SUBMITTED
          ? { approvedBy: userId, approvedAt: new Date() }
          : {}),
      },
      include: {
        submitter: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });
    return this.formatSheet(updated);
  }

  async reopen(
    schoolId: string,
    termId: string,
    classSubjectId: string,
  ) {
    const sheet = await this.getOrCreateSheet(schoolId, termId, classSubjectId);
    const updated = await this.prisma.classSubjectTermSheet.update({
      where: { id: sheet.id },
      data: {
        status: ResultWorkflowStatus.DRAFT,
        submittedAt: null,
        submittedBy: null,
        approvedAt: null,
        approvedBy: null,
        publishedAt: null,
        publishedBy: null,
      },
      include: {
        submitter: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });
    return this.formatSheet(updated);
  }

  listPending(schoolId: string, status?: ResultWorkflowStatus) {
    return this.prisma.classSubjectTermSheet.findMany({
      where: {
        schoolId,
        ...(status ? { status } : { status: ResultWorkflowStatus.SUBMITTED }),
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        term: { select: { name: true } },
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
        submitter: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async assertReportVisible(
    schoolId: string,
    termId: string,
    classSubjectId: string,
    role: string,
  ) {
    if (role === 'admin' || role === 'staff' || role === 'teacher') {
      return;
    }
    const sheet = await this.prisma.classSubjectTermSheet.findUnique({
      where: { termId_classSubjectId: { termId, classSubjectId } },
    });
    if (!sheet || sheet.status !== ResultWorkflowStatus.PUBLISHED) {
      throw new ForbiddenException('Report card not published yet');
    }
  }

  async assertAllClassSubjectsPublished(
    schoolId: string,
    studentProfileId: string,
    termId: string,
    role: string,
  ) {
    if (role === 'admin' || role === 'staff' || role === 'teacher') {
      return;
    }

    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
    });
    if (!profile) throw new NotFoundException('Student not found');

    const term = await this.prisma.academicTerm.findFirst({
      where: { id: termId, schoolId },
    });
    if (!term) throw new NotFoundException('Term not found');

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        gradeId: profile.gradeId,
        academicYearId: term.academicYearId,
        ...(profile.sectionId ? { sectionId: profile.sectionId } : {}),
      },
    });

    for (const cs of classSubjects) {
      await this.assertReportVisible(schoolId, termId, cs.id, role);
    }
  }

  private async assertTeacherAccess(
    schoolId: string,
    classSubjectId: string,
    userId: string,
    role: string,
  ) {
    if (role !== 'teacher') return;

    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
    });
    if (!cs) throw new NotFoundException('Class subject not found');

    const scopes = await this.teacherScope.getClassScopes(schoolId, userId, role);
    this.teacherScope.assertCanAccessClass(scopes, cs.gradeId, cs.sectionId);
  }

  private formatSheet(sheet: {
    id: string;
    status: ResultWorkflowStatus;
    submittedAt: Date | null;
    approvedAt: Date | null;
    publishedAt: Date | null;
    reviewerNotes: string | null;
    submitter: { firstName: string; lastName: string } | null;
    approver: { firstName: string; lastName: string } | null;
  }) {
    return {
      id: sheet.id,
      status: sheet.status,
      submittedAt: sheet.submittedAt,
      approvedAt: sheet.approvedAt,
      publishedAt: sheet.publishedAt,
      reviewerNotes: sheet.reviewerNotes,
      submittedByName: sheet.submitter
        ? `${sheet.submitter.firstName} ${sheet.submitter.lastName}`
        : null,
      approvedByName: sheet.approver
        ? `${sheet.approver.firstName} ${sheet.approver.lastName}`
        : null,
    };
  }
}
