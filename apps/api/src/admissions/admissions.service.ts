import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdmissionStatus } from '@prisma/client';
import { AcademicEnrollmentService } from '../results/academic-enrollment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { CreateAdmissionApplicationDto } from './dto/create-application.dto';
import { CreateAdmissionCycleDto } from './dto/create-cycle.dto';
import {
  CreatePlacementRuleDto,
  UpdatePlacementRuleDto,
} from './dto/placement-rule.dto';
import { RunPlacementDto } from './dto/run-placement.dto';
import { UpdateAdmissionApplicationDto } from './dto/update-application.dto';
import { UpdateAdmissionCycleDto } from './dto/update-cycle.dto';

const applicationInclude = {
  targetGrade: { select: { id: true, name: true } },
  placedGrade: { select: { id: true, name: true } },
  placedSection: { select: { id: true, name: true } },
  placementRule: { select: { id: true, label: true } },
  enrolledProfile: {
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true, externalRef: true } },
    },
  },
} as const;

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly enrollment: AcademicEnrollmentService,
  ) {}

  async listCycles(schoolId: string) {
    return this.prisma.admissionCycle.findMany({
      where: { schoolId },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        _count: { select: { applications: true, placementRules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCycle(schoolId: string, dto: CreateAdmissionCycleDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId },
    });
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }

    return this.prisma.admissionCycle.create({
      data: {
        schoolId,
        academicYearId: dto.academicYearId,
        name: dto.name.trim(),
        isOpen: dto.isOpen ?? true,
        autoPlaceOnScore: dto.autoPlaceOnScore ?? true,
        autoAcceptOnPlace: dto.autoAcceptOnPlace ?? true,
        autoEnrollOnPlace: dto.autoEnrollOnPlace ?? false,
      },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        _count: { select: { applications: true, placementRules: true } },
      },
    });
  }

  async ensureDefaultCycle(schoolId: string) {
    const existing = await this.prisma.admissionCycle.findFirst({
      where: { schoolId, isOpen: true },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        _count: { select: { applications: true, placementRules: true } },
      },
    });
    if (existing) {
      if (existing._count.placementRules === 0) {
        await this.autoSeedPlacementRulesForSchool(schoolId, existing.id);
      }
      return existing;
    }

    let year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!year) {
      year = await this.prisma.academicYear.findFirst({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
      });
    }
    if (!year) {
      throw new BadRequestException(
        'Create an academic year before opening admissions',
      );
    }

    return this.prisma.admissionCycle.create({
      data: {
        schoolId,
        academicYearId: year.id,
        name: `${year.name} intake`,
        isOpen: true,
        autoPlaceOnScore: true,
        autoAcceptOnPlace: true,
        autoEnrollOnPlace: false,
      },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        _count: { select: { applications: true, placementRules: true } },
      },
    }).then(async (cycle) => {
      await this.autoSeedPlacementRulesForSchool(schoolId, cycle.id);
      return cycle;
    });
  }

  async updateCycle(
    schoolId: string,
    cycleId: string,
    dto: UpdateAdmissionCycleDto,
  ) {
    await this.assertCycle(schoolId, cycleId);
    return this.prisma.admissionCycle.update({
      where: { id: cycleId },
      data: {
        isOpen: dto.isOpen,
        autoPlaceOnScore: dto.autoPlaceOnScore,
        autoAcceptOnPlace: dto.autoAcceptOnPlace,
        autoEnrollOnPlace: dto.autoEnrollOnPlace,
      },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        _count: { select: { applications: true, placementRules: true } },
      },
    });
  }

  private gradeHasStreamSections(sections: { name: string }[]) {
    return sections.some(
      (s) =>
        s.name.toLowerCase().startsWith('natural') ||
        s.name.toLowerCase().startsWith('social'),
    );
  }

  private async autoSeedPlacementRulesForSchool(
    schoolId: string,
    cycleId: string,
  ) {
    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      include: { sections: true },
      orderBy: { sortOrder: 'asc' },
    });
    for (const grade of grades) {
      try {
        if (this.gradeHasStreamSections(grade.sections)) {
          await this.seedStreamRules(schoolId, cycleId, grade.id);
        } else {
          await this.seedGradeRules(schoolId, cycleId, grade.id);
        }
      } catch {
        // Rules may already exist — ignore.
      }
    }
  }

  async listApplications(
    schoolId: string,
    options?: { cycleId?: string; status?: AdmissionStatus },
  ) {
    return this.prisma.admissionApplication.findMany({
      where: {
        schoolId,
        ...(options?.cycleId ? { cycleId: options.cycleId } : {}),
        ...(options?.status ? { status: options.status } : {}),
      },
      include: applicationInclude,
      orderBy: [{ totalScore: 'desc' }, { appliedAt: 'desc' }],
    });
  }

  async getApplication(schoolId: string, id: string) {
    const app = await this.prisma.admissionApplication.findFirst({
      where: { id, schoolId },
      include: {
        ...applicationInclude,
        cycle: {
          include: { academicYear: { select: { id: true, name: true } } },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  private computeTotalScore(
    entranceScore?: number | null,
    interviewScore?: number | null,
  ) {
    const entrance = entranceScore ?? 0;
    const interview = interviewScore ?? 0;
    if (entranceScore == null && interviewScore == null) return null;
    return entrance + interview;
  }

  private deriveStatus(
    current: AdmissionStatus,
    totalScore: number | null,
    hasPlacement: boolean,
  ): AdmissionStatus {
    if (
      current === AdmissionStatus.ENROLLED ||
      current === AdmissionStatus.WITHDRAWN ||
      current === AdmissionStatus.REJECTED
    ) {
      return current;
    }
    if (hasPlacement) return AdmissionStatus.PLACED;
    if (totalScore != null) return AdmissionStatus.SCORED;
    return current === AdmissionStatus.APPLIED
      ? AdmissionStatus.APPLIED
      : current;
  }

  async createApplication(schoolId: string, dto: CreateAdmissionApplicationDto) {
    const cycle = await this.prisma.admissionCycle.findFirst({
      where: { id: dto.cycleId, schoolId },
    });
    if (!cycle) throw new NotFoundException('Admission cycle not found');
    if (!cycle.isOpen) {
      throw new BadRequestException('This admission cycle is closed');
    }

    if (dto.targetGradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: dto.targetGradeId, schoolId },
      });
      if (!grade) throw new NotFoundException('Target grade not found');
    }

    const totalScore = this.computeTotalScore(
      dto.entranceScore,
      dto.interviewScore,
    );
    const status =
      totalScore != null ? AdmissionStatus.SCORED : AdmissionStatus.APPLIED;

    const created = await this.prisma.admissionApplication.create({
      data: {
        schoolId,
        cycleId: dto.cycleId,
        status,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        middleName: dto.middleName?.trim() || null,
        gender: dto.gender ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        idNumber: dto.idNumber?.trim() || null,
        phone: dto.phone?.trim() || null,
        fatherName: dto.fatherName.trim(),
        fatherPhone: dto.fatherPhone.trim(),
        motherName: dto.motherName.trim(),
        motherPhone: dto.motherPhone.trim(),
        email: dto.email?.toLowerCase().trim() || null,
        targetGradeId: dto.targetGradeId ?? null,
        entranceScore: dto.entranceScore ?? null,
        interviewScore: dto.interviewScore ?? null,
        totalScore,
        notes: dto.notes?.trim() || null,
      },
      include: applicationInclude,
    });

    return this.maybeAutoProcessApplication(schoolId, created.id);
  }

  async updateApplication(
    schoolId: string,
    id: string,
    dto: UpdateAdmissionApplicationDto,
  ) {
    const existing = await this.getApplication(schoolId, id);
    if (existing.status === AdmissionStatus.ENROLLED) {
      throw new BadRequestException('Cannot edit an enrolled application');
    }

    if (dto.targetGradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: dto.targetGradeId, schoolId },
      });
      if (!grade) throw new NotFoundException('Target grade not found');
    }

    if (dto.placedGradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: dto.placedGradeId, schoolId },
      });
      if (!grade) throw new NotFoundException('Placed grade not found');
      if (dto.placedSectionId) {
        const section = await this.prisma.section.findFirst({
          where: { id: dto.placedSectionId, gradeId: dto.placedGradeId },
        });
        if (!section) throw new NotFoundException('Placed section not found');
      }
    }

    const entranceScore =
      dto.entranceScore !== undefined
        ? dto.entranceScore
        : existing.entranceScore;
    const interviewScore =
      dto.interviewScore !== undefined
        ? dto.interviewScore
        : existing.interviewScore;
    const totalScore = this.computeTotalScore(entranceScore, interviewScore);

    const placedGradeId =
      dto.placedGradeId !== undefined
        ? dto.placedGradeId
        : existing.placedGradeId;
    const placedSectionId =
      dto.placedSectionId !== undefined
        ? dto.placedSectionId
        : existing.placedSectionId;
    const hasManualPlacement = Boolean(placedGradeId);

    let status = dto.status ?? existing.status;
    if (!dto.status) {
      status = this.deriveStatus(existing.status, totalScore, hasManualPlacement);
    }

    const updated = await this.prisma.admissionApplication.update({
      where: { id },
      data: {
        status,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        middleName:
          dto.middleName !== undefined
            ? dto.middleName?.trim() || null
            : undefined,
        gender: dto.gender,
        dateOfBirth:
          dto.dateOfBirth !== undefined
            ? dto.dateOfBirth
              ? new Date(dto.dateOfBirth)
              : null
            : undefined,
        idNumber:
          dto.idNumber !== undefined
            ? dto.idNumber?.trim() || null
            : undefined,
        phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
        fatherName: dto.fatherName?.trim(),
        fatherPhone: dto.fatherPhone?.trim(),
        motherName: dto.motherName?.trim(),
        motherPhone: dto.motherPhone?.trim(),
        email:
          dto.email !== undefined
            ? dto.email?.toLowerCase().trim() || null
            : undefined,
        targetGradeId: dto.targetGradeId,
        entranceScore: dto.entranceScore,
        interviewScore: dto.interviewScore,
        totalScore,
        placedGradeId: dto.placedGradeId,
        placedSectionId: dto.placedSectionId,
        placedAt: hasManualPlacement ? new Date() : undefined,
        placementNote: hasManualPlacement ? 'Manual override' : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
      },
      include: applicationInclude,
    });

    const scoreChanged =
      dto.entranceScore !== undefined || dto.interviewScore !== undefined;
    if (scoreChanged && !hasManualPlacement) {
      return this.maybeAutoProcessApplication(schoolId, updated.id);
    }
    return updated;
  }

  async deleteApplication(schoolId: string, id: string) {
    const app = await this.getApplication(schoolId, id);
    if (app.status === AdmissionStatus.ENROLLED) {
      throw new BadRequestException('Cannot delete an enrolled application');
    }
    await this.prisma.admissionApplication.delete({ where: { id } });
    return { removed: true, id };
  }

  async listPlacementRules(schoolId: string, cycleId: string) {
    await this.assertCycle(schoolId, cycleId);
    return this.prisma.admissionPlacementRule.findMany({
      where: { schoolId, cycleId },
      include: {
        targetGrade: { select: { id: true, name: true } },
        targetSection: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPlacementRule(
    schoolId: string,
    cycleId: string,
    dto: CreatePlacementRuleDto,
  ) {
    await this.assertCycle(schoolId, cycleId);
    await this.validateRuleTargets(schoolId, dto.targetGradeId, dto.targetSectionId);

    if (dto.minScore > dto.maxScore) {
      throw new BadRequestException('minScore cannot exceed maxScore');
    }

    return this.prisma.admissionPlacementRule.create({
      data: {
        schoolId,
        cycleId,
        label: dto.label.trim(),
        minScore: dto.minScore,
        maxScore: dto.maxScore,
        targetGradeId: dto.targetGradeId,
        targetSectionId: dto.targetSectionId ?? null,
        streamMatch: dto.streamMatch?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        targetGrade: { select: { id: true, name: true } },
        targetSection: { select: { id: true, name: true } },
      },
    });
  }

  async updatePlacementRule(
    schoolId: string,
    cycleId: string,
    ruleId: string,
    dto: UpdatePlacementRuleDto,
  ) {
    const rule = await this.prisma.admissionPlacementRule.findFirst({
      where: { id: ruleId, schoolId, cycleId },
    });
    if (!rule) throw new NotFoundException('Placement rule not found');

    const minScore = dto.minScore ?? rule.minScore;
    const maxScore = dto.maxScore ?? rule.maxScore;
    if (minScore > maxScore) {
      throw new BadRequestException('minScore cannot exceed maxScore');
    }

    if (dto.targetGradeId || dto.targetSectionId) {
      await this.validateRuleTargets(
        schoolId,
        dto.targetGradeId ?? rule.targetGradeId,
        dto.targetSectionId ?? rule.targetSectionId ?? undefined,
      );
    }

    return this.prisma.admissionPlacementRule.update({
      where: { id: ruleId },
      data: {
        label: dto.label?.trim(),
        minScore: dto.minScore,
        maxScore: dto.maxScore,
        targetGradeId: dto.targetGradeId,
        targetSectionId: dto.targetSectionId,
        streamMatch:
          dto.streamMatch !== undefined
            ? dto.streamMatch?.trim() || null
            : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      include: {
        targetGrade: { select: { id: true, name: true } },
        targetSection: { select: { id: true, name: true } },
      },
    });
  }

  async deletePlacementRule(schoolId: string, cycleId: string, ruleId: string) {
    const rule = await this.prisma.admissionPlacementRule.findFirst({
      where: { id: ruleId, schoolId, cycleId },
    });
    if (!rule) throw new NotFoundException('Placement rule not found');
    await this.prisma.admissionPlacementRule.delete({ where: { id: ruleId } });
    return { removed: true, id: ruleId };
  }

  async seedStreamRules(schoolId: string, cycleId: string, gradeId: string) {
    await this.assertCycle(schoolId, cycleId);
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
      include: { sections: true },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    const hasNatural = grade.sections.some((s) =>
      s.name.toLowerCase().startsWith('natural'),
    );
    const hasSocial = grade.sections.some((s) =>
      s.name.toLowerCase().startsWith('social'),
    );
    if (!hasNatural && !hasSocial) {
      throw new BadRequestException(
        'Grade has no Natural or Social sections — add them in school setup first',
      );
    }

    const existing = await this.prisma.admissionPlacementRule.count({
      where: { cycleId, targetGradeId: gradeId },
    });
    if (existing > 0) {
      throw new BadRequestException(
        'Placement rules already exist for this grade in this cycle',
      );
    }

    const rules: CreatePlacementRuleDto[] = [];
    if (hasNatural) {
      rules.push({
        label: `${grade.name} — Natural stream (70+)`,
        minScore: 70,
        maxScore: 100,
        targetGradeId: gradeId,
        streamMatch: 'Natural',
        sortOrder: 0,
      });
    }
    if (hasSocial) {
      rules.push({
        label: `${grade.name} — Social stream (0–69)`,
        minScore: 0,
        maxScore: 69,
        targetGradeId: gradeId,
        streamMatch: 'Social',
        sortOrder: 1,
      });
    }

    const created = [];
    for (const r of rules) {
      created.push(await this.createPlacementRule(schoolId, cycleId, r));
    }
    return created;
  }

  async seedGradeRules(schoolId: string, cycleId: string, gradeId: string) {
    await this.assertCycle(schoolId, cycleId);
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
      include: { sections: true },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    if (this.gradeHasStreamSections(grade.sections)) {
      return this.seedStreamRules(schoolId, cycleId, gradeId);
    }

    const existing = await this.prisma.admissionPlacementRule.count({
      where: { cycleId, targetGradeId: gradeId },
    });
    if (existing > 0) {
      throw new BadRequestException(
        'Placement rules already exist for this grade in this cycle',
      );
    }

    const sectionHint =
      grade.sections.length > 0 ? ' · auto-balance sections' : '';
    return [
      await this.createPlacementRule(schoolId, cycleId, {
        label: `${grade.name} — all scores (0–100)${sectionHint}`,
        minScore: 0,
        maxScore: 100,
        targetGradeId: gradeId,
        sortOrder: 0,
      }),
    ];
  }

  private async loadActiveRules(schoolId: string, cycleId: string) {
    return this.prisma.admissionPlacementRule.findMany({
      where: { schoolId, cycleId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        targetGrade: { include: { sections: true } },
        targetSection: true,
      },
    });
  }

  private async buildPlacedCounts(schoolId: string, cycleId: string) {
    const placedCounts = new Map<string, number>();
    const alreadyPlaced = await this.prisma.admissionApplication.findMany({
      where: {
        schoolId,
        cycleId,
        status: {
          in: [
            AdmissionStatus.PLACED,
            AdmissionStatus.ACCEPTED,
            AdmissionStatus.ENROLLED,
          ],
        },
        placedSectionId: { not: null },
      },
      select: { placedSectionId: true },
    });
    for (const p of alreadyPlaced) {
      if (p.placedSectionId) {
        placedCounts.set(
          p.placedSectionId,
          (placedCounts.get(p.placedSectionId) ?? 0) + 1,
        );
      }
    }
    return placedCounts;
  }

  private pickLeastFilledSection(
    sections: { id: string; name: string }[],
    placedCounts: Map<string, number>,
  ) {
    const candidates = [...sections];
    candidates.sort((a, b) => {
      const ca = placedCounts.get(a.id) ?? 0;
      const cb = placedCounts.get(b.id) ?? 0;
      return ca - cb || a.name.localeCompare(b.name);
    });
    const sectionId = candidates[0].id;
    placedCounts.set(sectionId, (placedCounts.get(sectionId) ?? 0) + 1);
    return { sectionId, sectionName: candidates[0].name };
  }

  private resolvePlacementForScore(
    score: number,
    rules: Awaited<ReturnType<AdmissionsService['loadActiveRules']>>,
    placedCounts: Map<string, number>,
    targetGradeId?: string | null,
  ):
    | {
        ok: true;
        gradeId: string;
        sectionId: string | null;
        ruleId: string;
        note: string;
      }
    | { ok: false; note: string } {
    const eligible = targetGradeId
      ? rules.filter((r) => r.targetGradeId === targetGradeId)
      : rules;
    const rule = eligible.find(
      (r) => score >= r.minScore && score <= r.maxScore,
    );
    if (!rule) {
      return {
        ok: false,
        note: targetGradeId
          ? 'No matching rule for the applied grade'
          : 'No matching rule',
      };
    }

    let sectionId = rule.targetSectionId;
    let note: string;

    if (!sectionId && rule.streamMatch) {
      const match = rule.streamMatch.toLowerCase();
      const candidates = rule.targetGrade.sections.filter((s) =>
        s.name.toLowerCase().startsWith(match),
      );
      if (candidates.length === 0) {
        return {
          ok: false,
          note: `No section matching "${rule.streamMatch}"`,
        };
      }
      const picked = this.pickLeastFilledSection(candidates, placedCounts);
      sectionId = picked.sectionId;
      note = `Auto: ${rule.streamMatch} · ${picked.sectionName}`;
    } else if (sectionId) {
      placedCounts.set(sectionId, (placedCounts.get(sectionId) ?? 0) + 1);
      note = `Rule: ${rule.label}`;
    } else if (rule.targetGrade.sections.length > 0) {
      const picked = this.pickLeastFilledSection(
        rule.targetGrade.sections,
        placedCounts,
      );
      sectionId = picked.sectionId;
      note = `Auto-balance · ${picked.sectionName}`;
    } else {
      note = `Rule: ${rule.label} (grade only)`;
    }

    return {
      ok: true,
      gradeId: rule.targetGradeId,
      sectionId,
      ruleId: rule.id,
      note,
    };
  }

  private async placeApplicationById(
    schoolId: string,
    applicationId: string,
    options?: { placedCounts?: Map<string, number> },
  ) {
    const app = await this.prisma.admissionApplication.findFirst({
      where: { id: applicationId, schoolId },
    });
    if (!app || app.totalScore == null) {
      return { ok: false as const, note: 'No score to place' };
    }
    if (
      app.status === AdmissionStatus.ENROLLED ||
      app.status === AdmissionStatus.WITHDRAWN ||
      app.status === AdmissionStatus.REJECTED
    ) {
      return { ok: false as const, note: 'Application not eligible' };
    }

    const rules = await this.loadActiveRules(schoolId, app.cycleId);
    if (rules.length === 0) {
      return { ok: false as const, note: 'No placement rules' };
    }

    const placedCounts =
      options?.placedCounts ??
      (await this.buildPlacedCounts(schoolId, app.cycleId));
    const resolved = this.resolvePlacementForScore(
      app.totalScore,
      rules,
      placedCounts,
      app.targetGradeId,
    );
    if (!resolved.ok) {
      return resolved;
    }

    await this.prisma.admissionApplication.update({
      where: { id: applicationId },
      data: {
        status: AdmissionStatus.PLACED,
        placedGradeId: resolved.gradeId,
        placedSectionId: resolved.sectionId,
        placementRuleId: resolved.ruleId,
        placementNote: resolved.note,
        placedAt: new Date(),
      },
    });

    return { ok: true as const, note: resolved.note };
  }

  private canAutoEnroll(app: {
    idNumber: string | null;
    gender: string | null;
    dateOfBirth: Date | null;
    placedGradeId: string | null;
  }) {
    return Boolean(
      app.placedGradeId &&
        app.idNumber?.trim() &&
        app.gender &&
        app.dateOfBirth,
    );
  }

  private async maybeAutoProcessApplication(schoolId: string, applicationId: string) {
    const app = await this.prisma.admissionApplication.findFirst({
      where: { id: applicationId, schoolId },
      include: { cycle: true },
    });
    if (!app) throw new NotFoundException('Application not found');

    const cycle = app.cycle;

    if (
      cycle.autoPlaceOnScore &&
      app.totalScore != null &&
      app.status !== AdmissionStatus.ENROLLED
    ) {
      await this.placeApplicationById(schoolId, applicationId);
    }

    let current = await this.prisma.admissionApplication.findFirst({
      where: { id: applicationId, schoolId },
    });
    if (!current) throw new NotFoundException('Application not found');

    if (
      cycle.autoAcceptOnPlace &&
      current.status === AdmissionStatus.PLACED
    ) {
      current = await this.prisma.admissionApplication.update({
        where: { id: applicationId },
        data: { status: AdmissionStatus.ACCEPTED },
      });
    }

    if (
      cycle.autoEnrollOnPlace &&
      current.status === AdmissionStatus.ACCEPTED &&
      this.canAutoEnroll(current)
    ) {
      try {
        await this.enrollApplication(schoolId, applicationId);
      } catch {
        // Missing data or plan limits — leave at ACCEPTED for manual enroll.
      }
    }

    return this.getApplication(schoolId, applicationId);
  }

  async runPlacement(
    schoolId: string,
    cycleId: string,
    dto: RunPlacementDto = {},
  ) {
    await this.assertCycle(schoolId, cycleId);

    const rules = await this.loadActiveRules(schoolId, cycleId);
    if (rules.length === 0) {
      throw new BadRequestException('Add placement rules before running placement');
    }

    const statuses: AdmissionStatus[] = [
      AdmissionStatus.SCORED,
      AdmissionStatus.PLACED,
      AdmissionStatus.ACCEPTED,
    ];
    if (!dto.includePlaced) {
      statuses.splice(1, 1);
    }

    const applications = await this.prisma.admissionApplication.findMany({
      where: {
        schoolId,
        cycleId,
        status: { in: statuses },
        totalScore: { not: null },
      },
      orderBy: { totalScore: 'desc' },
    });

    const placedCounts = await this.buildPlacedCounts(schoolId, cycleId);
    let placed = 0;
    let unmatched = 0;
    const results: { id: string; ok: boolean; note?: string }[] = [];

    for (const app of applications) {
      const result = await this.placeApplicationById(schoolId, app.id, {
        placedCounts,
      });
      if (result.ok) {
        placed += 1;
        results.push({ id: app.id, ok: true, note: result.note });
      } else {
        unmatched += 1;
        results.push({ id: app.id, ok: false, note: result.note });
      }
    }

    return { placed, unmatched, total: applications.length, results };
  }

  async enrollApplication(schoolId: string, id: string) {
    const app = await this.prisma.admissionApplication.findFirst({
      where: { id, schoolId },
      include: {
        cycle: true,
        placedGrade: true,
        placedSection: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status === AdmissionStatus.ENROLLED) {
      throw new BadRequestException('Application already enrolled');
    }
    if (!app.placedGradeId) {
      throw new BadRequestException(
        'Run placement or set grade/section before enrolling',
      );
    }
    if (!app.idNumber?.trim()) {
      throw new BadRequestException('ID number is required to enroll');
    }
    if (!app.gender) {
      throw new BadRequestException('Gender is required to enroll');
    }
    if (!app.dateOfBirth) {
      throw new BadRequestException('Date of birth is required to enroll');
    }

    const result = await this.studentsService.create(schoolId, {
      firstName: app.firstName,
      lastName: app.lastName,
      middleName: app.middleName ?? undefined,
      gradeId: app.placedGradeId,
      sectionId: app.placedSectionId ?? undefined,
      idNumber: app.idNumber,
      gender: app.gender,
      dateOfBirth: app.dateOfBirth.toISOString(),
      fatherName: app.fatherName,
      fatherPhone: app.fatherPhone,
      motherName: app.motherName,
      motherPhone: app.motherPhone,
      email: app.email ?? undefined,
      phone: app.phone ?? undefined,
    });

    await this.enrollment.ensureEnrollment(
      schoolId,
      result.student.id,
      app.cycle.academicYearId,
      app.placedGradeId,
      app.placedSectionId,
    );

    await this.prisma.admissionApplication.update({
      where: { id },
      data: {
        status: AdmissionStatus.ENROLLED,
        enrolledProfileId: result.student.id,
        enrolledAt: new Date(),
      },
    });

    return {
      applicationId: id,
      student: result,
    };
  }

  async bulkEnroll(schoolId: string, cycleId: string) {
    const apps = await this.prisma.admissionApplication.findMany({
      where: {
        schoolId,
        cycleId,
        status: { in: [AdmissionStatus.PLACED, AdmissionStatus.ACCEPTED] },
        placedGradeId: { not: null },
      },
    });

    const results: {
      id: string;
      ok: boolean;
      error?: string;
      studentId?: string;
    }[] = [];

    for (const app of apps) {
      try {
        const res = await this.enrollApplication(schoolId, app.id);
        results.push({
          id: app.id,
          ok: true,
          studentId: res.student.student.id,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Enrollment failed';
        results.push({ id: app.id, ok: false, error: message });
      }
    }

    const ok = results.filter((r) => r.ok).length;
    return { enrolled: ok, failed: results.length - ok, results };
  }

  private async assertCycle(schoolId: string, cycleId: string) {
    const cycle = await this.prisma.admissionCycle.findFirst({
      where: { id: cycleId, schoolId },
    });
    if (!cycle) throw new NotFoundException('Admission cycle not found');
    return cycle;
  }

  private async validateRuleTargets(
    schoolId: string,
    gradeId: string,
    sectionId?: string,
  ) {
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
    });
    if (!grade) throw new NotFoundException('Target grade not found');
    if (sectionId) {
      const section = await this.prisma.section.findFirst({
        where: { id: sectionId, gradeId },
      });
      if (!section) throw new NotFoundException('Target section not found');
    }
  }
}
