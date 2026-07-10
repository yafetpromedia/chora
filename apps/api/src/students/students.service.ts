import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gender, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashSync } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import {
  buildCardScanPayload,
  buildStudentPortalEmail,
  generateSchoolStudentId,
  generateStudentCardCode,
} from './student-card.util';
import { FayedaService } from '../fayeda/fayeda.service';
import { AcademicEnrollmentService } from '../results/academic-enrollment.service';
import { UsersService } from '../users/users.service';
import { UpdateParentAccountDto } from './dto/update-parent-account.dto';
import {
  buildParentContactEmail,
  isLegacyParentContactEmail,
} from '../users/username.util';

export type StudentRow = {
  firstName: string;
  lastName: string;
  gender?: string;
  gradeName: string;
  sectionName?: string;
  parentName: string;
  parentPhone: string;
  studentId?: string;
  idNumber?: string;
  dateOfBirth?: string;
  motherName?: string;
  motherPhone?: string;
  email?: string;
};

@Injectable()
export class StudentsService {
  private readonly studentInclude = {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        externalRef: true,
      },
    },
    grade: { select: { id: true, name: true } },
    section: { select: { id: true, name: true } },
    parents: {
      orderBy: { id: 'asc' },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    },
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly fayedaService: FayedaService,
    private readonly enrollment: AcademicEnrollmentService,
    private readonly usersService: UsersService,
  ) {}

  async list(schoolId: string) {
    return this.prisma.studentProfile.findMany({
      where: { schoolId },
      include: this.studentInclude,
      orderBy: [{ grade: { sortOrder: 'asc' } }, { user: { firstName: 'asc' } }],
    });
  }

  async listParents(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { joinCode: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const parents = await this.prisma.user.findMany({
      where: { schoolId, role: UserRole.parent },
      include: {
        parentLinks: {
          include: {
            student: {
              select: {
                id: true,
                middleName: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    externalRef: true,
                  },
                },
                grade: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    for (const p of parents) {
      const expected = buildParentContactEmail(school.joinCode, p.username);
      if (p.email !== expected && isLegacyParentContactEmail(p.email)) {
        await this.prisma.user.update({
          where: { id: p.id },
          data: { email: expected },
        });
        p.email = expected;
      }
    }

    return parents.map((p) => ({
      userId: p.id,
      username: p.username,
      email: p.email,
      phone: p.phone,
      firstName: p.firstName,
      lastName: p.lastName,
      name: `${p.firstName} ${p.lastName}`.trim(),
      children: p.parentLinks.map((link) => {
        const s = link.student;
        const childName = [s.user.firstName, s.middleName, s.user.lastName]
          .filter(Boolean)
          .join(' ');
        return {
          profileId: s.id,
          name: childName,
          gradeId: s.grade.id,
          gradeName: s.grade.name,
          sectionId: s.section?.id ?? null,
          sectionName: s.section?.name ?? null,
          studentId: s.user.externalRef,
        };
      }),
    }));
  }

  private async getParentUser(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, role: UserRole.parent },
    });
    if (!user) {
      throw new NotFoundException('Parent account not found');
    }
    return user;
  }

  async resetParentPassword(schoolId: string, userId: string) {
    const user = await this.getParentUser(schoolId, userId);
    const tempPassword = this.generateTempPassword();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashSync(tempPassword, 10) },
    });

    return {
      username: user.username,
      email: user.email,
      tempPassword,
    };
  }

  async updateParentAccount(
    schoolId: string,
    userId: string,
    dto: UpdateParentAccountDto,
  ) {
    const user = await this.getParentUser(schoolId, userId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { joinCode: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const data: { username?: string; passwordHash?: string; email?: string } = {};
    const nextUsername = dto.username?.trim()
      ? await this.usersService.assertUsernameAvailable(
          schoolId,
          dto.username,
          userId,
        )
      : undefined;

    if (nextUsername) {
      data.username = nextUsername;
      data.email = buildParentContactEmail(school.joinCode, nextUsername);
    } else if (isLegacyParentContactEmail(user.email)) {
      data.email = buildParentContactEmail(school.joinCode, user.username);
    }

    if (dto.password?.trim()) {
      data.passwordHash = hashSync(dto.password.trim(), 10);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
      },
    });

    return {
      userId: updated.id,
      username: updated.username,
      email: updated.email,
      phone: updated.phone,
      name: `${updated.firstName} ${updated.lastName}`.trim(),
      passwordUpdated: !!dto.password?.trim(),
    };
  }

  async getOne(schoolId: string, profileId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: profileId, schoolId },
      include: this.studentInclude,
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  async update(schoolId: string, profileId: string, dto: UpdateStudentDto) {
    const profile = await this.getOne(schoolId, profileId);

    if (dto.gradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: dto.gradeId, schoolId },
      });
      if (!grade) {
        throw new NotFoundException('Grade not found');
      }
    }

    const gradeId = dto.gradeId ?? profile.gradeId;
    let sectionId: string | null =
      dto.sectionId === null ? null : (dto.sectionId ?? profile.sectionId);

    if (sectionId) {
      const section = await this.prisma.section.findFirst({
        where: { id: sectionId, gradeId },
      });
      if (!section) {
        throw new NotFoundException('Section not found');
      }
    }

    const fatherName = dto.fatherName?.trim() || dto.parentName?.trim();
    const fatherPhone = dto.fatherPhone?.trim() || dto.parentPhone?.trim();
    const motherName = dto.motherName?.trim();
    const motherPhone = dto.motherPhone?.trim();

    if (dto.photoUrl !== undefined) {
      this.assertValidPhotoUrl(dto.photoUrl);
    }

    const updatedStudentId = dto.studentId?.trim();
    if (
      updatedStudentId &&
      updatedStudentId !== (profile.user.externalRef ?? '')
    ) {
      await this.assertSchoolStudentIdAvailable(
        schoolId,
        updatedStudentId,
        profile.userId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const userData: {
        firstName?: string;
        lastName?: string;
        username?: string;
        externalRef?: string;
      } = {};
      if (dto.firstName) userData.firstName = dto.firstName.trim();
      if (dto.lastName) userData.lastName = dto.lastName.trim();
      if (updatedStudentId) {
        userData.externalRef = updatedStudentId;
        userData.username = updatedStudentId;
      }

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: profile.userId },
          data: userData,
        });
      }

      const profileData: {
        gradeId?: string;
        sectionId?: string | null;
        middleName?: string | null;
        gender?: Gender;
        dateOfBirth?: Date | null;
        fcn?: string;
        phone?: string | null;
        photoUrl?: string | null;
        address?: string | null;
      } = { sectionId };

      if (dto.gradeId) profileData.gradeId = dto.gradeId;
      if (dto.middleName !== undefined) {
        profileData.middleName = dto.middleName.trim() || null;
      }
      if (dto.gender !== undefined) profileData.gender = dto.gender;
      if (dto.dateOfBirth !== undefined) {
        const dob = new Date(dto.dateOfBirth);
        if (Number.isNaN(dob.getTime())) {
          throw new BadRequestException('Invalid date of birth');
        }
        profileData.dateOfBirth = dob;
      }
      if (dto.idNumber?.trim()) profileData.fcn = dto.idNumber.trim();
      if (dto.phone !== undefined) {
        profileData.phone = dto.phone.trim() || null;
      }
      if (dto.photoUrl !== undefined) {
        profileData.photoUrl = dto.photoUrl?.trim() || null;
      }
      if (dto.address !== undefined) {
        profileData.address = dto.address?.trim() || null;
      }

      await tx.studentProfile.update({
        where: { id: profileId },
        data: profileData,
      });

      if (fatherName || fatherPhone) {
        await this.updateParentLink(
          tx,
          profile,
          0,
          fatherName,
          fatherPhone,
          schoolId,
          profileId,
        );
      }
      if (motherName || motherPhone) {
        await this.updateParentLink(
          tx,
          profile,
          1,
          motherName,
          motherPhone,
          schoolId,
          profileId,
        );
      }

      return tx.studentProfile.findFirstOrThrow({
        where: { id: profileId },
        include: this.studentInclude,
      });
    });
  }

  async resetPortalPassword(schoolId: string, profileId: string) {
    const profile = await this.getOne(schoolId, profileId);
    const portalUsername =
      profile.user.username ||
      profile.user.externalRef?.trim() ||
      profile.user.email;
    const tempPassword = this.generateTempPassword();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: profile.userId },
        data: { passwordHash: hashSync(tempPassword, 10) },
      }),
      this.prisma.studentProfile.update({
        where: { id: profileId },
        data: { portalTempPassword: tempPassword },
      }),
    ]);

    return { portalUsername, tempPassword };
  }

  async remove(schoolId: string, profileId: string) {
    const profile = await this.getOne(schoolId, profileId);

    await this.prisma.$transaction(async (tx) => {
      await tx.resultRecord.deleteMany({
        where: { schoolId, studentId: profile.userId },
      });
      await tx.user.delete({
        where: { id: profile.userId },
      });
    });

    return { removed: true, id: profileId };
  }

  async create(schoolId: string, dto: CreateStudentDto) {
    await this.subscriptionsService.assertCanAddUser(schoolId, UserRole.student);

    let fayedaFields: {
      middleName?: string | null;
      dateOfBirth?: Date | null;
      photoUrl?: string | null;
      fan?: string | null;
      fcn?: string | null;
      nationality?: string | null;
      region?: string | null;
      zone?: string | null;
      woreda?: string | null;
      phone?: string | null;
      gender?: Gender | null;
      fayedaVerifiedAt?: Date | null;
      firstName?: string;
      lastName?: string;
    } = {};

    if (dto.photoUrl?.trim()) {
      this.assertValidPhotoUrl(dto.photoUrl);
    }

    if (dto.fayedaVerificationToken) {
      const verified = this.fayedaService.consumeVerificationToken(
        schoolId,
        dto.fayedaVerificationToken,
      );
      fayedaFields = {
        middleName: verified.middleName,
        dateOfBirth: new Date(verified.dateOfBirth),
        photoUrl: verified.photoUrl,
        fan: verified.fan,
        fcn: verified.fcn,
        nationality: verified.nationality,
        region: verified.region,
        zone: verified.zone,
        woreda: verified.woreda,
        phone: verified.phone,
        gender: verified.gender,
        fayedaVerifiedAt: new Date(),
        firstName: verified.firstName,
        lastName: verified.lastName,
      };
    } else if (dto.fan || dto.fcn) {
      fayedaFields = {
        middleName: dto.middleName?.trim() || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        photoUrl: dto.photoUrl?.trim() || null,
        fan: dto.fan?.trim() || null,
        fcn: dto.fcn?.trim() || null,
        nationality: dto.nationality?.trim() || null,
        region: dto.region?.trim() || null,
        zone: dto.zone?.trim() || null,
        woreda: dto.woreda?.trim() || null,
        phone: dto.phone?.trim() || null,
      };
    }

    const grade = await this.prisma.grade.findFirst({
      where: { id: dto.gradeId, schoolId },
    });
    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (dto.sectionId) {
      const section = await this.prisma.section.findFirst({
        where: { id: dto.sectionId, gradeId: dto.gradeId },
      });
      if (!section) {
        throw new NotFoundException('Section not found');
      }
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { joinCode: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tempPassword = this.generateTempPassword();

    const fatherName =
      dto.fatherName?.trim() || dto.parentName?.trim() || '';
    const fatherPhone =
      dto.fatherPhone?.trim() || dto.parentPhone?.trim() || '';
    const motherName = dto.motherName?.trim() || '';
    const motherPhone = dto.motherPhone?.trim() || '';

    if (!fatherName || !fatherPhone || !motherName || !motherPhone) {
      throw new BadRequestException(
        'Father and mother full names and phone numbers are required',
      );
    }

    const idNumber = (dto.idNumber?.trim() || fayedaFields.fcn || '').trim();
    if (!idNumber) {
      throw new BadRequestException('ID number is required');
    }

    const dateOfBirth = fayedaFields.dateOfBirth ?? new Date(dto.dateOfBirth);
    if (Number.isNaN(dateOfBirth.getTime())) {
      throw new BadRequestException('Invalid date of birth');
    }

    const gender = fayedaFields.gender ?? dto.gender;

    const manualStudentId = dto.studentId?.trim();
    if (manualStudentId) {
      await this.assertSchoolStudentIdAvailable(schoolId, manualStudentId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const schoolStudentId =
        manualStudentId || (await this.allocateSchoolStudentId(tx, schoolId));

      const studentEmail =
        dto.email?.toLowerCase().trim() ||
        buildStudentPortalEmail(school.joinCode, schoolStudentId);

      const emailTaken = await tx.user.findUnique({
        where: { email: studentEmail },
      });
      if (emailTaken) {
        throw new ConflictException('Portal login email already in use');
      }

      const studentUser = await tx.user.create({
        data: {
          id: `u_${randomBytes(8).toString('hex')}`,
          schoolId,
          role: UserRole.student,
          username: schoolStudentId,
          email: studentEmail,
          firstName: (fayedaFields.firstName ?? dto.firstName).trim(),
          lastName: (fayedaFields.lastName ?? dto.lastName).trim(),
          externalRef: schoolStudentId,
          passwordHash: hashSync(tempPassword, 10),
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: studentUser.id,
          schoolId,
          gradeId: dto.gradeId,
          sectionId: dto.sectionId ?? null,
          gender,
          middleName:
            fayedaFields.middleName ?? (dto.middleName?.trim() || null),
          dateOfBirth,
          photoUrl:
            fayedaFields.photoUrl ?? (dto.photoUrl?.trim() || null),
          fan: fayedaFields.fan ?? null,
          fcn: idNumber,
          nationality: fayedaFields.nationality ?? null,
          region: fayedaFields.region ?? null,
          zone: fayedaFields.zone ?? null,
          woreda: fayedaFields.woreda ?? null,
          address: dto.address?.trim() || null,
          phone: fayedaFields.phone ?? (dto.phone?.trim() || null),
          fayedaVerifiedAt: fayedaFields.fayedaVerifiedAt ?? null,
          cardCode: await this.allocateCardCode(tx, schoolId),
          portalTempPassword: tempPassword,
        },
      });

      const father = await this.linkParent(
        tx,
        schoolId,
        fatherName,
        fatherPhone,
        profile.id,
        dto.parentEmail,
      );
      const mother = await this.linkParent(
        tx,
        schoolId,
        motherName,
        motherPhone,
        profile.id,
      );

      const welcomeParts: string[] = [];
      if (father.isNew && father.tempPassword) {
        welcomeParts.push(
          `Father — login ${father.phone} · temp password ${father.tempPassword}`,
        );
      }
      if (mother.isNew && mother.tempPassword) {
        welcomeParts.push(
          `Mother — login ${mother.phone} · temp password ${mother.tempPassword}`,
        );
      }

      return {
        student: {
          id: profile.id,
          userId: studentUser.id,
          name: `${studentUser.firstName} ${studentUser.lastName}`,
          grade: grade.name,
          studentId: schoolStudentId,
          idNumber,
        },
        father: {
          id: father.user.id,
          phone: father.user.phone,
          email: father.user.email,
          isNew: father.isNew,
        },
        mother: {
          id: mother.user.id,
          phone: mother.user.phone,
          email: mother.user.email,
          isNew: mother.isNew,
        },
        parent: {
          id: father.user.id,
          phone: father.user.phone,
          email: father.user.email,
          isNew: father.isNew,
        },
        credentials: {
          studentEmail,
          portalUsername: schoolStudentId,
          studentTempPassword: tempPassword,
          parentPhone: father.phone,
          parentTempPassword: father.tempPassword,
          fatherPhone: father.phone,
          fatherTempPassword: father.tempPassword,
          motherPhone: mother.phone,
          motherTempPassword: mother.tempPassword,
          welcomeMessage:
            `Student portal — username ${schoolStudentId} · password ${tempPassword}` +
            (welcomeParts.length > 0 ? ` · ${welcomeParts.join(' · ')}` : ''),
        },
      };
    });

    await this.enrollment.ensureForCurrentYear(
      schoolId,
      result.student.id,
      dto.gradeId,
      dto.sectionId ?? null,
    );

    return result;
  }

  async importRows(schoolId: string, rows: StudentRow[]) {
    const grades = await this.prisma.grade.findMany({
      where: { schoolId },
      include: { sections: true },
    });

    const results: {
      row: number;
      ok: boolean;
      error?: string;
      studentName?: string;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const grade = grades.find(
          (g) => g.name.toLowerCase() === row.gradeName.trim().toLowerCase(),
        );
        if (!grade) {
          throw new Error(`Grade "${row.gradeName}" not found`);
        }

        let sectionId: string | undefined;
        if (row.sectionName?.trim()) {
          const section = grade.sections.find(
            (s) =>
              s.name.toLowerCase() === row.sectionName!.trim().toLowerCase(),
          );
          if (!section) {
            throw new Error(
              `Section "${row.sectionName}" not found in ${grade.name}`,
            );
          }
          sectionId = section.id;
        }

        let gender: Gender | undefined;
        if (row.gender) {
          const g = row.gender.trim().toUpperCase();
          if (g === 'M' || g === 'MALE') gender = Gender.MALE;
          else if (g === 'F' || g === 'FEMALE') gender = Gender.FEMALE;
          else gender = Gender.OTHER;
        }

        await this.create(schoolId, {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          gradeId: grade.id,
          sectionId,
          gender: gender ?? Gender.OTHER,
          ...(row.studentId?.trim() ? { studentId: row.studentId.trim() } : {}),
          idNumber:
            row.idNumber?.trim() ||
            `IMPID-${String(i + 1).padStart(4, '0')}`,
          dateOfBirth: row.dateOfBirth?.trim() || '2010-01-01',
          fatherName: row.parentName.trim(),
          fatherPhone: row.parentPhone.trim(),
          motherName: row.motherName?.trim() || row.parentName.trim(),
          motherPhone: row.motherPhone?.trim() || row.parentPhone.trim(),
          email: row.email,
        });

        results.push({
          row: i + 1,
          ok: true,
          studentName: `${row.firstName} ${row.lastName}`,
        });
      } catch (err) {
        results.push({
          row: i + 1,
          ok: false,
          error: err instanceof Error ? err.message : 'Failed',
        });
      }
    }

    return {
      total: rows.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  parseCsv(buffer: Buffer): StudentRow[] {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('File must include a header row and data');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const col = (names: string[]) => {
      for (const n of names) {
        const i = headers.indexOf(n);
        if (i >= 0) return i;
      }
      return -1;
    };

    const firstIdx = col(['first name', 'firstname', 'student name']);
    const lastIdx = col(['last name', 'lastname']);
    const fullNameIdx = col(['student name', 'name']);
    const gradeIdx = col(['grade']);
    const sectionIdx = col(['section']);
    const genderIdx = col(['gender']);
    const parentNameIdx = col(['parent name', 'parentname']);
    const phoneIdx = col(['phone', 'parent phone', 'parentphone']);

    if (gradeIdx < 0 || parentNameIdx < 0 || phoneIdx < 0) {
      throw new BadRequestException(
        'CSV must include columns: Grade, Parent Name, Phone (and student name)',
      );
    }

    const rows: StudentRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      if (cells.every((c) => !c)) continue;

      let firstName = '';
      let lastName = '';

      if (firstIdx >= 0 && lastIdx >= 0) {
        firstName = cells[firstIdx] ?? '';
        lastName = cells[lastIdx] ?? '';
      } else if (fullNameIdx >= 0) {
        const parts = (cells[fullNameIdx] ?? '').split(/\s+/);
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ') || 'Student';
      } else {
        throw new BadRequestException('Missing student name columns');
      }

      rows.push({
        firstName,
        lastName,
        gender: genderIdx >= 0 ? cells[genderIdx] : undefined,
        gradeName: cells[gradeIdx] ?? '',
        sectionName: sectionIdx >= 0 ? cells[sectionIdx] : undefined,
        parentName: cells[parentNameIdx] ?? '',
        parentPhone: cells[phoneIdx] ?? '',
      });
    }

    return rows;
  }

  async ensureCardCodes(schoolId: string) {
    const missing = await this.prisma.studentProfile.findMany({
      where: { schoolId, cardCode: null },
      select: { id: true },
    });
    let updated = 0;
    for (const row of missing) {
      const code = await this.allocateCardCode(this.prisma, schoolId);
      await this.prisma.studentProfile.update({
        where: { id: row.id },
        data: { cardCode: code },
      });
      updated++;
    }
    return { updated, total: missing.length };
  }

  async getIdCard(schoolId: string, profileId: string) {
    const profile = await this.getOne(schoolId, profileId);
    await this.ensureProfileCardCode(profile, schoolId);
    const school = await this.loadSchoolForCard(schoolId);
    return this.formatIdCardPayload(profile, school);
  }

  async getIdCardByUserId(schoolId: string, userId: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { schoolId, userId },
      include: this.studentInclude,
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    await this.ensureProfileCardCode(profile, schoolId);
    const school = await this.loadSchoolForCard(schoolId);
    return this.formatIdCardPayload(profile, school);
  }

  async getIdCardForParentChild(
    schoolId: string,
    parentUserId: string,
    studentProfileId: string,
  ) {
    const link = await this.prisma.parentStudent.findFirst({
      where: { parentId: parentUserId, studentId: studentProfileId },
    });
    if (!link) {
      throw new NotFoundException('Student not linked to this parent');
    }
    return this.getIdCard(schoolId, studentProfileId);
  }

  private idCardListWhere(
    schoolId: string,
    gradeId?: string,
    sectionId?: string,
  ) {
    return {
      schoolId,
      cardCode: { not: null },
      ...(gradeId ? { gradeId } : {}),
      ...(sectionId ? { sectionId } : {}),
    };
  }

  async countIdCards(schoolId: string, gradeId?: string, sectionId?: string) {
    await this.ensureCardCodes(schoolId);
    return this.prisma.studentProfile.count({
      where: this.idCardListWhere(schoolId, gradeId, sectionId),
    });
  }

  async listIdCards(
    schoolId: string,
    gradeId?: string,
    sectionId?: string,
    skip?: number,
    take?: number,
  ) {
    await this.ensureCardCodes(schoolId);
    const profiles = await this.prisma.studentProfile.findMany({
      where: this.idCardListWhere(schoolId, gradeId, sectionId),
      include: this.studentInclude,
      orderBy: [{ grade: { sortOrder: 'asc' } }, { user: { firstName: 'asc' } }],
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });
    const school = await this.loadSchoolForCard(schoolId);
    return profiles.map((p) => this.formatIdCardPayload(p, school));
  }

  private async loadSchoolForCard(schoolId: string) {
    const [school, currentYear] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          name: true,
          logoUrl: true,
          joinCode: true,
          phone: true,
          address: true,
          email: true,
        },
      }),
      this.enrollment.getCurrentYear(schoolId),
    ]);
    const year = new Date().getFullYear();
    return {
      name: school?.name ?? 'CampusOne',
      logoUrl: school?.logoUrl ?? null,
      joinCode: school?.joinCode ?? '',
      phone: school?.phone ?? null,
      address: school?.address ?? null,
      email: school?.email ?? null,
      academicYearName: currentYear?.name ?? String(year),
    };
  }

  private async ensureProfileCardCode(
    profile: { id: string; cardCode: string | null },
    schoolId: string,
  ) {
    if (profile.cardCode) return;
    const code = await this.allocateCardCode(this.prisma, schoolId);
    await this.prisma.studentProfile.update({
      where: { id: profile.id },
      data: { cardCode: code },
    });
    profile.cardCode = code;
  }

  private formatStudentAddress(profile: {
    address?: string | null;
    woreda?: string | null;
    zone?: string | null;
    region?: string | null;
  }): string | null {
    const manual = profile.address?.trim();
    if (manual) return manual;
    const parts = [profile.woreda, profile.zone, profile.region]
      .map((p) => p?.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  private formatIdCardPayload(
    profile: {
      id: string;
      middleName?: string | null;
      photoUrl?: string | null;
      fan?: string | null;
      fcn?: string | null;
      region?: string | null;
      zone?: string | null;
      woreda?: string | null;
      address?: string | null;
      gender?: Gender | null;
      dateOfBirth?: Date | null;
      phone?: string | null;
      cardCode: string | null;
      user: {
        firstName: string;
        lastName: string;
        externalRef?: string | null;
      };
      grade: { name: string };
      section?: { name: string } | null;
      parents?: {
        parent: { firstName: string; lastName: string; phone: string | null };
      }[];
    },
    school: {
      name: string;
      logoUrl: string | null;
      joinCode: string;
      phone: string | null;
      address: string | null;
      email: string | null;
      academicYearName: string;
    },
  ) {
    const cardCode = profile.cardCode!;
    const name = [
      profile.user.firstName,
      profile.middleName,
      profile.user.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    let age: number | null = null;
    if (profile.dateOfBirth) {
      const dob = new Date(profile.dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
      }
    }

    const year = new Date().getFullYear();
    const father = profile.parents?.[0]?.parent;
    const mother = profile.parents?.[1]?.parent;
    const fatherName = father
      ? `${father.firstName} ${father.lastName}`.trim()
      : null;
    const fatherPhone = father?.phone ?? null;
    const motherName = mother
      ? `${mother.firstName} ${mother.lastName}`.trim()
      : null;
    const motherPhone = mother?.phone ?? null;
    const emergencyName = fatherName ?? motherName;
    const emergencyPhone = fatherPhone ?? motherPhone;

    return {
      studentProfileId: profile.id,
      cardCode,
      scanPayload: buildCardScanPayload(cardCode),
      name,
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      middleName: profile.middleName ?? null,
      photoUrl: profile.photoUrl ?? null,
      grade: profile.grade.name,
      section: profile.section?.name ?? null,
      studentId: profile.user.externalRef ?? null,
      fan: profile.fan?.trim() || profile.fcn?.trim() || null,
      address: this.formatStudentAddress(profile),
      gender: profile.gender ?? null,
      dateOfBirth: profile.dateOfBirth ?? null,
      age,
      phone: profile.phone ?? null,
      schoolName: school.name,
      schoolLogoUrl: school.logoUrl,
      schoolJoinCode: school.joinCode,
      schoolPhone: school.phone,
      schoolAddress: school.address,
      schoolEmail: school.email,
      validThrough: `${year}–${year + 1}`,
      academicYear: school.academicYearName,
      issuedAt: new Date().toISOString(),
      fatherName,
      fatherPhone,
      motherName,
      motherPhone,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
    };
  }

  private async assertSchoolStudentIdAvailable(
    schoolId: string,
    studentId: string,
    excludeUserId?: string,
  ): Promise<void> {
    const clash = await this.prisma.user.findFirst({
      where: {
        schoolId,
        externalRef: studentId,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    if (clash) {
      throw new ConflictException('Student ID already in use at this school');
    }
  }

  private async allocateSchoolStudentId(
    db: Pick<PrismaService, 'user'>,
    schoolId: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate = generateSchoolStudentId();
      const clash = await db.user.findFirst({
        where: { schoolId, externalRef: candidate },
      });
      if (!clash) return candidate;
    }

    throw new ConflictException('Could not allocate student ID');
  }

  private async allocateCardCode(
    db: Pick<PrismaService, 'studentProfile'>,
    schoolId: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const cardCode = generateStudentCardCode();
      const existing = await db.studentProfile.findFirst({
        where: { schoolId, cardCode },
      });
      if (!existing) {
        return cardCode;
      }
    }
    throw new ConflictException('Could not generate student card code');
  }

  private assertValidPhotoUrl(url: string | null) {
    if (!url) return;
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image/') && trimmed.length > 3_000_000) {
      throw new BadRequestException('Photo file is too large (max 2 MB)');
    }
  }

  private async updateParentLink(
    tx: Pick<PrismaService, 'user' | 'parentStudent' | 'school'>,
    profile: Awaited<ReturnType<StudentsService['getOne']>>,
    index: number,
    fullName: string | undefined,
    phone: string | undefined,
    schoolId: string,
    studentProfileId: string,
  ) {
    const name = fullName?.trim();
    const phoneRaw = phone?.trim();
    if (!name || !phoneRaw) return;

    const normalizedPhone = this.normalizePhone(phoneRaw);
    const link = profile.parents[index];

    if (!link) {
      await this.linkParent(tx, schoolId, name, phoneRaw, studentProfileId);
      return;
    }

    const parent = link.parent;
    const currentName = `${parent.firstName} ${parent.lastName}`.trim();
    const nameChanged = currentName !== name;
    const phoneChanged = (parent.phone ?? '') !== normalizedPhone;
    if (!nameChanged && !phoneChanged) return;

    if (phoneChanged) {
      await this.unlinkParentFromStudent(
        tx,
        link.parentId,
        studentProfileId,
      );
      await this.linkParent(tx, schoolId, name, phoneRaw, studentProfileId);
      return;
    }

    const [first, ...rest] = name.split(/\s+/);
    await tx.user.update({
      where: { id: link.parentId },
      data: {
        firstName: first || parent.firstName,
        lastName: rest.join(' ') || parent.lastName || 'Parent',
      },
    });
  }

  private async unlinkParentFromStudent(
    tx: Pick<PrismaService, 'parentStudent'>,
    parentId: string,
    studentProfileId: string,
  ) {
    await tx.parentStudent.delete({
      where: {
        parentId_studentId: { parentId, studentId: studentProfileId },
      },
    });
  }

  private async linkParent(
    tx: Pick<PrismaService, 'user' | 'parentStudent' | 'school'>,
    schoolId: string,
    fullName: string,
    phone: string,
    studentProfileId: string,
    emailOverride?: string,
  ) {
    const school = await tx.school.findUnique({
      where: { id: schoolId },
      select: { joinCode: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const normalizedPhone = this.normalizePhone(phone);
    const [first, ...rest] = fullName.trim().split(/\s+/);
    const lastName = rest.join(' ') || 'Parent';

    let user = await tx.user.findFirst({
      where: { schoolId, phone: normalizedPhone, role: UserRole.parent },
    });

    let tempPassword: string | null = null;

    if (!user) {
      await this.subscriptionsService.assertCanAddUser(
        schoolId,
        UserRole.parent,
      );
      tempPassword = this.generateTempPassword();
      const parentUsername = `p${normalizedPhone.replace(/\D/g, '').slice(-12) || randomBytes(4).toString('hex')}`;
      const email =
        emailOverride?.toLowerCase().trim() ||
        buildParentContactEmail(school.joinCode, parentUsername);
      user = await tx.user.create({
        data: {
          id: `u_${randomBytes(8).toString('hex')}`,
          schoolId,
          role: UserRole.parent,
          username: parentUsername,
          email,
          phone: normalizedPhone,
          firstName: first,
          lastName,
          passwordHash: hashSync(tempPassword, 10),
        },
      });
    } else {
      const email =
        isLegacyParentContactEmail(user.email)
          ? buildParentContactEmail(school.joinCode, user.username)
          : undefined;
      await tx.user.update({
        where: { id: user.id },
        data: {
          firstName: first,
          lastName,
          ...(email ? { email } : {}),
        },
      });
    }

    const existingLink = await tx.parentStudent.findFirst({
      where: { parentId: user.id, studentId: studentProfileId },
    });
    if (!existingLink) {
      await tx.parentStudent.create({
        data: {
          parentId: user.id,
          studentId: studentProfileId,
        },
      });
    }

    return {
      user,
      phone: normalizedPhone,
      isNew: tempPassword !== null,
      tempPassword,
    };
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\s/g, '').trim();
  }

  private generateTempPassword() {
    return `Co${randomBytes(3).toString('hex')}!`;
  }
}
