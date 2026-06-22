import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromotionOutcome, StudentRecordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicEnrollmentService } from './academic-enrollment.service';
import { ExecutePromotionDto } from './dto/execute-promotion.dto';

@Injectable()
export class AcademicPromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollment: AcademicEnrollmentService,
  ) {}

  async getPreview(schoolId: string, fromYearId: string) {
    const fromYear = await this.prisma.academicYear.findFirst({
      where: { id: fromYearId, schoolId },
    });
    if (!fromYear) throw new NotFoundException('Academic year not found');

    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
    });

    const otherYears = await this.prisma.academicYear.findMany({
      where: { schoolId, id: { not: fromYearId } },
      orderBy: { startDate: 'desc' },
    });

    const suggestedToYear =
      otherYears.find((y) => !y.isCurrent && y.startDate > fromYear.startDate) ??
      otherYears[0] ??
      null;

    const mappings = await Promise.all(
      grades.map(async (grade, index) => {
        const studentCount = await this.prisma.studentProfile.count({
          where: { schoolId, gradeId: grade.id },
        });
        const next = grades[index + 1];
        return {
          fromGradeId: grade.id,
          fromGradeName: grade.name,
          studentCount,
          suggestedToGradeId: next?.id ?? null,
          suggestedToGradeName: next?.name ?? 'Graduate / leave',
        };
      }),
    );

    const enrollmentCount = await this.prisma.studentEnrollment.count({
      where: { schoolId, academicYearId: fromYearId },
    });

    return {
      fromYear: {
        id: fromYear.id,
        name: fromYear.name,
        isCurrent: fromYear.isCurrent,
        enrollmentRecords: enrollmentCount,
      },
      suggestedToYear: suggestedToYear
        ? { id: suggestedToYear.id, name: suggestedToYear.name }
        : null,
      availableTargetYears: otherYears.map((y) => ({
        id: y.id,
        name: y.name,
        isCurrent: y.isCurrent,
      })),
      mappings,
      totalStudents: mappings.reduce((s, m) => s + m.studentCount, 0),
    };
  }

  async execute(schoolId: string, dto: ExecutePromotionDto) {
    const fromYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.fromYearId, schoolId },
    });
    if (!fromYear) throw new NotFoundException('From academic year not found');

    const toYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.toYearId, schoolId },
    });
    if (!toYear) throw new NotFoundException('Target academic year not found');

    if (fromYear.id === toYear.id) {
      throw new BadRequestException('From and target year must be different');
    }

    const gradeIds = new Set(
      (
        await this.prisma.grade.findMany({
          where: { schoolId },
          select: { id: true },
        })
      ).map((g) => g.id),
    );

    for (const m of dto.mappings) {
      if (!gradeIds.has(m.fromGradeId)) {
        throw new BadRequestException(`Unknown grade: ${m.fromGradeId}`);
      }
      if (m.toGradeId && !gradeIds.has(m.toGradeId)) {
        throw new BadRequestException(`Unknown target grade: ${m.toGradeId}`);
      }
    }

    const summary = {
      promoted: 0,
      graduated: 0,
      skipped: 0,
      fromYearId: fromYear.id,
      toYearId: toYear.id,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.studentEnrollment.updateMany({
        where: { schoolId, academicYearId: fromYear.id },
        data: { isCurrent: false },
      });

      for (const map of dto.mappings) {
        const students = await tx.studentProfile.findMany({
          where: { schoolId, gradeId: map.fromGradeId },
          include: { section: { select: { name: true } } },
        });

        for (const student of students) {
          await tx.studentEnrollment.upsert({
            where: {
              studentProfileId_academicYearId: {
                studentProfileId: student.id,
                academicYearId: fromYear.id,
              },
            },
            create: {
              schoolId,
              studentProfileId: student.id,
              academicYearId: fromYear.id,
              gradeId: map.fromGradeId,
              sectionId: student.sectionId,
              isCurrent: false,
            },
            update: {
              gradeId: map.fromGradeId,
              sectionId: student.sectionId,
              isCurrent: false,
              promotionOutcome: PromotionOutcome.PROMOTED,
            },
          });

          if (!map.toGradeId) {
            await tx.studentEnrollment.update({
              where: {
                studentProfileId_academicYearId: {
                  studentProfileId: student.id,
                  academicYearId: fromYear.id,
                },
              },
              data: { promotionOutcome: PromotionOutcome.GRADUATED },
            });
            await tx.studentProfile.update({
              where: { id: student.id },
              data: {
                status: StudentRecordStatus.GRADUATED,
                graduatedAt: new Date(),
              },
            });
            summary.graduated += 1;
            continue;
          }

          let newSectionId: string | null = null;
          if (student.section?.name) {
            const matched = await tx.section.findFirst({
              where: {
                gradeId: map.toGradeId,
                name: student.section.name,
              },
            });
            newSectionId = matched?.id ?? null;
          }

          await tx.studentProfile.update({
            where: { id: student.id },
            data: {
              gradeId: map.toGradeId,
              sectionId: newSectionId,
            },
          });

          await tx.studentEnrollment.upsert({
            where: {
              studentProfileId_academicYearId: {
                studentProfileId: student.id,
                academicYearId: toYear.id,
              },
            },
            create: {
              schoolId,
              studentProfileId: student.id,
              academicYearId: toYear.id,
              gradeId: map.toGradeId,
              sectionId: newSectionId,
              isCurrent: true,
            },
            update: {
              gradeId: map.toGradeId,
              sectionId: newSectionId,
              isCurrent: true,
              promotionOutcome: PromotionOutcome.ENROLLED,
            },
          });

          summary.promoted += 1;
        }
      }

      await tx.studentEnrollment.updateMany({
        where: { schoolId, academicYearId: { not: toYear.id } },
        data: { isCurrent: false },
      });

      if (dto.setToYearCurrent !== false) {
        await tx.academicYear.updateMany({
          where: { schoolId },
          data: { isCurrent: false },
        });
        await tx.academicYear.update({
          where: { id: toYear.id },
          data: { isCurrent: true },
        });
      }
    });

    return {
      ...summary,
      message: `Promoted ${summary.promoted} students to ${toYear.name}. ${summary.graduated} marked as graduates.`,
    };
  }
}
