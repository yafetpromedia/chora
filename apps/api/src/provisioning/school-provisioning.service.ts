import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GradePreset,
  LibraryResourceStatus,
  ProvisioningStepStatus,
  SchoolType,
} from '@prisma/client';
import { GradesService } from '../grades/grades.service';
import { LibraryService } from '../library/library.service';
import { AcademicsService } from '../results/academics.service';
import { AcademicYearsService } from '../results/academic-years.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_CURRICULUM_PACKAGE_KEY } from './curriculum-packages.data';
import { CurriculumCatalogService } from './curriculum-catalog.service';
import { PlatformContentService } from '../platform/platform-content.service';

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
  assessmentTemplates: number;
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
    private readonly platformContent: PlatformContentService,
  ) {}

  private async logStep(
    schoolId: string,
    packageKey: string | null,
    step: string,
    status: ProvisioningStepStatus,
    message?: string,
    meta?: Record<string, unknown>,
  ) {
    await this.prisma.schoolProvisioningLog.create({
      data: {
        schoolId,
        packageKey,
        step,
        status,
        message: message ?? null,
        meta: meta ? (meta as object) : undefined,
      },
    });
  }

  private async provisionSubjectFromPackage(
    schoolId: string,
    code: string,
    name: string,
    platformSubjectId: string | null,
  ) {
    const existing = await this.prisma.subject.findUnique({
      where: { schoolId_code: { schoolId, code } },
    });

    if (existing?.isCustomized) {
      return 'skipped';
    }

    await this.prisma.subject.upsert({
      where: { schoolId_code: { schoolId, code } },
      create: {
        schoolId,
        code,
        name,
        isSystem: true,
        platformSubjectId,
        isCustomized: false,
      },
      update: {
        name,
        isSystem: true,
        platformSubjectId,
      },
    });
    return 'created';
  }

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
      await this.logStep(
        schoolId,
        packageKey,
        'blank_package',
        ProvisioningStepStatus.SKIPPED,
        'Blank package — no academic content copied',
      );
      return {
        packageKey,
        subjects: 0,
        departments: 0,
        libraryResources: 0,
        templates: 0,
        assessmentTemplates: 0,
        gradesCreated: false,
        academicYearCreated: false,
      };
    }

    const gradePreset =
      options.gradePreset ??
      pkg.academicStructure?.gradePreset ??
      pkg.gradePreset ??
      GradePreset.KG_12;
    const schoolType = options.schoolType ?? pkg.schoolType ?? SchoolType.MIXED;

    let gradesCreated = false;
    if (!options.skipGrades) {
      const gradeCount = await this.prisma.grade.count({ where: { schoolId } });
      if (gradeCount === 0) {
        await this.gradesService.setupGrades(schoolId, gradePreset);
        gradesCreated = true;
        await this.logStep(schoolId, packageKey, 'grades', ProvisioningStepStatus.SUCCESS, undefined, {
          gradePreset,
        });
      } else {
        await this.logStep(schoolId, packageKey, 'grades', ProvisioningStepStatus.SKIPPED, 'Grades already exist');
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
      await this.logStep(schoolId, packageKey, 'academic_terms', ProvisioningStepStatus.SUCCESS);
    }

    await this.academicsService.ensureGradingScale(schoolId);
    await this.logStep(schoolId, packageKey, 'grading_scale', ProvisioningStepStatus.SUCCESS);

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolType: true },
    });
    const effectiveType = schoolType ?? school?.schoolType ?? SchoolType.MIXED;

    const platformSubjects = await this.prisma.platformSubject.findMany({
      where: { isArchived: false },
    });
    const platformByCode = new Map(platformSubjects.map((p) => [p.code, p]));

    let subjectCount = 0;
    let subjectSkipped = 0;
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

      const platform =
        platformByCode.get(s.code) ??
        (s.platformSubjectId
          ? platformSubjects.find((p) => p.id === s.platformSubjectId)
          : null);

      const result = await this.provisionSubjectFromPackage(
        schoolId,
        s.code,
        platform?.name ?? s.name,
        platform?.id ?? s.platformSubjectId ?? null,
      );
      if (result === 'skipped') subjectSkipped += 1;
      else subjectCount += 1;
    }

    await this.logStep(
      schoolId,
      packageKey,
      'subjects',
      ProvisioningStepStatus.SUCCESS,
      undefined,
      { created: subjectCount, skippedCustomized: subjectSkipped },
    );

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
    await this.logStep(schoolId, packageKey, 'departments', ProvisioningStepStatus.SUCCESS, undefined, {
      count: departmentCount,
    });

    let templateCount = 0;
    let templateSkipped = 0;
    for (const t of pkg.templates) {
      const existing = await this.prisma.schoolMessageTemplate.findUnique({
        where: { schoolId_key: { schoolId, key: t.key } },
      });
      if (existing?.isCustomized) {
        templateSkipped += 1;
        continue;
      }
      const platformId =
        t.platformMessageTemplateId ?? t.platformMessageTemplate?.id ?? null;
      await this.prisma.schoolMessageTemplate.upsert({
        where: { schoolId_key: { schoolId, key: t.key } },
        create: {
          schoolId,
          key: t.key,
          name: t.name,
          channel: t.channel,
          body: t.body,
          isSystem: true,
          platformMessageTemplateId: platformId,
          isCustomized: false,
        },
        update: {
          name: t.name,
          channel: t.channel,
          body: t.body,
          isSystem: true,
          platformMessageTemplateId: platformId,
        },
      });
      templateCount += 1;
    }
    await this.logStep(schoolId, packageKey, 'message_templates', ProvisioningStepStatus.SUCCESS, undefined, {
      count: templateCount,
      skippedCustomized: templateSkipped,
    });

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
    let librarySkipped = 0;
    for (const item of pkg.libraryItems) {
      const categoryId = categoryBySlug.get(item.categorySlug);
      if (!categoryId) continue;

      const platformRes = item.platformLibraryResource;
      const platformId =
        item.platformLibraryResourceId ?? platformRes?.id ?? null;
      const title = platformRes?.title ?? item.title;

      const existing = await this.prisma.libraryResource.findFirst({
        where: platformId
          ? { schoolId, platformLibraryResourceId: platformId }
          : { schoolId, title, categoryId },
      });
      if (existing?.isCustomized) {
        librarySkipped += 1;
        continue;
      }
      if (existing) continue;

      const gradeId = (platformRes?.gradeLabel ?? item.gradeLabel)
        ? gradeByName.get(platformRes?.gradeLabel ?? item.gradeLabel ?? '') ??
          null
        : null;

      await this.prisma.libraryResource.create({
        data: {
          schoolId,
          categoryId,
          title,
          description: platformRes?.description ?? item.description,
          fileUrl: platformRes?.fileUrl ?? null,
          externalUrl: platformRes?.externalUrl ?? null,
          coverUrl: platformRes?.coverUrl ?? null,
          resourceType: platformRes?.resourceType ?? item.resourceType,
          audience: platformRes?.audience ?? 'BOTH',
          subject: platformRes?.subject ?? item.subject,
          gradeId,
          status: LibraryResourceStatus.PUBLISHED,
          isSystem: true,
          platformLibraryResourceId: platformId,
          isCustomized: false,
          publishedAt: new Date(),
        },
      });
      libraryCount += 1;
    }
    await this.logStep(schoolId, packageKey, 'library', ProvisioningStepStatus.SUCCESS, undefined, {
      count: libraryCount,
      skippedCustomized: librarySkipped,
    });

    let assessmentTemplateCount = 0;
    for (const link of pkg.assessmentTemplates) {
      const platformId = link.platformAssessmentTemplateId;
      if (!platformId) continue;
      await this.platformContent.copyAssessmentTemplateToSchool(
        schoolId,
        platformId,
      );
      assessmentTemplateCount += 1;
    }
    await this.logStep(
      schoolId,
      packageKey,
      'assessment_templates',
      ProvisioningStepStatus.SUCCESS,
      undefined,
      { count: assessmentTemplateCount },
    );

    await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        curriculumPackageKey: packageKey,
        gradePreset,
        schoolType: effectiveType,
        ...(gradesCreated ? { setupComplete: true } : {}),
      },
    });

    await this.logStep(schoolId, packageKey, 'complete', ProvisioningStepStatus.SUCCESS);

    return {
      packageKey,
      subjects: subjectCount,
      departments: departmentCount,
      libraryResources: libraryCount,
      templates: templateCount,
      assessmentTemplates: assessmentTemplateCount,
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
