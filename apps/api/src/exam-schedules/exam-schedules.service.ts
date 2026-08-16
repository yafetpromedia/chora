import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ExamScheduleStatus, Prisma, StudentRecordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExamScheduleDto,
  CreateExamSeatingPlanDto,
  ExamSeatingRoomInputDto,
  ReplaceExamScheduleDaysDto,
  UpdateExamScheduleDto,
  UpdateExamSeatingPlanDto,
} from './dto/exam-schedule.dto';

const dayInclude = {
  slots: {
    include: {
      grade: { select: { id: true, name: true, sortOrder: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ grade: { sortOrder: 'asc' as const } }, { sortOrder: 'asc' as const }],
  },
} satisfies Prisma.ExamScheduleDayInclude;

const scheduleInclude = {
  academicYear: { select: { id: true, name: true } },
  academicTerm: { select: { id: true, name: true } },
  days: {
    include: dayInclude,
    orderBy: [{ sortOrder: 'asc' as const }, { examDate: 'asc' as const }],
  },
} satisfies Prisma.ExamScheduleInclude;

@Injectable()
export class ExamSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string, academicYearId?: string) {
    return this.prisma.examSchedule.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        academicTerm: { select: { id: true, name: true } },
        _count: { select: { days: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async listPublished(schoolId: string) {
    return this.prisma.examSchedule.findMany({
      where: { schoolId, status: ExamScheduleStatus.PUBLISHED },
      include: {
        academicYear: { select: { id: true, name: true } },
        academicTerm: { select: { id: true, name: true } },
        _count: { select: { days: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async get(schoolId: string, id: string) {
    const row = await this.prisma.examSchedule.findFirst({
      where: { id, schoolId },
      include: scheduleInclude,
    });
    if (!row) throw new NotFoundException('Exam schedule not found');
    return row;
  }

  async getPublished(
    schoolId: string,
    id: string,
    viewer?: { userId: string; role: string; studentProfileId?: string },
  ) {
    const row = await this.prisma.examSchedule.findFirst({
      where: { id, schoolId, status: ExamScheduleStatus.PUBLISHED },
      include: scheduleInclude,
    });
    if (!row) throw new NotFoundException('Published exam schedule not found');

    const focusGradeId = viewer
      ? await this.resolveFocusGradeId(schoolId, viewer)
      : null;

    return { ...row, focusGradeId };
  }

  private async resolveFocusGradeId(
    schoolId: string,
    viewer: { userId: string; role: string; studentProfileId?: string },
  ): Promise<string | null> {
    if (viewer.role === 'student') {
      const profile = await this.prisma.studentProfile.findFirst({
        where: { userId: viewer.userId, schoolId },
        select: { gradeId: true },
      });
      return profile?.gradeId ?? null;
    }

    if (viewer.role === 'parent' && viewer.studentProfileId) {
      const link = await this.prisma.parentStudent.findFirst({
        where: {
          parentId: viewer.userId,
          studentId: viewer.studentProfileId,
          student: { schoolId },
        },
        select: {
          student: { select: { gradeId: true } },
        },
      });
      return link?.student.gradeId ?? null;
    }

    return null;
  }

  async create(schoolId: string, dto: CreateExamScheduleDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    if (dto.academicTermId) {
      const term = await this.prisma.academicTerm.findFirst({
        where: {
          id: dto.academicTermId,
          schoolId,
          academicYearId: dto.academicYearId,
        },
      });
      if (!term) throw new NotFoundException('Academic term not found');
    }

    return this.prisma.examSchedule.create({
      data: {
        schoolId,
        academicYearId: dto.academicYearId,
        academicTermId: dto.academicTermId || null,
        title: dto.title.trim(),
        shiftLabel: dto.shiftLabel?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: scheduleInclude,
    });
  }

  async update(schoolId: string, id: string, dto: UpdateExamScheduleDto) {
    await this.get(schoolId, id);

    if (dto.academicTermId) {
      const schedule = await this.prisma.examSchedule.findFirst({
        where: { id, schoolId },
      });
      const term = await this.prisma.academicTerm.findFirst({
        where: {
          id: dto.academicTermId,
          schoolId,
          academicYearId: schedule!.academicYearId,
        },
      });
      if (!term) throw new NotFoundException('Academic term not found');
    }

    return this.prisma.examSchedule.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.shiftLabel !== undefined
          ? { shiftLabel: dto.shiftLabel?.trim() || null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.academicTermId !== undefined
          ? { academicTermId: dto.academicTermId || null }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as ExamScheduleStatus }
          : {}),
      },
      include: scheduleInclude,
    });
  }

  async remove(schoolId: string, id: string) {
    await this.get(schoolId, id);
    await this.prisma.examSchedule.delete({ where: { id } });
    return { ok: true };
  }

  async replaceDays(
    schoolId: string,
    id: string,
    dto: ReplaceExamScheduleDaysDto,
  ) {
    await this.get(schoolId, id);

    const gradeIds = new Set<string>();
    const subjectIds = new Set<string>();
    for (const day of dto.days) {
      for (const slot of day.slots ?? []) {
        gradeIds.add(slot.gradeId);
        if (slot.subjectId) subjectIds.add(slot.subjectId);
      }
    }

    if (gradeIds.size > 0) {
      const grades = await this.prisma.grade.findMany({
        where: { schoolId, id: { in: [...gradeIds] } },
        select: { id: true },
      });
      if (grades.length !== gradeIds.size) {
        throw new BadRequestException('One or more grades are invalid');
      }
    }

    if (subjectIds.size > 0) {
      const subjects = await this.prisma.subject.findMany({
        where: { schoolId, id: { in: [...subjectIds] } },
        select: { id: true },
      });
      if (subjects.length !== subjectIds.size) {
        throw new BadRequestException('One or more subjects are invalid');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.examScheduleDay.deleteMany({ where: { scheduleId: id, schoolId } });

      for (let i = 0; i < dto.days.length; i++) {
        const day = dto.days[i];
        const examDate = new Date(`${day.examDate}T00:00:00.000Z`);
        if (Number.isNaN(examDate.getTime())) {
          throw new BadRequestException(`Invalid date: ${day.examDate}`);
        }

        await tx.examScheduleDay.create({
          data: {
            scheduleId: id,
            schoolId,
            examDate,
            isStudyDay: Boolean(day.isStudyDay),
            studyNote: day.studyNote?.trim() || null,
            defaultStartTime: day.defaultStartTime?.trim() || null,
            defaultEndTime: day.defaultEndTime?.trim() || null,
            sortOrder: day.sortOrder ?? i,
            slots: {
              create: (day.slots ?? []).map((slot, j) => ({
                schoolId,
                gradeId: slot.gradeId,
                subjectId: slot.subjectId || null,
                subjectLabel: slot.subjectLabel.trim(),
                startTime: slot.startTime?.trim() || null,
                endTime: slot.endTime?.trim() || null,
                sortOrder: slot.sortOrder ?? j,
              })),
            },
          },
        });
      }
    });

    return this.get(schoolId, id);
  }

  private seatingPlanListInclude = {
    rooms: {
      select: {
        id: true,
        name: true,
        roomRef: true,
        capacity: true,
        sortOrder: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
  } satisfies Prisma.ExamSeatingPlanInclude;

  private seatingPlanFullInclude = {
    rooms: {
      include: {
        assignments: {
          orderBy: { seatNo: 'asc' as const },
        },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
  } satisfies Prisma.ExamSeatingPlanInclude;

  async listSeatingPlans(schoolId: string, scheduleId: string) {
    await this.get(schoolId, scheduleId);
    return this.prisma.examSeatingPlan.findMany({
      where: { scheduleId, schoolId },
      include: this.seatingPlanListInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async getSeatingPlan(schoolId: string, scheduleId: string, planId: string) {
    await this.get(schoolId, scheduleId);
    const plan = await this.prisma.examSeatingPlan.findFirst({
      where: { id: planId, scheduleId, schoolId },
      include: this.seatingPlanFullInclude,
    });
    if (!plan) throw new NotFoundException('Seating plan not found');
    return plan;
  }

  async createSeatingPlan(
    schoolId: string,
    scheduleId: string,
    dto: CreateExamSeatingPlanDto,
  ) {
    await this.get(schoolId, scheduleId);
    const rooms = this.normalizeRooms(dto.rooms);
    const sourceGradeIds = await this.validateSourceGrades(
      schoolId,
      dto.sourceGradeIds,
    );

    const distributed = await this.distributeStudents(
      schoolId,
      sourceGradeIds,
      rooms,
    );

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.examSeatingPlan.create({
        data: {
          scheduleId,
          schoolId,
          title: dto.title.trim() || 'Exam seating',
          notes: dto.notes?.trim() || null,
          sourceGradeIds,
          rooms: {
            create: rooms.map((room, i) => ({
              schoolId,
              name: room.name,
              roomRef: room.roomRef,
              capacity: room.capacity,
              sortOrder: i,
            })),
          },
        },
        include: { rooms: { orderBy: { sortOrder: 'asc' } } },
      });

      await this.persistAssignments(tx, schoolId, plan.rooms, distributed);

      return tx.examSeatingPlan.findFirstOrThrow({
        where: { id: plan.id },
        include: this.seatingPlanFullInclude,
      });
    });
  }

  async updateSeatingPlan(
    schoolId: string,
    scheduleId: string,
    planId: string,
    dto: UpdateExamSeatingPlanDto,
  ) {
    await this.getSeatingPlan(schoolId, scheduleId, planId);
    const rooms = this.normalizeRooms(dto.rooms);
    const sourceGradeIds = await this.validateSourceGrades(
      schoolId,
      dto.sourceGradeIds,
    );

    const distributed = await this.distributeStudents(
      schoolId,
      sourceGradeIds,
      rooms,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.examSeatingRoom.deleteMany({ where: { planId, schoolId } });

      await tx.examSeatingPlan.update({
        where: { id: planId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() || 'Exam seating' } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
          sourceGradeIds,
          rooms: {
            create: rooms.map((room, i) => ({
              schoolId,
              name: room.name,
              roomRef: room.roomRef,
              capacity: room.capacity,
              sortOrder: i,
            })),
          },
        },
      });

      const plan = await tx.examSeatingPlan.findFirstOrThrow({
        where: { id: planId },
        include: { rooms: { orderBy: { sortOrder: 'asc' } } },
      });

      await this.persistAssignments(tx, schoolId, plan.rooms, distributed);

      return tx.examSeatingPlan.findFirstOrThrow({
        where: { id: planId },
        include: this.seatingPlanFullInclude,
      });
    });
  }

  async removeSeatingPlan(schoolId: string, scheduleId: string, planId: string) {
    await this.getSeatingPlan(schoolId, scheduleId, planId);
    await this.prisma.examSeatingPlan.delete({ where: { id: planId } });
    return { ok: true };
  }

  private normalizeRooms(rooms: ExamSeatingRoomInputDto[]) {
    if (!rooms?.length) {
      throw new BadRequestException('Add at least one exam room');
    }
    return rooms.map((r, i) => {
      const name = r.name?.trim();
      if (!name) throw new BadRequestException(`Room ${i + 1} needs a name`);
      const capacity = Math.floor(Number(r.capacity ?? 33));
      if (!Number.isFinite(capacity) || capacity < 1) {
        throw new BadRequestException(`Room "${name}" needs capacity ≥ 1`);
      }
      return {
        name,
        roomRef: r.roomRef?.trim() || null,
        capacity,
      };
    });
  }

  private async validateSourceGrades(schoolId: string, gradeIds: string[]) {
    const unique = [...new Set((gradeIds ?? []).map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) {
      throw new BadRequestException('Select at least one source grade');
    }
    const grades = await this.prisma.grade.findMany({
      where: { schoolId, id: { in: unique } },
      select: { id: true },
    });
    if (grades.length !== unique.length) {
      throw new BadRequestException('One or more grades are invalid');
    }
    return unique;
  }

  private async distributeStudents(
    schoolId: string,
    sourceGradeIds: string[],
    rooms: Array<{ name: string; roomRef: string | null; capacity: number }>,
  ) {
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        status: StudentRecordStatus.ACTIVE,
        gradeId: { in: sourceGradeIds },
      },
      select: {
        id: true,
        middleName: true,
        grade: { select: { name: true } },
        section: { select: { name: true } },
        gradeId: true,
        sectionId: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (students.length === 0) {
      throw new BadRequestException('No active students in the selected grades');
    }

    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    if (students.length > totalCapacity) {
      throw new BadRequestException(
        `${students.length} students but only ${totalCapacity} seats — add rooms or raise capacity`,
      );
    }

    type SeatStudent = {
      studentProfileId: string;
      studentName: string;
      gradeLabel: string;
      sectionLabel: string | null;
      groupKey: string;
    };

    const pool: SeatStudent[] = students.map((s) => {
      const studentName = [s.user.firstName, s.middleName, s.user.lastName]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
      return {
        studentProfileId: s.id,
        studentName,
        gradeLabel: s.grade.name,
        sectionLabel: s.section?.name ?? null,
        groupKey: `${s.gradeId}|${s.sectionId ?? 'none'}`,
      };
    });

    const groups = new Map<string, SeatStudent[]>();
    for (const s of pool) {
      const list = groups.get(s.groupKey) ?? [];
      list.push(s);
      groups.set(s.groupKey, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.studentName.localeCompare(b.studentName));
    }

    const groupQueues = [...groups.values()];
    const roomBuckets: SeatStudent[][] = rooms.map(() => []);
    const roomFill = rooms.map(() => 0);
    let roomCursor = 0;
    let remaining = pool.length;

    while (remaining > 0) {
      let placed = false;
      for (let g = 0; g < groupQueues.length; g++) {
        const queue = groupQueues[g];
        if (queue.length === 0) continue;

        let attempts = 0;
        while (attempts < rooms.length) {
          const idx = roomCursor % rooms.length;
          roomCursor += 1;
          attempts += 1;
          if (roomFill[idx] >= rooms[idx].capacity) continue;
          const student = queue.shift()!;
          roomBuckets[idx].push(student);
          roomFill[idx] += 1;
          remaining -= 1;
          placed = true;
          break;
        }
        if (remaining === 0) break;
      }
      if (!placed) {
        throw new BadRequestException(
          'Could not place all students — increase capacity or add rooms',
        );
      }
    }

    return roomBuckets.map((bucket) => {
      const sorted = [...bucket].sort((a, b) =>
        a.studentName.localeCompare(b.studentName),
      );
      return sorted.map((s, i) => ({
        studentProfileId: s.studentProfileId,
        studentName: s.studentName,
        gradeLabel: s.gradeLabel,
        sectionLabel: s.sectionLabel,
        seatNo: i + 1,
      }));
    });
  }

  private async persistAssignments(
    tx: Prisma.TransactionClient,
    schoolId: string,
    rooms: Array<{ id: string }>,
    distributed: Array<
      Array<{
        studentProfileId: string;
        studentName: string;
        gradeLabel: string;
        sectionLabel: string | null;
        seatNo: number;
      }>
    >,
  ) {
    for (let i = 0; i < rooms.length; i++) {
      const assignments = distributed[i] ?? [];
      if (assignments.length === 0) continue;
      await tx.examSeatingAssignment.createMany({
        data: assignments.map((a) => ({
          roomId: rooms[i].id,
          schoolId,
          studentProfileId: a.studentProfileId,
          seatNo: a.seatNo,
          studentName: a.studentName,
          gradeLabel: a.gradeLabel,
          sectionLabel: a.sectionLabel,
        })),
      });
    }
  }
}
