import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import {
  buildTeacherCardScanPayload,
  generateSchoolTeacherId,
  generateTeacherCardCode,
} from './staff-card.util';

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
    return this.formatStaff(user, teachingSlots);
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

    if (dto.roleTemplateSlug) {
      const template = await this.prisma.roleTemplate.findFirst({
        where: { schoolId, slug: dto.roleTemplateSlug },
      });
      if (!template) {
        throw new BadRequestException('Unknown role template');
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { roleTemplateId: template.id, role: template.portalRole },
      });
    }

    let profile = user.teacherProfile;
    if (!profile && user.role === UserRole.teacher) {
      profile = await this.prisma.teacherProfile.create({
        data: { userId, schoolId },
      });
    }

    if (
      profile &&
      (dto.homeroomGradeId !== undefined || dto.homeroomSectionId !== undefined)
    ) {
      const homeroomGradeId = dto.homeroomGradeId ?? null;
      const homeroomSectionId = dto.homeroomSectionId ?? null;
      await this.prisma.teacherProfile.update({
        where: { id: profile.id },
        data: { homeroomGradeId, homeroomSectionId },
      });
      await this.syncHomeroomAssignment(
        profile.id,
        schoolId,
        homeroomGradeId,
        homeroomSectionId,
      );
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
    return this.formatStaff(user, teachingSlots);
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
        (u): u is typeof u & { teacherProfile: NonNullable<typeof u.teacherProfile> } =>
          !!u.teacherProfile?.cardCode,
      )
      .map((u) => this.formatTeacherIdCard(u, school));
  }

  private async loadSchoolForCard(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        logoUrl: true,
        authorizedSignatureUrl: true,
        authorizedSignatureLabel: true,
        joinCode: true,
        phone: true,
        address: true,
        email: true,
      },
    });
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { name: true },
    });
    const year = new Date().getFullYear();
    return {
      name: school?.name ?? 'Chora',
      logoUrl: school?.logoUrl ?? null,
      authorizedSignatureUrl: school?.authorizedSignatureUrl ?? null,
      authorizedSignatureLabel: school?.authorizedSignatureLabel ?? null,
      joinCode: school?.joinCode ?? '',
      phone: school?.phone ?? null,
      address: school?.address ?? null,
      email: school?.email ?? null,
      academicYearName: currentYear?.name ?? String(year),
    };
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
        cardCode: string | null;
        homeroomGrade: { name: string } | null;
        homeroomSection: { name: string } | null;
      };
    },
    school: {
      name: string;
      logoUrl: string | null;
      authorizedSignatureUrl: string | null;
      authorizedSignatureLabel: string | null;
      joinCode: string;
      phone: string | null;
      address: string | null;
      email: string | null;
      academicYearName: string;
    },
  ) {
    const cardCode = user.teacherProfile.cardCode!;
    const homeroom =
      user.teacherProfile.homeroomGrade != null
        ? `${user.teacherProfile.homeroomGrade.name}${
            user.teacherProfile.homeroomSection
              ? ` · ${user.teacherProfile.homeroomSection.name}`
              : ''
          }`
        : null;
    return {
      teacherProfileId: user.teacherProfile.id,
      userId: user.id,
      cardCode,
      scanPayload: buildTeacherCardScanPayload(cardCode),
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.teacherProfile.photoUrl,
      teacherId: user.externalRef,
      email: user.email,
      phone: user.phone,
      roleLabel: user.roleTemplate?.name ?? 'Teacher',
      homeroom,
      schoolName: school.name,
      schoolLogoUrl: school.logoUrl,
      schoolSignatureUrl: school.authorizedSignatureUrl,
      schoolSignatureLabel: school.authorizedSignatureLabel,
      schoolJoinCode: school.joinCode,
      schoolPhone: school.phone,
      schoolAddress: school.address,
      schoolEmail: school.email,
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
    externalRef?: string | null;
    firstName: string;
    lastName: string;
    role: string;
    roleTemplate: { slug: string; name: string } | null;
    teacherProfile: {
      id: string;
      cardCode?: string | null;
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
  ) {
    const p = user.teacherProfile;
    return {
      userId: user.id,
      email: user.email,
      teacherId: user.externalRef ?? null,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      portalRole: user.role,
      roleTemplateSlug: user.roleTemplate?.slug ?? null,
      roleTemplateName: user.roleTemplate?.name ?? null,
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
}
