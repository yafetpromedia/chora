import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, Weekday } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimetableRoomDto } from './dto/create-timetable-room.dto';
import { SaveTimetableEntriesDto } from './dto/save-timetable-entries.dto';
import { UpsertTimetablePeriodsDto } from './dto/upsert-timetable-periods.dto';
import {
  currentWeekday,
  DEFAULT_PERIOD_COUNT,
  WEEKDAY_LABELS,
  WEEKDAYS_ORDER,
} from './timetable.util';

type EntryRow = {
  id: string;
  weekday: Weekday;
  period: {
    id: string;
    number: number;
    label: string;
    startTime: string | null;
    endTime: string | null;
  };
  subject: { id: string; name: string; code: string };
  grade: { id: string; name: string };
  section: { id: string; name: string } | null;
  teacher: { userId: string; name: string } | null;
  room: { id: string; name: string } | null;
};

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureTimetable(schoolId: string, academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }

    let timetable = await this.prisma.timetable.findUnique({
      where: { academicYearId },
      include: { periods: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!timetable) {
      timetable = await this.prisma.timetable.create({
        data: {
          schoolId,
          academicYearId,
          name: `${year.name} timetable`,
          periods: {
            create: Array.from({ length: DEFAULT_PERIOD_COUNT }, (_, i) => ({
              schoolId,
              number: i + 1,
              label: `Period ${i + 1}`,
              sortOrder: i,
              startTime: null,
              endTime: null,
            })),
          },
        },
        include: { periods: { orderBy: { sortOrder: 'asc' } } },
      });
    } else if (timetable.periods.length === 0) {
      await this.prisma.timetablePeriod.createMany({
        data: Array.from({ length: DEFAULT_PERIOD_COUNT }, (_, i) => ({
          timetableId: timetable!.id,
          schoolId,
          number: i + 1,
          label: `Period ${i + 1}`,
          sortOrder: i,
        })),
      });
      timetable = await this.prisma.timetable.findUniqueOrThrow({
        where: { id: timetable.id },
        include: { periods: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    return this.formatTimetableMeta(timetable);
  }

  async listPeriods(schoolId: string, academicYearId: string) {
    const tt = await this.ensureTimetable(schoolId, academicYearId);
    const periods = await this.prisma.timetablePeriod.findMany({
      where: { timetableId: tt.id },
      orderBy: { sortOrder: 'asc' },
    });
    return periods.map((p) => ({
      id: p.id,
      number: p.number,
      label: p.label,
      startTime: p.startTime,
      endTime: p.endTime,
      sortOrder: p.sortOrder,
    }));
  }

  async upsertPeriods(schoolId: string, dto: UpsertTimetablePeriodsDto) {
    const tt = await this.ensureTimetable(schoolId, dto.academicYearId);
    await this.prisma.timetablePeriod.deleteMany({
      where: { timetableId: tt.id },
    });
    for (const p of dto.periods) {
      await this.prisma.timetablePeriod.create({
        data: {
          timetableId: tt.id,
          schoolId,
          number: p.number,
          label: p.label,
          startTime: p.startTime ?? null,
          endTime: p.endTime ?? null,
          sortOrder: p.sortOrder ?? p.number - 1,
        },
      });
    }
    return this.listPeriods(schoolId, dto.academicYearId);
  }

  async listRooms(schoolId: string, academicYearId: string) {
    const tt = await this.ensureTimetable(schoolId, academicYearId);
    return this.prisma.timetableRoom.findMany({
      where: { timetableId: tt.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async createRoom(schoolId: string, dto: CreateTimetableRoomDto) {
    const tt = await this.ensureTimetable(schoolId, dto.academicYearId);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Room name is required');
    }
    return this.prisma.timetableRoom.create({
      data: { timetableId: tt.id, schoolId, name },
      select: { id: true, name: true },
    });
  }

  async getClassGrid(
    schoolId: string,
    academicYearId: string,
    gradeId: string,
    sectionId?: string,
  ) {
    const tt = await this.ensureTimetable(schoolId, academicYearId);
    const [periods, entries, subjects, teachers] = await Promise.all([
      this.prisma.timetablePeriod.findMany({
        where: { timetableId: tt.id },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.timetableEntry.findMany({
        where: {
          timetableId: tt.id,
          gradeId,
          sectionId: sectionId ?? null,
        },
        include: {
          period: true,
          subject: true,
          grade: true,
          section: true,
          teacher: {
            select: { id: true, firstName: true, lastName: true },
          },
          room: true,
        },
      }),
      this.prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.user.findMany({
        where: { schoolId, role: UserRole.teacher },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    return {
      timetable: tt,
      weekdays: WEEKDAYS_ORDER.filter((d) => d !== Weekday.SUNDAY),
      weekdayLabels: WEEKDAY_LABELS,
      periods: periods.map((p) => ({
        id: p.id,
        number: p.number,
        label: p.label,
        startTime: p.startTime,
        endTime: p.endTime,
      })),
      entries: entries.map((e) => this.formatEntry(e)),
      subjects,
      teachers: teachers.map((t) => ({
        userId: t.id,
        name: `${t.firstName} ${t.lastName}`.trim(),
      })),
    };
  }

  async saveClassEntries(schoolId: string, dto: SaveTimetableEntriesDto) {
    const tt = await this.ensureTimetable(schoolId, dto.academicYearId);
    const periods = await this.prisma.timetablePeriod.findMany({
      where: { timetableId: tt.id },
    });
    const periodByNumber = new Map(periods.map((p) => [p.number, p]));

    const grade = await this.prisma.grade.findFirst({
      where: { id: dto.gradeId, schoolId },
    });
    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    const sectionId = dto.sectionId ?? null;
    if (sectionId) {
      const section = await this.prisma.section.findFirst({
        where: { id: sectionId, gradeId: dto.gradeId },
      });
      if (!section) {
        throw new NotFoundException('Section not found');
      }
    }

    await this.prisma.timetableEntry.deleteMany({
      where: {
        timetableId: tt.id,
        gradeId: dto.gradeId,
        sectionId,
      },
    });

    const roomCache = new Map<string, string>();

    for (const item of dto.entries) {
      if (!item.subjectId) continue;
      const period = periodByNumber.get(item.periodNumber);
      if (!period) {
        throw new BadRequestException(
          `Unknown period number ${item.periodNumber}`,
        );
      }

      let roomId: string | null = null;
      if (item.roomName?.trim()) {
        const key = item.roomName.trim();
        let cached = roomCache.get(key);
        if (!cached) {
          const room = await this.prisma.timetableRoom.upsert({
            where: {
              timetableId_name: { timetableId: tt.id, name: key },
            },
            create: { timetableId: tt.id, schoolId, name: key },
            update: {},
          });
          roomCache.set(key, room.id);
          cached = room.id;
        }
        roomId = cached;
      }

      if (item.teacherUserId) {
        await this.assertTeacher(schoolId, item.teacherUserId);
        await this.assertNoTeacherConflict(
          tt.id,
          item.weekday,
          period.id,
          item.teacherUserId,
        );
      }

      await this.prisma.timetableEntry.create({
        data: {
          timetableId: tt.id,
          schoolId,
          weekday: item.weekday,
          periodId: period.id,
          gradeId: dto.gradeId,
          sectionId,
          subjectId: item.subjectId,
          teacherUserId: item.teacherUserId ?? null,
          roomId,
        },
      });
    }

    return this.getClassGrid(
      schoolId,
      dto.academicYearId,
      dto.gradeId,
      dto.sectionId,
    );
  }

  async getScheduleForUser(
    schoolId: string,
    userId: string,
    role: UserRole,
    weekday?: Weekday,
  ) {
    const day = weekday ?? currentWeekday();
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!year) {
      return { weekday: day, weekdayLabel: WEEKDAY_LABELS[day], slots: [] };
    }

    const tt = await this.prisma.timetable.findFirst({
      where: { academicYearId: year.id, isPublished: true },
    });
    if (!tt) {
      return { weekday: day, weekdayLabel: WEEKDAY_LABELS[day], slots: [] };
    }

    let entries: EntryRow[] = [];

    if (role === UserRole.teacher) {
      const rows = await this.prisma.timetableEntry.findMany({
        where: {
          timetableId: tt.id,
          schoolId,
          weekday: day,
          teacherUserId: userId,
        },
        include: this.entryInclude(),
        orderBy: [{ period: { sortOrder: 'asc' } }],
      });
      entries = rows.map((e) => this.formatEntry(e));
    } else if (role === UserRole.student) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (profile) {
        const rows = await this.prisma.timetableEntry.findMany({
          where: {
            timetableId: tt.id,
            weekday: day,
            gradeId: profile.gradeId,
            sectionId: profile.sectionId,
          },
          include: this.entryInclude(),
          orderBy: [{ period: { sortOrder: 'asc' } }],
        });
        entries = rows.map((e) => this.formatEntry(e));
      }
    } else if (role === UserRole.parent) {
      const links = await this.prisma.parentStudent.findMany({
        where: { parentId: userId },
        include: {
          student: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      const slots: (EntryRow & { studentName: string })[] = [];
      for (const link of links) {
        const studentName =
          `${link.student.user.firstName} ${link.student.user.lastName}`.trim();
        const rows = await this.prisma.timetableEntry.findMany({
          where: {
            timetableId: tt.id,
            weekday: day,
            gradeId: link.student.gradeId,
            sectionId: link.student.sectionId,
          },
          include: this.entryInclude(),
          orderBy: [{ period: { sortOrder: 'asc' } }],
        });
        for (const row of rows) {
          slots.push({ ...this.formatEntry(row), studentName });
        }
      }
      entries = slots;
    }

    return {
      academicYear: { id: year.id, name: year.name },
      weekday: day,
      weekdayLabel: WEEKDAY_LABELS[day],
      slots: entries,
    };
  }

  async getWeekForUser(schoolId: string, userId: string, role: UserRole) {
    const year = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!year) {
      return { days: [] };
    }

    const days: {
      weekday: Weekday;
      weekdayLabel: string;
      slots: EntryRow[];
    }[] = [];

    for (const weekday of WEEKDAYS_ORDER) {
      if (weekday === Weekday.SUNDAY) continue;
      const day = await this.getScheduleForUser(
        schoolId,
        userId,
        role,
        weekday,
      );
      if (day.slots.length > 0) {
        days.push({
          weekday,
          weekdayLabel: WEEKDAY_LABELS[weekday],
          slots: day.slots as EntryRow[],
        });
      }
    }

    return { academicYear: year, days };
  }

  private entryInclude() {
    return {
      period: true,
      subject: true,
      grade: true,
      section: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
      room: true,
    } as const;
  }

  private formatEntry(e: {
    id: string;
    weekday: Weekday;
    period: {
      id: string;
      number: number;
      label: string;
      startTime: string | null;
      endTime: string | null;
    };
    subject: { id: string; name: string; code: string };
    grade: { id: string; name: string };
    section: { id: string; name: string } | null;
    teacher: { id: string; firstName: string; lastName: string } | null;
    room: { id: string; name: string } | null;
  }): EntryRow {
    return {
      id: e.id,
      weekday: e.weekday,
      period: {
        id: e.period.id,
        number: e.period.number,
        label: e.period.label,
        startTime: e.period.startTime,
        endTime: e.period.endTime,
      },
      subject: e.subject,
      grade: e.grade,
      section: e.section,
      teacher: e.teacher
        ? {
            userId: e.teacher.id,
            name: `${e.teacher.firstName} ${e.teacher.lastName}`.trim(),
          }
        : null,
      room: e.room,
    };
  }

  private formatTimetableMeta(timetable: {
    id: string;
    schoolId: string;
    academicYearId: string;
    name: string;
    isPublished: boolean;
  }) {
    return {
      id: timetable.id,
      schoolId: timetable.schoolId,
      academicYearId: timetable.academicYearId,
      name: timetable.name,
      isPublished: timetable.isPublished,
    };
  }

  private async assertTeacher(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, role: UserRole.teacher },
    });
    if (!user) {
      throw new BadRequestException('Invalid teacher');
    }
  }

  private async assertNoTeacherConflict(
    timetableId: string,
    weekday: Weekday,
    periodId: string,
    teacherUserId: string,
  ) {
    const clash = await this.prisma.timetableEntry.findFirst({
      where: {
        timetableId,
        weekday,
        periodId,
        teacherUserId,
      },
    });
    if (clash) {
      throw new BadRequestException(
        'Teacher is already scheduled in this period',
      );
    }
  }
}
