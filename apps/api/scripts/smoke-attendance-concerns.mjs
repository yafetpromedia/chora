/**
 * End-to-end smoke for attendance concerns against a running API + DB.
 * Usage: node scripts/smoke-attendance-concerns.mjs
 */
import { PrismaClient, AttendanceStatus, AttendanceConcernType } from '@prisma/client';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient();
const API = process.env.API_URL || 'http://127.0.0.1:3001';
const PASSWORD = 'Passw0rd!';

async function login(username, schoolCode = 'BRIGHT1') {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolCode, username, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(
      `Login failed for ${username}: ${res.status} ${await res.text()}`,
    );
  }
  const data = await res.json();
  return data.accessToken || data.token || data.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return json;
}

async function ensureFixture() {
  const school = await prisma.school.upsert({
    where: { id: 'school-addis' },
    create: {
      id: 'school-addis',
      name: 'Bright Side International School',
      slug: 'bright-side',
      joinCode: 'BRIGHT1',
      country: 'Ethiopia',
    },
    update: {},
  });

  const hash = hashSync(PASSWORD, 10);
  const homeroom = await prisma.user.upsert({
    where: { email: 'teacher@eduos.local' },
    create: {
      id: '2',
      schoolId: school.id,
      role: 'teacher',
      username: 'teacher',
      email: 'teacher@eduos.local',
      firstName: 'Teacher',
      lastName: 'A',
      passwordHash: hash,
    },
    update: { passwordHash: hash, role: 'teacher' },
  });

  const subjectTeacher = await prisma.user.upsert({
    where: { email: 'physics@eduos.local' },
    create: {
      id: 'smoke-physics',
      schoolId: school.id,
      role: 'teacher',
      username: 'physics',
      email: 'physics@eduos.local',
      firstName: 'Mr',
      lastName: 'X',
      passwordHash: hash,
    },
    update: { passwordHash: hash, role: 'teacher' },
  });

  // Ensure role templates / permissions exist via DB patterns if present
  const subjectTpl = await prisma.roleTemplate.findFirst({
    where: { schoolId: school.id, slug: 'subject_teacher' },
  });
  const homeTpl = await prisma.roleTemplate.findFirst({
    where: { schoolId: school.id, slug: 'homeroom_teacher' },
  });
  if (subjectTpl) {
    await prisma.user.update({
      where: { id: subjectTeacher.id },
      data: { roleTemplateId: subjectTpl.id },
    });
  }
  if (homeTpl) {
    await prisma.user.update({
      where: { id: homeroom.id },
      data: { roleTemplateId: homeTpl.id },
    });
  }

  let grade = await prisma.grade.findFirst({
    where: { schoolId: school.id, name: 'Grade 11' },
  });
  if (!grade) {
    grade = await prisma.grade.create({
      data: { schoolId: school.id, name: 'Grade 11', sortOrder: 11 },
    });
  }
  let section = await prisma.section.findFirst({
    where: { gradeId: grade.id, name: 'Natural Science A' },
  });
  if (!section) {
    section = await prisma.section.create({
      data: { gradeId: grade.id, name: 'Natural Science A' },
    });
  }

  await prisma.teacherProfile.upsert({
    where: { userId: homeroom.id },
    create: {
      userId: homeroom.id,
      schoolId: school.id,
      homeroomGradeId: grade.id,
      homeroomSectionId: section.id,
    },
    update: {
      schoolId: school.id,
      homeroomGradeId: grade.id,
      homeroomSectionId: section.id,
    },
  });
  await prisma.teacherProfile.upsert({
    where: { userId: subjectTeacher.id },
    create: { userId: subjectTeacher.id, schoolId: school.id },
    update: { schoolId: school.id, homeroomGradeId: null, homeroomSectionId: null },
  });

  let year = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });
  if (!year) {
    year = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: '2026/27',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-07-01'),
        isCurrent: true,
      },
    });
  }

  let subject = await prisma.subject.findFirst({
    where: { schoolId: school.id, code: 'PHY' },
  });
  if (!subject) {
    subject = await prisma.subject.create({
      data: { schoolId: school.id, name: 'Physics', code: 'PHY' },
    });
  }

  let tt = await prisma.timetable.findFirst({
    where: { academicYearId: year.id },
  });
  if (!tt) {
    tt = await prisma.timetable.create({
      data: {
        schoolId: school.id,
        academicYearId: year.id,
        name: 'Main',
        isPublished: true,
      },
    });
  } else if (!tt.isPublished) {
    tt = await prisma.timetable.update({
      where: { id: tt.id },
      data: { isPublished: true },
    });
  }

  let period = await prisma.timetablePeriod.findFirst({
    where: { timetableId: tt.id, number: 2 },
  });
  if (!period) {
    period = await prisma.timetablePeriod.create({
      data: {
        timetableId: tt.id,
        schoolId: school.id,
        number: 2,
        label: 'Period 2',
        startTime: '10:00',
        endTime: '10:45',
        sortOrder: 2,
      },
    });
  }

  const weekdayMap = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  const weekday = weekdayMap[new Date().getUTCDay()];

  let entry = await prisma.timetableEntry.findFirst({
    where: {
      timetableId: tt.id,
      weekday,
      periodId: period.id,
      gradeId: grade.id,
      sectionId: section.id,
    },
  });
  if (!entry) {
    entry = await prisma.timetableEntry.create({
      data: {
        timetableId: tt.id,
        schoolId: school.id,
        weekday,
        periodId: period.id,
        gradeId: grade.id,
        sectionId: section.id,
        subjectId: subject.id,
        teacherUserId: subjectTeacher.id,
      },
    });
  } else {
    entry = await prisma.timetableEntry.update({
      where: { id: entry.id },
      data: { teacherUserId: subjectTeacher.id, subjectId: subject.id },
    });
  }

  // Ensure 40 students with 36 present / 4 absent official roll
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const students = [];
  for (let i = 0; i < 40; i++) {
    const email = `smoke-stu-${i}@eduos.local`;
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        id: `smoke-stu-user-${i}`,
        schoolId: school.id,
        role: 'student',
        username: `smokestu${i}`,
        email,
        firstName: `Student`,
        lastName: `${i + 1}`,
        passwordHash: hash,
      },
      update: {},
    });
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        schoolId: school.id,
        gradeId: grade.id,
        sectionId: section.id,
      },
      update: { gradeId: grade.id, sectionId: section.id },
    });
    students.push(profile);
    await prisma.attendanceRecord.upsert({
      where: {
        schoolId_studentProfileId_date_periodNumber: {
          schoolId: school.id,
          studentProfileId: profile.id,
          date: day,
          periodNumber: 0,
        },
      },
      create: {
        schoolId: school.id,
        studentProfileId: profile.id,
        date: day,
        periodNumber: 0,
        status: i < 36 ? AttendanceStatus.present : AttendanceStatus.absent,
        recordedBy: homeroom.id,
      },
      update: {
        status: i < 36 ? AttendanceStatus.present : AttendanceStatus.absent,
        recordedBy: homeroom.id,
      },
    });
  }

  return { school, homeroom, subjectTeacher, entry, students };
}

async function main() {
  console.log('Preparing fixture…');
  const fx = await ensureFixture();

  console.log('Logging in subject teacher…');
  const subjectToken = await login('physics');
  console.log('Logging in homeroom teacher…');
  const homeToken = await login('teacher');

  const classes = await api(subjectToken, 'GET', '/attendance/my-classes/today');
  console.log('Today classes:', classes.slots?.length ?? 0);
  if (!classes.slots?.length) {
    throw new Error('Expected at least one class for subject teacher today');
  }

  const ctx = await api(
    subjectToken,
    'GET',
    `/attendance/classes/${fx.entry.id}/context`,
  );
  console.log('Official:', ctx.officialAttendance);
  if (ctx.officialAttendance.absentCount !== 4) {
    throw new Error(`Expected official absent 4, got ${ctx.officialAttendance.absentCount}`);
  }

  const beforeRecords = await prisma.attendanceRecord.count({
    where: { schoolId: fx.school.id, periodNumber: 0 },
  });

  const concern = await api(subjectToken, 'POST', '/attendance/concerns', {
    timetableEntryId: fx.entry.id,
    concernType: AttendanceConcernType.COUNT_MISMATCH,
    observedAbsentCount: 5,
    description: 'I counted five students missing when I entered the class.',
    acknowledgeDuplicate: true,
  });
  console.log('Created concern', concern.id, 'diff', concern.difference);

  if (concern.difference !== 1) {
    throw new Error(`Expected difference +1, got ${concern.difference}`);
  }

  const afterRecords = await prisma.attendanceRecord.count({
    where: { schoolId: fx.school.id, periodNumber: 0 },
  });
  if (afterRecords !== beforeRecords) {
    throw new Error('Official attendance records changed after concern create');
  }

  const notifs = await prisma.staffNotification.count({
    where: {
      schoolId: fx.school.id,
      userId: fx.homeroom.id,
      kind: 'ATTENDANCE_CONCERN',
      entityId: concern.id,
    },
  });
  if (notifs < 1) {
    throw new Error('Homeroom teacher did not receive staff notification');
  }
  console.log('Homeroom notifications:', notifs);

  const audits = await prisma.attendanceConcernAuditEvent.count({
    where: { concernId: concern.id, action: 'created' },
  });
  if (audits < 1) throw new Error('Missing create audit');

  const resolved = await api(homeToken, 'POST', `/attendance/concerns/${concern.id}/resolve`, {
    resolution: 'AUTHORIZED_ABSENCE',
    resolutionNote: 'Student E was attending an approved school activity.',
  });
  if (resolved.status !== 'RESOLVED') {
    throw new Error(`Expected RESOLVED, got ${resolved.status}`);
  }

  const afterResolveRecords = await prisma.attendanceRecord.count({
    where: { schoolId: fx.school.id, periodNumber: 0 },
  });
  if (afterResolveRecords !== beforeRecords) {
    throw new Error('Official attendance changed on resolve');
  }

  console.log('SMOKE OK');
}

main()
  .catch((err) => {
    console.error('SMOKE FAILED:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
