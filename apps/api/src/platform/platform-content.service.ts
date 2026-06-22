import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformContentSyncService } from './platform-content-sync.service';

@Injectable()
export class PlatformContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: PlatformContentSyncService,
  ) {}

  listStructures(includeArchived = false) {
    return this.prisma.platformAcademicStructure.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { packages: true } } },
    });
  }

  listLibraryCategories() {
    return this.prisma.platformLibraryCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { resources: true } } },
    });
  }

  listLibraryResources(includeArchived = false) {
    return this.prisma.platformLibraryResource.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        category: { select: { id: true, slug: true, name: true, icon: true } },
        _count: { select: { schoolResources: true, packageLinks: true } },
      },
    });
  }

  listMessageTemplates(includeArchived = false) {
    return this.prisma.platformMessageTemplate.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { packageLinks: true, schoolTemplates: true } } },
    });
  }

  listAssessmentTemplates(includeArchived = false) {
    return this.prisma.platformAssessmentTemplate.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { sortOrder: 'asc' },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { packageLinks: true, schoolTemplates: true } },
      },
    });
  }

  async getAssessmentTemplate(id: string) {
    const row = await this.prisma.platformAssessmentTemplate.findUnique({
      where: { id },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        packageLinks: { include: { package: { select: { key: true, label: true } } } },
      },
    });
    if (!row) throw new NotFoundException('Platform assessment template not found');
    return row;
  }

  async copyAssessmentTemplateToSchool(
    schoolId: string,
    platformTemplateId: string,
  ) {
    const platform = await this.prisma.platformAssessmentTemplate.findUnique({
      where: { id: platformTemplateId },
      include: { components: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!platform) throw new NotFoundException('Platform template not found');

    const existing = await this.prisma.assessmentTemplate.findFirst({
      where: {
        schoolId,
        OR: [
          { platformAssessmentTemplateId: platform.id },
          { name: platform.name },
        ],
      },
    });
    if (existing?.isCustomized) return existing;

    let template = existing;
    if (!template) {
      template = await this.prisma.assessmentTemplate.create({
        data: {
          schoolId,
          name: platform.name,
          description: platform.description,
          isSystem: true,
          platformAssessmentTemplateId: platform.id,
          isCustomized: false,
          components: {
            create: platform.components.map((c) => ({
              name: c.name,
              weightPercent: c.weightPercent,
              maxScore: c.maxScore,
              sortOrder: c.sortOrder,
            })),
          },
        },
        include: { components: true },
      });
    } else {
      const templateId = template.id;
      await this.prisma.assessmentTemplateComponent.deleteMany({
        where: { templateId },
      });
      await this.prisma.assessmentTemplateComponent.createMany({
        data: platform.components.map((c) => ({
          templateId,
          name: c.name,
          weightPercent: c.weightPercent,
          maxScore: c.maxScore,
          sortOrder: c.sortOrder,
        })),
      });
      template = await this.prisma.assessmentTemplate.update({
        where: { id: template.id },
        data: {
          description: platform.description,
          isSystem: true,
          platformAssessmentTemplateId: platform.id,
        },
        include: { components: true },
      });
    }

    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
    });
    for (const g of grades) {
      const n = g.name.match(/(\d+)/)?.[1];
      if (!n) continue;
      const num = Number(n);
      if (
        platform.gradeMin != null &&
        platform.gradeMax != null &&
        (num < platform.gradeMin || num > platform.gradeMax)
      ) {
        continue;
      }
      const link = await this.prisma.assessmentTemplateGrade.findFirst({
        where: { templateId: template.id, gradeId: g.id, subjectId: null },
      });
      if (!link) {
        await this.prisma.assessmentTemplateGrade.create({
          data: { templateId: template.id, gradeId: g.id, subjectId: null },
        });
      }
    }

    return template;
  }

  syncAll() {
    return this.sync.syncAll();
  }
}
