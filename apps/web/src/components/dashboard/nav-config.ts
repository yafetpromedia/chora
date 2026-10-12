import type { UserRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import type { SchoolModuleKey } from "@/lib/module-catalog";
import type { DashIconName } from "./dash-icons";

export type NavChild = {
  href: string;
  label: string;
  description?: string;
  /** Visual accent for special items (e.g. AI). */
  tone?: "ai";
};

export type NavItem = {
  href: string;
  label: string;
  icon: DashIconName;
  roles: UserRole[];
  /** If set, user must have this permission (staff/registrar/finance). */
  permission?: string;
  /** Teacher-only: show only when homeroom is assigned. */
  homeroomOnly?: boolean;
  /** Billable school module required (from subscription entitlements). */
  module?: SchoolModuleKey;
  /** Optional sub-sections shown in the sidebar when this item is active. */
  children?: NavChild[];
};

export const DASHBOARD_NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: "overview",
    roles: ["admin", "staff"],
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: "students",
    roles: ["admin", "staff"],
    permission: Permission.STUDENTS_READ,
  },
  {
    href: "/admin/admissions",
    label: "Admissions",
    icon: "students",
    roles: ["admin", "staff"],
    permission: Permission.ADMISSIONS_READ,
  },
  {
    href: "/admin/parents",
    label: "Parents",
    icon: "profile",
    roles: ["admin", "staff"],
    permission: Permission.STUDENTS_READ,
  },
  {
    href: "/admin/academics",
    label: "Academics",
    icon: "calendar",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
  },
  {
    href: "/admin/teachers",
    label: "Teachers",
    icon: "teachers",
    roles: ["admin", "staff"],
    permission: Permission.TEACHERS_READ,
  },
  {
    href: "/admin/subjects/assign",
    label: "Assign subjects",
    icon: "assign",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
  },
  {
    href: "/admin/subjects",
    label: "Subjects",
    icon: "subjects",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
  },
  {
    href: "/admin/timetable",
    label: "Timetable",
    icon: "calendar",
    roles: ["admin", "staff"],
    permission: Permission.TIMETABLE_READ,
    module: "timetable",
  },
  {
    href: "/admin/exams",
    label: "Exam schedules",
    icon: "results",
    roles: ["admin", "staff"],
    permission: Permission.TIMETABLE_READ,
    module: "timetable",
  },
  {
    href: "/admin/library",
    label: "eLibrary",
    icon: "library",
    roles: ["admin", "staff"],
    permission: Permission.LIBRARY_READ,
    module: "library",
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: "users",
    roles: ["admin", "staff"],
    permission: Permission.TEACHERS_READ,
  },
  {
    href: "/admin/hr/employees",
    label: "People",
    icon: "users",
    roles: ["admin", "staff"],
    permission: Permission.HR_EMPLOYEES_READ,
    module: "payroll",
    children: [
      {
        href: "/admin/hr/employees",
        label: "Employees",
      },
      {
        href: "/admin/hr/departments",
        label: "Departments",
      },
      {
        href: "/admin/hr/positions",
        label: "Positions",
      },
    ],
  },
  {
    href: "/admin/payroll",
    label: "Payroll",
    icon: "finance",
    roles: ["admin", "staff"],
    permission: Permission.PAYROLL_VIEW,
    module: "payroll",
    children: [
      {
        href: "/admin/payroll",
        label: "Runs",
      },
      {
        href: "/admin/payroll/settings",
        label: "Settings",
      },
    ],
  },
  {
    href: "/admin/attendance",
    label: "Attendance",
    icon: "attendance",
    roles: ["admin", "staff"],
    permission: Permission.ATTENDANCE_MANAGE,
    module: "attendance",
    children: [
      {
        href: "/admin/attendance",
        label: "Mark / analytics",
      },
      {
        href: "/admin/attendance/concerns",
        label: "Concerns",
      },
    ],
  },
  {
    href: "/admin/staff-attendance",
    label: "Staff Attendance",
    icon: "attendance",
    roles: ["admin", "staff"],
    permission: Permission.STAFF_ATTENDANCE_READ,
    module: "attendance",
    children: [
      {
        href: "/admin/staff-attendance",
        label: "Daily roll",
      },
      {
        href: "/admin/staff-attendance/analytics",
        label: "Analytics",
      },
    ],
  },
  {
    href: "/admin/leave",
    label: "Leave",
    icon: "calendar",
    roles: ["admin", "staff"],
    permission: Permission.LEAVE_READ,
    module: "attendance",
  },
  {
    href: "/admin/my-attendance",
    label: "My Attendance",
    icon: "profile",
    roles: ["admin", "staff"],
    permission: Permission.STAFF_ATTENDANCE_SELF,
    module: "attendance",
  },
  {
    href: "/admin/payroll/me",
    label: "My Payslips",
    icon: "fees",
    roles: ["admin", "staff"],
    permission: Permission.PAYSLIP_SELF,
    module: "payroll",
  },
  {
    href: "/admin/results",
    label: "Results",
    icon: "results",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
    module: "results",
  },
  {
    href: "/admin/report-cards",
    label: "Report cards",
    icon: "report-card",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
    module: "results",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: "chart",
    roles: ["admin", "staff"],
  },
  {
    href: "/admin/results/templates",
    label: "Assessment templates",
    icon: "templates",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
    module: "results",
  },
  {
    href: "/admin/finance",
    label: "Finance",
    icon: "finance",
    roles: ["admin", "staff"],
    permission: Permission.FINANCE_READ,
    module: "finance",
  },
  {
    href: "/admin/billing",
    label: "Billing",
    icon: "fees",
    roles: ["admin"],
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: "announcements",
    roles: ["admin", "staff"],
    permission: Permission.ANNOUNCEMENTS_MANAGE,
  },
  {
    href: "/admin/support",
    label: "Support",
    icon: "support",
    roles: ["admin", "staff"],
    permission: Permission.SCHOOL_SETTINGS,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "settings",
    roles: ["admin", "staff"],
    permission: Permission.SCHOOL_SETTINGS,
  },
  {
    href: "/admin/profile",
    label: "Profile",
    icon: "profile",
    roles: ["admin", "staff"],
  },
  { href: "/teacher", label: "Overview", icon: "overview", roles: ["teacher"] },
  {
    href: "/teacher/attendance",
    label: "Attendance",
    icon: "attendance",
    roles: ["teacher"],
    homeroomOnly: true,
    module: "attendance",
  },
  {
    href: "/teacher/classes-today",
    label: "My Classes",
    icon: "calendar",
    roles: ["teacher"],
    permission: Permission.ATTENDANCE_CONCERNS_REPORT,
    module: "attendance",
  },
  {
    href: "/teacher/attendance/concerns",
    label: "Attendance Concerns",
    icon: "alert",
    roles: ["teacher"],
    permission: Permission.ATTENDANCE_CONCERNS_REPORT,
    module: "attendance",
  },
  {
    href: "/teacher/my-attendance",
    label: "My Attendance",
    icon: "profile",
    roles: ["teacher"],
    permission: Permission.STAFF_ATTENDANCE_SELF,
    module: "attendance",
  },
  {
    href: "/teacher/payroll/me",
    label: "My Payslips",
    icon: "fees",
    roles: ["teacher"],
    permission: Permission.PAYSLIP_SELF,
    module: "payroll",
  },
  {
    href: "/teacher/results",
    label: "Results",
    icon: "results",
    roles: ["teacher"],
    module: "results",
    children: [
      {
        href: "/teacher/results",
        label: "Class score sheet",
        description: "All students, one subject",
      },
      {
        href: "/teacher/results/by-student",
        label: "By student",
        description: "Subject rows per learner",
      },
      {
        href: "/teacher/results/score-reports",
        label: "Score reports",
        description: "Propose fixes after publish",
      },
    ],
  },
  {
    href: "/teacher/classwork",
    label: "Assignments",
    icon: "library",
    roles: ["teacher"],
    module: "classroom",
  },
  {
    href: "/teacher/worksheets",
    label: "Worksheets",
    icon: "results",
    roles: ["teacher"],
    module: "worksheets",
  },
  {
    href: "/teacher/timetable",
    label: "Timetable",
    icon: "calendar",
    roles: ["teacher"],
    module: "timetable",
  },
  {
    href: "/teacher/exams",
    label: "Exam schedules",
    icon: "calendar",
    roles: ["teacher"],
    module: "timetable",
  },
  {
    href: "/teacher/library",
    label: "eLibrary",
    icon: "library",
    roles: ["teacher"],
    module: "library",
    children: [
      { href: "/teacher/library", label: "Browse", description: "Search & discover" },
      { href: "/teacher/library/progress", label: "Progress", description: "My uploads" },
      { href: "/teacher/library/ai", label: "AI Assistant", description: "Summarize & quiz", tone: "ai" },
    ],
  },
  { href: "/teacher/id-card", label: "Staff ID", icon: "students", roles: ["teacher"] },
  { href: "/teacher/profile", label: "Profile", icon: "profile", roles: ["teacher"] },
  { href: "/parent", label: "Overview", icon: "overview", roles: ["parent"], module: "parent" },
  {
    href: "/parent/attendance",
    label: "Attendance",
    icon: "attendance",
    roles: ["parent"],
    module: "attendance",
  },
  {
    href: "/parent/results",
    label: "Results",
    icon: "results",
    roles: ["parent"],
    module: "results",
  },
  {
    href: "/parent/report-card",
    label: "Report card",
    icon: "report-card",
    roles: ["parent"],
    module: "results",
  },
  {
    href: "/parent/fees",
    label: "Fees",
    icon: "fees",
    roles: ["parent"],
    module: "finance",
  },
  {
    href: "/parent/timetable",
    label: "Timetable",
    icon: "calendar",
    roles: ["parent"],
    module: "timetable",
  },
  {
    href: "/parent/exams",
    label: "Exam schedules",
    icon: "calendar",
    roles: ["parent"],
    module: "timetable",
  },
  { href: "/parent/profile", label: "Profile", icon: "profile", roles: ["parent"] },
  { href: "/student", label: "Overview", icon: "overview", roles: ["student"] },
  { href: "/student/id-card", label: "Campus ID", icon: "students", roles: ["student"] },
  {
    href: "/student/attendance",
    label: "Attendance",
    icon: "attendance",
    roles: ["student"],
    module: "attendance",
  },
  {
    href: "/student/results",
    label: "Results",
    icon: "results",
    roles: ["student"],
    module: "results",
  },
  {
    href: "/student/report-card",
    label: "Report card",
    icon: "report-card",
    roles: ["student"],
    module: "results",
  },
  {
    href: "/student/classwork",
    label: "Assignments",
    icon: "library",
    roles: ["student"],
    module: "classroom",
  },
  {
    href: "/student/worksheets",
    label: "Worksheets",
    icon: "results",
    roles: ["student"],
    module: "worksheets",
  },
  {
    href: "/student/fees",
    label: "Fees",
    icon: "fees",
    roles: ["student"],
    module: "finance",
  },
  {
    href: "/student/timetable",
    label: "Timetable",
    icon: "calendar",
    roles: ["student"],
    module: "timetable",
  },
  {
    href: "/student/exams",
    label: "Exam schedules",
    icon: "calendar",
    roles: ["student"],
    module: "timetable",
  },
  {
    href: "/student/library",
    label: "eLibrary",
    icon: "library",
    roles: ["student"],
    module: "library",
    children: [
      { href: "/student/library", label: "Browse", description: "Search & discover" },
      { href: "/student/library/progress", label: "Progress", description: "Reading & saves" },
      { href: "/student/library/ai", label: "AI Assistant", description: "Summarize & quiz", tone: "ai" },
    ],
  },
  { href: "/student/profile", label: "Profile", icon: "profile", roles: ["student"] },
];

export function navForRole(
  role: UserRole,
  options?: {
    canTakeAttendance?: boolean;
    enabledModules?: string[] | null;
  },
) {
  const modules = options?.enabledModules;
  return DASHBOARD_NAV.filter((n) => {
    if (!n.roles.includes(role)) return false;
    if (n.homeroomOnly && role === "teacher" && !options?.canTakeAttendance) {
      return false;
    }
    if (n.permission) {
      if (!hasPermission(n.permission)) return false;
    }
    // Fail closed: module-gated items stay hidden until entitlements load.
    if (n.module) {
      if (!modules || !modules.includes(n.module)) return false;
    }
    return true;
  });
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/teacher" || href === "/parent" || href === "/student") {
    return pathname === href;
  }
  // If we have nested routes that should not mark the parent item as active,
  // handle them explicitly here.
  if (href === "/admin/academics") {
    return (
      pathname === href ||
      pathname.startsWith("/admin/results/academic-years") ||
      pathname.startsWith("/admin/results/terms")
    );
  }
  if (href === "/admin/subjects") {
    return (
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      !pathname.startsWith("/admin/subjects/assign")
    );
  }
  if (href === "/admin/results") {
    return (
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      !pathname.startsWith("/admin/results/templates") &&
      !pathname.startsWith("/admin/results/academic-years") &&
      !pathname.startsWith("/admin/results/terms") &&
      !pathname.startsWith("/admin/results/print")
    );
  }
  if (href === "/admin/report-cards") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/admin/results/print")
    );
  }
  if (href === "/student/results" || href === "/parent/results") {
    const reportCard =
      href === "/student/results" ? "/student/report-card" : "/parent/report-card";
    return (
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      !pathname.startsWith(reportCard)
    );
  }
  if (href === "/student/library" || href === "/teacher/library" || href === "/teacher/results") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavChildActive(pathname: string, href: string) {
  if (
    href === "/student/library" ||
    href === "/teacher/library" ||
    href === "/teacher/results" ||
    href === "/admin/payroll"
  ) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Preferred bottom-tab destinations per role (first available wins). */
const MOBILE_TAB_PREFERENCE: Record<UserRole, string[]> = {
  admin: [
    "/admin",
    "/admin/students",
    "/admin/attendance",
    "/admin/results",
    "/admin/finance",
  ],
  staff: [
    "/admin",
    "/admin/students",
    "/admin/attendance",
    "/admin/results",
    "/admin/finance",
  ],
  teacher: ["/teacher", "/teacher/results", "/teacher/classwork", "/teacher/timetable"],
  parent: ["/parent", "/parent/results", "/parent/fees", "/parent/timetable"],
  student: ["/student", "/student/results", "/student/classwork", "/student/timetable", "/student/exams"],
};

/**
 * Pick up to `maxTabs` primary items for the mobile bottom tab bar.
 * Falls back to remaining nav items when preferred routes are unavailable
 * (e.g. staff without Results permission).
 */
export function mobilePrimaryNav(nav: NavItem[], role: UserRole, maxTabs = 4): NavItem[] {
  const prefs = MOBILE_TAB_PREFERENCE[role] ?? [];
  const remaining = new Map(nav.map((item) => [item.href, item]));
  const picked: NavItem[] = [];

  for (const href of prefs) {
    const item = remaining.get(href);
    if (!item) continue;
    picked.push(item);
    remaining.delete(href);
    if (picked.length >= maxTabs) return picked;
  }

  for (const item of nav) {
    if (!remaining.has(item.href)) continue;
    if (item.href.endsWith("/profile") && nav.length > maxTabs) continue;
    picked.push(item);
    remaining.delete(item.href);
    if (picked.length >= maxTabs) break;
  }

  return picked;
}

/** True when pathname is not covered by any primary tab (More should highlight). */
export function isMobileMoreActive(pathname: string, tabs: NavItem[]) {
  return !tabs.some((tab) => isNavActive(pathname, tab.href));
}
