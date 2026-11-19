import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CURRICULUM_PACKAGE_DEFINITIONS } from './curriculum-packages.data';

@Injectable()
export class CurriculumCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert package shells from code definitions.
   * Seed subjects / departments / library / templates only when that package
   * section is empty — never wipe operator edits on restart or sync.
   */
  async ensurePackagesFromDefinitions() {
    for (const def of CURRICULUM_PACKAGE_DEFINITIONS) {
      const existing = await this.prisma.curriculumPackage.findUnique({
        where: { key: def.key },
      });
      const pkg = await this.prisma.curriculumPackage.upsert({
        where: { key: def.key },
        create: {
          key: def.key,
          label: def.label,
          description: def.description,
          gradePreset: def.gradePreset ?? null,
          schoolType: def.schoolType ?? null,
          isBlank: def.isBlank ?? false,
          isActive: true,
          sortOrder: def.sortOrder,
        },
        update: {},
      });

      // Existing packages may have intentionally edited or emptied sections.
      // Only seed package sections during initial package creation.
      if (existing) continue;

      const [subjectCount, deptCount, libraryCount, templateCount] =
        await Promise.all([
          this.prisma.curriculumPackageSubject.count({
            where: { packageId: pkg.id },
          }),
          this.prisma.curriculumPackageDepartment.count({
            where: { packageId: pkg.id },
          }),
          this.prisma.curriculumPackageLibraryItem.count({
            where: { packageId: pkg.id },
          }),
          this.prisma.curriculumPackageTemplate.count({
            where: { packageId: pkg.id },
          }),
        ]);

      if (subjectCount === 0 && def.subjects.length) {
        await this.prisma.curriculumPackageSubject.createMany({
          data: def.subjects.map((s, i) => ({
            packageId: pkg.id,
            code: s.code,
            name: s.name,
            level: s.level ?? null,
            sortOrder: i,
          })),
        });
      }

      if (deptCount === 0 && def.departments.length) {
        await this.prisma.curriculumPackageDepartment.createMany({
          data: def.departments.map((name, i) => ({
            packageId: pkg.id,
            name,
            sortOrder: i,
          })),
        });
      }

      if (libraryCount === 0 && def.libraryItems.length) {
        await this.prisma.curriculumPackageLibraryItem.createMany({
          data: def.libraryItems.map((item, i) => ({
            packageId: pkg.id,
            title: item.title,
            description: item.description ?? null,
            resourceType: item.resourceType,
            categorySlug: item.categorySlug,
            subject: item.subject ?? null,
            gradeLabel: item.gradeLabel ?? null,
            sortOrder: i,
          })),
        });
      }

      if (templateCount === 0 && def.templates.length) {
        await this.prisma.curriculumPackageTemplate.createMany({
          data: def.templates.map((t, i) => ({
            packageId: pkg.id,
            key: t.key,
            name: t.name,
            channel: t.channel,
            body: t.body,
            sortOrder: i,
          })),
        });
      }
    }
  }

  /** @deprecated Prefer ensurePackagesFromDefinitions — kept for callers. */
  async syncCatalogFromDefinitions() {
    return this.ensurePackagesFromDefinitions();
  }

  listPackages() {
    return this.prisma.curriculumPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            subjects: true,
            departments: true,
            libraryItems: true,
            templates: true,
          },
        },
      },
    });
  }

  async getPackageByKey(key: string) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
      include: {
        academicStructure: true,
        subjects: {
          orderBy: { sortOrder: 'asc' },
          include: { platformSubject: true },
        },
        departments: { orderBy: { sortOrder: 'asc' } },
        libraryItems: {
          orderBy: { sortOrder: 'asc' },
          include: { platformLibraryResource: true },
        },
        templates: {
          orderBy: { sortOrder: 'asc' },
          include: { platformMessageTemplate: true },
        },
        assessmentTemplates: {
          orderBy: { sortOrder: 'asc' },
          include: {
            platformAssessmentTemplate: {
              include: { components: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });
    if (!pkg) {
      throw new NotFoundException('Curriculum package not found');
    }
    return pkg;
  }
}
