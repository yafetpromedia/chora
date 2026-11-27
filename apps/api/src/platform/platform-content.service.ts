import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { copyFile, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePlatformLibraryResourceDto,
  UpdatePlatformLibraryResourceDto,
} from './dto/platform-library.dto';
import {
  CreatePlatformStructureDto,
  UpdatePlatformStructureDto,
} from './dto/platform-structure.dto';
import {
  CreatePlatformMessageTemplateDto,
  UpdatePlatformMessageTemplateDto,
} from './dto/platform-template.dto';
import { PlatformContentSyncService } from './platform-content-sync.service';

@Injectable()
export class PlatformContentService {
  private readonly uploadRoot = join(
    process.cwd(),
    'uploads',
    'platform-library',
  );
  private readonly schoolUploadRoot = join(process.cwd(), 'uploads', 'library');

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

  async createStructure(dto: CreatePlatformStructureDto) {
    const key = dto.key.trim().toUpperCase();
    const existing = await this.prisma.platformAcademicStructure.findUnique({
      where: { key },
    });
    if (existing) {
      throw new BadRequestException('A structure with this key already exists');
    }

    const maxOrder = await this.prisma.platformAcademicStructure.aggregate({
      _max: { sortOrder: true },
    });

    return this.prisma.platformAcademicStructure.create({
      data: {
        key,
        label: dto.label.trim(),
        description: dto.description?.trim() || null,
        gradePreset: dto.gradePreset,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { _count: { select: { packages: true } } },
    });
  }

  async updateStructure(id: string, dto: UpdatePlatformStructureDto) {
    const existing = await this.prisma.platformAcademicStructure.findUnique({
      where: { id },
      include: { _count: { select: { packages: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Academic structure not found');
    }

    return this.prisma.platformAcademicStructure.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.gradePreset !== undefined
          ? { gradePreset: dto.gradePreset }
          : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
      include: { _count: { select: { packages: true } } },
    });
  }

  async deleteStructure(id: string) {
    const existing = await this.prisma.platformAcademicStructure.findUnique({
      where: { id },
      include: { _count: { select: { packages: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Academic structure not found');
    }
    if (existing._count.packages > 0) {
      throw new BadRequestException(
        'Unlink this structure from packages before deleting, or archive it instead.',
      );
    }

    await this.prisma.platformAcademicStructure.delete({ where: { id } });
    return { ok: true };
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

  async createLibraryResource(dto: CreatePlatformLibraryResourceDto) {
    const category = await this.prisma.platformLibraryCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Library category not found');
    }

    const maxOrder = await this.prisma.platformLibraryResource.aggregate({
      _max: { sortOrder: true },
    });

    return this.prisma.platformLibraryResource.create({
      data: {
        categoryId: category.id,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        resourceType: dto.resourceType,
        subject: dto.subject?.trim() || null,
        gradeLabel: dto.gradeLabel?.trim() || null,
        fileUrl: dto.fileUrl?.trim() || null,
        externalUrl: dto.externalUrl?.trim() || null,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        category: { select: { id: true, slug: true, name: true, icon: true } },
        _count: { select: { schoolResources: true, packageLinks: true } },
      },
    });
  }

  async updateLibraryResource(
    id: string,
    dto: UpdatePlatformLibraryResourceDto,
  ) {
    const existing = await this.prisma.platformLibraryResource.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Library resource not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.platformLibraryCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Library category not found');
      }
    }

    return this.prisma.platformLibraryResource.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.resourceType !== undefined
          ? { resourceType: dto.resourceType }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.subject !== undefined
          ? { subject: dto.subject.trim() || null }
          : {}),
        ...(dto.gradeLabel !== undefined
          ? { gradeLabel: dto.gradeLabel.trim() || null }
          : {}),
        ...(dto.fileUrl !== undefined
          ? { fileUrl: dto.fileUrl.trim() || null }
          : {}),
        ...(dto.externalUrl !== undefined
          ? { externalUrl: dto.externalUrl.trim() || null }
          : {}),
      },
      include: {
        category: { select: { id: true, slug: true, name: true, icon: true } },
        _count: { select: { schoolResources: true, packageLinks: true } },
      },
    });
  }

  async archiveLibraryResource(id: string) {
    const existing = await this.prisma.platformLibraryResource.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Library resource not found');
    }
    return this.prisma.platformLibraryResource.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async deleteLibraryResource(id: string) {
    const existing = await this.prisma.platformLibraryResource.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Library resource not found');
    }

    await this.prisma.$transaction([
      this.prisma.curriculumPackageLibraryItem.deleteMany({
        where: { platformLibraryResourceId: id },
      }),
      this.prisma.platformLibraryResource.delete({ where: { id } }),
    ]);

    return { ok: true };
  }

  listMessageTemplates(includeArchived = false) {
    return this.prisma.platformMessageTemplate.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { packageLinks: true, schoolTemplates: true } },
      },
    });
  }

  async createMessageTemplate(dto: CreatePlatformMessageTemplateDto) {
    const key = dto.key.trim().toLowerCase();
    const existing = await this.prisma.platformMessageTemplate.findUnique({
      where: { key },
    });
    if (existing) {
      throw new BadRequestException(`Template key ${key} already exists`);
    }

    const maxOrder = await this.prisma.platformMessageTemplate.aggregate({
      _max: { sortOrder: true },
    });

    return this.prisma.platformMessageTemplate.create({
      data: {
        key,
        name: dto.name.trim(),
        channel: dto.channel.trim().toUpperCase(),
        body: dto.body.trim(),
        description: dto.description?.trim() || null,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        _count: { select: { packageLinks: true, schoolTemplates: true } },
      },
    });
  }

  async updateMessageTemplate(
    id: string,
    dto: UpdatePlatformMessageTemplateDto,
  ) {
    const existing = await this.prisma.platformMessageTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Message template not found');
    }

    return this.prisma.platformMessageTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.channel !== undefined
          ? { channel: dto.channel.trim().toUpperCase() }
          : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
      },
      include: {
        _count: { select: { packageLinks: true, schoolTemplates: true } },
      },
    });
  }

  async archiveMessageTemplate(id: string) {
    const existing = await this.prisma.platformMessageTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Message template not found');
    }
    return this.prisma.platformMessageTemplate.update({
      where: { id },
      data: { isArchived: true },
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
        packageLinks: {
          include: { package: { select: { key: true, label: true } } },
        },
      },
    });
    if (!row)
      throw new NotFoundException('Platform assessment template not found');
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

  async saveUploadedFile(file: {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
  }) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    await mkdir(this.uploadRoot, { recursive: true });
    const filename = `${Date.now()}-${safeName}`;
    const fullPath = join(this.uploadRoot, filename);
    await writeFile(fullPath, file.buffer);
    return {
      fileUrl: `/platform/library/files/${filename}`,
      mimeType: file.mimetype,
      ext: extname(safeName),
    };
  }

  getFilePath(filename: string) {
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Invalid file');
    }
    return join(this.uploadRoot, filename);
  }

  async copyPlatformFileToSchool(schoolId: string, platformFileUrl: string) {
    const prefix = '/platform/library/files/';
    if (!platformFileUrl.startsWith(prefix)) {
      return platformFileUrl;
    }
    const filename = platformFileUrl.slice(prefix.length);
    const sourcePath = this.getFilePath(filename);
    if (!existsSync(sourcePath)) {
      return null;
    }

    const schoolDir = join(this.schoolUploadRoot, schoolId);
    await mkdir(schoolDir, { recursive: true });
    const schoolFilename = `platform-${filename}`;
    const destPath = join(schoolDir, schoolFilename);
    await copyFile(sourcePath, destPath);
    return `/schools/library/files/${schoolId}/${schoolFilename}`;
  }
}
