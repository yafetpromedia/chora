import { apiFetch, apiPatch, apiPost } from "@/lib/api";

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type TimetablePeriod = {
  id: string;
  number: number;
  label: string;
  startTime: string | null;
  endTime: string | null;
  sortOrder?: number;
};

export type TimetableSlot = {
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
  studentName?: string;
};

export type TimetableDaySchedule = {
  academicYear?: { id: string; name: string };
  weekday: Weekday;
  weekdayLabel: string;
  slots: TimetableSlot[];
};

export type TimetableGrid = {
  timetable: { id: string; academicYearId: string; name: string };
  weekdays: Weekday[];
  weekdayLabels: Record<Weekday, string>;
  periods: TimetablePeriod[];
  entries: TimetableSlot[];
  subjects: { id: string; name: string; code: string }[];
  teachers: { userId: string; name: string }[];
};

export async function ensureTimetable(academicYearId: string) {
  return apiPost<{ id: string; academicYearId: string }>(
    "/schools/timetable/ensure",
    { academicYearId },
  );
}

export async function getTimetableGrid(
  academicYearId: string,
  gradeId: string,
  sectionId?: string,
) {
  const q = new URLSearchParams({ academicYearId, gradeId });
  if (sectionId) q.set("sectionId", sectionId);
  return apiFetch<TimetableGrid>(`/schools/timetable/grid?${q}`);
}

export async function saveTimetableEntries(body: {
  academicYearId: string;
  gradeId: string;
  sectionId?: string;
  entries: {
    weekday: Weekday;
    periodNumber: number;
    subjectId: string;
    teacherUserId?: string | null;
    roomName?: string | null;
  }[];
}) {
  return apiPatch<TimetableGrid>("/schools/timetable/entries", body);
}

export async function getMyTimetableToday(weekday?: Weekday) {
  const q = weekday ? `?weekday=${weekday}` : "";
  return apiFetch<TimetableDaySchedule>(`/schools/timetable/me/today${q}`);
}

export async function getMyTimetableWeek() {
  return apiFetch<{
    academicYear: { id: string; name: string };
    days: { weekday: Weekday; weekdayLabel: string; slots: TimetableSlot[] }[];
  }>("/schools/timetable/me/week");
}
