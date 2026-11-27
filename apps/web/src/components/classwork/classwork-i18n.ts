import type { ClassworkStatus, ClassworkType } from "@/lib/classwork";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function teacherPrefix(mode: ClassworkType) {
  return mode === "ASSIGNMENT" ? "classworkUi.teacherAssign_" : "classworkUi.teacherWorksheet_";
}

export function studentPrefix(mode: ClassworkType) {
  return mode === "ASSIGNMENT" ? "classworkUi.studentAssign_" : "classworkUi.studentWorksheet_";
}

export function cwField(t: TFn, prefix: string, field: string) {
  return t(`${prefix}${field}`);
}

const STATUS_KEYS: Record<string, string> = {
  DRAFT: "classworkUi.statusDraft",
  PUBLISHED: "classworkUi.statusPublished",
  CLOSED: "classworkUi.statusClosed",
  SUBMITTED: "classworkUi.statusSubmitted",
  LATE: "classworkUi.statusLate",
  GRADED: "classworkUi.statusGraded",
  PENDING: "classworkUi.statusPending",
};

export function classworkStatusLabel(t: TFn, status: string) {
  const key = STATUS_KEYS[status as ClassworkStatus];
  return key ? t(key) : status;
}