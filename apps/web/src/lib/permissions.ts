export type UserRole = "admin" | "staff" | "teacher" | "student" | "parent";

export const AUTH_PERMISSIONS_KEY = "edu_os_permissions";
export const AUTH_ROLE_TEMPLATE_KEY = "edu_os_role_template";
/** Must match AUTH_ROLE_KEY in auth.ts (kept here to avoid circular imports). */
const AUTH_ROLE_STORAGE_KEY = "edu_os_role";

export const Permission = {
  SCHOOL_DASHBOARD: "school.dashboard",
  SCHOOL_SETTINGS: "school.settings",
  STUDENTS_READ: "students.read",
  STUDENTS_CREATE: "students.create",
  STUDENTS_EDIT: "students.edit",
  STUDENTS_DELETE: "students.delete",
  STUDENTS_CARDS: "students.cards",
  ADMISSIONS_READ: "admissions.read",
  ADMISSIONS_MANAGE: "admissions.manage",
  TEACHERS_READ: "teachers.read",
  TEACHERS_MANAGE: "teachers.manage",
  ATTENDANCE_READ: "attendance.read",
  ATTENDANCE_MANAGE: "attendance.manage",
  ATTENDANCE_ANALYTICS: "attendance.analytics",
  RESULTS_READ: "results.read",
  RESULTS_MANAGE: "results.manage",
  RESULTS_APPROVE: "results.approve",
  TIMETABLE_READ: "timetable.read",
  TIMETABLE_MANAGE: "timetable.manage",
  FINANCE_READ: "finance.read",
  FINANCE_MANAGE: "finance.manage",
  ANNOUNCEMENTS_MANAGE: "announcements.manage",
  PARENT_MESSAGES: "parent.messages",
  LIBRARY_READ: "library.read",
  LIBRARY_MANAGE: "library.manage",
  LIBRARY_UPLOAD: "library.upload",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export function getStoredPermissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUTH_PERMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function permissionMatches(
  userPermissions: string[],
  required: string,
): boolean {
  if (userPermissions.includes(required)) return true;
  if (required.endsWith(".*")) {
    const prefix = required.slice(0, -2);
    return userPermissions.some((p) => p.startsWith(`${prefix}.`));
  }
  const [category] = required.split(".");
  return userPermissions.includes(`${category}.*`);
}

export function hasPermission(required: PermissionKey | string): boolean {
  if (typeof window !== "undefined") {
    const template = localStorage.getItem(AUTH_ROLE_TEMPLATE_KEY);
    if (template === "school_admin") return true;
    const role = localStorage.getItem(AUTH_ROLE_STORAGE_KEY);
    const perms = getStoredPermissions();
    // Match API fallback: legacy admin sessions without stored grants
    if (role === "admin" && perms.length === 0) return true;
  }
  return permissionMatches(getStoredPermissions(), required);
}

export type PermissionModule = {
  id: string;
  label: string;
  description: string;
  keys: PermissionKey[];
};

/** One-switch module access (maps to multiple permission keys). */
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "admissions",
    label: "Admissions",
    description: "Applications, placement rules, and enrollment",
    keys: [Permission.ADMISSIONS_READ, Permission.ADMISSIONS_MANAGE],
  },
];

export const PERMISSION_MODULE_KEY_SET = new Set(
  PERMISSION_MODULES.flatMap((module) => module.keys),
);

export const ROLE_TEMPLATE_LABELS: Record<string, string> = {
  school_admin: "School admin",
  principal: "Principal",
  academic_director: "Academic director",
  registrar: "Registrar",
  finance_officer: "Finance officer",
  reception: "Reception",
  attendance_officer: "Attendance officer",
  homeroom_teacher: "Homeroom teacher",
  subject_teacher: "Subject teacher",
};
