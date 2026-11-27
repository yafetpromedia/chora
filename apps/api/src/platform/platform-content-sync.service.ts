import { Injectable } from '@nestjs/common';
import { GradePreset } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CURRICULUM_PACKAGE_DEFINITIONS } from '../provisioning/curriculum-packages.data';
import { DEFAULT_LIBRARY_CATEGORIES } from '../library/library.constants';

const ACADEMIC_STRUCTURES = [
  {
    key: 'KG_12',
    label: 'KG through Grade 12',
    gradePreset: GradePreset.KG_12,
    description: 'Full K–12 private school structure',
  },
  {
    key: 'PRIMARY_1_8',
    label: 'Primary (Grades 1–8)',
    gradePreset: GradePreset.GRADES_1_8,
    description: 'Primary school only',
  },
  {
    key: 'SECONDARY_9_12',
    label: 'Secondary (Grades 9–12)',
    gradePreset: GradePreset.GRADES_9_12,
    description: 'Secondary / preparatory',
  },
];

const PLATFORM_ASSESSMENT_TEMPLATES = [
  {
    key: 'PRIMARY_1_4',
    name: 'Primary (Grades 1–4)',
    description: 'Activity-based primary assessment',
    gradeMin: 1,
    gradeMax: 4,
    components: [
      { name: 'Activity', weightPercent: 10, maxScore: 10, sortOrder: 0 },
      { name: 'Worksheet', weightPercent: 10, maxScore: 10, sortOrder: 1 },
      {
        name: 'Class Participation',
        weightPercent: 10,
        maxScore: 10,
        sortOrder: 2,
      },
      { name: 'Mid Exam', weightPercent: 20, maxScore: 20, sortOrder: 3 },
      { name: 'Final Exam', weightPercent: 50, maxScore: 50, sortOrder: 4 },
    ],
  },
  {
    key: 'MIDDLE_5_8',
    name: 'Middle School (Grades 5–8)',
    description: 'Balanced continuous assessment',
    gradeMin: 5,
    gradeMax: 8,
    components: [
      { name: 'Assignment', weightPercent: 15, maxScore: 15, sortOrder: 0 },
      { name: 'Quiz', weightPercent: 15, maxScore: 15, sortOrder: 1 },
      { name: 'Group Work', weightPercent: 10, maxScore: 10, sortOrder: 2 },
      { name: 'Mid Exam', weightPercent: 20, maxScore: 20, sortOrder: 3 },
      { name: 'Final Exam', weightPercent: 40, maxScore: 40, sortOrder: 4 },
    ],
  },
  {
    key: 'SECONDARY_9_12',
    name: 'Secondary (Grades 9–12)',
    description: 'Exam-focused secondary assessment',
    gradeMin: 9,
    gradeMax: 12,
    components: [
      { name: 'Assignment', weightPercent: 15, maxScore: 15, sortOrder: 0 },
      { name: 'Project', weightPercent: 10, maxScore: 10, sortOrder: 1 },
      { name: 'Mid Exam', weightPercent: 25, maxScore: 25, sortOrder: 2 },
      { name: 'Final Exam', weightPercent: 50, maxScore: 50, sortOrder: 3 },
    ],
  },
];

@Injectable()
export class PlatformContentSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncAll() {
    await this.syncAcademicStructures();
    await this.syncLibraryCatalog();
    await this.syncMessageTemplates();
    await this.syncAssessmentTemplates();
    await this.linkPackagesToPlatformContent();
  }

  async syncAcademicStructures() {
    let order = 0;
    for (const s of ACADEMIC_STRUCTURES) {
      await this.prisma.platformAcademicStructure.upsert({
        where: { key: s.key },
        create: {
          key: s.key,
          label: s.label,
          description: s.description,
          gradePreset: s.gradePreset,
          sortOrder: order++,
        },
        update: {},
      });
    }
  }

  async syncLibraryCatalog() {
    const existingCategoryCount =
      await this.prisma.platformLibraryCategory.count();
    for (const cat of DEFAULT_LIBRARY_CATEGORIES) {
      await this.prisma.platformLibraryCategory.upsert({
        where: { slug: cat.slug },
        create: {
          slug: cat.slug,
          name: cat.name,
          icon: cat.icon ?? null,
          sortOrder: cat.sortOrder,
        },
        update: {},
      });
    }

    // Do not repopulate resources in an existing catalog.
    if (existingCategoryCount > 0) return;

    const categories = await this.prisma.platformLibraryCategory.findMany();
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));

    // Seed starter package library items only on an empty catalog.
    // If operators delete samples, do not recreate them on API restart or Sync.
    const existingCount = await this.prisma.platformLibraryResource.count();
    if (existingCount > 0) {
      return;
    }

    const seeded = new Set<string>();
    let order = 0;
    for (const pkg of CURRICULUM_PACKAGE_DEFINITIONS) {
      for (const item of pkg.libraryItems) {
        const categoryId = slugToId.get(item.categorySlug);
        if (!categoryId) continue;
        const key = `${categoryId}::${item.title}`;
        if (seeded.has(key)) continue;
        seeded.add(key);

        await this.prisma.platformLibraryResource.create({
          data: {
            categoryId,
            title: item.title,
            description: item.description ?? null,
            resourceType: item.resourceType,
            subject: item.subject ?? null,
            gradeLabel: item.gradeLabel ?? null,
            sortOrder: order++,
          },
        });
      }
    }
  }

  async syncMessageTemplates() {
    const allTemplates = CURRICULUM_PACKAGE_DEFINITIONS.flatMap(
      (p) => p.templates,
    );
    const seen = new Map<string, (typeof allTemplates)[0]>();
    for (const t of allTemplates) {
      if (!seen.has(t.key)) seen.set(t.key, t);
    }

    let order = 0;
    for (const [key, t] of seen) {
      await this.prisma.platformMessageTemplate.upsert({
        where: { key },
        create: {
          key,
          name: t.name,
          channel: t.channel,
          body: t.body,
          sortOrder: order++,
        },
        update: {},
      });
    }
  }

  async syncAssessmentTemplates() {
    let order = 0;
    for (const def of PLATFORM_ASSESSMENT_TEMPLATES) {
      const existing = await this.prisma.platformAssessmentTemplate.findUnique({
        where: { key: def.key },
      });
      const template = await this.prisma.platformAssessmentTemplate.upsert({
        where: { key: def.key },
        create: {
          key: def.key,
          name: def.name,
          description: def.description,
          gradeMin: def.gradeMin,
          gradeMax: def.gradeMax,
          sortOrder: order++,
        },
        update: {},
      });

      // Existing assessment components may have been edited by an administrator.
      if (!existing) {
        await this.prisma.platformAssessmentTemplateComponent.createMany({
          data: def.components.map((c) => ({
            templateId: template.id,
            name: c.name,
            weightPercent: c.weightPercent,
            maxScore: c.maxScore,
            sortOrder: c.sortOrder,
          })),
        });
      }
    }
  }

  async linkPackagesToPlatformContent() {
    const structures = await this.prisma.platformAcademicStructure.findMany();
    const structureByPreset = new Map(
      structures.map((s) => [s.gradePreset, s.id]),
    );

    const platformSubjects = await this.prisma.platformSubject.findMany();
    const subjectByCode = new Map(platformSubjects.map((s) => [s.code, s.id]));

    const platformLibrary = await this.prisma.platformLibraryResource.findMany({
      include: { category: true },
    });
    const libraryByTitle = new Map(
      platformLibrary.map((r) => [`${r.category.slug}:${r.title}`, r.id]),
    );

    const platformMessages =
      await this.prisma.platformMessageTemplate.findMany();
    const messageByKey = new Map(platformMessages.map((m) => [m.key, m.id]));

    const platformAssessments =
      await this.prisma.platformAssessmentTemplate.findMany();
    const assessmentByKey = new Map(
      platformAssessments.map((a) => [a.key, a.id]),
    );

    for (const def of CURRICULUM_PACKAGE_DEFINITIONS) {
      const pkg = await this.prisma.curriculumPackage.findUnique({
        where: { key: def.key },
      });
      if (!pkg) continue;

      const structureId = def.gradePreset
        ? (structureByPreset.get(def.gradePreset) ?? null)
        : null;
      if (structureId && !pkg.academicStructureId) {
        await this.prisma.curriculumPackage.update({
          where: { id: pkg.id },
          data: { academicStructureId: structureId },
        });
      }

      const packageSubjects =
        await this.prisma.curriculumPackageSubject.findMany({
          where: { packageId: pkg.id },
        });
      for (const row of packageSubjects) {
        const platformId = subjectByCode.get(row.code);
        if (platformId && !row.platformSubjectId) {
          await this.prisma.curriculumPackageSubject.update({
            where: { id: row.id },
            data: { platformSubjectId: platformId },
          });
        }
      }

      const packageLibrary =
        await this.prisma.curriculumPackageLibraryItem.findMany({
          where: { packageId: pkg.id },
        });
      for (const row of packageLibrary) {
        const platformId = libraryByTitle.get(
          `${row.categorySlug}:${row.title}`,
        );
        if (platformId && !row.platformLibraryResourceId) {
          await this.prisma.curriculumPackageLibraryItem.update({
            where: { id: row.id },
            data: { platformLibraryResourceId: platformId },
          });
        }
      }

      const packageTemplates =
        await this.prisma.curriculumPackageTemplate.findMany({
          where: { packageId: pkg.id },
        });
      for (const row of packageTemplates) {
        const platformId = messageByKey.get(row.key);
        if (platformId && !row.platformMessageTemplateId) {
          await this.prisma.curriculumPackageTemplate.update({
            where: { id: row.id },
            data: { platformMessageTemplateId: platformId },
          });
        }
      }

      if (!def.isBlank) {
        const links = [
          { key: 'PRIMARY_1_4', grades: [1, 4] },
          { key: 'MIDDLE_5_8', grades: [5, 8] },
          { key: 'SECONDARY_9_12', grades: [9, 12] },
        ];
        let sort = 0;
        for (const link of links) {
          const platformId = assessmentByKey.get(link.key);
          if (!platformId) continue;
          await this.prisma.curriculumPackageAssessmentTemplate.upsert({
            where: {
              packageId_platformAssessmentTemplateId: {
                packageId: pkg.id,
                platformAssessmentTemplateId: platformId,
              },
            },
            create: {
              packageId: pkg.id,
              platformAssessmentTemplateId: platformId,
              sortOrder: sort++,
            },
            update: {},
          });
        }
      }
    }
  }
}
