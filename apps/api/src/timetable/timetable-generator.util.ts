import { Weekday } from '@prisma/client';

export type GeneratorLesson = {
  id: string;
  classSubjectId: string;
  gradeId: string;
  sectionId: string | null;
  subjectId: string;
  subjectName: string;
  gradeName: string;
  sectionName: string | null;
  teacherUserId: string | null;
  sessionIndex: number;
  weeklySessions: number;
};

export type GeneratorPlacement = GeneratorLesson & {
  weekday: Weekday;
  periodNumber: number;
};

export type GeneratorInput = {
  weekdays: Weekday[];
  periodNumbers: number[];
  lessons: GeneratorLesson[];
};

export type GeneratorResult = {
  placed: GeneratorPlacement[];
  unplaced: GeneratorLesson[];
};

/** Common double-lesson pairs (e.g. Period 3 + 5 same day). */
const DOUBLE_PERIOD_PAIRS: [number, number][] = [
  [3, 5],
  [3, 6],
  [2, 4],
  [4, 6],
  [1, 3],
  [5, 7],
  [2, 5],
  [4, 5],
  [6, 8],
];

function classSlotKey(
  gradeId: string,
  sectionId: string | null,
  weekday: Weekday,
  periodNumber: number,
) {
  return `${gradeId}:${sectionId ?? ''}:${weekday}:${periodNumber}`;
}

function teacherSlotKey(
  teacherUserId: string,
  weekday: Weekday,
  periodNumber: number,
) {
  return `${teacherUserId}:${weekday}:${periodNumber}`;
}

function classDayLoad(
  gradeId: string,
  sectionId: string | null,
  weekday: Weekday,
  classBusy: Set<string>,
) {
  const prefix = `${gradeId}:${sectionId ?? ''}:${weekday}:`;
  let count = 0;
  for (const key of classBusy) {
    if (key.startsWith(prefix)) count += 1;
  }
  return count;
}

function teacherDayLoad(
  teacherUserId: string,
  weekday: Weekday,
  teacherBusy: Set<string>,
) {
  const prefix = `${teacherUserId}:${weekday}:`;
  let count = 0;
  for (const key of teacherBusy) {
    if (key.startsWith(prefix)) count += 1;
  }
  return count;
}

/** Prefer weekdays (and periods) with fewer existing lessons so the week fills evenly. */
function orderedWeekdaysForLesson(
  lesson: GeneratorLesson,
  weekdays: Weekday[],
  classBusy: Set<string>,
  teacherBusy: Set<string>,
) {
  return [...weekdays].sort((a, b) => {
    const classLoad =
      classDayLoad(lesson.gradeId, lesson.sectionId, a, classBusy) -
      classDayLoad(lesson.gradeId, lesson.sectionId, b, classBusy);
    if (classLoad !== 0) return classLoad;
    if (lesson.teacherUserId) {
      const teacherLoad =
        teacherDayLoad(lesson.teacherUserId, a, teacherBusy) -
        teacherDayLoad(lesson.teacherUserId, b, teacherBusy);
      if (teacherLoad !== 0) return teacherLoad;
    }
    return weekdays.indexOf(a) - weekdays.indexOf(b);
  });
}

function orderedPeriods(
  periodNumbers: number[],
  weekday: Weekday,
  classBusy: Set<string>,
) {
  return [...periodNumbers].sort((a, b) => {
    const suffixA = `:${weekday}:${a}`;
    const suffixB = `:${weekday}:${b}`;
    let loadA = 0;
    let loadB = 0;
    for (const key of classBusy) {
      if (key.endsWith(suffixA)) loadA += 1;
      if (key.endsWith(suffixB)) loadB += 1;
    }
    return loadA - loadB || a - b;
  });
}

/** Each period is one bell slot — at most one subject per class per weekday×period. */
export function generateTimetableSchedule(
  input: GeneratorInput,
): GeneratorResult {
  const classBusy = new Set<string>();
  const teacherBusy = new Set<string>();
  const placed: GeneratorPlacement[] = [];
  const unplaced: GeneratorLesson[] = [];

  const canPlace = (
    lesson: GeneratorLesson,
    weekday: Weekday,
    periodNumber: number,
  ) => {
    const classKey = classSlotKey(
      lesson.gradeId,
      lesson.sectionId,
      weekday,
      periodNumber,
    );
    if (classBusy.has(classKey)) return false;
    if (lesson.teacherUserId) {
      const teacherKey = teacherSlotKey(
        lesson.teacherUserId,
        weekday,
        periodNumber,
      );
      if (teacherBusy.has(teacherKey)) return false;
    }
    return true;
  };

  /** Same subject cannot occupy the same period twice on one day (double = two different periods). */
  const subjectPeriodDay = new Set<string>();

  const canPlaceSubject = (
    lesson: GeneratorLesson,
    weekday: Weekday,
    periodNumber: number,
  ) => {
    if (!canPlace(lesson, weekday, periodNumber)) return false;
    const subjectKey = `${lesson.gradeId}:${lesson.sectionId ?? ''}:${lesson.subjectId}:${weekday}:${periodNumber}`;
    if (subjectPeriodDay.has(subjectKey)) return false;
    return true;
  };

  const occupy = (
    lesson: GeneratorLesson,
    weekday: Weekday,
    periodNumber: number,
  ) => {
    classBusy.add(
      classSlotKey(lesson.gradeId, lesson.sectionId, weekday, periodNumber),
    );
    subjectPeriodDay.add(
      `${lesson.gradeId}:${lesson.sectionId ?? ''}:${lesson.subjectId}:${weekday}:${periodNumber}`,
    );
    if (lesson.teacherUserId) {
      teacherBusy.add(
        teacherSlotKey(lesson.teacherUserId, weekday, periodNumber),
      );
    }
    placed.push({ ...lesson, weekday, periodNumber });
  };

  const doubleGroups = new Map<string, GeneratorLesson[]>();
  const singles: GeneratorLesson[] = [];

  for (const lesson of input.lessons) {
    if (lesson.weeklySessions >= 2) {
      const list = doubleGroups.get(lesson.classSubjectId) ?? [];
      list.push(lesson);
      doubleGroups.set(lesson.classSubjectId, list);
    } else {
      singles.push(lesson);
    }
  }

  for (const groupLessons of doubleGroups.values()) {
    const sorted = [...groupLessons].sort(
      (a, b) => a.sessionIndex - b.sessionIndex,
    );
    if (sorted.length < 2) {
      singles.push(...sorted);
      continue;
    }

    const [first, second] = sorted;
    let done = false;
    const weekdayOrder = orderedWeekdaysForLesson(
      first,
      input.weekdays,
      classBusy,
      teacherBusy,
    );

    for (const weekday of weekdayOrder) {
      for (const [p1, p2] of DOUBLE_PERIOD_PAIRS) {
        if (
          !input.periodNumbers.includes(p1) ||
          !input.periodNumbers.includes(p2) ||
          p1 === p2
        ) {
          continue;
        }
        if (
          canPlaceSubject(first, weekday, p1) &&
          canPlaceSubject(second, weekday, p2)
        ) {
          occupy(first, weekday, p1);
          occupy(second, weekday, p2);
          done = true;
          break;
        }
        if (
          canPlaceSubject(first, weekday, p2) &&
          canPlaceSubject(second, weekday, p1)
        ) {
          occupy(first, weekday, p2);
          occupy(second, weekday, p1);
          done = true;
          break;
        }
      }
      if (done) break;
    }

    if (!done) {
      for (const weekday of weekdayOrder) {
        const periods = orderedPeriods(input.periodNumbers, weekday, classBusy);
        for (let i = 0; i < periods.length && !done; i++) {
          for (let j = i + 1; j < periods.length; j++) {
            const p1 = periods[i];
            const p2 = periods[j];
            if (p1 === p2) continue;
            if (
              canPlaceSubject(first, weekday, p1) &&
              canPlaceSubject(second, weekday, p2)
            ) {
              occupy(first, weekday, p1);
              occupy(second, weekday, p2);
              done = true;
              break;
            }
          }
        }
        if (done) break;
      }
    }

    if (!done) {
      unplaced.push(first, second);
    }

    for (const extra of sorted.slice(2)) {
      singles.push(extra);
    }
  }

  const teacherLoad = new Map<string, number>();
  for (const lesson of singles) {
    if (!lesson.teacherUserId) continue;
    teacherLoad.set(
      lesson.teacherUserId,
      (teacherLoad.get(lesson.teacherUserId) ?? 0) + 1,
    );
  }

  singles.sort((a, b) => {
    const loadA = a.teacherUserId ? (teacherLoad.get(a.teacherUserId) ?? 0) : 0;
    const loadB = b.teacherUserId ? (teacherLoad.get(b.teacherUserId) ?? 0) : 0;
    return loadB - loadA;
  });

  for (const lesson of singles) {
    let ok = false;
    const weekdayOrder = orderedWeekdaysForLesson(
      lesson,
      input.weekdays,
      classBusy,
      teacherBusy,
    );
    for (const weekday of weekdayOrder) {
      for (const periodNumber of orderedPeriods(
        input.periodNumbers,
        weekday,
        classBusy,
      )) {
        if (canPlaceSubject(lesson, weekday, periodNumber)) {
          occupy(lesson, weekday, periodNumber);
          ok = true;
          break;
        }
      }
      if (ok) break;
    }
    if (!ok) unplaced.push(lesson);
  }

  return { placed, unplaced };
}
