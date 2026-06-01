import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CURRICULUM_PACKAGE_DEFINITIONS } from './curriculum-packages.data';

@Injectable()
export class CurriculumCatalogService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncCatalogFromDefinitions();
  }

  async syncCatalogFromDefinitions() {
    for (const def of CURRICULUM_PACKAGE_DEFINITIONS) {
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
        update: {
          label: def.label,
          description: def.description,
          gradePreset: def.gradePreset ?? null,
          schoolType: def.schoolType ?? null,
          isBlank: def.isBlank ?? false,
          sortOrder: def.sortOrder,
        },
      });

      await this.prisma.curriculumPackageSubject.deleteMany({
        where: { packageId: pkg.id },
      });
      if (def.subjects.length) {
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

      await this.prisma.curriculumPackageDepartment.deleteMany({
        where: { packageId: pkg.id },
      });
      if (def.departments.length) {
        await this.prisma.curriculumPackageDepartment.createMany({
          data: def.departments.map((name, i) => ({
            packageId: pkg.id,
            name,
            sortOrder: i,
          })),
        });
      }

      await this.prisma.curriculumPackageLibraryItem.deleteMany({
        where: { packageId: pkg.id },
      });
      if (def.libraryItems.length) {
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

      await this.prisma.curriculumPackageTemplate.deleteMany({
        where: { packageId: pkg.id },
      });
      if (def.templates.length) {
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
        subjects: { orderBy: { sortOrder: 'asc' } },
        departments: { orderBy: { sortOrder: 'asc' } },
        libraryItems: { orderBy: { sortOrder: 'asc' } },
        templates: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!pkg) {
      throw new NotFoundException('Curriculum package not found');
    }
    return pkg;
  }
}
