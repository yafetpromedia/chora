import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademicEnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentYear(schoolId: string) {
    return this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
  }

  /** Ensure every active student has a current-year enrollment row matching their profile. */
  async syncSchoolEnrollments(schoolId: string) {
    const year = await this.getCurrentYear(schoolId);
    if (!year) {
      return { synced: 0, message: 'No current academic year set' };
    }

    const students = await this.prisma.studentProfile.findMany({
      where: { schoolId },
      select: { id: true, gradeId: true, sectionId: true },
    });

    let synced = 0;
    for (const s of students) {
      await this.ensureEnrollment(schoolId, s.id, year.id, s.gradeId, s.sectionId);
      synced += 1;
    }

    await this.prisma.studentEnrollment.updateMany({
      where: {
        schoolId,
        academicYearId: { not: year.id },
      },
      data: { isCurrent: false },
    });

    return { synced, academicYearId: year.id, academicYearName: year.name };
  }

  async ensureEnrollment(
    schoolId: string,
    studentProfileId: string,
    academicYearId: string,
    gradeId: string,
    sectionId: string | null,
  ) {
    await this.prisma.studentEnrollment.updateMany({
      where: { schoolId, studentProfileId, isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.studentEnrollment.upsert({
      where: {
        studentProfileId_academicYearId: { studentProfileId, academicYearId },
      },
      create: {
        schoolId,
        studentProfileId,
        academicYearId,
        gradeId,
        sectionId,
        isCurrent: true,
      },
      update: { gradeId, sectionId, isCurrent: true },
    });
  }

  async ensureForCurrentYear(
    schoolId: string,
    studentProfileId: string,
    gradeId: string,
    sectionId: string | null,
  ) {
    const year = await this.getCurrentYear(schoolId);
    if (!year) return null;
    return this.ensureEnrollment(
      schoolId,
      studentProfileId,
      year.id,
      gradeId,
      sectionId,
    );
  }

  async listEnrollmentsForStudent(schoolId: string, studentProfileId: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, schoolId },
    });
    if (!profile) throw new NotFoundException('Student not found');

    return this.prisma.studentEnrollment.findMany({
      where: { schoolId, studentProfileId },
      orderBy: { academicYear: { startDate: 'desc' } },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
  }
}
