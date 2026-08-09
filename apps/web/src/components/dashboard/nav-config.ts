import type { UserRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
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
  },
  {
    href: "/admin/library",
    label: "eLibrary",
    icon: "library",
    roles: ["admin", "staff"],
    permission: Permission.LIBRARY_READ,
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: "users",
    roles: ["admin", "staff"],
    permission: Permission.TEACHERS_READ,
  },
  {
    href: "/admin/attendance",
    label: "Attendance",
    icon: "attendance",
    roles: ["admin", "staff"],
    permission: Permission.ATTENDANCE_MANAGE,
  },
  {
    href: "/admin/results",
    label: "Results",
    icon: "results",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
  },
  {
    href: "/admin/report-cards",
    label: "Report cards",
    icon: "report-card",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
  },
  {
    href: "/admin/results/templates",
    label: "Assessment templates",
    icon: "templates",
    roles: ["admin", "staff"],
    permission: Permission.RESULTS_READ,
  },
  {
    href: "/admin/finance",
    label: "Finance",
    icon: "finance",
    roles: ["admin", "staff"],
    permission: Permission.FINANCE_READ,
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
  },
  {
    href: "/teacher/results",
    label: "Results",
    icon: "results",
    roles: ["teacher"],
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
    ],
  },
  { href: "/teacher/classwork", label: "Assignments", icon: "library", roles: ["teacher"] },
  { href: "/teacher/worksheets", label: "Worksheets", icon: "results", roles: ["teacher"] },
  { href: "/teacher/timetable", label: "Timetable", icon: "calendar", roles: ["teacher"] },
  {
    href: "/teacher/library",
    label: "eLibrary",
    icon: "library",
    roles: ["teacher"],
    children: [
      { href: "/teacher/library", label: "Browse", description: "Search & discover" },
      { href: "/teacher/library/progress", label: "Progress", description: "My uploads" },
      { href: "/teacher/library/ai", label: "AI Assistant", description: "Summarize & quiz", tone: "ai" },
    ],
  },
  { href: "/teacher/id-card", label: "Staff ID", icon: "students", roles: ["teacher"] },
  { href: "/teacher/profile", label: "Profile", icon: "profile", roles: ["teacher"] },
  { href: "/parent", label: "Overview", icon: "overview", roles: ["parent"] },
  { href: "/parent/fees", label: "Fees", icon: "fees", roles: ["parent"] },
  { href: "/parent/timetable", label: "Timetable", icon: "calendar", roles: ["parent"] },
  { href: "/parent/profile", label: "Profile", icon: "profile", roles: ["parent"] },
  { href: "/student", label: "Overview", icon: "overview", roles: ["student"] },
  { href: "/student/id-card", label: "Campus ID", icon: "students", roles: ["student"] },
  { href: "/student/attendance", label: "Attendance", icon: "attendance", roles: ["student"] },
  { href: "/student/results", label: "Results", icon: "results", roles: ["student"] },
  { href: "/student/report-card", label: "Report card", icon: "report-card", roles: ["student"] },
  { href: "/student/classwork", label: "Assignments", icon: "library", roles: ["student"] },
  { href: "/student/worksheets", label: "Worksheets", icon: "results", roles: ["student"] },
  { href: "/student/fees", label: "Fees", icon: "fees", roles: ["student"] },
  { href: "/student/timetable", label: "Timetable", icon: "calendar", roles: ["student"] },
  {
    href: "/student/library",
    label: "eLibrary",
    icon: "library",
    roles: ["student"],
    children: [
      { href: "/student/library", label: "Browse", description: "Search & discover" },
      { href: "/student/library/progress", label: "Progress", description: "Reading & saves" },
      { href: "/student/library/ai", label: "AI Assistant", description: "Summarize & quiz", tone: "ai" },
    ],
  },
  { href: "/student/profile", label: "Profile", icon: "profile", roles: ["student"] },
];

export function navForRole(role: UserRole, options?: { canTakeAttendance?: boolean }) {
  return DASHBOARD_NAV.filter((n) => {
    if (!n.roles.includes(role)) return false;
    if (n.homeroomOnly && role === "teacher" && !options?.canTakeAttendance) {
      return false;
    }
    if (n.permission && (role === "admin" || role === "staff")) {
      return hasPermission(n.permission);
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
  if (href === "/student/results") {
    return (
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      !pathname.startsWith("/student/report-card")
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
    href === "/teacher/results"
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
  parent: ["/parent", "/parent/fees", "/parent/timetable", "/parent/profile"],
  student: ["/student", "/student/results", "/student/classwork", "/student/timetable"],
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
