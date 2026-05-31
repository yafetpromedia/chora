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

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async list(schoolId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: [UserRole.admin, UserRole.staff, UserRole.teacher] },
        roleTemplateId: { not: null },
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

    return users.map((u) => this.formatStaff(u));
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
    return this.formatStaff(user);
  }

  async create(schoolId: string, dto: CreateTeacherDto) {
    const template = await this.prisma.roleTemplate.findFirst({
      where: { schoolId, slug: dto.roleTemplateSlug },
    });
    if (!template) {
      throw new BadRequestException('Unknown role template');
    }

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: template.portalRole,
      schoolId,
      roleTemplateId: template.id,
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

    if (profile && (dto.homeroomGradeId !== undefined || dto.homeroomSectionId !== undefined)) {
      await this.prisma.teacherProfile.update({
        where: { id: profile.id },
        data: {
          homeroomGradeId: dto.homeroomGradeId ?? null,
          homeroomSectionId: dto.homeroomSectionId ?? null,
        },
      });
    }

    if (profile && dto.assignments) {
      await this.prisma.teacherAssignment.deleteMany({
        where: { teacherProfileId: profile.id },
      });
      for (const a of dto.assignments) {
        await this.prisma.teacherAssignment.create({
          data: {
            teacherProfileId: profile.id,
            schoolId,
            gradeId: a.gradeId,
            sectionId: a.sectionId ?? null,
            subjectId: a.subjectId ?? null,
            isHomeroom: a.isHomeroom ?? false,
          },
        });
      }
    }

    return this.getByUserId(schoolId, userId);
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
    return this.formatStaff(user);
  }

  private formatStaff(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    roleTemplate: { slug: string; name: string } | null;
    teacherProfile: {
      id: string;
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
  }) {
    const p = user.teacherProfile;
    return {
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      portalRole: user.role,
      roleTemplateSlug: user.roleTemplate?.slug ?? null,
      roleTemplateName: user.roleTemplate?.name ?? null,
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
    };
  }
}
