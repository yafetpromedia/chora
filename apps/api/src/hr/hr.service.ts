import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmploymentStatus,
  EmploymentType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  decryptBankAccount,
  encryptBankAccount,
  maskBankAccount,
} from '../payroll/bank-crypto.util';
import { UpsertEmployeeProfileDto, UpsertHrOrgDto } from './hr.dto';

const DEFAULT_DEPARTMENTS = [
  { code: 'ADMIN', name: 'Administration', sortOrder: 1 },
  { code: 'ACAD', name: 'Academic', sortOrder: 2 },
  { code: 'FIN', name: 'Finance', sortOrder: 3 },
  { code: 'HR', name: 'Human Resources', sortOrder: 4 },
  { code: 'IT', name: 'IT', sortOrder: 5 },
  { code: 'SEC', name: 'Security', sortOrder: 6 },
  { code: 'CLN', name: 'Cleaning', sortOrder: 7 },
  { code: 'TRN', name: 'Transport', sortOrder: 8 },
  { code: 'LIB', name: 'Library', sortOrder: 9 },
  { code: 'MNT', name: 'Maintenance', sortOrder: 10 },
  { code: 'CAF', name: 'Cafeteria', sortOrder: 11 },
  { code: 'RCP', name: 'Reception', sortOrder: 12 },
  { code: 'OTH', name: 'Other', sortOrder: 99 },
];

const DEFAULT_POSITIONS = [
  { code: 'DIR', name: 'Director', sortOrder: 1 },
  { code: 'PRIN', name: 'Principal', sortOrder: 2 },
  { code: 'VPRIN', name: 'Vice Principal', sortOrder: 3 },
  { code: 'TCH', name: 'Teacher', sortOrder: 4 },
  { code: 'REG', name: 'Registrar', sortOrder: 5 },
  { code: 'ACCT', name: 'Accountant', sortOrder: 6 },
  { code: 'SEC', name: 'Secretary', sortOrder: 7 },
  { code: 'GUARD', name: 'Security Guard', sortOrder: 8 },
  { code: 'CLN', name: 'Cleaner', sortOrder: 9 },
  { code: 'DRV', name: 'Driver', sortOrder: 10 },
  { code: 'IT', name: 'IT Officer', sortOrder: 11 },
  { code: 'SUP', name: 'Supervisor', sortOrder: 12 },
  { code: 'LIB', name: 'Librarian', sortOrder: 13 },
];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function maskAccount(num: string | null | undefined): string | null {
  return maskBankAccount(num);
}

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureOrgDefaults(schoolId: string) {
    for (const d of DEFAULT_DEPARTMENTS) {
      await this.prisma.hrDepartment.upsert({
        where: { schoolId_code: { schoolId, code: d.code } },
        create: { schoolId, ...d },
        update: {},
      });
    }
    for (const p of DEFAULT_POSITIONS) {
      await this.prisma.hrPosition.upsert({
        where: { schoolId_code: { schoolId, code: p.code } },
        create: { schoolId, ...p },
        update: {},
      });
    }
  }

  async listDepartments(schoolId: string) {
    const existing = await this.prisma.hrDepartment.count({ where: { schoolId } });
    if (existing === 0) await this.ensureOrgDefaults(schoolId);
    return this.prisma.hrDepartment.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createDepartment(schoolId: string, dto: UpsertHrOrgDto) {
    return this.prisma.hrDepartment.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateDepartment(schoolId: string, id: string, dto: UpsertHrOrgDto) {
    await this.assertDept(schoolId, id);
    return this.prisma.hrDepartment.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        active: dto.active,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async listPositions(schoolId: string) {
    const existing = await this.prisma.hrPosition.count({ where: { schoolId } });
    if (existing === 0) await this.ensureOrgDefaults(schoolId);
    return this.prisma.hrPosition.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createPosition(schoolId: string, dto: UpsertHrOrgDto) {
    return this.prisma.hrPosition.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePosition(schoolId: string, id: string, dto: UpsertHrOrgDto) {
    await this.assertPos(schoolId, id);
    return this.prisma.hrPosition.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        active: dto.active,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async listEmployees(
    schoolId: string,
    opts: {
      search?: string;
      departmentId?: string;
      positionId?: string;
      status?: string;
      revealBank?: boolean;
    },
  ) {
    await this.ensureOrgDefaults(schoolId);
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
        roleTemplateId: { not: null },
        ...(opts.search
          ? {
              OR: [
                { firstName: { contains: opts.search, mode: 'insensitive' } },
                { lastName: { contains: opts.search, mode: 'insensitive' } },
                { email: { contains: opts.search, mode: 'insensitive' } },
                {
                  employeeProfile: {
                    employeeCode: {
                      contains: opts.search,
                      mode: 'insensitive',
                    },
                  },
                },
              ],
            }
          : {}),
        ...(opts.departmentId || opts.positionId || opts.status
          ? {
              employeeProfile: {
                ...(opts.departmentId
                  ? { hrDepartmentId: opts.departmentId }
                  : {}),
                ...(opts.positionId ? { hrPositionId: opts.positionId } : {}),
                ...(opts.status
                  ? { employmentStatus: opts.status as EmploymentStatus }
                  : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        roleTemplate: { select: { name: true, slug: true } },
        employeeProfile: {
          include: {
            hrDepartment: true,
            hrPosition: true,
          },
        },
        teacherProfile: { select: { photoUrl: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 500,
    });

    return users.map((u) => this.formatEmployee(u, !!opts.revealBank));
  }

  async getEmployee(
    schoolId: string,
    userId: string,
    revealBank = false,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        roleTemplate: { select: { name: true, slug: true } },
        employeeProfile: {
          include: {
            hrDepartment: true,
            hrPosition: true,
            histories: {
              orderBy: { effectiveFrom: 'desc' },
              take: 50,
              include: {
                hrDepartment: true,
                hrPosition: true,
                changedBy: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        teacherProfile: { select: { photoUrl: true } },
      },
    });
    if (!user) throw new NotFoundException('Employee not found');
    return this.formatEmployee(user, revealBank);
  }

  async upsertProfile(
    schoolId: string,
    actorId: string,
    userId: string,
    dto: UpsertEmployeeProfileDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
      },
    });
    if (!user) throw new NotFoundException('Employee not found');

    if (dto.hrDepartmentId) await this.assertDept(schoolId, dto.hrDepartmentId);
    if (dto.hrPositionId) await this.assertPos(schoolId, dto.hrPositionId);
    if (dto.supervisorUserId) {
      await this.assertSameSchoolUser(schoolId, dto.supervisorUserId);
    }

    const existing = await this.prisma.employeeProfile.findUnique({
      where: { userId },
    });
    if (existing && existing.schoolId !== schoolId) {
      throw new NotFoundException('Employee not found');
    }

    const employeeCode =
      dto.employeeCode?.trim() ||
      existing?.employeeCode ||
      (await this.nextEmployeeCode(schoolId));

    const data: Prisma.EmployeeProfileUncheckedCreateInput = {
      schoolId,
      userId,
      employeeCode,
      gender: dto.gender ?? existing?.gender ?? null,
      dateOfBirth: parseDate(dto.dateOfBirth) ?? existing?.dateOfBirth ?? null,
      address: dto.address ?? existing?.address ?? null,
      emergencyName: dto.emergencyName ?? existing?.emergencyName ?? null,
      emergencyPhone: dto.emergencyPhone ?? existing?.emergencyPhone ?? null,
      employmentType:
        dto.employmentType ?? existing?.employmentType ?? EmploymentType.FULL_TIME,
      employmentStatus:
        dto.employmentStatus ??
        existing?.employmentStatus ??
        EmploymentStatus.ACTIVE,
      hrDepartmentId:
        dto.hrDepartmentId === undefined
          ? existing?.hrDepartmentId ?? null
          : dto.hrDepartmentId,
      hrPositionId:
        dto.hrPositionId === undefined
          ? existing?.hrPositionId ?? null
          : dto.hrPositionId,
      supervisorUserId:
        dto.supervisorUserId === undefined
          ? existing?.supervisorUserId ?? null
          : dto.supervisorUserId,
      hireDate:
        dto.hireDate === undefined
          ? existing?.hireDate ?? null
          : parseDate(dto.hireDate),
      contractStart:
        dto.contractStart === undefined
          ? existing?.contractStart ?? null
          : parseDate(dto.contractStart),
      contractEnd:
        dto.contractEnd === undefined
          ? existing?.contractEnd ?? null
          : parseDate(dto.contractEnd),
      photoUrl:
        dto.photoUrl === undefined ? existing?.photoUrl ?? null : dto.photoUrl,
      bankName:
        dto.bankName === undefined ? existing?.bankName ?? null : dto.bankName,
      bankAccountHolder:
        dto.bankAccountHolder === undefined
          ? existing?.bankAccountHolder ?? null
          : dto.bankAccountHolder,
      bankAccountNumber:
        dto.bankAccountNumber === undefined
          ? existing?.bankAccountNumber ?? null
          : encryptBankAccount(dto.bankAccountNumber),
    };

    const profile = await this.prisma.$transaction(async (tx) => {
      const row = await tx.employeeProfile.upsert({
        where: { userId },
        create: data,
        update: {
          employeeCode: data.employeeCode,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          emergencyName: data.emergencyName,
          emergencyPhone: data.emergencyPhone,
          employmentType: data.employmentType,
          employmentStatus: data.employmentStatus,
          hrDepartmentId: data.hrDepartmentId,
          hrPositionId: data.hrPositionId,
          supervisorUserId: data.supervisorUserId,
          hireDate: data.hireDate,
          contractStart: data.contractStart,
          contractEnd: data.contractEnd,
          photoUrl: data.photoUrl,
          bankName: data.bankName,
          bankAccountHolder: data.bankAccountHolder,
          bankAccountNumber: data.bankAccountNumber,
        },
      });

      const employmentChanged =
        !existing ||
        existing.employmentType !== row.employmentType ||
        existing.employmentStatus !== row.employmentStatus ||
        existing.hrDepartmentId !== row.hrDepartmentId ||
        existing.hrPositionId !== row.hrPositionId;

      if (employmentChanged) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (existing) {
          await tx.employmentHistory.updateMany({
            where: {
              employeeProfileId: existing.id,
              effectiveTo: null,
            },
            data: {
              effectiveTo: new Date(today.getTime() - 86400000),
            },
          });
        }
        await tx.employmentHistory.create({
          data: {
            schoolId,
            employeeProfileId: row.id,
            effectiveFrom: today,
            hrDepartmentId: row.hrDepartmentId,
            hrPositionId: row.hrPositionId,
            employmentType: row.employmentType,
            employmentStatus: row.employmentStatus,
            reason: dto.reason?.trim() || 'Employment update',
            changedById: actorId,
          },
        });
      }
      return row;
    });

    return this.getEmployee(schoolId, userId, true);
  }

  private async nextEmployeeCode(schoolId: string) {
    const count = await this.prisma.employeeProfile.count({ where: { schoolId } });
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  private async assertSameSchoolUser(schoolId: string, userId: string) {
    const row = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
      },
      select: { id: true },
    });
    if (!row) throw new BadRequestException('Supervisor must belong to this school');
  }

  private async assertDept(schoolId: string, id: string) {
    const row = await this.prisma.hrDepartment.findFirst({
      where: { id, schoolId },
    });
    if (!row) throw new NotFoundException('Department not found');
  }

  private async assertPos(schoolId: string, id: string) {
    const row = await this.prisma.hrPosition.findFirst({
      where: { id, schoolId },
    });
    if (!row) throw new NotFoundException('Position not found');
  }

  private formatEmployee(
    u: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      role: string;
      roleTemplate: { name: string; slug: string } | null;
      employeeProfile: {
        id: string;
        employeeCode: string;
        gender: string | null;
        dateOfBirth: Date | null;
        address: string | null;
        emergencyName: string | null;
        emergencyPhone: string | null;
        employmentType: EmploymentType;
        employmentStatus: EmploymentStatus;
        hrDepartmentId: string | null;
        hrPositionId: string | null;
        supervisorUserId: string | null;
        hireDate: Date | null;
        contractStart: Date | null;
        contractEnd: Date | null;
        photoUrl: string | null;
        bankName: string | null;
        bankAccountHolder: string | null;
        bankAccountNumber: string | null;
        hrDepartment?: { id: string; name: string; code: string } | null;
        hrPosition?: { id: string; name: string; code: string } | null;
        histories?: unknown[];
      } | null;
      teacherProfile: { photoUrl: string | null } | null;
    },
    revealBank: boolean,
  ) {
    const p = u.employeeProfile;
    return {
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      phone: u.phone,
      portalRole: u.role,
      roleName: u.roleTemplate?.name ?? u.role,
      roleTemplateSlug: u.roleTemplate?.slug ?? null,
      photoUrl: p?.photoUrl ?? u.teacherProfile?.photoUrl ?? null,
      profile: p
        ? {
            id: p.id,
            employeeCode: p.employeeCode,
            gender: p.gender,
            dateOfBirth: p.dateOfBirth?.toISOString().slice(0, 10) ?? null,
            address: p.address,
            emergencyName: p.emergencyName,
            emergencyPhone: p.emergencyPhone,
            employmentType: p.employmentType,
            employmentStatus: p.employmentStatus,
            hrDepartmentId: p.hrDepartmentId,
            hrPositionId: p.hrPositionId,
            departmentName: p.hrDepartment?.name ?? null,
            positionName: p.hrPosition?.name ?? null,
            supervisorUserId: p.supervisorUserId,
            hireDate: p.hireDate?.toISOString().slice(0, 10) ?? null,
            contractStart: p.contractStart?.toISOString().slice(0, 10) ?? null,
            contractEnd: p.contractEnd?.toISOString().slice(0, 10) ?? null,
            bankName: revealBank ? p.bankName : null,
            bankAccountHolder: revealBank ? p.bankAccountHolder : null,
            bankAccountNumber: revealBank
              ? decryptBankAccount(p.bankAccountNumber)
              : null,
            bankAccountMasked: maskAccount(p.bankAccountNumber),
            histories: p.histories ?? [],
          }
        : null,
    };
  }
}
