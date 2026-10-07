import {
  AUTH_ROLE_TEMPLATE_KEY,
  hasPermission,
  Permission,
  ROLE_TEMPLATE_LABELS,
} from "@/lib/permissions";
import type { DashIconName } from "@/components/dashboard/dash-icons";

export type StaffQuickLink = {
  href: string;
  label: string;
  description: string;
  icon: DashIconName;
};

const STAFF_QUICK_LINKS: Array<StaffQuickLink & { permission: string }> = [
  {
    href: "/admin/students",
    label: "Students",
    description: "Roster, records & ID cards",
    icon: "students",
    permission: Permission.STUDENTS_READ,
  },
  {
    href: "/admin/admissions",
    label: "Admissions",
    description: "Applications & placement",
    icon: "students",
    permission: Permission.ADMISSIONS_READ,
  },
  {
    href: "/admin/parents",
    label: "Parents",
    description: "Family portal accounts",
    icon: "profile",
    permission: Permission.STUDENTS_READ,
  },
  {
    href: "/admin/attendance",
    label: "Attendance",
    description: "Mark & monitor daily rolls",
    icon: "attendance",
    permission: Permission.ATTENDANCE_MANAGE,
  },
  {
    href: "/admin/staff-attendance",
    label: "Staff Attendance",
    description: "Teacher & staff check-ins",
    icon: "attendance",
    permission: Permission.STAFF_ATTENDANCE_READ,
  },
  {
    href: "/admin/academics",
    label: "Academics",
    description: "Years, terms & subjects",
    icon: "calendar",
    permission: Permission.RESULTS_READ,
  },
  {
    href: "/admin/finance",
    label: "Finance",
    description: "Fees & collections",
    icon: "finance",
    permission: Permission.FINANCE_READ,
  },
  {
    href: "/admin/hr/employees",
    label: "People",
    description: "Employees & HR profiles",
    icon: "users",
    permission: Permission.HR_EMPLOYEES_READ,
  },
  {
    href: "/admin/payroll",
    label: "Payroll",
    description: "Salary runs & payslips",
    icon: "finance",
    permission: Permission.PAYROLL_VIEW,
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    description: "Campus updates",
    icon: "announcements",
    permission: Permission.ANNOUNCEMENTS_MANAGE,
  },
];

const ROLE_SUBTITLES: Record<string, string> = {
  registrar: "Admissions, enrollments, and student records for your campus.",
  reception: "Front desk inquiries, families, and visitor coordination.",
  finance_officer: "Fees, payments, receipts, and family billing.",
  attendance_officer: "Gate checks, QR scans, student and staff attendance.",
  academic_director: "Academic programs, subjects, teachers, and results.",
};

export function getStoredRoleTemplate(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_ROLE_TEMPLATE_KEY);
}

export function getStaffWorkspaceLabel(): string {
  const slug = getStoredRoleTemplate();
  if (slug && ROLE_TEMPLATE_LABELS[slug]) return ROLE_TEMPLATE_LABELS[slug];
  return "Staff";
}

export function getStaffWorkspaceTitle(): string {
  const label = getStaffWorkspaceLabel();
  return label === "Staff" ? "Workspace" : `${label} workspace`;
}

export function getStaffWorkspaceSubtitle(): string {
  const slug = getStoredRoleTemplate();
  if (slug && ROLE_SUBTITLES[slug]) return ROLE_SUBTITLES[slug];
  return "Your school tools — only what your role needs.";
}

export function staffQuickLinks(): StaffQuickLink[] {
  return STAFF_QUICK_LINKS.filter((item) => hasPermission(item.permission));
}

export function canViewSchoolDashboard(): boolean {
  return hasPermission(Permission.SCHOOL_DASHBOARD);
}
