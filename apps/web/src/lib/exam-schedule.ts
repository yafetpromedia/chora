import { apiDelete, apiFetch, apiPatch, apiPost, apiPut } from "@/lib/api";

export type ExamScheduleStatus = "DRAFT" | "PUBLISHED";

export type ExamScheduleSlot = {
  id: string;
  gradeId: string;
  grade: { id: string; name: string; sortOrder: number };
  subjectId: string | null;
  subject: { id: string; name: string; code: string } | null;
  subjectLabel: string;
  startTime: string | null;
  endTime: string | null;
  sortOrder: number;
};

export type ExamScheduleDay = {
  id: string;
  examDate: string;
  isStudyDay: boolean;
  studyNote: string | null;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  sortOrder: number;
  slots: ExamScheduleSlot[];
};

export type ExamSchedule = {
  id: string;
  academicYearId: string;
  academicTermId: string | null;
  title: string;
  shiftLabel: string | null;
  notes: string | null;
  status: ExamScheduleStatus;
  academicYear: { id: string; name: string };
  academicTerm: { id: string; name: string } | null;
  days: ExamScheduleDay[];
  createdAt: string;
  updatedAt: string;
};

export type ExamScheduleListItem = {
  id: string;
  title: string;
  shiftLabel: string | null;
  status: ExamScheduleStatus;
  academicYear: { id: string; name: string };
  academicTerm: { id: string; name: string } | null;
  _count: { days: number };
  updatedAt: string;
};

export type ExamScheduleDayInput = {
  examDate: string;
  isStudyDay?: boolean;
  studyNote?: string | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  sortOrder?: number;
  slots: {
    gradeId: string;
    subjectId?: string | null;
    subjectLabel: string;
    startTime?: string | null;
    endTime?: string | null;
    sortOrder?: number;
  }[];
};

export type PublishedExamSchedule = ExamSchedule & {
  focusGradeId: string | null;
};

export async function listExamSchedules(academicYearId?: string) {
  const q = academicYearId
    ? `?${new URLSearchParams({ academicYearId })}`
    : "";
  return apiFetch<ExamScheduleListItem[]>(`/schools/exam-schedules${q}`);
}

export async function getExamSchedule(id: string) {
  return apiFetch<ExamSchedule>(`/schools/exam-schedules/${id}`);
}

export async function listPublishedExamSchedules() {
  return apiFetch<ExamScheduleListItem[]>("/schools/exam-schedules/published");
}

export async function getPublishedExamSchedule(
  id: string,
  studentProfileId?: string,
) {
  const q = studentProfileId
    ? `?${new URLSearchParams({ studentProfileId })}`
    : "";
  return apiFetch<PublishedExamSchedule>(
    `/schools/exam-schedules/published/${id}${q}`,
  );
}

export async function createExamSchedule(body: {
  academicYearId: string;
  academicTermId?: string | null;
  title: string;
  shiftLabel?: string | null;
  notes?: string | null;
}) {
  return apiPost<ExamSchedule>("/schools/exam-schedules", body);
}

export async function updateExamSchedule(
  id: string,
  body: {
    title?: string;
    academicTermId?: string | null;
    shiftLabel?: string | null;
    notes?: string | null;
    status?: ExamScheduleStatus;
  },
) {
  return apiPatch<ExamSchedule>(`/schools/exam-schedules/${id}`, body);
}

export async function saveExamScheduleDays(
  id: string,
  days: ExamScheduleDayInput[],
) {
  return apiPut<ExamSchedule>(`/schools/exam-schedules/${id}/days`, { days });
}

export async function deleteExamSchedule(id: string) {
  return apiDelete<{ ok: boolean }>(`/schools/exam-schedules/${id}`);
}

export type ExamSeatingRoomInput = {
  name: string;
  roomRef?: string | null;
  capacity?: number;
};

export type ExamSeatingAssignment = {
  id: string;
  studentProfileId: string;
  seatNo: number;
  studentName: string;
  gradeLabel: string;
  sectionLabel: string | null;
};

export type ExamSeatingRoom = {
  id: string;
  name: string;
  roomRef: string | null;
  capacity: number;
  sortOrder: number;
  assignments?: ExamSeatingAssignment[];
  _count?: { assignments: number };
};

export type ExamSeatingPlanListItem = {
  id: string;
  title: string;
  notes: string | null;
  sourceGradeIds: string[];
  rooms: ExamSeatingRoom[];
  updatedAt: string;
};

export type ExamSeatingPlan = {
  id: string;
  scheduleId: string;
  title: string;
  notes: string | null;
  sourceGradeIds: string[];
  rooms: Array<ExamSeatingRoom & { assignments: ExamSeatingAssignment[] }>;
  createdAt: string;
  updatedAt: string;
};

export async function listExamSeatingPlans(scheduleId: string) {
  return apiFetch<ExamSeatingPlanListItem[]>(
    `/schools/exam-schedules/${scheduleId}/seating`,
  );
}

export async function getExamSeatingPlan(scheduleId: string, planId: string) {
  return apiFetch<ExamSeatingPlan>(
    `/schools/exam-schedules/${scheduleId}/seating/${planId}`,
  );
}

export async function createExamSeatingPlan(
  scheduleId: string,
  body: {
    title: string;
    notes?: string | null;
    sourceGradeIds: string[];
    rooms: ExamSeatingRoomInput[];
  },
) {
  return apiPost<ExamSeatingPlan>(
    `/schools/exam-schedules/${scheduleId}/seating`,
    body,
  );
}

export async function updateExamSeatingPlan(
  scheduleId: string,
  planId: string,
  body: {
    title?: string;
    notes?: string | null;
    sourceGradeIds: string[];
    rooms: ExamSeatingRoomInput[];
  },
) {
  return apiPut<ExamSeatingPlan>(
    `/schools/exam-schedules/${scheduleId}/seating/${planId}`,
    body,
  );
}

export async function deleteExamSeatingPlan(scheduleId: string, planId: string) {
  return apiDelete<{ ok: boolean }>(
    `/schools/exam-schedules/${scheduleId}/seating/${planId}`,
  );
}

export function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}
