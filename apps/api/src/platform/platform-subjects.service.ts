import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CURRICULUM_PACKAGE_DEFINITIONS } from '../provisioning/curriculum-packages.data';
import { CreatePlatformSubjectDto, UpdatePlatformSubjectDto } from './dto/platform-subject.dto';

@Injectable()
export class PlatformSubjectsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncFromPackageDefinitions();
  }

  /** Seed / refresh master subjects from code-defined packages (idempotent). */
  async syncFromPackageDefinitions() {
    const seen = new Map<string, { name: string; level?: string; curriculum?: string }>();

    for (const pkg of CURRICULUM_PACKAGE_DEFINITIONS) {
      for (const s of pkg.subjects) {
        const code = s.code.trim().toUpperCase();
        if (!seen.has(code)) {
          seen.set(code, {
            name: s.name,
            level: s.level,
            curriculum: pkg.key,
          });
        }
      }
    }

    let order = 0;
    for (const [code, meta] of seen) {
      await this.prisma.platformSubject.upsert({
        where: { code },
        create: {
          code,
          name: meta.name,
          level: meta.level ?? null,
          curriculum: meta.curriculum ?? null,
          sortOrder: order++,
        },
        update: {
          name: meta.name,
          level: meta.level ?? undefined,
        },
      });
    }

    await this.linkPackageSubjectsToPlatform();
  }

  async linkPackageSubjectsToPlatform() {
    const platformByCode = await this.prisma.platformSubject.findMany();
    const codeToId = new Map(platformByCode.map((p) => [p.code, p.id]));

    const packageSubjects = await this.prisma.curriculumPackageSubject.findMany();
    for (const row of packageSubjects) {
      const platformId = codeToId.get(row.code);
      if (platformId && row.platformSubjectId !== platformId) {
        await this.prisma.curriculumPackageSubject.update({
          where: { id: row.id },
          data: { platformSubjectId: platformId },
        });
      }
    }
  }

  list(includeArchived = false) {
    return this.prisma.platformSubject.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { packageLinks: true, schoolSubjects: true },
        },
      },
    });
  }

  async getById(id: string) {
    const row = await this.prisma.platformSubject.findUnique({
      where: { id },
      include: {
        packageLinks: {
          include: { package: { select: { key: true, label: true } } },
        },
        _count: { select: { schoolSubjects: true } },
      },
    });
    if (!row) throw new NotFoundException('Platform subject not found');
    return row;
  }

  async create(dto: CreatePlatformSubjectDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.platformSubject.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Subject code ${code} already exists`);
    }
    const maxOrder = await this.prisma.platformSubject.aggregate({
      _max: { sortOrder: true },
    });
    return this.prisma.platformSubject.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        icon: dto.icon?.trim() || null,
        curriculum: dto.curriculum?.trim() || null,
        level: dto.level?.trim() || null,
        gradeMin: dto.gradeMin ?? null,
        gradeMax: dto.gradeMax ?? null,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async update(id: string, dto: UpdatePlatformSubjectDto) {
    await this.getById(id);
    return this.prisma.platformSubject.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon?.trim() || null } : {}),
        ...(dto.curriculum !== undefined
          ? { curriculum: dto.curriculum?.trim() || null }
          : {}),
        ...(dto.level !== undefined ? { level: dto.level?.trim() || null } : {}),
        ...(dto.gradeMin !== undefined ? { gradeMin: dto.gradeMin } : {}),
        ...(dto.gradeMax !== undefined ? { gradeMax: dto.gradeMax } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
    });
  }

  async archive(id: string) {
    return this.update(id, { isArchived: true });
  }

  async resolveByCode(code: string) {
    return this.prisma.platformSubject.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }
}
