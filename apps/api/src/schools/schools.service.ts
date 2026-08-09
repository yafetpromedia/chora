import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AttendanceMode, GradePreset, Plan, SchoolStatus, SchoolType } from '@prisma/client';
import { gradeNamesForPreset } from '../grades/grade-presets';
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
  schoolType: string | null;
  address: string | null;
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
  paymentInstructions: string | null;
  reportCardTitle: string | null;
  reportCardTagline: string | null;
};

@Injectable()
export class SchoolsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly permissionsService: PermissionsService,
    private readonly provisioning: SchoolProvisioningService,
  ) {}

  async onModuleInit() {
    await this.prisma.school.upsert({
      where: { id: 'school-addis' },
      create: {
        id: 'school-addis',
        name: 'Bright Side International School',
        slug: 'bright-side',
        joinCode: 'BRIGHT1',
        country: 'Ethiopia',
        bankName: 'Commercial Bank of Ethiopia',
        bankAccountHolder: 'Bright Side International School',
        bankAccountNumber: '1000123456789',
        paymentInstructions:
          'Use your child’s full name as the transfer reference. Upload the bank receipt after paying.',
      },
      update: {
        name: 'Bright Side International School',
        joinCode: 'BRIGHT1',
        status: SchoolStatus.ACTIVE,
        bankName: 'Commercial Bank of Ethiopia',
        bankAccountHolder: 'Bright Side International School',
        bankAccountNumber: '1000123456789',
        paymentInstructions:
          'Use your child’s full name as the transfer reference. Upload the bank receipt after paying.',
      },
    });

    await this.subscriptionsService.ensureSubscription('school-addis', Plan.STARTER);

    const demoGradeCount = await this.prisma.grade.count({
      where: { schoolId: 'school-addis' },
    });
    if (demoGradeCount === 0) {
      const names = gradeNamesForPreset(GradePreset.GRADES_1_8);
      await this.prisma.$transaction([
        ...names.map((name, index) =>
          this.prisma.grade.create({
            data: { schoolId: 'school-addis', name, sortOrder: index },
          }),
        ),
        this.prisma.school.update({
          where: { id: 'school-addis' },
          data: {
            gradePreset: GradePreset.GRADES_1_8,
            setupComplete: true,
            schoolType: 'MIXED',
          },
        }),
      ]);
      const grades = await this.prisma.grade.findMany({
        where: { schoolId: 'school-addis' },
      });
      for (const grade of grades.slice(0, 2)) {
        await this.prisma.section.createMany({
          data: [
            { gradeId: grade.id, name: 'A' },
            { gradeId: grade.id, name: 'B' },
          ],
          skipDuplicates: true,
        });
      }
    }

    const firstGrade = await this.prisma.grade.findFirst({
      where: { schoolId: 'school-addis' },
      orderBy: { sortOrder: 'asc' },
      include: { sections: true },
    });
    if (firstGrade) {
      const sectionId = firstGrade.sections[0]?.id ?? null;
      const demoProfile = await this.prisma.studentProfile.upsert({
        where: { userId: '3' },
        create: {
          userId: '3',
          schoolId: 'school-addis',
          gradeId: firstGrade.id,
          sectionId,
        },
        update: { gradeId: firstGrade.id, sectionId },
      });
      await this.prisma.parentStudent.upsert({
        where: {
          parentId_studentId: { parentId: '4', studentId: demoProfile.id },
        },
        create: { parentId: '4', studentId: demoProfile.id },
        update: {},
      });
    }
  }

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
      throw new ConflictException('Could not create school. Try a different name.');
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
    return school ? this.toRecord(school) : null;
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
      email?: string;
      phone?: string;
      country?: string;
      logoUrl?: string | null;
      attendanceMode?: AttendanceMode;
      bankName?: string | null;
      bankAccountHolder?: string | null;
      bankAccountNumber?: string | null;
      paymentInstructions?: string | null;
      reportCardTitle?: string | null;
      reportCardTagline?: string | null;
    },
  ): Promise<SchoolRecord> {
    const existing = await this.prisma.school.findUnique({ where: { id: schoolId } });
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
      data.logoUrl = input.logoUrl?.trim() || null;
    }
    if (input.attendanceMode !== undefined) {
      data.attendanceMode = input.attendanceMode;
    }
    if (input.reportCardTitle !== undefined) {
      data.reportCardTitle = input.reportCardTitle.trim() || null;
    }
    if (input.reportCardTagline !== undefined) {
      data.reportCardTagline = input.reportCardTagline.trim() || null;
    }

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data,
    });

    return this.toRecord(school);
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

  private toRecord(school: {
    id: string;
    name: string;
    slug: string;
    joinCode: string;
    logoUrl: string | null;
    schoolType: string | null;
    address: string | null;
    email: string | null;
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
    paymentInstructions: string | null;
    reportCardTitle?: string | null;
    reportCardTagline?: string | null;
  }): SchoolRecord {
    return {
      id: school.id,
      name: school.name,
      slug: school.slug,
      joinCode: school.joinCode,
      logoUrl: school.logoUrl,
      schoolType: school.schoolType,
      address: school.address,
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
      paymentInstructions: school.paymentInstructions,
      reportCardTitle: school.reportCardTitle ?? null,
      reportCardTagline: school.reportCardTagline ?? null,
    };
  }
}
