import { Weekday } from '@prisma/client';

export const WEEKDAY_ORDER: Weekday[] = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
];

export const DEFAULT_WEEKEND_DAYS: Weekday[] = [
  Weekday.SATURDAY,
  Weekday.SUNDAY,
];

const JS_TO_WEEKDAY: Weekday[] = [
  Weekday.SUNDAY,
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
];

export function weekdayFromDate(date: Date, utc = true): Weekday {
  const js = utc ? date.getUTCDay() : date.getDay();
  return JS_TO_WEEKDAY[js] ?? Weekday.SUNDAY;
}

export function normalizeWeekendDays(
  days: Weekday[] | null | undefined,
): Weekday[] {
  if (!days || days.length === 0) return [...DEFAULT_WEEKEND_DAYS];
  const unique = [...new Set(days)];
  return WEEKDAY_ORDER.filter((d) => unique.includes(d));
}

export function isWeekendDay(
  date: Date,
  weekendDays: Weekday[] | null | undefined,
  utc = true,
): boolean {
  const weekends = normalizeWeekendDays(weekendDays);
  return weekends.includes(weekdayFromDate(date, utc));
}

/** Inclusive count of school days between two UTC dates (weekends excluded). */
export function countSchoolDays(
  start: Date,
  end: Date,
  weekendDays: Weekday[] | null | undefined,
): number {
  if (end < start) return 0;
  const weekends = new Set(normalizeWeekendDays(weekendDays));
  let count = 0;
  const cur = new Date(start);
  cur.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);
  while (cur <= last) {
    if (!weekends.has(weekdayFromDate(cur, true))) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}
