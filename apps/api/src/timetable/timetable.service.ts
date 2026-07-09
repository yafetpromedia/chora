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
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import {
  generateTimetableSchedule,
  type GeneratorLesson,
} from './timetable-generator.util';
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
    const classSlotKeys = new Set<string>();

    for (const item of dto.entries) {
      if (!item.subjectId) continue;
      const period = periodByNumber.get(item.periodNumber);
      if (!period) {
        throw new BadRequestException(
          `Unknown period number ${item.periodNumber}`,
        );
      }

      const slotKey = `${item.weekday}:${item.periodNumber}`;
      if (classSlotKeys.has(slotKey)) {
        throw new BadRequestException(
          'Each period holds one subject only — remove duplicate slots in the same class.',
        );
      }
      classSlotKeys.add(slotKey);

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

  async autoGenerate(schoolId: string, dto: GenerateTimetableDto) {
    const tt = await this.ensureTimetable(schoolId, dto.academicYearId);
    const weekdays = WEEKDAYS_ORDER.filter((d) => d !== Weekday.SUNDAY);
    const periods = await this.prisma.timetablePeriod.findMany({
      where: { timetableId: tt.id },
      orderBy: { sortOrder: 'asc' },
    });
    if (periods.length === 0) {
      throw new BadRequestException('Add at least one period before generating.');
    }

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        schoolId,
        academicYearId: dto.academicYearId,
        ...(dto.gradeId ? { gradeId: dto.gradeId } : {}),
        ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });

    if (classSubjects.length === 0) {
      throw new BadRequestException(
        'No subject assignments found. Assign subjects to classes first.',
      );
    }

    const lessons: GeneratorLesson[] = [];
    for (const cs of classSubjects) {
      const weeklySessions = Math.min(Math.max(cs.weeklySessions ?? 1, 1), 2);
      for (let sessionIndex = 0; sessionIndex < weeklySessions; sessionIndex++) {
        lessons.push({
          id: `${cs.id}:${sessionIndex}`,
          classSubjectId: cs.id,
          gradeId: cs.gradeId,
          sectionId: cs.sectionId,
          subjectId: cs.subjectId,
          subjectName: cs.subject.name,
          gradeName: cs.grade.name,
          sectionName: cs.section?.name ?? null,
          teacherUserId: cs.teacherId,
          sessionIndex,
          weeklySessions,
        });
      }
    }

    const { placed, unplaced } = generateTimetableSchedule({
      weekdays,
      periodNumbers: periods.map((p) => p.number),
      lessons,
    });

    const periodByNumber = new Map(periods.map((p) => [p.number, p]));
    const replaceExisting = dto.replaceExisting !== false;

    await this.prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.timetableEntry.deleteMany({
          where: {
            timetableId: tt.id,
            ...(dto.gradeId ? { gradeId: dto.gradeId } : {}),
            ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
          },
        });
      }

      for (const slot of placed) {
        const period = periodByNumber.get(slot.periodNumber);
        if (!period) continue;

        if (slot.teacherUserId) {
          const clash = await tx.timetableEntry.findFirst({
            where: {
              timetableId: tt.id,
              weekday: slot.weekday,
              periodId: period.id,
              teacherUserId: slot.teacherUserId,
            },
          });
          if (clash) {
            throw new BadRequestException(
              `Scheduling conflict for ${slot.subjectName} — teacher already booked.`,
            );
          }
        }

        await tx.timetableEntry.create({
          data: {
            timetableId: tt.id,
            schoolId,
            weekday: slot.weekday,
            periodId: period.id,
            gradeId: slot.gradeId,
            sectionId: slot.sectionId,
            subjectId: slot.subjectId,
            teacherUserId: slot.teacherUserId,
          },
        });
      }
    });

    const classKeys = new Set(
      classSubjects.map(
        (cs) => `${cs.gradeId}:${cs.sectionId ?? ''}`,
      ),
    );

    return {
      placed: placed.length,
      unplaced: unplaced.map((u) => ({
        subjectName: u.subjectName,
        gradeName: u.gradeName,
        sectionName: u.sectionName,
        reason:
          u.weeklySessions >= 2
            ? 'Could not fit double lesson on the same day without clashing.'
            : 'No free slot without clashing with another class or teacher.',
      })),
      classesProcessed: classKeys.size,
      totalLessons: lessons.length,
    };
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
