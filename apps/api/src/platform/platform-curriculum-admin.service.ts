import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurriculumCatalogService } from '../provisioning/curriculum-catalog.service';
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

  async syncCatalogFromCode() {
    await this.catalog.syncCatalogFromDefinitions();
    await this.platformSubjects.syncFromPackageDefinitions();
    await this.contentSync.syncAll();
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
