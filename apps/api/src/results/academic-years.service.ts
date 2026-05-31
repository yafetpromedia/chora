import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto } from '../finance/dto/create-academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string) {
    return this.prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { academicTerms: true, classSubjects: true },
        },
      },
    });
  }

  async getCurrent(schoolId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      include: {
        academicTerms: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return year;
  }

  async create(schoolId: string, dto: CreateAcademicYearDto) {
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { schoolId },
        data: { isCurrent: false },
      });
    }
    return this.prisma.academicYear.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  async setCurrent(schoolId: string, yearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: yearId, schoolId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    await this.prisma.$transaction([
      this.prisma.academicYear.updateMany({
        where: { schoolId },
        data: { isCurrent: false },
      }),
      this.prisma.academicYear.update({
        where: { id: yearId },
        data: { isCurrent: true },
      }),
    ]);

    return this.getCurrent(schoolId);
  }

  async ensureCurrentYear(schoolId: string) {
    const current = await this.getCurrent(schoolId);
    if (current) return current;

    const now = new Date();
    const start = new Date(now.getFullYear(), 8, 1);
    const end = new Date(now.getFullYear() + 1, 6, 30);
    return this.create(schoolId, {
      name: `${now.getFullYear()}/${now.getFullYear() + 1}`,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      isCurrent: true,
    });
  }
}
