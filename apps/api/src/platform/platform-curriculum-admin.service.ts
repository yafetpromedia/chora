import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurriculumCatalogService } from '../provisioning/curriculum-catalog.service';
import {
  CreatePackageDepartmentDto,
  UpdatePackageDepartmentDto,
} from './dto/platform-department.dto';
import { AddPackageLibraryItemDto } from './dto/platform-library.dto';
import {
  AddPackageTemplateDto,
  UpdatePackageTemplateDto,
} from './dto/platform-template.dto';
import {
  AddPackageSubjectDto,
  UpdateCurriculumPackageDto,
} from './dto/platform-subject.dto';
import { PlatformSubjectsService } from './platform-subjects.service';
import { PlatformContentSyncService } from './platform-content-sync.service';

@Injectable()
export class PlatformCurriculumAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CurriculumCatalogService,
    private readonly platformSubjects: PlatformSubjectsService,
    private readonly contentSync: PlatformContentSyncService,
  ) {}

  async updatePackage(key: string, dto: UpdateCurriculumPackageDto) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');
    if (pkg.isBlank) {
      throw new BadRequestException('Cannot edit blank package metadata');
    }
    return this.prisma.curriculumPackage.update({
      where: { key },
      data: {
        ...(dto.label != null ? { label: dto.label.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
      },
    });
  }

  async addSubjectToPackage(key: string, dto: AddPackageSubjectDto) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');
    if (pkg.isBlank) {
      throw new BadRequestException('Cannot add subjects to blank package');
    }

    const platform = await this.platformSubjects.getById(dto.platformSubjectId);
    const existing = await this.prisma.curriculumPackageSubject.findUnique({
      where: {
        packageId_code: { packageId: pkg.id, code: platform.code },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Subject ${platform.code} is already in this package`,
      );
    }

    const maxOrder = await this.prisma.curriculumPackageSubject.aggregate({
      where: { packageId: pkg.id },
      _max: { sortOrder: true },
    });

    return this.prisma.curriculumPackageSubject.create({
      data: {
        packageId: pkg.id,
        platformSubjectId: platform.id,
        code: platform.code,
        name: platform.name,
        level: dto.level?.trim() || platform.level,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { platformSubject: true },
    });
  }

  async addLibraryItemToPackage(key: string, dto: AddPackageLibraryItemDto) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');
    if (pkg.isBlank) {
      throw new BadRequestException('Cannot add library items to blank package');
    }

    const resource = await this.prisma.platformLibraryResource.findUnique({
      where: { id: dto.platformLibraryResourceId },
      include: { category: true },
    });
    if (!resource || resource.isArchived) {
      throw new NotFoundException('Platform library resource not found');
    }

    const existing = await this.prisma.curriculumPackageLibraryItem.findFirst({
      where: {
        packageId: pkg.id,
        OR: [
          { platformLibraryResourceId: resource.id },
          {
            title: resource.title,
            categorySlug: resource.category.slug,
          },
        ],
      },
    });
    if (existing) {
      throw new BadRequestException(
        `"${resource.title}" is already in this package`,
      );
    }

    const maxOrder = await this.prisma.curriculumPackageLibraryItem.aggregate({
      where: { packageId: pkg.id },
      _max: { sortOrder: true },
    });

    return this.prisma.curriculumPackageLibraryItem.create({
      data: {
        packageId: pkg.id,
        platformLibraryResourceId: resource.id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resourceType,
        categorySlug: resource.category.slug,
        subject: resource.subject,
        gradeLabel: resource.gradeLabel,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { platformLibraryResource: true },
    });
  }

  async removeLibraryItemFromPackage(
    key: string,
    packageLibraryItemId: string,
  ) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');

    const row = await this.prisma.curriculumPackageLibraryItem.findFirst({
      where: { id: packageLibraryItemId, packageId: pkg.id },
    });
    if (!row) throw new NotFoundException('Package library item not found');

    await this.prisma.curriculumPackageLibraryItem.delete({
      where: { id: row.id },
    });
    return { ok: true };
  }

  async removeSubjectFromPackage(key: string, packageSubjectId: string) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');

    const row = await this.prisma.curriculumPackageSubject.findFirst({
      where: { id: packageSubjectId, packageId: pkg.id },
    });
    if (!row) throw new NotFoundException('Package subject not found');

    await this.prisma.curriculumPackageSubject.delete({
      where: { id: row.id },
    });
    return { ok: true };
  }

  async addTemplateToPackage(key: string, dto: AddPackageTemplateDto) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');
    if (pkg.isBlank) {
      throw new BadRequestException('Cannot add templates to blank package');
    }

    const platform = await this.prisma.platformMessageTemplate.findUnique({
      where: { id: dto.platformMessageTemplateId },
    });
    if (!platform || platform.isArchived) {
      throw new NotFoundException('Platform message template not found');
    }

    const existing = await this.prisma.curriculumPackageTemplate.findUnique({
      where: {
        packageId_key: { packageId: pkg.id, key: platform.key },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Template ${platform.key} is already in this package`,
      );
    }

    const maxOrder = await this.prisma.curriculumPackageTemplate.aggregate({
      where: { packageId: pkg.id },
      _max: { sortOrder: true },
    });

    return this.prisma.curriculumPackageTemplate.create({
      data: {
        packageId: pkg.id,
        platformMessageTemplateId: platform.id,
        key: platform.key,
        name: platform.name,
        channel: platform.channel,
        body: platform.body,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { platformMessageTemplate: true },
    });
  }

  async updatePackageTemplate(
    key: string,
    packageTemplateId: string,
    dto: UpdatePackageTemplateDto,
  ) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');

    const row = await this.prisma.curriculumPackageTemplate.findFirst({
      where: { id: packageTemplateId, packageId: pkg.id },
    });
    if (!row) throw new NotFoundException('Package template not found');

    return this.prisma.curriculumPackageTemplate.update({
      where: { id: row.id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.channel != null ? { channel: dto.channel.trim().toUpperCase() } : {}),
        ...(dto.body != null ? { body: dto.body.trim() } : {}),
      },
    });
  }

  async removeTemplateFromPackage(key: string, packageTemplateId: string) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');

    const row = await this.prisma.curriculumPackageTemplate.findFirst({
      where: { id: packageTemplateId, packageId: pkg.id },
    });
    if (!row) throw new NotFoundException('Package template not found');

    await this.prisma.curriculumPackageTemplate.delete({
      where: { id: row.id },
    });
    return { ok: true };
  }

  async addDepartmentToPackage(key: string, dto: CreatePackageDepartmentDto) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');
    if (pkg.isBlank) {
      throw new BadRequestException('Cannot add departments to blank package');
    }

    const name = dto.name.trim();
    const existing = await this.prisma.curriculumPackageDepartment.findUnique({
      where: { packageId_name: { packageId: pkg.id, name } },
    });
    if (existing) {
      throw new BadRequestException(`Department "${name}" is already in this package`);
    }

    const maxOrder = await this.prisma.curriculumPackageDepartment.aggregate({
      where: { packageId: pkg.id },
      _max: { sortOrder: true },
    });

    return this.prisma.curriculumPackageDepartment.create({
      data: {
        packageId: pkg.id,
        name,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async updatePackageDepartment(
    key: string,
    departmentId: string,
    dto: UpdatePackageDepartmentDto,
  ) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');

    const row = await this.prisma.curriculumPackageDepartment.findFirst({
      where: { id: departmentId, packageId: pkg.id },
    });
    if (!row) throw new NotFoundException('Package department not found');

    const name = dto.name.trim();
    if (name !== row.name) {
      const clash = await this.prisma.curriculumPackageDepartment.findUnique({
        where: { packageId_name: { packageId: pkg.id, name } },
      });
      if (clash) {
        throw new BadRequestException(`Department "${name}" already exists`);
      }
    }

    return this.prisma.curriculumPackageDepartment.update({
      where: { id: row.id },
      data: { name },
    });
  }

  async removeDepartmentFromPackage(key: string, departmentId: string) {
    const pkg = await this.prisma.curriculumPackage.findUnique({
      where: { key },
    });
    if (!pkg) throw new NotFoundException('Curriculum package not found');

    const row = await this.prisma.curriculumPackageDepartment.findFirst({
      where: { id: departmentId, packageId: pkg.id },
    });
    if (!row) throw new NotFoundException('Package department not found');

    await this.prisma.curriculumPackageDepartment.delete({
      where: { id: row.id },
    });
    return { ok: true };
  }

  /**
   * Refresh package links from platform masters (eLibrary, subjects, templates).
   * Does not recreate seed samples or wipe package eLibrary selections.
   */
  async syncCatalogFromCode() {
    await this.catalog.ensurePackagesFromDefinitions();
    await this.platformSubjects.linkPackageSubjectsToPlatform();
    await this.contentSync.linkPackagesToPlatformContent();
    return this.catalog.listPackages();
  }

  listProvisioningLogs(schoolId?: string, limit = 50) {
    return this.prisma.schoolProvisioningLog.findMany({
      where: schoolId ? { schoolId } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        school: { select: { id: true, name: true, joinCode: true } },
      },
    });
  }
}
