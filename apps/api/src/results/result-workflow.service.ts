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

  /** Teachers edit unlocked components until admin locks them; only published is fully frozen. */
  async assertCanSaveScores(
    schoolId: string,
    termId: string,
    classSubjectId: string,
    role?: string,
  ) {
    const sheet = await this.getOrCreateSheet(schoolId, termId, classSubjectId);

    if (role === 'teacher') {
      if (sheet.status === ResultWorkflowStatus.PUBLISHED) {
        throw new BadRequestException(
          'This score sheet is published and cannot be edited.',
        );
      }
      return sheet;
    }

    if (sheet.status === ResultWorkflowStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published sheets cannot be edited. Reopen the sheet first.',
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

    const savedScores = await this.countSheetScores(
      schoolId,
      termId,
      classSubjectId,
    );
    if (savedScores === 0) {
      throw new BadRequestException(
        'Enter and save at least one score before submitting',
      );
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

    await this.assertSheetHasScores(schoolId, termId, classSubjectId);

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

    await this.notifyParentsOfClassSubjectPublish(
      schoolId,
      termId,
      classSubjectId,
    );

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

  async approveBulk(
    schoolId: string,
    userId: string,
    termId?: string,
    sheetIds?: string[],
  ) {
    const result = await this.prisma.classSubjectTermSheet.updateMany({
      where: {
        schoolId,
        status: ResultWorkflowStatus.SUBMITTED,
        ...(termId ? { termId } : {}),
        ...(sheetIds?.length ? { id: { in: sheetIds } } : {}),
      },
      data: {
        status: ResultWorkflowStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
    return { approved: result.count };
  }

  async publishBulk(
    schoolId: string,
    userId: string,
    termId?: string,
    sheetIds?: string[],
  ) {
    const candidates = await this.prisma.classSubjectTermSheet.findMany({
      where: {
        schoolId,
        status: {
          in: [
            ResultWorkflowStatus.APPROVED,
            ResultWorkflowStatus.SUBMITTED,
          ],
        },
        ...(termId ? { termId } : {}),
        ...(sheetIds?.length ? { id: { in: sheetIds } } : {}),
      },
      select: { id: true, termId: true, classSubjectId: true, status: true },
    });

    const publishable: typeof candidates = [];
    for (const sheet of candidates) {
      const count = await this.countSheetScores(
        schoolId,
        sheet.termId,
        sheet.classSubjectId,
      );
      if (count > 0) publishable.push(sheet);
    }

    if (publishable.length === 0) {
      return {
        published: 0,
        skipped: candidates.length,
      };
    }

    const now = new Date();
    const publishableIds = publishable.map((s) => s.id);

    const [fromApproved, fromSubmitted] = await this.prisma.$transaction([
      this.prisma.classSubjectTermSheet.updateMany({
        where: {
          id: { in: publishableIds },
          status: ResultWorkflowStatus.APPROVED,
        },
        data: {
          status: ResultWorkflowStatus.PUBLISHED,
          publishedBy: userId,
          publishedAt: now,
        },
      }),
      this.prisma.classSubjectTermSheet.updateMany({
        where: {
          id: { in: publishableIds },
          status: ResultWorkflowStatus.SUBMITTED,
        },
        data: {
          status: ResultWorkflowStatus.PUBLISHED,
          publishedBy: userId,
          publishedAt: now,
          approvedBy: userId,
          approvedAt: now,
        },
      }),
    ]);

    await this.notifyParentsOfBulkPublish(schoolId, publishable);

    return {
      published: fromApproved.count + fromSubmitted.count,
      skipped: candidates.length - publishable.length,
    };
  }

  listPending(
    schoolId: string,
    status?: ResultWorkflowStatus,
    termId?: string,
  ) {
    return this.prisma.classSubjectTermSheet.findMany({
      where: {
        schoolId,
        ...(status ? { status } : { status: ResultWorkflowStatus.SUBMITTED }),
        ...(termId ? { termId } : {}),
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

  /**
   * Admin shortcut: publish every scored class sheet for this student's
   * grade/section/term so the family report card unlocks (DRAFT allowed).
   */
  async publishReportCardsForStudent(
    schoolId: string,
    userId: string,
    studentProfileId: string,
    termId: string,
  ) {
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
      include: { subject: { select: { name: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    const now = new Date();
    let published = 0;
    let alreadyPublished = 0;
    let skippedEmpty = 0;
    const subjects: Array<{ name: string; status: string }> = [];

    for (const cs of classSubjects) {
      const sheet = await this.getOrCreateSheet(schoolId, termId, cs.id);
      if (sheet.status === ResultWorkflowStatus.PUBLISHED) {
        alreadyPublished += 1;
        subjects.push({ name: cs.subject.name, status: 'PUBLISHED' });
        continue;
      }

      const scoreCount = await this.countSheetScores(schoolId, termId, cs.id);
      if (scoreCount === 0) {
        skippedEmpty += 1;
      }

      await this.prisma.classSubjectTermSheet.update({
        where: { id: sheet.id },
        data: {
          status: ResultWorkflowStatus.PUBLISHED,
          publishedBy: userId,
          publishedAt: now,
          approvedBy: sheet.approvedAt ? undefined : userId,
          approvedAt: sheet.approvedAt ?? now,
          submittedBy: sheet.submittedAt ? undefined : userId,
          submittedAt: sheet.submittedAt ?? now,
        },
      });
      published += 1;
      subjects.push({
        name: cs.subject.name,
        status: scoreCount === 0 ? 'PUBLISHED_EMPTY' : 'PUBLISHED',
      });
    }

    const total = classSubjects.length;
    const familyVisible = total > 0 && alreadyPublished + published === total;

    if (published > 0) {
      await this.notifyParentsOfStudentResultsPublish(
        schoolId,
        studentProfileId,
        term.name,
        {
          subjectCount: alreadyPublished + published,
          reportCardReady: familyVisible,
        },
      );
    }

    return {
      published,
      alreadyPublished,
      emptyPublished: skippedEmpty,
      total,
      familyVisible,
      subjects,
    };
  }

  async getReportCardPublishStatus(
    schoolId: string,
    studentProfileId: string,
    termId: string,
  ) {
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
      include: { subject: { select: { name: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    let publishedCount = 0;
    let withScores = 0;
    let unpublishedCount = 0;
    const subjects: Array<{
      name: string;
      status: ResultWorkflowStatus | 'MISSING';
      hasScores: boolean;
    }> = [];

    for (const cs of classSubjects) {
      const sheet = await this.prisma.classSubjectTermSheet.findUnique({
        where: {
          termId_classSubjectId: { termId, classSubjectId: cs.id },
        },
      });
      const scoreCount = await this.countSheetScores(schoolId, termId, cs.id);
      const hasScores = scoreCount > 0;
      if (hasScores) withScores += 1;
      const status = sheet?.status ?? null;
      if (status === ResultWorkflowStatus.PUBLISHED) {
        publishedCount += 1;
      } else {
        unpublishedCount += 1;
      }
      subjects.push({
        name: cs.subject.name,
        status: status ?? 'MISSING',
        hasScores,
      });
    }

    return {
      published: classSubjects.length > 0 && unpublishedCount === 0,
      publishedCount,
      total: classSubjects.length,
      withScores,
      unpublishedCount,
      canPublish: unpublishedCount > 0,
      subjects,
    };
  }

  private countSheetScores(
    schoolId: string,
    termId: string,
    classSubjectId: string,
  ) {
    return this.prisma.studentAssessmentScore.count({
      where: {
        assessment: { schoolId, termId, classSubjectId },
      },
    });
  }

  private async assertSheetHasScores(
    schoolId: string,
    termId: string,
    classSubjectId: string,
  ) {
    const count = await this.countSheetScores(
      schoolId,
      termId,
      classSubjectId,
    );
    if (count === 0) {
      throw new BadRequestException(
        'Cannot publish — no scores have been entered for this class',
      );
    }
  }

  private async assertTeacherAccess(
    schoolId: string,
    classSubjectId: string,
    userId: string,
    role: string,
  ) {
    if (role !== 'teacher') return;

    await this.teacherScope.assertCanEditClassSubjectScores(
      schoolId,
      userId,
      role,
      classSubjectId,
    );
  }

  /**
   * Alert linked parents that a subject's results are now officially published.
   */
  private async notifyParentsOfClassSubjectPublish(
    schoolId: string,
    termId: string,
    classSubjectId: string,
  ) {
    const [cs, term, scored] = await Promise.all([
      this.prisma.classSubject.findFirst({
        where: { id: classSubjectId, schoolId },
        include: { subject: { select: { name: true } } },
      }),
      this.prisma.academicTerm.findFirst({
        where: { id: termId, schoolId },
        select: { name: true },
      }),
      this.prisma.studentAssessmentScore.findMany({
        where: {
          assessment: { schoolId, termId, classSubjectId },
        },
        select: { studentProfileId: true },
        distinct: ['studentProfileId'],
      }),
    ]);
    if (!cs || scored.length === 0) return;

    const studentIds = scored.map((s) => s.studentProfileId);
    const [students, links] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: {
          id: { in: studentIds },
          schoolId,
          parentsCanViewResults: true,
        },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { parentId: true, studentId: true },
      }),
    ]);
    if (students.length === 0 || links.length === 0) return;

    const allowedIds = new Set(students.map((s) => s.id));
    const nameById = new Map(
      students.map((s) => [
        s.id,
        `${s.user.firstName} ${s.user.lastName}`.trim(),
      ]),
    );
    const subjectName = cs.subject.name;
    const termName = term?.name ?? 'this term';

    await this.prisma.parentNotification.createMany({
      data: links
        .filter((link) => allowedIds.has(link.studentId))
        .map((link) => {
          const child = nameById.get(link.studentId) ?? 'your child';
          return {
            schoolId,
            parentId: link.parentId,
            studentProfileId: link.studentId,
            title: `Results published — ${subjectName}`,
            body: `${subjectName} results for ${child} are now published (${termName}). Open Results to review the scores.`,
          };
        }),
    });
  }

  /**
   * Bulk publish: one notification per student listing published subjects.
   */
  private async notifyParentsOfBulkPublish(
    schoolId: string,
    sheets: Array<{ termId: string; classSubjectId: string }>,
  ) {
    if (sheets.length === 0) return;

    const classSubjectIds = [...new Set(sheets.map((s) => s.classSubjectId))];
    const termIds = [...new Set(sheets.map((s) => s.termId))];

    const [classSubjects, terms, scores] = await Promise.all([
      this.prisma.classSubject.findMany({
        where: { id: { in: classSubjectIds }, schoolId },
        include: { subject: { select: { name: true } } },
      }),
      this.prisma.academicTerm.findMany({
        where: { id: { in: termIds }, schoolId },
        select: { id: true, name: true },
      }),
      this.prisma.studentAssessmentScore.findMany({
        where: {
          assessment: {
            schoolId,
            OR: sheets.map((s) => ({
              termId: s.termId,
              classSubjectId: s.classSubjectId,
            })),
          },
        },
        select: {
          studentProfileId: true,
          assessment: {
            select: {
              termId: true,
              classSubjectId: true,
            },
          },
        },
      }),
    ]);

    if (scores.length === 0) return;

    const subjectByCs = new Map(
      classSubjects.map((cs) => [cs.id, cs.subject.name]),
    );
    const termById = new Map(terms.map((t) => [t.id, t.name]));

    const byStudent = new Map<
      string,
      { subjects: Set<string>; termNames: Set<string> }
    >();
    for (const row of scores) {
      const subject = subjectByCs.get(row.assessment.classSubjectId);
      if (!subject) continue;
      let bucket = byStudent.get(row.studentProfileId);
      if (!bucket) {
        bucket = { subjects: new Set(), termNames: new Set() };
        byStudent.set(row.studentProfileId, bucket);
      }
      bucket.subjects.add(subject);
      const termName = termById.get(row.assessment.termId);
      if (termName) bucket.termNames.add(termName);
    }

    const studentIds = [...byStudent.keys()];
    const [students, links] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: {
          id: { in: studentIds },
          schoolId,
          parentsCanViewResults: true,
        },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { parentId: true, studentId: true },
      }),
    ]);
    if (students.length === 0 || links.length === 0) return;

    const allowedIds = new Set(students.map((s) => s.id));
    const nameById = new Map(
      students.map((s) => [
        s.id,
        `${s.user.firstName} ${s.user.lastName}`.trim(),
      ]),
    );

    await this.prisma.parentNotification.createMany({
      data: links
        .filter((link) => allowedIds.has(link.studentId))
        .map((link) => {
          const info = byStudent.get(link.studentId);
          const child = nameById.get(link.studentId) ?? 'your child';
          const subjects = info ? [...info.subjects].sort() : [];
          const termLabel = info
            ? [...info.termNames].join(', ') || 'this term'
            : 'this term';
          const subjectLabel =
            subjects.length <= 3
              ? subjects.join(', ')
              : `${subjects.slice(0, 3).join(', ')} +${subjects.length - 3} more`;
          return {
            schoolId,
            parentId: link.parentId,
            studentProfileId: link.studentId,
            title: `Results published for ${child}`,
            body: `${subjectLabel || 'Subject'} results are now published (${termLabel}). Open Results in the parent portal to review.`,
          };
        }),
    });
  }

  private async notifyParentsOfStudentResultsPublish(
    schoolId: string,
    studentProfileId: string,
    termName: string,
    options: { subjectCount: number; reportCardReady: boolean },
  ) {
    const [student, links] = await Promise.all([
      this.prisma.studentProfile.findFirst({
        where: {
          id: studentProfileId,
          schoolId,
          parentsCanViewResults: true,
        },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.parentStudent.findMany({
        where: { studentId: studentProfileId },
        select: { parentId: true },
      }),
    ]);
    if (!student || links.length === 0) return;

    const child = `${student.user.firstName} ${student.user.lastName}`.trim();
    const title = options.reportCardReady
      ? `Report card ready — ${child}`
      : `Results published — ${child}`;
    const body = options.reportCardReady
      ? `${termName} results for ${child} are published (${options.subjectCount} subjects). The official report card is now available.`
      : `${termName} results for ${child} were published (${options.subjectCount} subjects). Open Results to review.`;

    await this.prisma.parentNotification.createMany({
      data: links.map((link) => ({
        schoolId,
        parentId: link.parentId,
        studentProfileId,
        title,
        body,
      })),
    });
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
