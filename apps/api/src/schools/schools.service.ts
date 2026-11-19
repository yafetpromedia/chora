import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sanitizeSchoolImageUrl } from '../common/validators/school-image-url';
import {
  AttendanceMode,
  GradePreset,
  SchoolStatus,
  SchoolType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PermissionsService } from '../permissions/permissions.service';
import { SchoolProvisioningService } from '../provisioning/school-provisioning.service';
import { DEFAULT_CURRICULUM_PACKAGE_KEY } from '../provisioning/curriculum-packages.data';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export type SchoolRecord = {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  logoUrl: string | null;
  authorizedSignatureUrl: string | null;
  authorizedSignatureLabel: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  accentDeep: string | null;
  schoolType: string | null;
  address: string | null;
  postalBox: string | null;
  email: string | null;
  country: string | null;
  phone: string | null;
  setupComplete: boolean;
  gradePreset: string | null;
  curriculumPackageKey: string | null;
  attendanceMode: string;
  status: string;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  telebirrNumber: string | null;
  telebirrAccountName: string | null;
  paymentInstructions: string | null;
  reportCardTitle: string | null;
  reportCardTagline: string | null;
  nameAm: string | null;
  stampUrl: string | null;
  idCardShowStamp: boolean;
  reportCoverImageUrl: string | null;
  reportShowRank: boolean;
  reportShowAttendance: boolean;
};

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly permissionsService: PermissionsService,
    private readonly provisioning: SchoolProvisioningService,
  ) {}

  async createSchool(input: {
    name: string;
    schoolType?: string;
    address?: string;
    email?: string;
    logoUrl?: string;
    country?: string;
    phone?: string;
    curriculumPackageKey?: string;
    gradePreset?: GradePreset;
  }): Promise<SchoolRecord> {
    const joinCode = await this.generateUniqueJoinCode();
    const slug = await this.generateUniqueSlug(input.name);
    const id = `school_${randomBytes(6).toString('hex')}`;

    try {
      const school = await this.prisma.school.create({
        data: {
          id,
          name: input.name.trim(),
          slug,
          joinCode,
          schoolType: input.schoolType as never,
          address: input.address?.trim() || null,
          email: input.email?.trim() || null,
          logoUrl: input.logoUrl?.trim() || null,
          country: input.country?.trim() || null,
          phone: input.phone?.trim() || null,
          setupComplete: false,
          status: SchoolStatus.TRIAL,
        },
      });
      await this.subscriptionsService.createTrial(school.id);
      await this.permissionsService.ensureSchoolRoleTemplates(school.id);
      await this.provisioning.provisionSchool(school.id, {
        curriculumPackageKey:
          input.curriculumPackageKey?.trim() || DEFAULT_CURRICULUM_PACKAGE_KEY,
        gradePreset: input.gradePreset,
        schoolType: input.schoolType as SchoolType | undefined,
      });
      const refreshed = await this.prisma.school.findUnique({
        where: { id: school.id },
      });
      return this.toRecord(refreshed ?? school);
    } catch {
      throw new ConflictException(
        'Could not create school. Try a different name.',
      );
    }
  }

  async findByJoinCode(joinCode: string): Promise<SchoolRecord> {
    const school = await this.prisma.school.findUnique({
      where: { joinCode: joinCode.trim().toUpperCase() },
    });
    if (!school) {
      throw new NotFoundException('Invalid school code');
    }
    return this.toRecord(school);
  }

  async findById(id: string): Promise<SchoolRecord | null> {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) return null;
    return this.toRecord(school, await this.readIdCardShowStamp(id));
  }

  /** Works even when Prisma client has not been regenerated after the migration. */
  private async readIdCardShowStamp(schoolId: string): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ v: boolean | null }>
      >(
        `SELECT "idCardShowStamp" AS v FROM "School" WHERE id = $1 LIMIT 1`,
        schoolId,
      );
      return rows[0]?.v === true;
    } catch {
      return false;
    }
  }

  async updateAttendanceMode(schoolId: string, mode: AttendanceMode) {
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: { attendanceMode: mode },
      select: { attendanceMode: true },
    });
    return { mode: school.attendanceMode };
  }

  async updateSettings(
    schoolId: string,
    input: {
      name?: string;
      schoolType?: string;
      address?: string;
      postalBox?: string;
      email?: string;
      phone?: string;
      country?: string;
      logoUrl?: string | null;
      authorizedSignatureUrl?: string | null;
      authorizedSignatureLabel?: string | null;
      primaryColor?: string | null;
      accentColor?: string | null;
      accentDeep?: string | null;
      attendanceMode?: AttendanceMode;
      bankName?: string | null;
      bankAccountHolder?: string | null;
      bankAccountNumber?: string | null;
      telebirrNumber?: string | null;
      telebirrAccountName?: string | null;
      paymentInstructions?: string | null;
      reportCardTitle?: string | null;
      reportCardTagline?: string | null;
      nameAm?: string | null;
      stampUrl?: string | null;
      reportCoverImageUrl?: string | null;
      idCardShowStamp?: boolean;
      reportShowRank?: boolean;
      reportShowAttendance?: boolean;
    },
  ): Promise<SchoolRecord> {
    const existing = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!existing) {
      throw new NotFoundException('School not found');
    }

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }
    if (input.schoolType !== undefined) {
      data.schoolType = input.schoolType;
    }
    if (input.address !== undefined) {
      data.address = input.address.trim() || null;
    }
    if (input.postalBox !== undefined) {
      data.postalBox = input.postalBox.trim() || null;
    }
    if (input.email !== undefined) {
      data.email = input.email.trim() || null;
    }
    if (input.phone !== undefined) {
      data.phone = input.phone.trim() || null;
    }
    if (input.country !== undefined) {
      data.country = input.country.trim() || null;
    }
    if (input.logoUrl !== undefined) {
      data.logoUrl = sanitizeSchoolImageUrl('Logo', input.logoUrl);
    }
    if (input.authorizedSignatureUrl !== undefined) {
      data.authorizedSignatureUrl = sanitizeSchoolImageUrl(
        'Signature',
        input.authorizedSignatureUrl,
      );
    }
    if (input.authorizedSignatureLabel !== undefined) {
      data.authorizedSignatureLabel =
        input.authorizedSignatureLabel?.trim() || null;
    }
    if (input.primaryColor !== undefined) {
      data.primaryColor = normalizeHexColor(input.primaryColor);
    }
    if (input.accentColor !== undefined) {
      data.accentColor = normalizeHexColor(input.accentColor);
    }
    if (input.accentDeep !== undefined) {
      data.accentDeep = normalizeHexColor(input.accentDeep);
    }
    if (input.attendanceMode !== undefined) {
      data.attendanceMode = input.attendanceMode;
    }
    if (input.bankName !== undefined) {
      data.bankName = input.bankName?.trim() || null;
    }
    if (input.bankAccountHolder !== undefined) {
      data.bankAccountHolder = input.bankAccountHolder?.trim() || null;
    }
    if (input.bankAccountNumber !== undefined) {
      data.bankAccountNumber = input.bankAccountNumber?.trim() || null;
    }
    if (input.telebirrNumber !== undefined) {
      data.telebirrNumber = input.telebirrNumber?.trim() || null;
    }
    if (input.telebirrAccountName !== undefined) {
      data.telebirrAccountName = input.telebirrAccountName?.trim() || null;
    }
    if (input.paymentInstructions !== undefined) {
      data.paymentInstructions = input.paymentInstructions?.trim() || null;
    }
    if (input.reportCardTitle !== undefined) {
      data.reportCardTitle = input.reportCardTitle?.trim() || null;
    }
    if (input.reportCardTagline !== undefined) {
      data.reportCardTagline = input.reportCardTagline?.trim() || null;
    }
    if (input.nameAm !== undefined) {
      data.nameAm = input.nameAm?.trim() || null;
    }
    if (input.stampUrl !== undefined) {
      data.stampUrl = sanitizeSchoolImageUrl('Stamp', input.stampUrl);
    }
    if (input.reportCoverImageUrl !== undefined) {
      data.reportCoverImageUrl = sanitizeSchoolImageUrl(
        'Report cover',
        input.reportCoverImageUrl,
      );
    }
    if (input.reportShowRank !== undefined) {
      data.reportShowRank = input.reportShowRank;
    }
    if (input.reportShowAttendance !== undefined) {
      data.reportShowAttendance = input.reportShowAttendance;
    }

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data,
    });

    const stampAvailable = Boolean(
      (data.stampUrl as string | null | undefined) ?? existing.stampUrl,
    );
    let idCardShowStampValue = await this.readIdCardShowStamp(schoolId);

    if (input.idCardShowStamp !== undefined) {
      idCardShowStampValue = input.idCardShowStamp === true && stampAvailable;
      try {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "School" SET "idCardShowStamp" = $1::boolean WHERE id = $2`,
          idCardShowStampValue,
          schoolId,
        );
      } catch {
        // Ignore if column/client lag; stamp stays off on ID cards by default.
      }
    } else if (
      input.stampUrl !== undefined &&
      !stampAvailable &&
      idCardShowStampValue
    ) {
      idCardShowStampValue = false;
      try {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "School" SET "idCardShowStamp" = $1::boolean WHERE id = $2`,
          false,
          schoolId,
        );
      } catch {
        /* ignore */
      }
    }

    return this.toRecord(school, idCardShowStampValue);
  }

  private async generateUniqueJoinCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 20; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const existing = await this.prisma.school.findUnique({
        where: { joinCode: code },
      });
      if (!existing) {
        return code;
      }
    }
    return randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || 'school';

    let slug = base;
    let suffix = 0;
    while (true) {
      const existing = await this.prisma.school.findUnique({ where: { slug } });
      if (!existing) {
        return slug;
      }
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
  }

  private toRecord(
    school: {
      id: string;
      name: string;
      slug: string;
      joinCode: string;
      logoUrl: string | null;
      authorizedSignatureUrl?: string | null;
      authorizedSignatureLabel?: string | null;
      primaryColor?: string | null;
      accentColor?: string | null;
      accentDeep?: string | null;
      schoolType: string | null;
      address: string | null;
      email: string | null;
      postalBox?: string | null;
      country: string | null;
      phone: string | null;
      setupComplete: boolean;
      gradePreset: string | null;
      curriculumPackageKey?: string | null;
      attendanceMode: string;
      status: string;
      bankName: string | null;
      bankAccountHolder: string | null;
      bankAccountNumber: string | null;
      telebirrNumber?: string | null;
      telebirrAccountName?: string | null;
      paymentInstructions: string | null;
      reportCardTitle?: string | null;
      reportCardTagline?: string | null;
      nameAm?: string | null;
      stampUrl?: string | null;
      reportCoverImageUrl?: string | null;
      idCardShowStamp?: boolean;
      reportShowRank?: boolean;
      reportShowAttendance?: boolean;
    },
    idCardShowStampOverride?: boolean,
  ): SchoolRecord {
    const stampFlag =
      idCardShowStampOverride ??
      (school as { idCardShowStamp?: boolean }).idCardShowStamp ??
      false;
    return {
      id: school.id,
      name: school.name,
      slug: school.slug,
      joinCode: school.joinCode,
      logoUrl: school.logoUrl,
      authorizedSignatureUrl: school.authorizedSignatureUrl ?? null,
      authorizedSignatureLabel: school.authorizedSignatureLabel ?? null,
      primaryColor: school.primaryColor ?? null,
      accentColor: school.accentColor ?? null,
      accentDeep: school.accentDeep ?? null,
      schoolType: school.schoolType,
      address: school.address,
      postalBox: school.postalBox ?? null,
      email: school.email,
      country: school.country,
      phone: school.phone,
      setupComplete: school.setupComplete,
      gradePreset: school.gradePreset,
      curriculumPackageKey: school.curriculumPackageKey ?? null,
      attendanceMode: school.attendanceMode,
      status: school.status,
      bankName: school.bankName,
      bankAccountHolder: school.bankAccountHolder,
      bankAccountNumber: school.bankAccountNumber,
      telebirrNumber: school.telebirrNumber ?? null,
      telebirrAccountName: school.telebirrAccountName ?? null,
      paymentInstructions: school.paymentInstructions,
      reportCardTitle: school.reportCardTitle ?? null,
      reportCardTagline: school.reportCardTagline ?? null,
      nameAm: school.nameAm ?? null,
      stampUrl: school.stampUrl ?? null,
      idCardShowStamp: stampFlag,
      reportCoverImageUrl: school.reportCoverImageUrl ?? null,
      reportShowRank: school.reportShowRank ?? true,
      reportShowAttendance: school.reportShowAttendance ?? true,
    };
  }
}

function normalizeHexColor(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}
