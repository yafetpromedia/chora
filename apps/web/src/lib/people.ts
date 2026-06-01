/** Role templates for classroom teachers only. */
export const TEACHER_ROLE_SLUGS = ["homeroom_teacher", "subject_teacher"] as const;

/** Office / operations team (non-teaching portal accounts). */
export const OFFICE_STAFF_ROLE_SLUGS = [
  "principal",
  "academic_director",
  "registrar",
  "finance_officer",
  "reception",
  "attendance_officer",
] as const;

export type PeopleGroup = "teachers" | "staff";
