import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassworkStatus,
  ClassworkSubmissionStatus,
  ClassworkType,
  StudentRecordStatus,
  UserRole,
} from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentTemplatesService } from '../results/assessment-templates.service';
import { TeacherScopeService } from '../teachers/teacher-scope.service';
import {
  CreateClassworkDto,
  GradeSubmissionDto,
  UpdateClassworkDto,
} from './dto/classwork.dto';

@Injectable()
export class ClassworkService {
  private readonly uploadRoot = join(process.cwd(), 'uploads', 'classwork');

  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherScope: TeacherScopeService,
    private readonly templates: AssessmentTemplatesService,
  ) {}

  async listTeacherClassSubjects(
    schoolId: string,
    userId: string,
    role: string,
  ) {
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });
    const where: {
      schoolId: string;
      teacherId?: string;
      academicYearId?: string;
    } = {
      schoolId,
      ...(currentYear ? { academicYearId: currentYear.id } : {}),
    };
    if (role === UserRole.teacher) {
      where.teacherId = userId;
    }
    const rows = await this.prisma.classSubject.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: [{ grade: { sortOrder: 'asc' } }, { subject: { name: 'asc' } }],
    });
    return rows.map((r) => ({
      id: r.id,
      label: `${r.grade.name}${r.section ? ` · ${r.section.name}` : ''} — ${r.subject.name}`,
      gradeId: r.gradeId,
      sectionId: r.sectionId,
      subject: r.subject,
    }));
  }

  async listForTeacher(
    schoolId: string,
    userId: string,
    role: string,
    classSubjectId?: string,
    type?: ClassworkType,
  ) {
    if (classSubjectId) {
      await this.assertCanManageClassSubject(
        schoolId,
        userId,
        role,
        classSubjectId,
      );
    }
    const subjects = await this.listTeacherClassSubjects(
      schoolId,
      userId,
      role,
    );
    const subjectIds = classSubjectId
      ? [classSubjectId]
      : subjects.map((s) => s.id);
    if (subjectIds.length === 0) return [];

    const rows = await this.prisma.classworkAssignment.findMany({
      where: {
        schoolId,
        classSubjectId: { in: subjectIds },
        ...(type ? { type } : {}),
      },
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => this.formatAssignment(r));
  }

  async listForStudent(schoolId: string, userId: string, type?: ClassworkType) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { schoolId, userId },
      select: { id: true, gradeId: true, sectionId: true },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        gradeId: profile.gradeId,
        ...(profile.sectionId
          ? { OR: [{ sectionId: profile.sectionId }, { sectionId: null }] }
          : {}),
        ...(currentYear ? { academicYearId: currentYear.id } : {}),
      },
      select: { id: true },
    });
    const ids = classSubjects.map((c) => c.id);
    if (ids.length === 0) return [];

    const rows = await this.prisma.classworkAssignment.findMany({
      where: {
        schoolId,
        classSubjectId: { in: ids },
        status: ClassworkStatus.PUBLISHED,
        ...(type ? { type } : {}),
      },
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        submissions: {
          where: { studentProfileId: profile.id },
          take: 1,
        },
      },
      orderBy: [{ dueAt: 'asc' }, { publishedAt: 'desc' }],
    });

    return rows.map((r) => ({
      ...this.formatAssignment({
        ...r,
        _count: { submissions: r.submissions.length },
      }),
      mySubmission: r.submissions[0]
        ? {
            status: r.submissions[0].status,
            submittedAt: r.submissions[0].submittedAt,
            fileName: r.submissions[0].fileName,
            score: r.submissions[0].score,
            feedback: r.submissions[0].feedback,
            gradedAt: r.submissions[0].gradedAt,
          }
        : null,
    }));
  }

  async getOneForTeacher(
    schoolId: string,
    userId: string,
    role: string,
    assignmentId: string,
  ) {
    const row = await this.getOwnedAssignment(
      schoolId,
      userId,
      role,
      assignmentId,
    );
    await this.syncMaxScoreFromTemplate(schoolId, row);
    const withCount = await this.prisma.classworkAssignment.findFirst({
      where: { id: row.id },
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });
    if (!withCount) throw new NotFoundException('Assignment not found');
    return {
      ...this.formatAssignment(withCount),
      description: withCount.description,
    };
  }

  async getOneForStudent(
    schoolId: string,
    userId: string,
    assignmentId: string,
  ) {
    const list = await this.listForStudent(schoolId, userId);
    const row = list.find((a) => a.id === assignmentId);
    if (!row) {
      throw new NotFoundException('Assignment not found');
    }
    const full = await this.prisma.classworkAssignment.findFirst({
      where: { id: assignmentId, schoolId, status: ClassworkStatus.PUBLISHED },
    });
    if (!full) throw new NotFoundException('Assignment not found');
    return {
      ...row,
      description: full.description,
      fileUrl: full.fileUrl,
      fileName: full.fileName,
    };
  }

  async create(
    schoolId: string,
    userId: string,
    role: string,
    dto: CreateClassworkDto,
  ) {
    await this.assertCanManageClassSubject(
      schoolId,
      userId,
      role,
      dto.classSubjectId,
    );
    const maxScore = await this.templates.resolveClassworkMaxScore(
      schoolId,
      dto.classSubjectId,
      dto.type,
    );
    const row = await this.prisma.classworkAssignment.create({
      data: {
        schoolId,
        classSubjectId: dto.classSubjectId,
        createdByUserId: userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        type: dto.type,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        maxScore,
        status: ClassworkStatus.DRAFT,
      },
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });
    return this.formatAssignment(row);
  }

  async update(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
    dto: UpdateClassworkDto,
  ) {
    const existing = await this.getOwnedAssignment(schoolId, userId, role, id);
    if (existing.status === ClassworkStatus.CLOSED) {
      throw new BadRequestException('Closed assignments cannot be edited');
    }
    const row = await this.prisma.classworkAssignment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.dueAt !== undefined
          ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }
          : {}),
      },
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });
    return this.formatAssignment(row);
  }

  async publish(schoolId: string, userId: string, role: string, id: string) {
    const existing = await this.getOwnedAssignment(schoolId, userId, role, id);
    const maxScore = await this.templates.resolveClassworkMaxScore(
      schoolId,
      existing.classSubjectId,
      existing.type,
    );
    const row = await this.prisma.classworkAssignment.update({
      where: { id: existing.id },
      data: {
        status: ClassworkStatus.PUBLISHED,
        publishedAt: new Date(),
        maxScore,
      },
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });
    await this.seedSubmissionsForAssignment(
      row.id,
      row.classSubjectId,
      schoolId,
    );
    return this.formatAssignment(row);
  }

  async close(schoolId: string, userId: string, role: string, id: string) {
    await this.getOwnedAssignment(schoolId, userId, role, id);
    const row = await this.prisma.classworkAssignment.update({
      where: { id },
      data: { status: ClassworkStatus.CLOSED },
      include: {
        classSubject: {
          include: {
            subject: { select: { name: true } },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });
    return this.formatAssignment(row);
  }

  async listSubmissions(
    schoolId: string,
    userId: string,
    role: string,
    assignmentId: string,
  ) {
    const assignment = await this.getOwnedAssignment(
      schoolId,
      userId,
      role,
      assignmentId,
    );
    await this.syncMaxScoreFromTemplate(schoolId, assignment);
    const rows = await this.prisma.classworkSubmission.findMany({
      where: { assignmentId },
      include: {
        studentProfile: {
          include: {
            user: {
              select: { firstName: true, lastName: true, externalRef: true },
            },
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
      orderBy: { studentProfile: { user: { firstName: 'asc' } } },
    });
    return rows.map((s) => ({
      id: s.id,
      studentProfileId: s.studentProfileId,
      studentName:
        `${s.studentProfile.user.firstName} ${s.studentProfile.user.lastName}`.trim(),
      studentId: s.studentProfile.user.externalRef,
      grade: s.studentProfile.grade.name,
      section: s.studentProfile.section?.name ?? null,
      status: s.status,
      submittedAt: s.submittedAt,
      fileUrl: s.fileUrl,
      fileName: s.fileName,
      note: s.note,
      score: s.score,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
      maxScore: assignment.maxScore,
    }));
  }

  async gradeSubmission(
    schoolId: string,
    userId: string,
    role: string,
    assignmentId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
  ) {
    const assignment = await this.getOwnedAssignment(
      schoolId,
      userId,
      role,
      assignmentId,
    );
    await this.syncMaxScoreFromTemplate(schoolId, assignment);
    const submission = await this.prisma.classworkSubmission.findFirst({
      where: { id: submissionId, assignmentId },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.status === ClassworkSubmissionStatus.PENDING) {
      throw new BadRequestException('Student has not submitted yet');
    }
    if (dto.score > assignment.maxScore) {
      throw new BadRequestException(
        `Score cannot exceed ${assignment.maxScore}`,
      );
    }

    const row = await this.prisma.classworkSubmission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback?.trim() || null,
        gradedAt: new Date(),
        gradedByUserId: userId,
        status: ClassworkSubmissionStatus.GRADED,
      },
    });
    return {
      id: row.id,
      score: row.score,
      feedback: row.feedback,
      gradedAt: row.gradedAt,
      status: row.status,
      maxScore: assignment.maxScore,
    };
  }

  async saveAssignmentFile(
    schoolId: string,
    userId: string,
    role: string,
    assignmentId: string,
    file: { buffer: Buffer; originalname: string },
  ) {
    await this.getOwnedAssignment(schoolId, userId, role, assignmentId);
    const ext = extname(file.originalname) || '.bin';
    const filename = `${assignmentId}-${randomBytes(6).toString('hex')}${ext}`;
    const dir = join(this.uploadRoot, schoolId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), file.buffer);
    const fileUrl = `/schools/classwork/files/${schoolId}/${filename}`;
    await this.prisma.classworkAssignment.update({
      where: { id: assignmentId },
      data: { fileUrl, fileName: file.originalname },
    });
    return { fileUrl, fileName: file.originalname };
  }

  async submitStudent(
    schoolId: string,
    userId: string,
    assignmentId: string,
    note?: string,
    file?: { buffer: Buffer; originalname: string },
  ) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { schoolId, userId },
    });
    if (!profile) throw new NotFoundException('Student profile not found');

    const assignment = await this.prisma.classworkAssignment.findFirst({
      where: {
        id: assignmentId,
        schoolId,
        status: ClassworkStatus.PUBLISHED,
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not available');

    const now = new Date();
    const isLate = assignment.dueAt != null && now > assignment.dueAt;
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    if (file) {
      const ext = extname(file.originalname) || '.bin';
      const filename = `sub-${assignmentId}-${profile.id}-${randomBytes(4).toString('hex')}${ext}`;
      const dir = join(this.uploadRoot, schoolId);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, filename), file.buffer);
      fileUrl = `/schools/classwork/files/${schoolId}/${filename}`;
      fileName = file.originalname;
    }

    const row = await this.prisma.classworkSubmission.upsert({
      where: {
        assignmentId_studentProfileId: {
          assignmentId,
          studentProfileId: profile.id,
        },
      },
      create: {
        assignmentId,
        studentProfileId: profile.id,
        status: isLate
          ? ClassworkSubmissionStatus.LATE
          : ClassworkSubmissionStatus.SUBMITTED,
        submittedAt: now,
        note: note?.trim() || null,
        fileUrl: fileUrl ?? null,
        fileName: fileName ?? null,
      },
      update: {
        status: isLate
          ? ClassworkSubmissionStatus.LATE
          : ClassworkSubmissionStatus.SUBMITTED,
        submittedAt: now,
        score: null,
        feedback: null,
        gradedAt: null,
        gradedByUserId: null,
        note: note?.trim() || null,
        ...(fileUrl ? { fileUrl, fileName } : {}),
      },
    });
    return {
      id: row.id,
      status: row.status,
      submittedAt: row.submittedAt,
      fileName: row.fileName,
    };
  }

  resolveFilePath(schoolId: string, filename: string) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    return join(this.uploadRoot, schoolId, safe);
  }

  private async seedSubmissionsForAssignment(
    assignmentId: string,
    classSubjectId: string,
    schoolId: string,
  ) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
      select: { gradeId: true, sectionId: true },
    });
    if (!cs) return;
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId: cs.gradeId,
        ...(cs.sectionId ? { sectionId: cs.sectionId } : {}),
        status: StudentRecordStatus.ACTIVE,
      },
      select: { id: true },
    });
    for (const s of students) {
      await this.prisma.classworkSubmission.upsert({
        where: {
          assignmentId_studentProfileId: {
            assignmentId,
            studentProfileId: s.id,
          },
        },
        create: {
          assignmentId,
          studentProfileId: s.id,
          status: ClassworkSubmissionStatus.PENDING,
        },
        update: {},
      });
    }
  }

  private async getOwnedAssignment(
    schoolId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    const row = await this.prisma.classworkAssignment.findFirst({
      where: { id, schoolId },
      include: { classSubject: true },
    });
    if (!row) throw new NotFoundException('Assignment not found');
    await this.assertCanManageClassSubject(
      schoolId,
      userId,
      role,
      row.classSubjectId,
    );
    return row;
  }

  private async assertCanManageClassSubject(
    schoolId: string,
    userId: string,
    role: string,
    classSubjectId: string,
  ) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { id: classSubjectId, schoolId },
    });
    if (!cs) throw new NotFoundException('Class subject not found');

    if (role === UserRole.admin || role === UserRole.staff) return;

    if (role === UserRole.teacher) {
      if (cs.teacherId === userId) return;
      const scopes = await this.teacherScope.getClassScopes(
        schoolId,
        userId,
        role,
      );
      this.teacherScope.assertCanAccessClass(scopes, cs.gradeId, cs.sectionId);
      return;
    }
    throw new ForbiddenException('Access denied');
  }

  /** Align legacy default (100) with the class assessment template when nothing is graded yet. */
  private async syncMaxScoreFromTemplate(
    schoolId: string,
    assignment: {
      id: string;
      classSubjectId: string;
      type: ClassworkType;
      maxScore: number;
    },
  ) {
    const resolved = await this.templates.resolveClassworkMaxScore(
      schoolId,
      assignment.classSubjectId,
      assignment.type,
    );
    if (resolved === assignment.maxScore) return;

    const gradedCount = await this.prisma.classworkSubmission.count({
      where: { assignmentId: assignment.id, score: { not: null } },
    });
    if (gradedCount > 0) return;

    await this.prisma.classworkAssignment.update({
      where: { id: assignment.id },
      data: { maxScore: resolved },
    });
    assignment.maxScore = resolved;
  }

  private formatAssignment(row: {
    id: string;
    title: string;
    description: string | null;
    type: ClassworkType;
    dueAt: Date | null;
    fileUrl: string | null;
    fileName: string | null;
    maxScore?: number;
    status: ClassworkStatus;
    publishedAt: Date | null;
    createdAt: Date;
    classSubject: {
      subject: { name: string };
      grade: { name: string };
      section: { name: string } | null;
    };
    _count: { submissions: number };
  }) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      dueAt: row.dueAt,
      fileUrl: row.fileUrl,
      fileName: row.fileName,
      maxScore: row.maxScore,
      status: row.status,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      classLabel: `${row.classSubject.grade.name}${
        row.classSubject.section ? ` · ${row.classSubject.section.name}` : ''
      } — ${row.classSubject.subject.name}`,
      submissionCount: row._count?.submissions ?? 0,
    };
  }
}
