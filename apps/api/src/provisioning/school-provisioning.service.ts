import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GradePreset,
  LibraryResourceStatus,
  SchoolType,
} from '@prisma/client';
import { GradesService } from '../grades/grades.service';
import { LibraryService } from '../library/library.service';
import { AcademicsService } from '../results/academics.service';
import { AcademicYearsService } from '../results/academic-years.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_CURRICULUM_PACKAGE_KEY,
} from './curriculum-packages.data';
import { CurriculumCatalogService } from './curriculum-catalog.service';

export type ProvisionSchoolOptions = {
  curriculumPackageKey?: string;
  gradePreset?: GradePreset;
  schoolType?: SchoolType;
  skipGrades?: boolean;
};

export type ProvisionSummary = {
  packageKey: string;
  subjects: number;
  departments: number;
  libraryResources: number;
  templates: number;
  gradesCreated: boolean;
  academicYearCreated: boolean;
};

@Injectable()
export class SchoolProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CurriculumCatalogService,
    private readonly gradesService: GradesService,
    private readonly academicYearsService: AcademicYearsService,
    private readonly academicsService: AcademicsService,
    private readonly libraryService: LibraryService,
  ) {}

  async provisionSchool(
    schoolId: string,
    options: ProvisionSchoolOptions = {},
  ): Promise<ProvisionSummary> {
    const packageKey =
      options.curriculumPackageKey?.trim() || DEFAULT_CURRICULUM_PACKAGE_KEY;

    const pkg = await this.catalog.getPackageByKey(packageKey);
    if (pkg.isBlank) {
      await this.prisma.school.update({
        where: { id: schoolId },
        data: { curriculumPackageKey: packageKey },
      });
      await this.libraryService.ensureCategories(schoolId);
      return {
        packageKey,
        subjects: 0,
        departments: 0,
        libraryResources: 0,
        templates: 0,
        gradesCreated: false,
        academicYearCreated: false,
      };
    }

    const gradePreset =
      options.gradePreset ?? pkg.gradePreset ?? GradePreset.KG_12;
    const schoolType = options.schoolType ?? pkg.schoolType ?? SchoolType.MIXED;

    let gradesCreated = false;
    if (!options.skipGrades) {
      const gradeCount = await this.prisma.grade.count({ where: { schoolId } });
      if (gradeCount === 0) {
        await this.gradesService.setupGrades(schoolId, gradePreset);
        gradesCreated = true;
      }
    }

    const year = await this.academicYearsService.ensureCurrentYear(schoolId);
    let academicYearCreated = false;
    const termCount = await this.prisma.academicTerm.count({
      where: { schoolId, academicYearId: year.id },
    });
    if (termCount === 0) {
      academicYearCreated = true;
      const start = new Date(year.startDate);
      const semesters = [
        { name: 'Semester 1', sortOrder: 0, months: 0 },
        { name: 'Semester 2', sortOrder: 1, months: 5 },
      ];
      for (const sem of semesters) {
        const termStart = new Date(start);
        termStart.setMonth(termStart.getMonth() + sem.months);
        const termEnd = new Date(termStart);
        termEnd.setMonth(termEnd.getMonth() + 4);
        await this.prisma.academicTerm.create({
          data: {
            schoolId,
            academicYearId: year.id,
            name: sem.name,
            sortOrder: sem.sortOrder,
            startDate: termStart,
            endDate: termEnd,
            isCurrent: sem.sortOrder === 0,
          },
        });
      }
    }

    await this.academicsService.ensureGradingScale(schoolId);

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolType: true },
    });
    const effectiveType = schoolType ?? school?.schoolType ?? SchoolType.MIXED;

    let subjectCount = 0;
    for (const s of pkg.subjects) {
      if (
        s.level === 'PRIMARY' &&
        effectiveType === SchoolType.SECONDARY
      ) {
        continue;
      }
      if (
        s.level === 'SECONDARY' &&
        (effectiveType === SchoolType.PRIMARY ||
          effectiveType === SchoolType.KINDERGARTEN)
      ) {
        continue;
      }
      await this.prisma.subject.upsert({
        where: { schoolId_code: { schoolId, code: s.code } },
        create: { schoolId, code: s.code, name: s.name },
        update: { name: s.name },
      });
      subjectCount += 1;
    }

    let departmentCount = 0;
    for (const d of pkg.departments) {
      await this.prisma.schoolDepartment.upsert({
        where: { schoolId_name: { schoolId, name: d.name } },
        create: {
          schoolId,
          name: d.name,
          sortOrder: d.sortOrder,
        },
        update: { sortOrder: d.sortOrder },
      });
      departmentCount += 1;
    }

    let templateCount = 0;
    for (const t of pkg.templates) {
      await this.prisma.schoolMessageTemplate.upsert({
        where: { schoolId_key: { schoolId, key: t.key } },
        create: {
          schoolId,
          key: t.key,
          name: t.name,
          channel: t.channel,
          body: t.body,
        },
        update: { name: t.name, channel: t.channel, body: t.body },
      });
      templateCount += 1;
    }

    await this.libraryService.ensureCategories(schoolId);
    const categories = await this.prisma.libraryCategory.findMany({
      where: { schoolId },
    });
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    });
    const gradeByName = new Map(grades.map((g) => [g.name, g.id]));

    let libraryCount = 0;
    for (const item of pkg.libraryItems) {
      const categoryId = categoryBySlug.get(item.categorySlug);
      if (!categoryId) continue;

      const gradeId = item.gradeLabel
        ? gradeByName.get(item.gradeLabel) ?? null
        : null;

      const existing = await this.prisma.libraryResource.findFirst({
        where: {
          schoolId,
          title: item.title,
          categoryId,
        },
      });
      if (existing) continue;

      await this.prisma.libraryResource.create({
        data: {
          schoolId,
          categoryId,
          title: item.title,
          description: item.description,
          resourceType: item.resourceType,
          subject: item.subject,
          gradeId,
          status: LibraryResourceStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      libraryCount += 1;
    }

    await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        curriculumPackageKey: packageKey,
        gradePreset,
        schoolType: effectiveType,
        ...(gradesCreated ? { setupComplete: true } : {}),
      },
    });

    return {
      packageKey,
      subjects: subjectCount,
      departments: departmentCount,
      libraryResources: libraryCount,
      templates: templateCount,
      gradesCreated,
      academicYearCreated,
    };
  }

  async reprovisionSchool(schoolId: string, packageKey: string) {
    const studentCount = await this.prisma.studentProfile.count({
      where: { schoolId },
    });
    if (studentCount > 0) {
      throw new BadRequestException(
        'Cannot re-provision while students are enrolled. Use admin tools to add subjects manually.',
      );
    }
    return this.provisionSchool(schoolId, {
      curriculumPackageKey: packageKey,
      skipGrades: true,
    });
  }
}
