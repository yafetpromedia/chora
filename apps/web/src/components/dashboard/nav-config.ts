import type { UserRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import type { DashIconName } from "./dash-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: DashIconName;
  roles: UserRole[];
  /** If set, user must have this permission (staff/registrar/finance). */
  permission?: string;
};

export const DASHBOARD_NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: "overview",
    roles: ["admin", "staff"],
    permission: Permission.SCHOOL_DASHBOARD,
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: "students",
    roles: ["admin", "staff"],
    permission: Permission.STUDENTS_READ,
  },
  {
    href: "/admin/parents",
    label: "Parents",
    icon: "profile",
    roles: ["admin", "staff"],
    permission: Permission.STUDENTS_READ,
  },
  {
    href: "/admin/teachers",
    label: "Teachers",
    icon: "teachers",
    roles: ["admin", "staff"],
    permission: Permission.TEACHERS_READ,
  },
  {
    href: "/admin/subjects",
    label: "Subjects",
    icon: "results",
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
    href: "/admin/results/templates",
    label: "Assessment templates",
    icon: "results",
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
  { href: "/teacher/attendance", label: "Attendance", icon: "attendance", roles: ["teacher"] },
  { href: "/teacher/results", label: "Results", icon: "results", roles: ["teacher"] },
  { href: "/teacher/timetable", label: "Timetable", icon: "calendar", roles: ["teacher"] },
  { href: "/teacher/library", label: "eLibrary", icon: "library", roles: ["teacher"] },
  { href: "/teacher/profile", label: "Profile", icon: "profile", roles: ["teacher"] },
  { href: "/parent", label: "Overview", icon: "overview", roles: ["parent"] },
  { href: "/parent/fees", label: "Fees", icon: "fees", roles: ["parent"] },
  { href: "/parent/timetable", label: "Timetable", icon: "calendar", roles: ["parent"] },
  { href: "/parent/profile", label: "Profile", icon: "profile", roles: ["parent"] },
  { href: "/student", label: "Overview", icon: "overview", roles: ["student"] },
  { href: "/student/id-card", label: "Campus ID", icon: "students", roles: ["student"] },
  { href: "/student/results", label: "Results", icon: "results", roles: ["student"] },
  { href: "/student/fees", label: "Fees", icon: "fees", roles: ["student"] },
  { href: "/student/timetable", label: "Timetable", icon: "calendar", roles: ["student"] },
  { href: "/student/library", label: "eLibrary", icon: "library", roles: ["student"] },
  { href: "/student/profile", label: "Profile", icon: "profile", roles: ["student"] },
];

export function navForRole(role: UserRole) {
  return DASHBOARD_NAV.filter((n) => {
    if (!n.roles.includes(role)) return false;
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
  if (href === "/admin/results") {
    // When browsing assessment templates, highlight that item only.
    return pathname === href || pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/templates`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
