import { Weekday } from '@prisma/client';

export const WEEKDAYS_ORDER: Weekday[] = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  [Weekday.MONDAY]: 'Monday',
  [Weekday.TUESDAY]: 'Tuesday',
  [Weekday.WEDNESDAY]: 'Wednesday',
  [Weekday.THURSDAY]: 'Thursday',
  [Weekday.FRIDAY]: 'Friday',
  [Weekday.SATURDAY]: 'Saturday',
  [Weekday.SUNDAY]: 'Sunday',
};

export function currentWeekday(): Weekday {
  const js = new Date().getDay();
  const map: Weekday[] = [
    Weekday.SUNDAY,
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
    Weekday.SATURDAY,
  ];
  return map[js] ?? Weekday.MONDAY;
}

export const DEFAULT_PERIOD_COUNT = 8;
