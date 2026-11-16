import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  PromotionOutcome,
  StudentCertificateType,
  StudentRecordStatus,
} from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicsService } from '../results/academics.service';
import { FinanceService } from '../finance/finance.service';
import {
  CreateBehaviorRecordDto,
  IssueCertificateDto,
  UpdateHealthRecordDto,
  UpdateStudentStatusDto,
} from './dto/student-records.dto';
import { StudentDocumentType } from '@prisma/client';
import { normalizeBloodType } from '../common/validators/blood-type';

function parseGradeNumber(name: string): number | null {
  const m = name.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function percentToGpa(percent: number): number {
  return Math.round((percent / 100) * 4 * 100) / 100;
}

@Injectable()
export class StudentRecordsService {
  private readonly uploadRoot = join(
    process.cwd(),
    'uploads',
    'student-documents',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly academics: AcademicsService,
    private readonly finance: FinanceService,
  ) {}

  async assertStudentFileAccess(schoolId: string, studentProfileId: string) {
    await this.assertStudent(schoolId, studentProfileId);
  }

  private async assertStudent(schoolId: string, studentProfileId: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            externalRef: true,
            email: true,
          },
        },
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        healthRecord: true,
      },
    });
    if (!profile) throw new NotFoundException('Student not found');
    return profile;
  }

  async getSummary(schoolId: string, studentProfileId: string) {
    const profile = await this.assertStudent(schoolId, studentProfileId);

    const [enrollmentCount, documentCount, behaviorCount, certificateCount, attStats] =
      await Promise.all([
        this.prisma.studentEnrollment.count({
          where: { studentProfileId, schoolId },
        }),
        this.prisma.studentDocument.count({
          where: { studentProfileId, schoolId },
        }),
        this.prisma.behaviorRecord.count({
          where: { studentProfileId, schoolId },
        }),
        this.prisma.studentCertificate.count({
          where: { studentProfileId, schoolId },
        }),
        this.prisma.attendanceRecord.groupBy({
          by: ['status'],
          where: { schoolId, studentProfileId, periodNumber: 0 },
          _count: { _all: true },
        }),
      ]);

    const attTotal = attStats.reduce((s, r) => s + r._count._all, 0);
    const attPresent = attStats
      .filter(
        (r) =>
          r.status === AttendanceStatus.present ||
          r.status === AttendanceStatus.late ||
          r.status === AttendanceStatus.excused,
      )
      .reduce((s, r) => s + r._count._all, 0);

    let financeSummary = null;
    try {
      financeSummary = await this.finance.getStudentFinanceSummary(
        schoolId,
        studentProfileId,
      );
    } catch {
      financeSummary = null;
    }

    return {
      student: {
        profileId: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        studentId: profile.user.externalRef,
        email: profile.user.email,
        grade: profile.grade.name,
        section: profile.section?.name ?? null,
        status: profile.status,
        graduatedAt: profile.graduatedAt,
        photoUrl: profile.photoUrl,
      },
      counts: {
        enrollments: enrollmentCount,
        documents: documentCount,
        behaviorRecords: behaviorCount,
        certificates: certificateCount,
      },
      attendance: {
        total: attTotal,
        present: attPresent,
        rate: attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null,
      },
      finance: financeSummary
        ? {
            outstandingCents: financeSummary.outstandingCents,
            totalPaidCents: financeSummary.totalPaidCents,
            totalDueCents: financeSummary.totalDueCents,
          }
        : null,
      health: profile.healthRecord,
    };
  }

  async getEnrollmentHistory(schoolId: string, studentProfileId: string) {
    await this.assertStudent(schoolId, studentProfileId);
    return this.prisma.studentEnrollment.findMany({
      where: { schoolId, studentProfileId },
      orderBy: { academicYear: { startDate: 'asc' } },
      include: {
        academicYear: { select: { id: true, name: true, startDate: true } },
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
  }

  async buildTranscript(schoolId: string, studentProfileId: string) {
    const profile = await this.assertStudent(schoolId, studentProfileId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, logoUrl: true },
    });

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { schoolId, studentProfileId },
      orderBy: { academicYear: { startDate: 'asc' } },
      include: {
        academicYear: true,
        grade: true,
        section: true,
      },
    });

    const years: Array<{
      academicYear: string;
      academicYearId: string;
      grade: string;
      section: string | null;
      promotionOutcome: string;
      terms: Array<{
        termId: string;
        termName: string;
        average: number | null;
        letter: string | null;
        subjects: { subject: string; average: number; letter: string }[];
      }>;
      yearAverage: number | null;
    }> = [];

    for (const enr of enrollments) {
      const terms = await this.prisma.academicTerm.findMany({
        where: { schoolId, academicYearId: enr.academicYearId },
        orderBy: { sortOrder: 'asc' },
      });

      const termRows: (typeof years)[0]['terms'] = [];
      for (const term of terms) {
        const subjects = await this.academics.getTermSubjectResults(
          schoolId,
          studentProfileId,
          term.id,
          enr.gradeId,
          enr.sectionId,
          enr.academicYearId,
        );
        if (subjects.length === 0) continue;
        const avg =
          Math.round(
            (subjects.reduce((s, r) => s + r.average, 0) / subjects.length) * 10,
          ) / 10;
        termRows.push({
          termId: term.id,
          termName: term.name,
          average: avg,
          letter: subjects[0] ? subjects.map((s) => s.letter)[0] : null,
          subjects: subjects.map((s) => ({
            subject: s.subject,
            average: s.average,
            letter: s.letter,
          })),
        });
      }

      const yearAverage =
        termRows.length > 0
          ? Math.round(
              (termRows.reduce((s, t) => s + (t.average ?? 0), 0) /
                termRows.length) *
                10,
            ) / 10
          : null;

      years.push({
        academicYear: enr.academicYear.name,
        academicYearId: enr.academicYearId,
        grade: enr.grade.name,
        section: enr.section?.name ?? null,
        promotionOutcome: enr.promotionOutcome,
        terms: termRows,
        yearAverage,
      });
    }

    const yearAvgs = years
      .map((y) => y.yearAverage)
      .filter((a): a is number => a != null);
    const overallAverage =
      yearAvgs.length > 0
        ? Math.round(
            (yearAvgs.reduce((s, a) => s + a, 0) / yearAvgs.length) * 10,
          ) / 10
        : null;
    const overallGpa =
      overallAverage != null ? percentToGpa(overallAverage) : null;

    return {
      school: { name: school?.name ?? 'School', logoUrl: school?.logoUrl ?? null },
      student: {
        profileId: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        studentId: profile.user.externalRef,
        currentGrade: profile.grade.name,
        status: profile.status,
      },
      years,
      overallAverage,
      overallGpa,
      generatedAt: new Date().toISOString(),
    };
  }

  buildTranscriptHtml(
    transcript: Awaited<ReturnType<StudentRecordsService['buildTranscript']>>,
  ) {
    const yearBlocks = transcript.years
      .map(
        (y) => `
      <section class="year-block">
        <h2>${y.academicYear} — ${y.grade}${y.section ? ` (${y.section})` : ''}</h2>
        <p class="meta">Outcome: ${y.promotionOutcome}${y.yearAverage != null ? ` · Year average: <strong>${y.yearAverage}%</strong>` : ''}</p>
        ${y.terms
          .map(
            (t) => `
          <h3>${t.termName}</h3>
          <table>
            <tr><th>Subject</th><th>Average</th><th>Grade</th></tr>
            ${t.subjects
              .map(
                (s) =>
                  `<tr><td>${s.subject}</td><td>${s.average}%</td><td>${s.letter}</td></tr>`,
              )
              .join('')}
          </table>
          <p class="term-avg">Term average: <strong>${t.average ?? '—'}%</strong></p>`,
          )
          .join('')}
      </section>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Transcript — ${transcript.student.name}</title>
<style>
  body { font-family: Georgia, serif; max-width: 820px; margin: 2rem auto; color: #1a2e2e; }
  h1 { color: #2a6f6f; }
  .summary { background: #f4f9f9; padding: 1rem; border-radius: 8px; margin: 1.5rem 0; }
  table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; }
  th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
  th { background: #e8f4f4; }
  .meta { color: #666; font-size: 0.9rem; }
  .year-block { margin-bottom: 2rem; page-break-inside: avoid; }
</style></head>
<body>
  <h1>Official Academic Transcript</h1>
  <p><strong>${transcript.school.name}</strong></p>
  <p>${transcript.student.name} · ID: ${transcript.student.studentId ?? '—'}</p>
  <div class="summary">
    <p>Overall average: <strong>${transcript.overallAverage ?? '—'}%</strong></p>
    <p>Cumulative GPA (4.0 scale): <strong>${transcript.overallGpa ?? '—'}</strong></p>
  </div>
  ${yearBlocks}
  <p class="meta">Generated ${new Date(transcript.generatedAt).toLocaleString()}</p>
</body></html>`;
  }

  async getAttendanceHistory(schoolId: string, studentProfileId: string) {
    await this.assertStudent(schoolId, studentProfileId);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentProfileId, periodNumber: 0 },
      orderBy: { date: 'desc' },
      take: 120,
      include: {
        marker: { select: { firstName: true, lastName: true } },
      },
    });
    return records.map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      reason: r.reason,
      recordedBy: `${r.marker.firstName} ${r.marker.lastName}`,
    }));
  }

  async listDocuments(schoolId: string, studentProfileId: string) {
    await this.assertStudent(schoolId, studentProfileId);
    return this.prisma.studentDocument.findMany({
      where: { schoolId, studentProfileId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async uploadDocument(
    schoolId: string,
    studentProfileId: string,
    uploadedById: string,
    type: StudentDocumentType,
    title: string | undefined,
    file: { buffer: Buffer; originalname: string },
  ) {
    await this.assertStudent(schoolId, studentProfileId);
    const dir = join(this.uploadRoot, schoolId, studentProfileId);
    await mkdir(dir, { recursive: true });
    const ext = extname(file.originalname) || '.bin';
    const filename = `${Date.now()}${ext}`;
    const fullPath = join(dir, filename);
    await writeFile(fullPath, file.buffer);
    const fileUrl = `/schools/students/files/${schoolId}/${studentProfileId}/${filename}`;

    return this.prisma.studentDocument.create({
      data: {
        schoolId,
        studentProfileId,
        type,
        title: title?.trim() || file.originalname,
        fileUrl,
        uploadedById,
      },
    });
  }

  async deleteDocument(
    schoolId: string,
    studentProfileId: string,
    documentId: string,
  ) {
    const doc = await this.prisma.studentDocument.findFirst({
      where: { id: documentId, schoolId, studentProfileId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.studentDocument.delete({ where: { id: documentId } });
    return { ok: true };
  }

  async listBehavior(schoolId: string, studentProfileId: string) {
    await this.assertStudent(schoolId, studentProfileId);
    return this.prisma.behaviorRecord.findMany({
      where: { schoolId, studentProfileId },
      orderBy: { date: 'desc' },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async createBehavior(
    schoolId: string,
    studentProfileId: string,
    recordedById: string,
    dto: CreateBehaviorRecordDto,
  ) {
    await this.assertStudent(schoolId, studentProfileId);
    return this.prisma.behaviorRecord.create({
      data: {
        schoolId,
        studentProfileId,
        date: new Date(dto.date),
        type: dto.type,
        note: dto.note?.trim() ?? null,
        recordedById,
      },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getHealth(schoolId: string, studentProfileId: string) {
    await this.assertStudent(schoolId, studentProfileId);
    return this.prisma.studentHealthRecord.findUnique({
      where: { studentProfileId },
    });
  }

  async upsertHealth(
    schoolId: string,
    studentProfileId: string,
    dto: UpdateHealthRecordDto,
  ) {
    await this.assertStudent(schoolId, studentProfileId);
    const bloodType =
      dto.bloodType !== undefined
        ? normalizeBloodType(dto.bloodType)
        : undefined;
    return this.prisma.studentHealthRecord.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        bloodType: bloodType ?? null,
        emergencyContactName: dto.emergencyContactName?.trim() ?? null,
        emergencyContactPhone: dto.emergencyContactPhone?.trim() ?? null,
        allergies: dto.allergies?.trim() ?? null,
        medicalConditions: dto.medicalConditions?.trim() ?? null,
        medicationNotes: dto.medicationNotes?.trim() ?? null,
      },
      update: {
        ...(bloodType !== undefined ? { bloodType } : {}),
        ...(dto.emergencyContactName !== undefined
          ? { emergencyContactName: dto.emergencyContactName?.trim() || null }
          : {}),
        ...(dto.emergencyContactPhone !== undefined
          ? { emergencyContactPhone: dto.emergencyContactPhone?.trim() || null }
          : {}),
        ...(dto.allergies !== undefined
          ? { allergies: dto.allergies?.trim() || null }
          : {}),
        ...(dto.medicalConditions !== undefined
          ? { medicalConditions: dto.medicalConditions?.trim() || null }
          : {}),
        ...(dto.medicationNotes !== undefined
          ? { medicationNotes: dto.medicationNotes?.trim() || null }
          : {}),
      },
    });
  }

  async listCertificates(schoolId: string, studentProfileId: string) {
    await this.assertStudent(schoolId, studentProfileId);
    return this.prisma.studentCertificate.findMany({
      where: { schoolId, studentProfileId },
      orderBy: { issuedAt: 'desc' },
      include: {
        issuedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async issueCertificate(
    schoolId: string,
    studentProfileId: string,
    issuedById: string,
    dto: IssueCertificateDto,
  ) {
    const profile = await this.assertStudent(schoolId, studentProfileId);
    const year = new Date().getFullYear();
    const certificateNumber = `C1-${dto.type.slice(0, 3)}-${year}-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.studentCertificate.create({
      data: {
        schoolId,
        studentProfileId,
        type: dto.type,
        certificateNumber,
        issuedById,
        meta: {
          studentName: `${profile.user.firstName} ${profile.user.lastName}`,
          grade: profile.grade.name,
          note: dto.note?.trim() ?? null,
        },
      },
    });
  }

  buildCertificateHtml(
    schoolId: string,
    cert: {
      type: StudentCertificateType;
      certificateNumber: string;
      issuedAt: Date;
      meta: unknown;
    },
    schoolName: string,
  ) {
    const meta = (cert.meta ?? {}) as {
      studentName?: string;
      grade?: string;
      note?: string;
    };
    const titles: Record<StudentCertificateType, string> = {
      ENROLLMENT: 'Certificate of Enrollment',
      COMPLETION: 'Certificate of Completion',
      GRADUATION: 'Certificate of Graduation',
      CONDUCT: 'Certificate of Good Conduct',
    };
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>${titles[cert.type]}</title>
<style>
  body { font-family: Georgia, serif; text-align: center; padding: 3rem; color: #1a2e2e; }
  h1 { color: #2a6f6f; font-size: 1.75rem; }
  .cert-no { color: #666; font-size: 0.85rem; margin-top: 2rem; }
</style></head>
<body>
  <p>${schoolName}</p>
  <h1>${titles[cert.type]}</h1>
  <p>This is to certify that</p>
  <p style="font-size:1.4rem;font-weight:bold">${meta.studentName ?? 'Student'}</p>
  <p>Grade: ${meta.grade ?? '—'}</p>
  ${meta.note ? `<p>${meta.note}</p>` : ''}
  <p>Issued: ${cert.issuedAt.toLocaleDateString()}</p>
  <p class="cert-no">${cert.certificateNumber}</p>
</body></html>`;
  }

  async getCertificateHtml(
    schoolId: string,
    studentProfileId: string,
    certificateId: string,
  ) {
    const cert = await this.prisma.studentCertificate.findFirst({
      where: { id: certificateId, schoolId, studentProfileId },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    return this.buildCertificateHtml(schoolId, cert, school?.name ?? 'School');
  }

  async previewGraduation(schoolId: string, studentProfileId: string) {
    const profile = await this.assertStudent(schoolId, studentProfileId);
    const gradeNum = parseGradeNumber(profile.grade.name);
    const transcript = await this.buildTranscript(schoolId, studentProfileId);

    const requirements = [
      {
        key: 'status_active',
        label: 'Student status is Active',
        met: profile.status === StudentRecordStatus.ACTIVE,
      },
      {
        key: 'grade_12',
        label: 'Final grade level (Grade 11–12)',
        met: gradeNum != null && gradeNum >= 11,
      },
      {
        key: 'academic_history',
        label: 'At least one year with recorded results',
        met: transcript.years.some((y) => y.terms.length > 0),
      },
    ];

    return {
      studentProfileId,
      requirements,
      ready: requirements.every((r) => r.met),
      transcriptSummary: {
        overallAverage: transcript.overallAverage,
        overallGpa: transcript.overallGpa,
        years: transcript.years.length,
      },
    };
  }

  async executeGraduation(
    schoolId: string,
    studentProfileId: string,
    issuedById: string,
  ) {
    const preview = await this.previewGraduation(schoolId, studentProfileId);
    if (!preview.ready) {
      throw new BadRequestException(
        'Graduation requirements not met. Review preview.',
      );
    }

    await this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: {
        status: StudentRecordStatus.GRADUATED,
        graduatedAt: new Date(),
      },
    });

    await this.prisma.studentEnrollment.updateMany({
      where: {
        schoolId,
        studentProfileId,
        isCurrent: true,
      },
      data: { promotionOutcome: PromotionOutcome.GRADUATED },
    });

    const cert = await this.issueCertificate(
      schoolId,
      studentProfileId,
      issuedById,
      { type: StudentCertificateType.GRADUATION },
    );

    return {
      status: StudentRecordStatus.GRADUATED,
      certificate: cert,
      message: 'Student graduated. Graduation certificate issued.',
    };
  }

  async updateStatus(
    schoolId: string,
    studentProfileId: string,
    dto: UpdateStudentStatusDto,
  ) {
    await this.assertStudent(schoolId, studentProfileId);
    return this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: {
        status: dto.status,
        graduatedAt:
          dto.status === StudentRecordStatus.GRADUATED
            ? new Date()
            : undefined,
      },
      select: { id: true, status: true, graduatedAt: true },
    });
  }
}
