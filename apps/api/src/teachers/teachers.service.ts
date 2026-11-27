import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  Gender,
  ResultWorkflowStatus,
  StudentRecordStatus,
  TeacherPhotoReviewStatus,
  UserRole,
} from '@prisma/client';
import { hashSync } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import {
  AdminSetTeacherPhotoDto,
  ReviewTeacherPhotoDto,
  SubmitTeacherPhotoDto,
} from './dto/teacher-photo.dto';
import {
  buildTeacherCardScanPayload,
  generateSchoolTeacherId,
  generateTeacherCardCode,
} from './staff-card.util';

function ageFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async list(schoolId: string, group?: 'teachers' | 'staff') {
    const roleFilter =
      group === 'teachers'
        ? UserRole.teacher
        : group === 'staff'
          ? { in: [UserRole.admin, UserRole.staff] as UserRole[] }
          : { in: [UserRole.admin, UserRole.staff, UserRole.teacher] };

    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        roleTemplateId: { not: null },
        role: roleFilter,
      },
      include: {
        roleTemplate: true,
        teacherProfile: {
          include: {
            homeroomGrade: { select: { id: true, name: true } },
            homeroomSection: { select: { id: true, name: true } },
            assignments: {
              include: {
                grade: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });

    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });
    const teacherUserIds = users
      .filter((u) => u.role === UserRole.teacher)
      .map((u) => u.id);
    const teachingByUser = await this.loadTeachingSlotsBatch(
      schoolId,
      teacherUserIds,
      currentYear?.id,
    );

    return users.map((u) =>
      this.formatStaff(u, teachingByUser.get(u.id) ?? []),
    );
  }

  async listGradesForSchool(schoolId: string) {
    return this.prisma.grade.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
      include: {
        sections: { orderBy: { name: 'asc' } },
        _count: { select: { students: true } },
      },
    });
  }

  async getMe(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
      include: {
        roleTemplate: true,
        teacherProfile: {
          include: {
            homeroomGrade: { select: { id: true, name: true } },
            homeroomSection: { select: { id: true, name: true } },
            assignments: {
              include: {
                grade: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const teachingSlots = await this.loadTeachingSlots(schoolId, user.id);
    return this.formatStaff(user, teachingSlots, { includePendingPhoto: true });
  }

  async create(schoolId: string, dto: CreateTeacherDto) {
    const template = await this.prisma.roleTemplate.findFirst({
      where: { schoolId, slug: dto.roleTemplateSlug },
    });
    if (!template) {
      throw new BadRequestException('Unknown role template');
    }

    const teacherId = await this.allocateTeacherId(schoolId);
    const user = await this.usersService.createUser({
      username: teacherId,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: template.portalRole,
      schoolId,
      roleTemplateId: template.id,
      externalRef: teacherId,
    });

    if (template.portalRole === UserRole.teacher) {
      const profile = await this.prisma.teacherProfile.update({
        where: { userId: user.id },
        data: {
          homeroomGradeId: dto.homeroomGradeId ?? null,
          homeroomSectionId: dto.homeroomSectionId ?? null,
          gender: dto.gender ?? null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          bloodType: dto.bloodType?.trim() || null,
          address: dto.address?.trim() || null,
          emergencyContactName: dto.emergencyContactName?.trim() || null,
          emergencyContactPhone: dto.emergencyContactPhone?.trim() || null,
        },
      });

      if (dto.homeroomGradeId) {
        await this.prisma.teacherAssignment.create({
          data: {
            teacherProfileId: profile.id,
            schoolId,
            gradeId: dto.homeroomGradeId,
            sectionId: dto.homeroomSectionId ?? null,
            isHomeroom: true,
          },
        });
      }
    }

    return this.getByUserId(schoolId, user.id);
  }

  async update(schoolId: string, userId: string, dto: UpdateTeacherDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
      include: { teacherProfile: true, roleTemplate: true },
    });
    if (!user) {
      throw new NotFoundException('Staff member not found');
    }

    const accountTouched =
      dto.firstName !== undefined ||
      dto.lastName !== undefined ||
      dto.email !== undefined ||
      dto.password !== undefined ||
      dto.roleTemplateSlug !== undefined ||
      dto.phone !== undefined;

    if (accountTouched) {
      const data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        passwordHash?: string;
        roleTemplateId?: string;
        role?: UserRole;
        phone?: string | null;
      } = {};
      if (dto.firstName !== undefined) {
        const firstName = dto.firstName.trim();
        if (!firstName) throw new BadRequestException('First name is required');
        data.firstName = firstName;
      }
      if (dto.lastName !== undefined) {
        const lastName = dto.lastName.trim();
        if (!lastName) throw new BadRequestException('Last name is required');
        data.lastName = lastName;
      }
      if (dto.email !== undefined) {
        data.email = await this.usersService.assertEmailAvailable(
          dto.email,
          userId,
        );
      }
      if (dto.password?.trim()) {
        data.passwordHash = hashSync(dto.password.trim(), 10);
      }
      if (dto.roleTemplateSlug) {
        const template = await this.prisma.roleTemplate.findFirst({
          where: { schoolId, slug: dto.roleTemplateSlug },
        });
        if (!template) {
          throw new BadRequestException('Unknown role template');
        }
        data.roleTemplateId = template.id;
        data.role = template.portalRole;
      }
      if (dto.phone !== undefined) {
        data.phone = dto.phone?.trim() || null;
      }
      await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    }

    let profile = user.teacherProfile;
    if (!profile && user.role === UserRole.teacher) {
      profile = await this.prisma.teacherProfile.create({
        data: { userId, schoolId },
      });
    }

    if (profile) {
      const profileData: {
        homeroomGradeId?: string | null;
        homeroomSectionId?: string | null;
        gender?: Gender | null;
        dateOfBirth?: Date | null;
        bloodType?: string | null;
        address?: string | null;
        emergencyContactName?: string | null;
        emergencyContactPhone?: string | null;
      } = {};
      if (dto.homeroomGradeId !== undefined || dto.homeroomSectionId !== undefined) {
        profileData.homeroomGradeId = dto.homeroomGradeId ?? null;
        profileData.homeroomSectionId = dto.homeroomSectionId ?? null;
      }
      if (dto.gender !== undefined) profileData.gender = dto.gender;
      if (dto.dateOfBirth !== undefined) {
        profileData.dateOfBirth = dto.dateOfBirth
          ? new Date(dto.dateOfBirth)
          : null;
      }
      if (dto.bloodType !== undefined) {
        profileData.bloodType = dto.bloodType?.trim() || null;
      }
      if (dto.address !== undefined) {
        profileData.address = dto.address?.trim() || null;
      }
      if (dto.emergencyContactName !== undefined) {
        profileData.emergencyContactName =
          dto.emergencyContactName?.trim() || null;
      }
      if (dto.emergencyContactPhone !== undefined) {
        profileData.emergencyContactPhone =
          dto.emergencyContactPhone?.trim() || null;
      }
      if (Object.keys(profileData).length > 0) {
        await this.prisma.teacherProfile.update({
          where: { id: profile.id },
          data: profileData,
        });
      }
      if (
        dto.homeroomGradeId !== undefined ||
        dto.homeroomSectionId !== undefined
      ) {
        await this.syncHomeroomAssignment(
          profile.id,
          schoolId,
          profileData.homeroomGradeId ?? profile.homeroomGradeId,
          profileData.homeroomSectionId ?? profile.homeroomSectionId,
        );
      }
    }

    if (profile && dto.assignments) {
      await this.prisma.teacherAssignment.deleteMany({
        where: { teacherProfileId: profile.id, isHomeroom: false },
      });
      for (const a of dto.assignments.filter((x) => !x.isHomeroom)) {
        await this.prisma.teacherAssignment.create({
          data: {
            teacherProfileId: profile.id,
            schoolId,
            gradeId: a.gradeId,
            sectionId: a.sectionId ?? null,
            subjectId: a.subjectId ?? null,
            isHomeroom: false,
          },
        });
      }
    }

    return this.getByUserId(schoolId, userId);
  }

  async remove(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, role: UserRole.teacher },
    });
    if (!user) {
      throw new NotFoundException('Teacher not found');
    }

    const [classwork, attendance, announcements, behavior, resultsUpdated] =
      await Promise.all([
        this.prisma.classworkAssignment.count({
          where: { schoolId, createdByUserId: userId },
        }),
        this.prisma.attendanceRecord.count({
          where: { schoolId, recordedBy: userId },
        }),
        this.prisma.announcement.count({
          where: { schoolId, createdBy: userId },
        }),
        this.prisma.behaviorRecord.count({
          where: { schoolId, recordedById: userId },
        }),
        this.prisma.resultRecord.count({
          where: { schoolId, updatedBy: userId },
        }),
      ]);

    const blockers: string[] = [];
    if (classwork > 0) blockers.push('classwork they created');
    if (attendance > 0) blockers.push('attendance records');
    if (announcements > 0) blockers.push('announcements');
    if (behavior > 0) blockers.push('behavior records');
    if (resultsUpdated > 0) blockers.push('score entries');

    if (blockers.length > 0) {
      throw new BadRequestException(
        `Cannot remove this teacher yet — they still have ${blockers.join(', ')}. Unassign their classes first if needed.`,
      );
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return { removed: true, userId };
  }

  async getByUserId(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
      include: {
        roleTemplate: true,
        teacherProfile: {
          include: {
            homeroomGrade: { select: { id: true, name: true } },
            homeroomSection: { select: { id: true, name: true } },
            assignments: {
              include: {
                grade: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Staff member not found');
    }
    const teachingSlots = await this.loadTeachingSlots(schoolId, user.id);
    return this.formatStaff(user, teachingSlots, { includePendingPhoto: true });
  }

  async submitMyPhoto(
    schoolId: string,
    userId: string,
    dto: SubmitTeacherPhotoDto,
  ) {
    this.assertValidPhotoUrl(dto.photoUrl);
    const profile = await this.prisma.teacherProfile.findFirst({
      where: { userId, schoolId },
    });
    if (!profile) throw new NotFoundException('Teacher profile not found');

    const updated = await this.prisma.teacherProfile.update({
      where: { id: profile.id },
      data: {
        pendingPhotoUrl: dto.photoUrl.trim(),
        photoReviewStatus: TeacherPhotoReviewStatus.PENDING,
        photoSubmittedAt: new Date(),
        photoReviewedAt: null,
        photoReviewedById: null,
        photoReviewNote: null,
      },
    });

    return this.photoStatusPayload(updated);
  }

  async cancelMyPendingPhoto(schoolId: string, userId: string) {
    const profile = await this.prisma.teacherProfile.findFirst({
      where: { userId, schoolId },
    });
    if (!profile) throw new NotFoundException('Teacher profile not found');
    if (profile.photoReviewStatus !== TeacherPhotoReviewStatus.PENDING) {
      throw new BadRequestException('No pending photo to cancel');
    }

    const updated = await this.prisma.teacherProfile.update({
      where: { id: profile.id },
      data: {
        pendingPhotoUrl: null,
        photoReviewStatus: TeacherPhotoReviewStatus.NONE,
        photoSubmittedAt: null,
        photoReviewNote: null,
      },
    });

    return this.photoStatusPayload(updated);
  }

  async listPendingPhotoRequests(schoolId: string) {
    const rows = await this.prisma.teacherProfile.findMany({
      where: {
        schoolId,
        photoReviewStatus: TeacherPhotoReviewStatus.PENDING,
        pendingPhotoUrl: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            externalRef: true,
          },
        },
      },
      orderBy: { photoSubmittedAt: 'asc' },
    });

    return rows.map((p) => ({
      userId: p.user.id,
      teacherId: p.user.externalRef,
      name: `${p.user.firstName} ${p.user.lastName}`.trim(),
      email: p.user.email,
      photoUrl: p.photoUrl,
      pendingPhotoUrl: p.pendingPhotoUrl,
      photoSubmittedAt: p.photoSubmittedAt?.toISOString() ?? null,
    }));
  }

  async reviewPhoto(
    schoolId: string,
    teacherUserId: string,
    reviewerId: string,
    dto: ReviewTeacherPhotoDto,
  ) {
    const profile = await this.prisma.teacherProfile.findFirst({
      where: { userId: teacherUserId, schoolId },
    });
    if (!profile) throw new NotFoundException('Teacher profile not found');
    if (
      profile.photoReviewStatus !== TeacherPhotoReviewStatus.PENDING ||
      !profile.pendingPhotoUrl
    ) {
      throw new BadRequestException('No pending photo to review');
    }

    if (dto.action === 'approve') {
      await this.prisma.teacherProfile.update({
        where: { id: profile.id },
        data: {
          photoUrl: profile.pendingPhotoUrl,
          pendingPhotoUrl: null,
          photoReviewStatus: TeacherPhotoReviewStatus.NONE,
          photoReviewedAt: new Date(),
          photoReviewedById: reviewerId,
          photoReviewNote: dto.note?.trim() || null,
          photoSubmittedAt: null,
        },
      });
    } else {
      await this.prisma.teacherProfile.update({
        where: { id: profile.id },
        data: {
          pendingPhotoUrl: null,
          photoReviewStatus: TeacherPhotoReviewStatus.REJECTED,
          photoReviewedAt: new Date(),
          photoReviewedById: reviewerId,
          photoReviewNote: dto.note?.trim() || 'Photo rejected',
          photoSubmittedAt: null,
        },
      });
    }

    return this.getByUserId(schoolId, teacherUserId);
  }

  /** Admin/staff sets the published ID photo immediately (skips pending review). */
  async adminSetPhoto(
    schoolId: string,
    targetUserId: string,
    adminId: string,
    dto: AdminSetTeacherPhotoDto,
  ) {
    this.assertValidPhotoUrl(dto.photoUrl);
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, schoolId },
      include: { teacherProfile: true },
    });
    if (!user) throw new NotFoundException('Staff member not found');

    let profile = user.teacherProfile;
    if (!profile) {
      profile = await this.prisma.teacherProfile.create({
        data: { userId: targetUserId, schoolId },
      });
    }

    await this.prisma.teacherProfile.update({
      where: { id: profile.id },
      data: {
        photoUrl: dto.photoUrl.trim(),
        pendingPhotoUrl: null,
        photoReviewStatus: TeacherPhotoReviewStatus.NONE,
        photoSubmittedAt: null,
        photoReviewedAt: new Date(),
        photoReviewedById: adminId,
        photoReviewNote: null,
      },
    });

    return this.getByUserId(schoolId, targetUserId);
  }

  async adminClearPhoto(schoolId: string, targetUserId: string) {
    const profile = await this.prisma.teacherProfile.findFirst({
      where: { userId: targetUserId, schoolId },
    });
    if (!profile) throw new NotFoundException('Staff member not found');

    await this.prisma.teacherProfile.update({
      where: { id: profile.id },
      data: {
        photoUrl: null,
        pendingPhotoUrl: null,
        photoReviewStatus: TeacherPhotoReviewStatus.NONE,
        photoSubmittedAt: null,
        photoReviewedAt: null,
        photoReviewedById: null,
        photoReviewNote: null,
      },
    });

    return this.getByUserId(schoolId, targetUserId);
  }

  private assertValidPhotoUrl(url: string | null) {
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed.startsWith('data:image/')) {
      throw new BadRequestException('Photo must be an image upload');
    }
    if (trimmed.length > 3_000_000) {
      throw new BadRequestException('Photo file is too large (max 2 MB)');
    }
  }

  private photoStatusPayload(profile: {
    photoUrl: string | null;
    pendingPhotoUrl: string | null;
    photoReviewStatus: TeacherPhotoReviewStatus;
    photoSubmittedAt: Date | null;
    photoReviewedAt: Date | null;
    photoReviewNote: string | null;
  }) {
    return {
      photoUrl: profile.photoUrl,
      pendingPhotoUrl: profile.pendingPhotoUrl,
      photoReviewStatus: profile.photoReviewStatus,
      photoSubmittedAt: profile.photoSubmittedAt?.toISOString() ?? null,
      photoReviewedAt: profile.photoReviewedAt?.toISOString() ?? null,
      photoReviewNote: profile.photoReviewNote,
      hasPendingPhoto:
        profile.photoReviewStatus === TeacherPhotoReviewStatus.PENDING &&
        !!profile.pendingPhotoUrl,
    };
  }

  private async loadTeachingSlotsBatch(
    schoolId: string,
    userIds: string[],
    academicYearId?: string,
  ) {
    const teachingByUser = new Map<
      string,
      { gradeName: string; sectionName: string | null; subjectName: string }[]
    >();
    if (userIds.length === 0) return teachingByUser;

    const slots = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        teacherId: { in: userIds },
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        subject: { select: { name: true } },
        grade: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: [{ grade: { sortOrder: 'asc' } }, { subject: { name: 'asc' } }],
    });
    for (const cs of slots) {
      if (!cs.teacherId) continue;
      const list = teachingByUser.get(cs.teacherId) ?? [];
      list.push({
        gradeName: cs.grade.name,
        sectionName: cs.section?.name ?? null,
        subjectName: cs.subject.name,
      });
      teachingByUser.set(cs.teacherId, list);
    }
    return teachingByUser;
  }

  private async loadTeachingSlots(schoolId: string, userId: string) {
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });
    const map = await this.loadTeachingSlotsBatch(
      schoolId,
      [userId],
      currentYear?.id,
    );
    return map.get(userId) ?? [];
  }

  private async syncHomeroomAssignment(
    profileId: string,
    schoolId: string,
    gradeId: string | null,
    sectionId: string | null,
  ) {
    await this.prisma.teacherAssignment.deleteMany({
      where: { teacherProfileId: profileId, isHomeroom: true },
    });
    if (gradeId) {
      await this.prisma.teacherAssignment.create({
        data: {
          teacherProfileId: profileId,
          schoolId,
          gradeId,
          sectionId,
          isHomeroom: true,
        },
      });
    }
  }

  async ensureTeacherIdsAndCards(schoolId: string) {
    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: UserRole.teacher },
      include: { teacherProfile: true },
    });
    let idsUpdated = 0;
    let cardsUpdated = 0;
    for (const u of teachers) {
      if (!u.externalRef) {
        const teacherId = await this.allocateTeacherId(schoolId);
        await this.prisma.user.update({
          where: { id: u.id },
          data: { externalRef: teacherId },
        });
        idsUpdated++;
      }
      if (u.teacherProfile && !u.teacherProfile.cardCode) {
        const cardCode = await this.allocateTeacherCardCode(schoolId);
        await this.prisma.teacherProfile.update({
          where: { id: u.teacherProfile.id },
          data: { cardCode },
        });
        cardsUpdated++;
      }
    }
    return { idsUpdated, cardsUpdated, total: teachers.length };
  }

  async getTeacherIdCard(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, role: UserRole.teacher },
      include: {
        roleTemplate: true,
        teacherProfile: {
          include: {
            homeroomGrade: { select: { name: true } },
            homeroomSection: { select: { name: true } },
          },
        },
      },
    });
    if (!user?.teacherProfile) {
      throw new NotFoundException('Teacher not found');
    }
    const profile = user.teacherProfile;
    if (!user.externalRef) {
      const teacherId = await this.allocateTeacherId(schoolId);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { externalRef: teacherId },
      });
      user.externalRef = teacherId;
    }
    await this.ensureTeacherProfileCardCode(profile, schoolId);
    const school = await this.loadSchoolForCard(schoolId);
    return this.formatTeacherIdCard(
      { ...user, teacherProfile: profile },
      school,
    );
  }

  async listTeacherIdCards(schoolId: string) {
    await this.ensureTeacherIdsAndCards(schoolId);
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: UserRole.teacher,
        teacherProfile: { cardCode: { not: null } },
      },
      include: {
        roleTemplate: true,
        teacherProfile: {
          include: {
            homeroomGrade: { select: { name: true } },
            homeroomSection: { select: { name: true } },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    const school = await this.loadSchoolForCard(schoolId);
    return users
      .filter(
        (
          u,
        ): u is typeof u & {
          teacherProfile: NonNullable<typeof u.teacherProfile>;
        } => !!u.teacherProfile?.cardCode,
      )
      .map((u) => this.formatTeacherIdCard(u, school));
  }

  private async loadSchoolForCard(schoolId: string) {
    const [school, currentYear, idCardShowStamp] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          name: true,
          logoUrl: true,
          authorizedSignatureUrl: true,
          authorizedSignatureLabel: true,
          stampUrl: true,
          joinCode: true,
          phone: true,
          address: true,
          postalBox: true,
          email: true,
          primaryColor: true,
          accentColor: true,
          accentDeep: true,
          reportCardTagline: true,
        },
      }),
      this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { name: true },
      }),
      this.readIdCardShowStamp(schoolId),
    ]);
    const year = new Date().getFullYear();
    return {
      name: school?.name ?? 'Chora',
      logoUrl: school?.logoUrl ?? null,
      authorizedSignatureUrl: school?.authorizedSignatureUrl ?? null,
      authorizedSignatureLabel: school?.authorizedSignatureLabel ?? null,
      stampUrl: school?.stampUrl ?? null,
      idCardShowStamp,
      joinCode: school?.joinCode ?? '',
      phone: school?.phone ?? null,
      address: school?.address ?? null,
      postalBox: school?.postalBox ?? null,
      email: school?.email ?? null,
      primaryColor: school?.primaryColor ?? null,
      accentColor: school?.accentColor ?? null,
      accentDeep: school?.accentDeep ?? null,
      reportCardTagline: school?.reportCardTagline ?? null,
      academicYearName: currentYear?.name ?? String(year),
    };
  }

  /** Defaults off; tolerates DB before the idCardShowStamp migration. */
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

  private formatTeacherIdCard(
    user: {
      id: string;
      email: string;
      phone: string | null;
      firstName: string;
      lastName: string;
      externalRef: string | null;
      roleTemplate: { name: string } | null;
      teacherProfile: {
        id: string;
        photoUrl: string | null;
        pendingPhotoUrl: string | null;
        photoReviewStatus: TeacherPhotoReviewStatus;
        photoSubmittedAt: Date | null;
        photoReviewedAt: Date | null;
        photoReviewNote: string | null;
        cardCode: string | null;
        gender: Gender | null;
        dateOfBirth: Date | null;
        bloodType: string | null;
        address: string | null;
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        homeroomGrade: { name: string } | null;
        homeroomSection: { name: string } | null;
      };
    },
    school: {
      name: string;
      logoUrl: string | null;
      authorizedSignatureUrl: string | null;
      authorizedSignatureLabel: string | null;
      stampUrl: string | null;
      idCardShowStamp: boolean;
      joinCode: string;
      phone: string | null;
      address: string | null;
      postalBox: string | null;
      email: string | null;
      primaryColor: string | null;
      accentColor: string | null;
      accentDeep: string | null;
      reportCardTagline: string | null;
      academicYearName: string;
    },
  ) {
    const cardCode = user.teacherProfile.cardCode!;
    const profile = user.teacherProfile;
    const homeroom =
      profile.homeroomGrade != null
        ? `${profile.homeroomGrade.name}${
            profile.homeroomSection ? ` · ${profile.homeroomSection.name}` : ''
          }`
        : null;
    const schoolMotto = school.reportCardTagline?.trim() || null;
    const dob = profile.dateOfBirth;
    return {
      teacherProfileId: profile.id,
      userId: user.id,
      cardCode,
      scanPayload: buildTeacherCardScanPayload(cardCode),
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: profile.photoUrl,
      pendingPhotoUrl: profile.pendingPhotoUrl,
      photoReviewStatus: profile.photoReviewStatus,
      photoSubmittedAt: profile.photoSubmittedAt?.toISOString() ?? null,
      photoReviewedAt: profile.photoReviewedAt?.toISOString() ?? null,
      photoReviewNote: profile.photoReviewNote,
      hasPendingPhoto:
        profile.photoReviewStatus === TeacherPhotoReviewStatus.PENDING &&
        !!profile.pendingPhotoUrl,
      teacherId: user.externalRef,
      email: user.email,
      phone: user.phone,
      gender: profile.gender,
      dateOfBirth: dob ? dob.toISOString().slice(0, 10) : null,
      age: ageFromDob(dob),
      bloodType: profile.bloodType,
      address: profile.address,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      roleLabel: user.roleTemplate?.name ?? 'Teacher',
      homeroom,
      schoolName: school.name,
      schoolLogoUrl: school.logoUrl,
      schoolSignatureUrl: school.authorizedSignatureUrl,
      schoolSignatureLabel: school.authorizedSignatureLabel,
      schoolStampUrl: school.idCardShowStamp ? school.stampUrl : null,
      schoolMotto,
      schoolJoinCode: school.joinCode,
      schoolPhone: school.phone,
      schoolAddress: school.address,
      schoolPostalBox: school.postalBox,
      schoolEmail: school.email,
      schoolPrimaryColor: school.primaryColor,
      schoolAccentColor: school.accentColor,
      schoolAccentDeep: school.accentDeep,
      academicYear: school.academicYearName,
      issuedAt: new Date().toISOString(),
      validThrough: `${school.academicYearName}`,
    };
  }

  private async ensureTeacherProfileCardCode(
    profile: { id: string; cardCode: string | null },
    schoolId: string,
  ) {
    if (profile.cardCode) return;
    const cardCode = await this.allocateTeacherCardCode(schoolId);
    await this.prisma.teacherProfile.update({
      where: { id: profile.id },
      data: { cardCode },
    });
    profile.cardCode = cardCode;
  }

  private async allocateTeacherId(schoolId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = generateSchoolTeacherId();
      const exists = await this.prisma.user.findFirst({
        where: { schoolId, externalRef: candidate },
      });
      if (!exists) return candidate;
    }
    throw new BadRequestException('Could not allocate teacher ID');
  }

  private async allocateTeacherCardCode(schoolId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = generateTeacherCardCode();
      const exists = await this.prisma.teacherProfile.findFirst({
        where: { schoolId, cardCode: candidate },
      });
      if (!exists) return candidate;
    }
    throw new BadRequestException('Could not allocate teacher card code');
  }

  private formatStaff(
    user: {
      id: string;
      email: string;
      phone?: string | null;
      externalRef?: string | null;
      firstName: string;
      lastName: string;
      role: string;
      roleTemplate: { slug: string; name: string } | null;
      teacherProfile: {
        id: string;
        photoUrl?: string | null;
        pendingPhotoUrl?: string | null;
        photoReviewStatus?: TeacherPhotoReviewStatus | null;
        photoSubmittedAt?: Date | null;
        photoReviewedAt?: Date | null;
        photoReviewNote?: string | null;
        cardCode?: string | null;
        gender?: Gender | null;
        dateOfBirth?: Date | null;
        bloodType?: string | null;
        address?: string | null;
        emergencyContactName?: string | null;
        emergencyContactPhone?: string | null;
        homeroomGrade: { id: string; name: string } | null;
        homeroomSection: { id: string; name: string } | null;
        assignments: {
          id: string;
          gradeId: string;
          sectionId: string | null;
          subjectId: string | null;
          isHomeroom: boolean;
          grade: { id: string; name: string };
          section: { id: string; name: string } | null;
          subject: { id: string; name: string; code: string } | null;
        }[];
      } | null;
    },
    teachingSlots: {
      gradeName: string;
      sectionName: string | null;
      subjectName: string;
    }[] = [],
    opts: { includePendingPhoto?: boolean } = {},
  ) {
    const p = user.teacherProfile;
    const dob = p?.dateOfBirth ?? null;
    const status = p?.photoReviewStatus ?? TeacherPhotoReviewStatus.NONE;
    const hasPending =
      status === TeacherPhotoReviewStatus.PENDING && !!p?.pendingPhotoUrl;
    return {
      userId: user.id,
      email: user.email,
      phone: user.phone ?? null,
      teacherId: user.externalRef ?? null,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      portalRole: user.role,
      roleTemplateSlug: user.roleTemplate?.slug ?? null,
      roleTemplateName: user.roleTemplate?.name ?? null,
      photoUrl: p?.photoUrl ?? null,
      pendingPhotoUrl: opts.includePendingPhoto
        ? (p?.pendingPhotoUrl ?? null)
        : null,
      photoReviewStatus: status,
      photoSubmittedAt: p?.photoSubmittedAt?.toISOString() ?? null,
      photoReviewedAt: p?.photoReviewedAt?.toISOString() ?? null,
      photoReviewNote: p?.photoReviewNote ?? null,
      hasPendingPhoto: hasPending,
      gender: p?.gender ?? null,
      dateOfBirth: dob ? dob.toISOString().slice(0, 10) : null,
      bloodType: p?.bloodType ?? null,
      address: p?.address ?? null,
      emergencyContactName: p?.emergencyContactName ?? null,
      emergencyContactPhone: p?.emergencyContactPhone ?? null,
      canTakeAttendance: !!p?.homeroomGrade,
      homeroom: p?.homeroomGrade
        ? {
            gradeId: p.homeroomGrade.id,
            gradeName: p.homeroomGrade.name,
            sectionId: p.homeroomSection?.id ?? null,
            sectionName: p.homeroomSection?.name ?? null,
          }
        : null,
      assignments: (p?.assignments ?? []).map((a) => ({
        id: a.id,
        gradeId: a.gradeId,
        gradeName: a.grade.name,
        sectionId: a.sectionId,
        sectionName: a.section?.name ?? null,
        subjectId: a.subjectId,
        subjectName: a.subject?.name ?? null,
        isHomeroom: a.isHomeroom,
      })),
      teachingSlots,
    };
  }

  async listHomeroomStudents(schoolId: string, teacherUserId: string) {
    const profile = await this.requireHomeroomProfile(schoolId, teacherUserId);
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        gradeId: profile.homeroomGradeId!,
        ...(profile.homeroomSectionId
          ? { sectionId: profile.homeroomSectionId }
          : {}),
        status: StudentRecordStatus.ACTIVE,
      },
      select: {
        id: true,
        photoUrl: true,
        phone: true,
        cardCode: true,
        homeroomGroup: true,
        gender: true,
        dateOfBirth: true,
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            externalRef: true,
          },
        },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    since.setUTCHours(0, 0, 0, 0);
    const ids = students.map((s) => s.id);

    const empty = ids.length === 0;
    const [attendanceRows, scoreRows, classworkRows, libraryRows, behaviorRows] =
      await Promise.all([
        empty
          ? Promise.resolve([])
          : this.prisma.attendanceRecord.findMany({
              where: {
                schoolId,
                periodNumber: 0,
                date: { gte: since },
                studentProfileId: { in: ids },
              },
              select: {
                studentProfileId: true,
                status: true,
              },
            }),
        empty
          ? Promise.resolve([])
          : this.prisma.studentAssessmentScore.findMany({
              where: {
                studentProfileId: { in: ids },
                assessment: {
                  schoolId,
                  classSubject: {
                    termSheets: {
                      some: { status: ResultWorkflowStatus.PUBLISHED },
                    },
                  },
                },
              },
              select: {
                studentProfileId: true,
                score: true,
                assessment: {
                  select: {
                    maxScore: true,
                    termId: true,
                    classSubjectId: true,
                  },
                },
              },
              take: 5000,
            }),
        empty
          ? Promise.resolve([])
          : this.prisma.classworkSubmission.findMany({
              where: { studentProfileId: { in: ids } },
              select: {
                studentProfileId: true,
                status: true,
                score: true,
              },
            }),
        empty
          ? Promise.resolve([])
          : this.prisma.libraryReadingProgress.findMany({
              where: { studentProfileId: { in: ids } },
              select: {
                studentProfileId: true,
                progressPercent: true,
              },
            }),
        empty
          ? Promise.resolve([])
          : this.prisma.behaviorRecord.findMany({
              where: {
                schoolId,
                studentProfileId: { in: ids },
                date: { gte: since },
              },
              select: {
                studentProfileId: true,
                type: true,
              },
            }),
      ]);

    const attMap = new Map<string, { present: number; total: number }>();
    for (const row of attendanceRows) {
      const cur = attMap.get(row.studentProfileId) ?? {
        present: 0,
        total: 0,
      };
      cur.total += 1;
      if (row.status === AttendanceStatus.present) cur.present += 1;
      attMap.set(row.studentProfileId, cur);
    }

    const scoreMap = new Map<string, { sumPct: number; count: number }>();
    for (const row of scoreRows) {
      if (!row.assessment.maxScore) continue;
      const pct = (row.score / row.assessment.maxScore) * 100;
      const cur = scoreMap.get(row.studentProfileId) ?? {
        sumPct: 0,
        count: 0,
      };
      cur.sumPct += pct;
      cur.count += 1;
      scoreMap.set(row.studentProfileId, cur);
    }

    const classworkMap = new Map<
      string,
      { submitted: number; graded: number; pending: number }
    >();
    for (const row of classworkRows) {
      const cur = classworkMap.get(row.studentProfileId) ?? {
        submitted: 0,
        graded: 0,
        pending: 0,
      };
      if (
        row.status === 'SUBMITTED' ||
        row.status === 'LATE' ||
        row.status === 'GRADED'
      ) {
        cur.submitted += 1;
      }
      if (row.status === 'GRADED' || row.score != null) {
        cur.graded += 1;
      }
      if (row.status === 'PENDING') {
        cur.pending += 1;
      }
      classworkMap.set(row.studentProfileId, cur);
    }

    const libraryMap = new Map<
      string,
      { resources: number; avgProgress: number | null }
    >();
    const libraryAcc = new Map<string, { sum: number; count: number }>();
    for (const row of libraryRows) {
      const cur = libraryAcc.get(row.studentProfileId) ?? { sum: 0, count: 0 };
      cur.sum += row.progressPercent;
      cur.count += 1;
      libraryAcc.set(row.studentProfileId, cur);
    }
    for (const [id, cur] of libraryAcc) {
      libraryMap.set(id, {
        resources: cur.count,
        avgProgress: cur.count > 0 ? Math.round(cur.sum / cur.count) : null,
      });
    }

    const behaviorMap = new Map<string, number>();
    for (const row of behaviorRows) {
      behaviorMap.set(
        row.studentProfileId,
        (behaviorMap.get(row.studentProfileId) ?? 0) + 1,
      );
    }

    const groups = Array.from(
      new Set(
        students
          .map((s) => s.homeroomGroup?.trim())
          .filter((g): g is string => Boolean(g)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return {
      homeroom: {
        gradeId: profile.homeroomGradeId!,
        gradeName: profile.homeroomGrade!.name,
        sectionId: profile.homeroomSectionId,
        sectionName: profile.homeroomSection?.name ?? null,
      },
      groups,
      students: students.map((s) => {
        const att = attMap.get(s.id);
        const sc = scoreMap.get(s.id);
        const cw = classworkMap.get(s.id);
        const lib = libraryMap.get(s.id);
        return {
          studentProfileId: s.id,
          name: `${s.user.firstName} ${s.user.lastName}`.trim(),
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          studentId: s.user.externalRef,
          photoUrl: s.photoUrl,
          phone: s.phone,
          cardCode: s.cardCode,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth?.toISOString().slice(0, 10) ?? null,
          grade: s.grade.name,
          section: s.section?.name ?? null,
          group: s.homeroomGroup?.trim() || null,
          attendance: {
            presentDays: att?.present ?? 0,
            markedDays: att?.total ?? 0,
            rate:
              att && att.total > 0
                ? Math.round((att.present / att.total) * 100)
                : null,
          },
          results: {
            publishedScores: sc?.count ?? 0,
            averagePercent:
              sc && sc.count > 0 ? Math.round(sc.sumPct / sc.count) : null,
          },
          classwork: {
            submitted: cw?.submitted ?? 0,
            graded: cw?.graded ?? 0,
            pending: cw?.pending ?? 0,
          },
          library: {
            resources: lib?.resources ?? 0,
            avgProgress: lib?.avgProgress ?? null,
          },
          behaviorNotes: behaviorMap.get(s.id) ?? 0,
        };
      }),
    };
  }

  async setHomeroomGroup(
    schoolId: string,
    teacherUserId: string,
    studentProfileId: string,
    group: string | null | undefined,
  ) {
    const profile = await this.requireHomeroomProfile(schoolId, teacherUserId);
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        id: studentProfileId,
        schoolId,
        gradeId: profile.homeroomGradeId!,
        ...(profile.homeroomSectionId
          ? { sectionId: profile.homeroomSectionId }
          : {}),
      },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not in your homeroom');
    }

    const normalized = group?.trim() ? group.trim().slice(0, 40) : null;
    const updated = await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: { homeroomGroup: normalized },
      select: {
        id: true,
        homeroomGroup: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return {
      studentProfileId: updated.id,
      name: `${updated.user.firstName} ${updated.user.lastName}`.trim(),
      group: updated.homeroomGroup,
    };
  }

  private async requireHomeroomProfile(schoolId: string, teacherUserId: string) {
    const profile = await this.prisma.teacherProfile.findFirst({
      where: { schoolId, userId: teacherUserId },
      select: {
        homeroomGradeId: true,
        homeroomSectionId: true,
        homeroomGrade: { select: { id: true, name: true } },
        homeroomSection: { select: { id: true, name: true } },
      },
    });
    if (!profile?.homeroomGradeId) {
      throw new ForbiddenException(
        'Only homeroom teachers can manage this class roster',
      );
    }
    return profile;
  }
}
