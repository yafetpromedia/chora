import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ResultWorkflowStatus,
  ScoreCorrectionStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherScopeService } from '../teachers/teacher-scope.service';
import { AcademicsService } from './academics.service';
import { CreateScoreCorrectionDto } from './dto/create-score-correction.dto';
import { ProposeScoreCorrectionDto } from './dto/propose-score-correction.dto';
import { ReviewScoreCorrectionDto } from './dto/review-score-correction.dto';

const correctionInclude = {
  assessment: { select: { id: true, name: true, maxScore: true } },
  term: { select: { id: true, name: true } },
  classSubject: {
    select: {
      id: true,
      teacherId: true,
      subject: { select: { name: true } },
      grade: { select: { name: true } },
      section: { select: { name: true } },
    },
  },
  studentProfile: {
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true, externalRef: true } },
    },
  },
  reportedBy: {
    select: { id: true, firstName: true, lastName: true, role: true },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true },
  },
  reviewedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} satisfies Prisma.ScoreCorrectionRequestInclude;

@Injectable()
export class ScoreCorrectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academics: AcademicsService,
    private readonly teacherScope: TeacherScopeService,
  ) {}

  async create(
    schoolId: string,
    userId: string,
    role: string,
    dto: CreateScoreCorrectionDto,
  ) {
    if (role !== 'student' && role !== 'parent') {
      throw new ForbiddenException('Only students or parents can report scores');
    }

    const studentProfileId = await this.academics.resolveProfileId(
      role,
      userId,
      schoolId,
      dto.studentProfileId,
    );

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: dto.assessmentId, schoolId },
      include: {
        classSubject: { select: { id: true, teacherId: true } },
      },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const sheet = await this.prisma.classSubjectTermSheet.findUnique({
      where: {
        termId_classSubjectId: {
          termId: assessment.termId,
          classSubjectId: assessment.classSubjectId,
        },
      },
    });
    if (!sheet || sheet.status !== ResultWorkflowStatus.PUBLISHED) {
      throw new BadRequestException(
        'You can only report issues on published scores',
      );
    }

    const existing = await this.prisma.scoreCorrectionRequest.findFirst({
      where: {
        schoolId,
        assessmentId: assessment.id,
        studentProfileId,
        status: {
          in: [ScoreCorrectionStatus.OPEN, ScoreCorrectionStatus.PROPOSED],
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'A correction request is already open for this score',
      );
    }

    const current = await this.prisma.studentAssessmentScore.findUnique({
      where: {
        assessmentId_studentProfileId: {
          assessmentId: assessment.id,
          studentProfileId,
        },
      },
    });

    const created = await this.prisma.scoreCorrectionRequest.create({
      data: {
        schoolId,
        termId: assessment.termId,
        classSubjectId: assessment.classSubjectId,
        assessmentId: assessment.id,
        studentProfileId,
        reportedById: userId,
        teacherId: assessment.classSubject.teacherId,
        message: dto.message.trim(),
        currentScore: current?.score ?? null,
        status: ScoreCorrectionStatus.OPEN,
      },
      include: correctionInclude,
    });

    if (assessment.classSubject.teacherId) {
      await this.notifyUser(
        schoolId,
        assessment.classSubject.teacherId,
        userId,
        `Score report: ${assessment.name}`,
        `${this.studentName(created)} reported a problem with a published score. Open Results → Score reports to respond.`,
      );
    }

    return this.serialize(created);
  }

  async list(
    schoolId: string,
    userId: string,
    role: string,
    opts?: { status?: ScoreCorrectionStatus; termId?: string },
  ) {
    const where: Prisma.ScoreCorrectionRequestWhereInput = {
      schoolId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.termId ? { termId: opts.termId } : {}),
    };

    if (role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (!profile || profile.schoolId !== schoolId) {
        return [];
      }
      where.studentProfileId = profile.id;
    } else if (role === 'parent') {
      const links = await this.prisma.parentStudent.findMany({
        where: { parentId: userId, student: { schoolId } },
        select: { studentId: true },
      });
      where.studentProfileId = { in: links.map((l) => l.studentId) };
    } else if (role === 'teacher') {
      where.OR = [
        { teacherId: userId },
        { classSubject: { teacherId: userId } },
      ];
    } else if (role !== 'admin' && role !== 'staff') {
      throw new ForbiddenException();
    }

    const rows = await this.prisma.scoreCorrectionRequest.findMany({
      where,
      include: correctionInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return rows.map((r) => this.serialize(r));
  }

  async propose(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
    dto: ProposeScoreCorrectionDto,
  ) {
    const row = await this.findOwned(schoolId, id);
    if (row.status !== ScoreCorrectionStatus.OPEN) {
      throw new BadRequestException('Only open reports can receive a proposal');
    }

    await this.assertTeacherCanHandle(schoolId, userId, role, row);

    if (dto.proposedScore > row.assessment.maxScore) {
      throw new BadRequestException(
        `Score cannot exceed ${row.assessment.maxScore}`,
      );
    }

    const updated = await this.prisma.scoreCorrectionRequest.update({
      where: { id },
      data: {
        proposedScore: dto.proposedScore,
        status: ScoreCorrectionStatus.PROPOSED,
        teacherId: row.teacherId ?? userId,
        ...(dto.replyNote?.trim()
          ? { reviewNote: dto.replyNote.trim() }
          : {}),
      },
      include: correctionInclude,
    });

    return this.serialize(updated);
  }

  async approve(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
    dto: ReviewScoreCorrectionDto,
  ) {
    if (role !== 'admin' && role !== 'staff') {
      throw new ForbiddenException('Only admin or staff can approve');
    }

    const row = await this.findOwned(schoolId, id);
    if (row.status !== ScoreCorrectionStatus.PROPOSED) {
      throw new BadRequestException('Only proposed corrections can be approved');
    }
    if (row.proposedScore == null) {
      throw new BadRequestException('Proposed score is missing');
    }
    if (row.proposedScore > row.assessment.maxScore) {
      throw new BadRequestException(
        `Score cannot exceed ${row.assessment.maxScore}`,
      );
    }

    const sheet = await this.prisma.classSubjectTermSheet.findUnique({
      where: {
        termId_classSubjectId: {
          termId: row.termId,
          classSubjectId: row.classSubjectId,
        },
      },
    });
    if (!sheet || sheet.status !== ResultWorkflowStatus.PUBLISHED) {
      throw new BadRequestException(
        'Sheet must still be published to apply a correction',
      );
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.studentAssessmentScore.upsert({
        where: {
          assessmentId_studentProfileId: {
            assessmentId: row.assessmentId,
            studentProfileId: row.studentProfileId,
          },
        },
        create: {
          assessmentId: row.assessmentId,
          studentProfileId: row.studentProfileId,
          score: row.proposedScore,
        },
        update: { score: row.proposedScore },
      }),
      this.prisma.scoreCorrectionRequest.update({
        where: { id },
        data: {
          status: ScoreCorrectionStatus.APPROVED,
          reviewedById: userId,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || row.reviewNote,
        },
        include: correctionInclude,
      }),
    ]);

    await this.notifyUser(
      schoolId,
      row.reportedById,
      userId,
      `Score corrected: ${row.assessment.name}`,
      `Your report was approved. The published score is now ${row.proposedScore}/${row.assessment.maxScore}.`,
    );

    return this.serialize(updated);
  }

  async reject(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
    dto: ReviewScoreCorrectionDto,
  ) {
    if (role !== 'admin' && role !== 'staff') {
      throw new ForbiddenException('Only admin or staff can reject');
    }

    const row = await this.findOwned(schoolId, id);
    if (
      row.status !== ScoreCorrectionStatus.OPEN &&
      row.status !== ScoreCorrectionStatus.PROPOSED
    ) {
      throw new BadRequestException('This correction is already closed');
    }

    const updated = await this.prisma.scoreCorrectionRequest.update({
      where: { id },
      data: {
        status: ScoreCorrectionStatus.REJECTED,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote?.trim() || null,
      },
      include: correctionInclude,
    });

    await this.notifyUser(
      schoolId,
      row.reportedById,
      userId,
      `Score report declined: ${row.assessment.name}`,
      dto.reviewNote?.trim() ||
        'Your score report was reviewed and the published mark was left unchanged.',
    );

    return this.serialize(updated);
  }

  private async findOwned(schoolId: string, id: string) {
    const row = await this.prisma.scoreCorrectionRequest.findFirst({
      where: { id, schoolId },
      include: correctionInclude,
    });
    if (!row) {
      throw new NotFoundException('Correction request not found');
    }
    return row;
  }

  private async assertTeacherCanHandle(
    schoolId: string,
    userId: string,
    role: string,
    row: {
      teacherId: string | null;
      classSubjectId: string;
      classSubject: { teacherId: string | null };
    },
  ) {
    if (role === 'admin' || role === 'staff') return;
    if (role !== 'teacher') {
      throw new ForbiddenException();
    }
    if (row.teacherId === userId || row.classSubject.teacherId === userId) {
      return;
    }
    await this.teacherScope.assertCanEditClassSubjectScores(
      schoolId,
      userId,
      role,
      row.classSubjectId,
    );
  }

  private async notifyUser(
    schoolId: string,
    recipientUserId: string,
    createdBy: string,
    title: string,
    body: string,
  ) {
    await this.prisma.announcement.create({
      data: {
        schoolId,
        title,
        body,
        createdBy,
        recipientUserId,
      },
    });
  }

  private studentName(row: {
    studentProfile: {
      user: { firstName: string; lastName: string };
    };
  }) {
    return `${row.studentProfile.user.firstName} ${row.studentProfile.user.lastName}`.trim();
  }

  private serialize(
    row: Prisma.ScoreCorrectionRequestGetPayload<{
      include: typeof correctionInclude;
    }>,
  ) {
    const section = row.classSubject.section?.name
      ? ` ${row.classSubject.section.name}`
      : '';
    return {
      id: row.id,
      schoolId: row.schoolId,
      termId: row.termId,
      termName: row.term.name,
      classSubjectId: row.classSubjectId,
      assessmentId: row.assessmentId,
      assessmentName: row.assessment.name,
      maxScore: row.assessment.maxScore,
      subjectName: row.classSubject.subject.name,
      classLabel: `${row.classSubject.grade.name}${section}`,
      studentProfileId: row.studentProfileId,
      studentName: this.studentName(row),
      studentExternalRef: row.studentProfile.user.externalRef,
      reportedById: row.reportedById,
      reportedByName:
        `${row.reportedBy.firstName} ${row.reportedBy.lastName}`.trim(),
      reportedByRole: row.reportedBy.role,
      teacherId: row.teacherId,
      teacherName: row.teacher
        ? `${row.teacher.firstName} ${row.teacher.lastName}`.trim()
        : null,
      message: row.message,
      currentScore: row.currentScore,
      proposedScore: row.proposedScore,
      status: row.status,
      reviewedById: row.reviewedById,
      reviewedByName: row.reviewedBy
        ? `${row.reviewedBy.firstName} ${row.reviewedBy.lastName}`.trim()
        : null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
