import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  AttendanceConcernStatus,
  AttendanceConcernType,
  AttendanceStatus,
  ObservedAttendanceStatus,
  UserRole,
} from '@prisma/client';
import { AttendanceConcernsService } from './attendance-concerns.service';

type ConcernFindArgs = {
  where?: { id?: string; reportedByUserId?: string; status?: unknown };
};

describe('AttendanceConcernsService', () => {
  const prisma = {
    academicYear: { findFirst: jest.fn() },
    timetable: { findFirst: jest.fn() },
    timetableEntry: { findFirst: jest.fn(), findMany: jest.fn() },
    studentProfile: { findMany: jest.fn(), findFirst: jest.fn() },
    attendanceRecord: { findMany: jest.fn(), findFirst: jest.fn() },
    attendanceConcern: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    attendanceConcernAuditEvent: { create: jest.fn() },
    attendancePermissionRequest: { findMany: jest.fn() },
    teacherProfile: { findUnique: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    staffNotification: { createMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const service = new AttendanceConcernsService(prisma as never);

  const entry = {
    id: 'entry-1',
    schoolId: 'school-a',
    gradeId: 'grade-1',
    sectionId: 'section-1',
    subjectId: 'subject-1',
    teacherUserId: 'teacher-b',
    period: {
      id: 'p1',
      number: 2,
      label: 'Period 2',
      startTime: '10:00',
      endTime: '10:45',
      sortOrder: 2,
    },
    subject: { id: 'subject-1', name: 'Physics', code: 'PHY' },
    grade: { id: 'grade-1', name: 'Grade 11' },
    section: { id: 'section-1', name: 'Natural Science A' },
    room: { id: 'r1', name: 'Lab 1' },
    teacher: { id: 'teacher-b', firstName: 'Mr', lastName: 'X' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.timetableEntry.findFirst.mockResolvedValue(entry);
    prisma.studentProfile.findMany.mockResolvedValue(
      Array.from({ length: 40 }, (_, i) => ({ id: `stu-${i}` })),
    );
    prisma.attendanceRecord.findMany.mockResolvedValue([
      ...Array.from({ length: 36 }, (_, i) => ({
        studentProfileId: `stu-${i}`,
        status: AttendanceStatus.present,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        studentProfileId: `stu-${36 + i}`,
        status: AttendanceStatus.absent,
      })),
    ]);
    prisma.attendanceConcern.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      firstName: 'Mr',
      lastName: 'X',
    });
    prisma.teacherProfile.findMany.mockResolvedValue([
      { userId: 'teacher-a', homeroomSectionId: 'section-1' },
    ]);
    prisma.staffNotification.createMany.mockResolvedValue({ count: 1 });
    prisma.attendanceConcernAuditEvent.create.mockResolvedValue({});
    prisma.attendanceConcern.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'concern-1',
          ...data,
          category: 'ATTENDANCE',
          status: AttendanceConcernStatus.OPEN,
          createdAt: new Date(),
          updatedAt: new Date(),
          reviewedAt: null,
          resolvedAt: null,
          resolvedByUserId: null,
          resolution: null,
          resolutionNote: null,
        }),
    );
    prisma.attendanceConcern.findFirst.mockImplementation(
      (args?: ConcernFindArgs) => {
        if (args?.where?.id === 'concern-1' || args?.where?.reportedByUserId) {
          if (args?.where?.reportedByUserId && args?.where?.status) {
            return Promise.resolve(null); // duplicate check
          }
          if (args?.where?.id) {
            return Promise.resolve({
              id: 'concern-1',
              schoolId: 'school-a',
              category: 'ATTENDANCE',
              date: new Date('2026-10-08'),
              gradeId: 'grade-1',
              sectionId: 'section-1',
              subjectId: 'subject-1',
              timetableEntryId: 'entry-1',
              periodNumber: 2,
              periodLabel: 'Period 2',
              subjectNameSnapshot: 'Physics',
              reportedByUserId: 'teacher-b',
              officialPresentCount: 36,
              officialAbsentCount: 4,
              officialLateCount: 0,
              officialExcusedCount: 0,
              officialSubmitted: true,
              totalStudents: 40,
              observedPresentCount: null,
              observedAbsentCount: 5,
              difference: 1,
              concernType: AttendanceConcernType.COUNT_MISMATCH,
              studentProfileId: null,
              officialStudentStatus: null,
              observedStudentStatus: null,
              description: 'I counted five students missing',
              status: AttendanceConcernStatus.OPEN,
              resolution: null,
              resolutionNote: null,
              resolvedByUserId: null,
              reviewedAt: null,
              resolvedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              grade: { id: 'grade-1', name: 'Grade 11' },
              section: { id: 'section-1', name: 'Natural Science A' },
              subject: { id: 'subject-1', name: 'Physics', code: 'PHY' },
              reportedBy: { id: 'teacher-b', firstName: 'Mr', lastName: 'X' },
              resolvedBy: null,
              studentProfile: null,
            });
          }
        }
        return Promise.resolve(null);
      },
    );
    prisma.attendancePermissionRequest.findMany.mockResolvedValue([]);
  });

  it('creates count discrepancy without mutating AttendanceRecord', async () => {
    const updateSpy = jest.fn();
    (
      prisma as { attendanceRecord: { update?: jest.Mock } }
    ).attendanceRecord.update = updateSpy;
    (
      prisma as { attendanceRecord: { create?: jest.Mock } }
    ).attendanceRecord.create = jest.fn();
    (
      prisma as { attendanceRecord: { upsert?: jest.Mock } }
    ).attendanceRecord.upsert = jest.fn();

    const result = await service.createConcern(
      'school-a',
      'teacher-b',
      UserRole.teacher,
      {
        timetableEntryId: 'entry-1',
        concernType: AttendanceConcernType.COUNT_MISMATCH,
        observedAbsentCount: 5,
        description: 'I counted five students missing',
      },
    );

    expect(result.difference).toBe(1);
    expect(result.officialAbsentCount).toBe(4);
    expect(result.observedAbsentCount).toBe(5);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(
      (prisma.attendanceRecord as { create?: jest.Mock }).create,
    ).not.toHaveBeenCalled();
    expect(
      (prisma.attendanceRecord as { upsert?: jest.Mock }).upsert,
    ).not.toHaveBeenCalled();
    expect(prisma.staffNotification.createMany).toHaveBeenCalled();
    expect(prisma.attendanceConcernAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'created' }) as unknown,
      }),
    );
  });

  it('blocks subject teacher from unrelated timetable entry', async () => {
    prisma.timetableEntry.findFirst.mockResolvedValue({
      ...entry,
      teacherUserId: 'other-teacher',
    });

    await expect(
      service.createConcern('school-a', 'teacher-b', UserRole.teacher, {
        timetableEntryId: 'entry-1',
        concernType: AttendanceConcernType.COUNT_MISMATCH,
        observedAbsentCount: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks cross-school timetable entry lookup', async () => {
    prisma.timetableEntry.findFirst.mockResolvedValue(null);
    await expect(
      service.createConcern('school-b', 'teacher-b', UserRole.teacher, {
        timetableEntryId: 'entry-1',
        concernType: AttendanceConcernType.COUNT_MISMATCH,
        observedAbsentCount: 5,
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('creates student-specific concern', async () => {
    prisma.studentProfile.findFirst.mockResolvedValue({ id: 'stu-e' });
    prisma.attendanceRecord.findFirst.mockResolvedValue({
      status: AttendanceStatus.present,
    });

    await service.createConcern('school-a', 'teacher-b', UserRole.teacher, {
      timetableEntryId: 'entry-1',
      concernType: AttendanceConcernType.STUDENT_APPEARS_ABSENT,
      studentProfileId: 'stu-e',
      observedStudentStatus: ObservedAttendanceStatus.MISSING,
    });

    expect(prisma.attendanceConcern.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentProfileId: 'stu-e',
          officialStudentStatus: AttendanceStatus.present,
          observedStudentStatus: ObservedAttendanceStatus.MISSING,
        }) as unknown,
      }),
    );
  });

  it('rejects duplicate open concerns unless acknowledged', async () => {
    prisma.attendanceConcern.findFirst.mockResolvedValueOnce({ id: 'dup-1' });

    await expect(
      service.createConcern('school-a', 'teacher-b', UserRole.teacher, {
        timetableEntryId: 'entry-1',
        concernType: AttendanceConcernType.COUNT_MISMATCH,
        observedAbsentCount: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('records resolver on resolve', async () => {
    prisma.teacherProfile.findUnique.mockResolvedValue({
      schoolId: 'school-a',
      homeroomGradeId: 'grade-1',
      homeroomSectionId: 'section-1',
    });
    prisma.attendanceConcern.findFirst.mockResolvedValue({
      id: 'concern-1',
      schoolId: 'school-a',
      gradeId: 'grade-1',
      sectionId: 'section-1',
      status: AttendanceConcernStatus.OPEN,
      reviewedAt: null,
    });
    prisma.attendanceConcern.update.mockResolvedValue({
      id: 'concern-1',
      status: AttendanceConcernStatus.RESOLVED,
    });
    // getConcern after resolve
    prisma.attendanceConcern.findFirst
      .mockResolvedValueOnce({
        id: 'concern-1',
        schoolId: 'school-a',
        gradeId: 'grade-1',
        sectionId: 'section-1',
        status: AttendanceConcernStatus.OPEN,
        reviewedAt: null,
      })
      .mockResolvedValueOnce({
        id: 'concern-1',
        schoolId: 'school-a',
        category: 'ATTENDANCE',
        date: new Date('2026-10-08'),
        gradeId: 'grade-1',
        sectionId: 'section-1',
        subjectId: 'subject-1',
        timetableEntryId: 'entry-1',
        periodNumber: 2,
        periodLabel: 'Period 2',
        subjectNameSnapshot: 'Physics',
        reportedByUserId: 'teacher-b',
        officialPresentCount: 36,
        officialAbsentCount: 4,
        officialLateCount: 0,
        officialExcusedCount: 0,
        officialSubmitted: true,
        totalStudents: 40,
        observedPresentCount: null,
        observedAbsentCount: 5,
        difference: 1,
        concernType: AttendanceConcernType.COUNT_MISMATCH,
        studentProfileId: null,
        officialStudentStatus: null,
        observedStudentStatus: null,
        description: null,
        status: AttendanceConcernStatus.RESOLVED,
        resolution: 'AUTHORIZED_ABSENCE',
        resolutionNote: 'Approved activity',
        resolvedByUserId: 'teacher-a',
        reviewedAt: new Date(),
        resolvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        grade: { id: 'grade-1', name: 'Grade 11' },
        section: { id: 'section-1', name: 'Natural Science A' },
        subject: { id: 'subject-1', name: 'Physics', code: 'PHY' },
        reportedBy: { id: 'teacher-b', firstName: 'Mr', lastName: 'X' },
        resolvedBy: { id: 'teacher-a', firstName: 'Teacher', lastName: 'A' },
        studentProfile: null,
      });

    const result = await service.resolve(
      'school-a',
      'teacher-a',
      UserRole.teacher,
      'concern-1',
      {
        resolution: 'AUTHORIZED_ABSENCE',
        resolutionNote: 'Approved activity',
      },
    );

    expect(prisma.attendanceConcern.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AttendanceConcernStatus.RESOLVED,
          resolvedByUserId: 'teacher-a',
        }) as unknown,
      }),
    );
    expect(result.status).toBe(AttendanceConcernStatus.RESOLVED);
  });
});
