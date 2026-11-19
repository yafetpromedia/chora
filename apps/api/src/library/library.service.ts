import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LibraryAudience,
  LibraryResourceStatus,
  LibraryResourceType,
  UserRole,
} from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_LIBRARY_CATEGORIES,
  LIBRARY_TYPE_LABELS,
} from './library.constants';
import { CreateLibraryResourceDto } from './dto/create-library-resource.dto';
import { UpdateLibraryResourceDto } from './dto/update-library-resource.dto';
import { UpdateReadingProgressDto } from './dto/update-reading-progress.dto';

type ListQuery = {
  q?: string;
  categoryId?: string;
  resourceType?: LibraryResourceType;
  gradeId?: string;
  status?: LibraryResourceStatus;
  limit?: number;
};

@Injectable()
export class LibraryService {
  private readonly uploadRoot = join(process.cwd(), 'uploads', 'library');

  constructor(private readonly prisma: PrismaService) {}

  async ensureCategories(schoolId: string) {
    const count = await this.prisma.libraryCategory.count({
      where: { schoolId },
    });
    if (count > 0) return;
    for (const cat of DEFAULT_LIBRARY_CATEGORIES) {
      await this.prisma.libraryCategory.create({
        data: { schoolId, ...cat },
      });
    }
  }

  private formatResource(
    r: {
      id: string;
      title: string;
      description: string | null;
      fileUrl: string | null;
      externalUrl: string | null;
      coverUrl: string | null;
      resourceType: LibraryResourceType;
      audience: LibraryAudience;
      subject: string | null;
      author: string | null;
      status: LibraryResourceStatus;
      downloadCount: number;
      viewCount: number;
      publishedAt: Date | null;
      createdAt: Date;
      category: { id: string; name: string; slug: string; icon: string | null };
      grade: { id: string; name: string } | null;
      uploadedBy: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
    },
    extra?: { progressPercent?: number; favorited?: boolean },
  ) {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      fileUrl: r.fileUrl,
      externalUrl: r.externalUrl,
      coverUrl: r.coverUrl,
      resourceType: r.resourceType,
      resourceTypeLabel: LIBRARY_TYPE_LABELS[r.resourceType],
      audience: r.audience,
      subject: r.subject,
      author: r.author,
      status: r.status,
      downloadCount: r.downloadCount,
      viewCount: r.viewCount,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      category: r.category,
      grade: r.grade,
      uploadedBy: r.uploadedBy
        ? {
            id: r.uploadedBy.id,
            name: `${r.uploadedBy.firstName} ${r.uploadedBy.lastName}`.trim(),
          }
        : null,
      progressPercent: extra?.progressPercent,
      favorited: extra?.favorited ?? false,
    };
  }

  private resourceInclude() {
    return {
      category: {
        select: { id: true, name: true, slug: true, icon: true },
      },
      grade: { select: { id: true, name: true } },
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    } as const;
  }

  private publishedFilter(role: UserRole) {
    if (role === 'admin' || role === 'staff') {
      return undefined;
    }
    return LibraryResourceStatus.PUBLISHED;
  }

  private audienceFilter(role: UserRole) {
    if (role === 'admin' || role === 'staff') return undefined;
    if (role === 'teacher') {
      return { in: [LibraryAudience.TEACHERS, LibraryAudience.BOTH] };
    }
    return { in: [LibraryAudience.STUDENTS, LibraryAudience.BOTH] };
  }

  async getHub(schoolId: string, userId: string, role: UserRole) {
    await this.ensureCategories(schoolId);
    const statusFilter = this.publishedFilter(role);

    const student = await this.getStudentProfileIfNeeded(
      schoolId,
      userId,
      role,
    );

    const whereBase = {
      schoolId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(this.audienceFilter(role)
        ? { audience: this.audienceFilter(role) }
        : {}),
      ...(student
        ? {
            OR: [{ gradeId: null }, { gradeId: student.gradeId }],
          }
        : {}),
    };

    const [categories, featured, recent, stats] = await Promise.all([
      this.prisma.libraryCategory.findMany({
        where: { schoolId },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: {
              resources: {
                where: whereBase,
              },
            },
          },
        },
      }),
      this.prisma.libraryResource.findMany({
        where: whereBase,
        orderBy: { viewCount: 'desc' },
        take: 6,
        include: this.resourceInclude(),
      }),
      this.prisma.libraryResource.findMany({
        where: whereBase,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: this.resourceInclude(),
      }),
      role === 'admin' || role === 'staff'
        ? this.getAdminStats(schoolId)
        : null,
    ]);

    let shelf: {
      favorites: ReturnType<LibraryService['formatResource']>[];
      continueReading: ReturnType<LibraryService['formatResource']>[];
    } | null = null;

    let contributions: {
      pending: ReturnType<LibraryService['formatResource']>[];
      published: ReturnType<LibraryService['formatResource']>[];
    } | null = null;

    if (role === 'teacher') {
      const uploads = await this.prisma.libraryResource.findMany({
        where: { schoolId, uploadedById: userId },
        orderBy: { createdAt: 'desc' },
        take: 48,
        include: this.resourceInclude(),
      });
      contributions = {
        pending: uploads
          .filter((r) => r.status === LibraryResourceStatus.PENDING)
          .map((r) => this.formatResource(r)),
        published: uploads
          .filter((r) => r.status === LibraryResourceStatus.PUBLISHED)
          .map((r) => this.formatResource(r)),
      };
    }

    if (student) {
      const [favorites, progress] = await Promise.all([
        this.prisma.libraryFavorite.findMany({
          where: { studentProfileId: student.id },
          include: {
            resource: { include: this.resourceInclude() },
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
        this.prisma.libraryReadingProgress.findMany({
          where: {
            studentProfileId: student.id,
            progressPercent: { gt: 0, lt: 100 },
          },
          include: {
            resource: { include: this.resourceInclude() },
          },
          orderBy: { lastOpenedAt: 'desc' },
          take: 6,
        }),
      ]);
      shelf = {
        favorites: favorites.map((f) =>
          this.formatResource(f.resource, {
            favorited: true,
            progressPercent: undefined,
          }),
        ),
        continueReading: progress.map((p) =>
          this.formatResource(p.resource, {
            progressPercent: p.progressPercent,
            favorited: false,
          }),
        ),
      };
    }

    return {
      tagline: 'Learn anywhere. Read anytime.',
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        resourceCount: c._count.resources,
      })),
      featured: featured.map((r) => this.formatResource(r)),
      recent: recent.map((r) => this.formatResource(r)),
      stats,
      shelf,
      contributions,
      studentGrade: student
        ? { id: student.gradeId, name: student.grade.name }
        : null,
    };
  }

  private async getAdminStats(schoolId: string) {
    const [totalResources, published, pending, downloads, readers] =
      await Promise.all([
        this.prisma.libraryResource.count({ where: { schoolId } }),
        this.prisma.libraryResource.count({
          where: { schoolId, status: LibraryResourceStatus.PUBLISHED },
        }),
        this.prisma.libraryResource.count({
          where: { schoolId, status: LibraryResourceStatus.PENDING },
        }),
        this.prisma.libraryResource.aggregate({
          where: { schoolId },
          _sum: { downloadCount: true },
        }),
        this.prisma.libraryReadingProgress.groupBy({
          by: ['studentProfileId'],
          where: { resource: { schoolId } },
        }),
      ]);

    return {
      totalResources,
      published,
      pending,
      totalDownloads: downloads._sum.downloadCount ?? 0,
      activeReaders: readers.length,
    };
  }

  async listResources(
    schoolId: string,
    userId: string,
    role: UserRole,
    query: ListQuery,
  ) {
    await this.ensureCategories(schoolId);
    const student = await this.getStudentProfileIfNeeded(
      schoolId,
      userId,
      role,
    );

    const status =
      query.status ??
      this.publishedFilter(role) ??
      LibraryResourceStatus.PUBLISHED;

    const where = {
      schoolId,
      status,
      ...(this.audienceFilter(role)
        ? { audience: this.audienceFilter(role) }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(student && !query.gradeId
        ? { OR: [{ gradeId: null }, { gradeId: student.gradeId }] }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              { subject: { contains: query.q, mode: 'insensitive' as const } },
              { author: { contains: query.q, mode: 'insensitive' as const } },
              {
                description: {
                  contains: query.q,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.libraryResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit ?? 40, 80),
      include: this.resourceInclude(),
    });

    let progressMap = new Map<string, number>();
    let favoriteSet = new Set<string>();
    if (student) {
      const [progress, favorites] = await Promise.all([
        this.prisma.libraryReadingProgress.findMany({
          where: {
            studentProfileId: student.id,
            resourceId: { in: rows.map((r) => r.id) },
          },
        }),
        this.prisma.libraryFavorite.findMany({
          where: {
            studentProfileId: student.id,
            resourceId: { in: rows.map((r) => r.id) },
          },
        }),
      ]);
      progressMap = new Map(
        progress.map((p) => [p.resourceId, p.progressPercent]),
      );
      favoriteSet = new Set(favorites.map((f) => f.resourceId));
    }

    return rows.map((r) =>
      this.formatResource(r, {
        progressPercent: progressMap.get(r.id),
        favorited: favoriteSet.has(r.id),
      }),
    );
  }

  async getResource(
    schoolId: string,
    userId: string,
    role: UserRole,
    resourceId: string,
  ) {
    const resource = await this.prisma.libraryResource.findFirst({
      where: { id: resourceId, schoolId },
      include: this.resourceInclude(),
    });
    if (!resource) throw new NotFoundException('Resource not found');

    if (
      role !== 'admin' &&
      role !== 'staff' &&
      resource.status !== LibraryResourceStatus.PUBLISHED
    ) {
      throw new NotFoundException('Resource not found');
    }
    if (
      role !== 'admin' &&
      role !== 'staff' &&
      ![resource.audience, LibraryAudience.BOTH].some((audience) =>
        role === 'teacher'
          ? audience === LibraryAudience.TEACHERS ||
            audience === LibraryAudience.BOTH
          : audience === LibraryAudience.STUDENTS ||
            audience === LibraryAudience.BOTH,
      )
    ) {
      throw new NotFoundException('Resource not found');
    }

    await this.prisma.libraryResource.update({
      where: { id: resourceId },
      data: { viewCount: { increment: 1 } },
    });

    const student = await this.getStudentProfileIfNeeded(
      schoolId,
      userId,
      role,
    );
    let extra: { progressPercent?: number; favorited?: boolean } = {};
    if (student) {
      const [progress, favorite] = await Promise.all([
        this.prisma.libraryReadingProgress.findUnique({
          where: {
            studentProfileId_resourceId: {
              studentProfileId: student.id,
              resourceId,
            },
          },
        }),
        this.prisma.libraryFavorite.findUnique({
          where: {
            studentProfileId_resourceId: {
              studentProfileId: student.id,
              resourceId,
            },
          },
        }),
      ]);
      extra = {
        progressPercent: progress?.progressPercent,
        favorited: !!favorite,
      };
    }

    return this.formatResource(resource, extra);
  }

  async createResource(
    schoolId: string,
    userId: string,
    role: UserRole,
    dto: CreateLibraryResourceDto,
  ) {
    await this.ensureCategories(schoolId);
    const category = await this.prisma.libraryCategory.findFirst({
      where: { id: dto.categoryId, schoolId },
    });
    if (!category) throw new BadRequestException('Invalid category');

    const status =
      role === 'teacher'
        ? LibraryResourceStatus.PENDING
        : LibraryResourceStatus.PUBLISHED;

    const resource = await this.prisma.libraryResource.create({
      data: {
        schoolId,
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        fileUrl: dto.fileUrl ?? null,
        externalUrl: dto.externalUrl ?? null,
        coverUrl: dto.coverUrl ?? null,
        resourceType: dto.resourceType,
        audience: dto.audience ?? LibraryAudience.BOTH,
        subject: dto.subject?.trim() || null,
        gradeId: dto.gradeId || null,
        author: dto.author?.trim() || null,
        status,
        uploadedById: userId,
        publishedAt:
          status === LibraryResourceStatus.PUBLISHED ? new Date() : null,
      },
      include: this.resourceInclude(),
    });

    return this.formatResource(resource);
  }

  async updateResource(
    schoolId: string,
    resourceId: string,
    dto: UpdateLibraryResourceDto,
  ) {
    const existing = await this.prisma.libraryResource.findFirst({
      where: { id: resourceId, schoolId },
    });
    if (!existing) throw new NotFoundException('Resource not found');

    const resource = await this.prisma.libraryResource.update({
      where: { id: resourceId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.resourceType !== undefined
          ? { resourceType: dto.resourceType }
          : {}),
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.subject !== undefined
          ? { subject: dto.subject?.trim() || null }
          : {}),
        ...(dto.gradeId !== undefined ? { gradeId: dto.gradeId || null } : {}),
        ...(dto.author !== undefined
          ? { author: dto.author?.trim() || null }
          : {}),
        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl || null } : {}),
        ...(dto.externalUrl !== undefined
          ? { externalUrl: dto.externalUrl || null }
          : {}),
        ...(dto.coverUrl !== undefined
          ? { coverUrl: dto.coverUrl || null }
          : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              publishedAt:
                dto.status === LibraryResourceStatus.PUBLISHED
                  ? new Date()
                  : null,
            }
          : {}),
      },
      include: this.resourceInclude(),
    });

    return this.formatResource(resource);
  }

  async publishResource(schoolId: string, resourceId: string) {
    return this.updateResource(schoolId, resourceId, {
      status: LibraryResourceStatus.PUBLISHED,
    });
  }

  async deleteResource(schoolId: string, resourceId: string) {
    const existing = await this.prisma.libraryResource.findFirst({
      where: { id: resourceId, schoolId },
    });
    if (!existing) throw new NotFoundException('Resource not found');
    await this.prisma.libraryResource.delete({ where: { id: resourceId } });
    return { ok: true };
  }

  async saveUploadedFile(
    schoolId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dir = join(this.uploadRoot, schoolId);
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${safeName}`;
    const fullPath = join(dir, filename);
    await writeFile(fullPath, file.buffer);
    return {
      fileUrl: `/schools/library/files/${schoolId}/${filename}`,
      mimeType: file.mimetype,
      ext: extname(safeName),
    };
  }

  getFilePath(schoolId: string, filename: string): Promise<string> {
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      return Promise.reject(new BadRequestException('Invalid file'));
    }
    return Promise.resolve(join(this.uploadRoot, schoolId, filename));
  }

  async recordDownload(schoolId: string, resourceId: string) {
    await this.prisma.libraryResource.updateMany({
      where: { id: resourceId, schoolId },
      data: { downloadCount: { increment: 1 } },
    });
    return { ok: true };
  }

  async toggleFavorite(schoolId: string, userId: string, resourceId: string) {
    const student = await this.requireStudent(schoolId, userId);
    const resource = await this.prisma.libraryResource.findFirst({
      where: {
        id: resourceId,
        schoolId,
        status: LibraryResourceStatus.PUBLISHED,
      },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    const existing = await this.prisma.libraryFavorite.findUnique({
      where: {
        studentProfileId_resourceId: {
          studentProfileId: student.id,
          resourceId,
        },
      },
    });

    if (existing) {
      await this.prisma.libraryFavorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    }

    await this.prisma.libraryFavorite.create({
      data: { studentProfileId: student.id, resourceId },
    });
    return { favorited: true };
  }

  async updateProgress(
    schoolId: string,
    userId: string,
    resourceId: string,
    dto: UpdateReadingProgressDto,
  ) {
    const student = await this.requireStudent(schoolId, userId);
    const resource = await this.prisma.libraryResource.findFirst({
      where: {
        id: resourceId,
        schoolId,
        status: LibraryResourceStatus.PUBLISHED,
      },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    await this.prisma.libraryReadingProgress.upsert({
      where: {
        studentProfileId_resourceId: {
          studentProfileId: student.id,
          resourceId,
        },
      },
      create: {
        studentProfileId: student.id,
        resourceId,
        progressPercent: dto.progressPercent,
        lastReadPage: dto.lastReadPage ?? null,
      },
      update: {
        progressPercent: dto.progressPercent,
        lastReadPage: dto.lastReadPage ?? null,
        lastOpenedAt: new Date(),
      },
    });

    return { progressPercent: dto.progressPercent };
  }

  private async getStudentProfileIfNeeded(
    schoolId: string,
    userId: string,
    role: UserRole,
  ) {
    if (role !== 'student') return null;
    return this.requireStudent(schoolId, userId);
  }

  private async requireStudent(schoolId: string, userId: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { userId, schoolId },
      include: { grade: { select: { id: true, name: true } } },
    });
    if (!profile) {
      throw new ForbiddenException('Student profile required');
    }
    return profile;
  }
}
