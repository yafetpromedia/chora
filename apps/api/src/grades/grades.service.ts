import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GradePreset } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  gradeNamesForPreset,
  gradeNamesForRange,
  presetForGradeNames,
  EARLY_CHILDHOOD_GRADES,
  GRADE_PRESET_OPTIONS,
} from './grade-presets';
import type { SetupGradesDto } from './dto/setup-grades.dto';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  listPresets() {
    return GRADE_PRESET_OPTIONS;
  }

  async listGrades(schoolId: string) {
    return this.prisma.grade.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
      include: {
        sections: { orderBy: { name: 'asc' } },
        _count: { select: { students: true } },
      },
    });
  }

  async setupGrades(
    schoolId: string,
    presetOrDto: GradePreset | SetupGradesDto,
  ) {
    const existing = await this.prisma.grade.count({ where: { schoolId } });
    if (existing > 0) {
      throw new ConflictException(
        'Grades already exist. Add sections to existing grades instead.',
      );
    }

    return this.createGradesFromInput(
      schoolId,
      this.normalizeSetupInput(presetOrDto),
    );
  }

  async resetGrades(
    schoolId: string,
    presetOrDto: GradePreset | SetupGradesDto,
  ) {
    const input = this.normalizeSetupInput(presetOrDto);
    const names = this.resolveGradeNames(input);
    const [studentCount, current] = await Promise.all([
      this.prisma.studentProfile.count({ where: { schoolId } }),
      this.prisma.grade.findMany({
        where: { schoolId },
        orderBy: { sortOrder: 'asc' },
        select: { name: true },
      }),
    ]);

    if (studentCount > 0) {
      throw new BadRequestException(
        'Cannot change grade structure while students are enrolled. Remove students first.',
      );
    }

    const same =
      current.length === names.length &&
      current.every((g, i) => g.name === names[i]);
    if (same) {
      return { replaced: false, grades: await this.listGrades(schoolId) };
    }

    await this.prisma.grade.deleteMany({ where: { schoolId } });
    const grades = await this.createGradesFromInput(schoolId, input);
    return { replaced: true, grades };
  }

  async addGrade(schoolId: string, name: string, sections: string[] = []) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Grade name is required');
    const existing = await this.prisma.grade.findFirst({
      where: { schoolId, name: trimmed },
    });
    if (existing) throw new ConflictException('That grade already exists');

    const last = await this.prisma.grade.findFirst({
      where: { schoolId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const uniqueSections = this.uniqueNames(sections);
    await this.prisma.grade.create({
      data: {
        schoolId,
        name: trimmed,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        sections:
          uniqueSections.length > 0
            ? {
                create: uniqueSections.map((sectionName) => ({
                  name: sectionName,
                })),
              }
            : undefined,
      },
    });
    await this.prisma.school.update({
      where: { id: schoolId },
      data: { gradePreset: null },
    });
    return this.listGrades(schoolId);
  }

  private normalizeSetupInput(
    presetOrDto: GradePreset | SetupGradesDto,
  ): SetupGradesDto {
    if (typeof presetOrDto === 'string') return { preset: presetOrDto };
    return presetOrDto;
  }

  private uniqueNames(names: string[]) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    return out;
  }

  private resolveGradeNames(input: SetupGradesDto): string[] {
    if (input.fromGrade != null && input.toGrade != null) {
      if (input.fromGrade > input.toGrade) {
        throw new BadRequestException(
          'Start grade must be less than or equal to end grade',
        );
      }
      const names = gradeNamesForRange(
        input.fromGrade,
        input.toGrade,
        input.includeEarlyChildhood ?? false,
        input.extraNames ?? [],
      );
      if (names.length === 0) {
        throw new BadRequestException('That range does not create any grades');
      }
      return this.uniqueNames(names);
    }
    if (input.preset) return gradeNamesForPreset(input.preset);
    throw new BadRequestException('Choose a preset or a grade range');
  }

  private async createGradesFromInput(schoolId: string, input: SetupGradesDto) {
    const names = this.resolveGradeNames(input);
    const preset = presetForGradeNames(names);
    const sections = this.uniqueNames(input.defaultSections ?? []);

    await this.prisma.$transaction([
      ...names.map((name, index) =>
        this.prisma.grade.create({
          data: {
            schoolId,
            name,
            sortOrder: index,
            sections:
              sections.length > 0
                ? {
                    create: sections.map((sectionName) => ({
                      name: sectionName,
                    })),
                  }
                : undefined,
          },
        }),
      ),
      this.prisma.school.update({
        where: { id: schoolId },
        data: { gradePreset: preset },
      }),
    ]);

    return this.listGrades(schoolId);
  }

  async addSection(schoolId: string, gradeId: string, name: string) {
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
    });
    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    try {
      return await this.prisma.section.create({
        data: { gradeId, name: name.trim() },
      });
    } catch {
      throw new ConflictException('Section already exists for this grade');
    }
  }

  async removeSection(schoolId: string, gradeId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, gradeId, grade: { schoolId } },
      include: { _count: { select: { students: true } } },
    });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    if (section._count.students > 0) {
      throw new BadRequestException(
        'Cannot remove a section with enrolled students. Move students first.',
      );
    }

    await this.prisma.section.delete({ where: { id: sectionId } });
    return { removed: true, sectionId };
  }

  /** Split legacy single "KG" into Nursery, KG 1, KG 2 for Ethiopian early childhood */
  async fixEarlyChildhoodGrades(schoolId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
    });

    const legacyKg = grades.find((g) => g.name === 'KG');
    const hasAll = EARLY_CHILDHOOD_GRADES.every((name) =>
      grades.some((g) => g.name === name),
    );

    if (!legacyKg || hasAll) {
      return { updated: false, grades: await this.listGrades(schoolId) };
    }

    const kgSort = legacyKg.sortOrder;

    await this.prisma.$transaction([
      ...grades
        .filter((g) => g.sortOrder > kgSort)
        .map((g) =>
          this.prisma.grade.update({
            where: { id: g.id },
            data: { sortOrder: g.sortOrder + 2 },
          }),
        ),
      this.prisma.grade.update({
        where: { id: legacyKg.id },
        data: { name: 'KG 1', sortOrder: kgSort + 1 },
      }),
      this.prisma.grade.create({
        data: { schoolId, name: 'Nursery', sortOrder: kgSort },
      }),
      this.prisma.grade.create({
        data: { schoolId, name: 'KG 2', sortOrder: kgSort + 2 },
      }),
    ]);

    return { updated: true, grades: await this.listGrades(schoolId) };
  }

  async markSetupComplete(schoolId: string) {
    const gradeCount = await this.prisma.grade.count({ where: { schoolId } });
    if (gradeCount === 0) {
      throw new BadRequestException('Create grades before completing setup');
    }

    return this.prisma.school.update({
      where: { id: schoolId },
      data: { setupComplete: true },
      select: {
        id: true,
        setupComplete: true,
        gradePreset: true,
      },
    });
  }

  async getSetupStatus(schoolId: string) {
    const [school, gradeCount, studentCount] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { setupComplete: true, gradePreset: true },
      }),
      this.prisma.grade.count({ where: { schoolId } }),
      this.prisma.studentProfile.count({ where: { schoolId } }),
    ]);

    return {
      setupComplete: school?.setupComplete ?? false,
      gradePreset: school?.gradePreset ?? null,
      gradeCount,
      studentCount,
    };
  }
}
