/**
 * Canonical permission keys for Chora.
 * Role templates reference these keys or wildcards (e.g. finance.*).
 */

export const PermissionCatalog = {
  // School
  SCHOOL_DASHBOARD: 'school.dashboard',
  SCHOOL_SETTINGS: 'school.settings',
  SCHOOL_SUBSCRIPTIONS: 'school.subscriptions',

  // Students & admissions
  STUDENTS_READ: 'students.read',
  STUDENTS_CREATE: 'students.create',
  STUDENTS_EDIT: 'students.edit',
  STUDENTS_DELETE: 'students.delete',
  STUDENTS_CARDS: 'students.cards',
  ADMISSIONS_READ: 'admissions.read',
  ADMISSIONS_MANAGE: 'admissions.manage',

  // Teachers / staff
  TEACHERS_READ: 'teachers.read',
  TEACHERS_MANAGE: 'teachers.manage',

  // Attendance (students)
  ATTENDANCE_READ: 'attendance.read',
  ATTENDANCE_MANAGE: 'attendance.manage',
  ATTENDANCE_ANALYTICS: 'attendance.analytics',
  ATTENDANCE_CONCERNS_REPORT: 'attendance.concerns.report',
  ATTENDANCE_CONCERNS_REVIEW: 'attendance.concerns.review',

  // Staff attendance (teachers + office staff)
  STAFF_ATTENDANCE_READ: 'staff_attendance.read',
  STAFF_ATTENDANCE_MANAGE: 'staff_attendance.manage',
  STAFF_ATTENDANCE_ANALYTICS: 'staff_attendance.analytics',
  STAFF_ATTENDANCE_SELF: 'staff_attendance.self',
  STAFF_ATTENDANCE_QR_MANAGE: 'staff_attendance.qr_manage',

  // Staff leave
  LEAVE_READ: 'leave.read',
  LEAVE_REQUEST: 'leave.request',
  LEAVE_MANAGE: 'leave.manage',
  LEAVE_APPROVE: 'leave.approve',
  LEAVE_ANALYTICS: 'leave.analytics',

  // Results
  RESULTS_READ: 'results.read',
  RESULTS_MANAGE: 'results.manage',
  RESULTS_APPROVE: 'results.approve',

  // Timetable
  TIMETABLE_READ: 'timetable.read',
  TIMETABLE_MANAGE: 'timetable.manage',

  // Finance
  FINANCE_READ: 'finance.read',
  FINANCE_MANAGE: 'finance.manage',

  // HR
  HR_EMPLOYEES_READ: 'hr.employees.read',
  HR_EMPLOYEES_MANAGE: 'hr.employees.manage',
  HR_ORG_MANAGE: 'hr.org.manage',

  // Payroll
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CALCULATE: 'payroll.calculate',
  PAYROLL_ADJUST: 'payroll.adjust',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_PAY: 'payroll.pay',
  PAYROLL_CLOSE: 'payroll.close',
  PAYROLL_EXPORT: 'payroll.export',
  PAYROLL_SETTINGS: 'payroll.settings',
  PAYSLIP_SELF: 'payslip.self',
  PAYSLIP_MANAGE: 'payslip.manage',

  // Comms
  ANNOUNCEMENTS_MANAGE: 'announcements.manage',
  PARENT_MESSAGES: 'parent.messages',

  // Digital library
  LIBRARY_READ: 'library.read',
  LIBRARY_MANAGE: 'library.manage',
  LIBRARY_UPLOAD: 'library.upload',
} as const;

export type PermissionKey =
  (typeof PermissionCatalog)[keyof typeof PermissionCatalog];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(
  PermissionCatalog,
);

export type PermissionMeta = {
  key: PermissionKey;
  label: string;
  category: string;
  description: string;
};

export const PERMISSION_META: PermissionMeta[] = [
  { key: 'school.dashboard', label: 'View dashboards', category: 'school', description: 'Principal / leadership overview' },
  { key: 'school.settings', label: 'School settings', category: 'school', description: 'Profile, attendance mode, invites' },
  { key: 'school.subscriptions', label: 'Billing & plan', category: 'school', description: 'Subscription and upgrades' },
  { key: 'students.read', label: 'View students', category: 'students', description: 'Search and view roster' },
  { key: 'students.create', label: 'Register students', category: 'students', description: 'Add and import students' },
  { key: 'students.edit', label: 'Edit students', category: 'students', description: 'Update records and class' },
  { key: 'students.delete', label: 'Remove students', category: 'students', description: 'Remove from school' },
  { key: 'students.cards', label: 'Student ID cards', category: 'students', description: 'Print QR ID cards' },
  { key: 'admissions.read', label: 'View admissions', category: 'admissions', description: 'Applications pipeline' },
  { key: 'admissions.manage', label: 'Manage admissions', category: 'admissions', description: 'Enroll applicants' },
  { key: 'teachers.read', label: 'View staff', category: 'teachers', description: 'Staff directory' },
  { key: 'teachers.manage', label: 'Manage staff', category: 'teachers', description: 'Roles and assignments' },
  { key: 'attendance.read', label: 'View attendance', category: 'attendance', description: 'Class rolls' },
  { key: 'attendance.manage', label: 'Mark attendance', category: 'attendance', description: 'Manual mark and QR scan' },
  { key: 'attendance.analytics', label: 'Attendance analytics', category: 'attendance', description: 'School-wide stats' },
  { key: 'attendance.concerns.report', label: 'Report attendance concerns', category: 'attendance', description: 'Subject teachers report classroom attendance discrepancies' },
  { key: 'attendance.concerns.review', label: 'Review attendance concerns', category: 'attendance', description: 'Homeroom and officers review and resolve concerns' },
  { key: 'staff_attendance.read', label: 'View staff attendance', category: 'staff_attendance', description: 'Teacher and staff attendance rolls' },
  { key: 'staff_attendance.manage', label: 'Manage staff attendance', category: 'staff_attendance', description: 'Check-in, check-out, and corrections' },
  { key: 'staff_attendance.analytics', label: 'Staff attendance analytics', category: 'staff_attendance', description: 'Staff attendance summaries and exports' },
  { key: 'staff_attendance.self', label: 'My staff attendance', category: 'staff_attendance', description: 'View own attendance history' },
  { key: 'staff_attendance.qr_manage', label: 'Manage staff QR', category: 'staff_attendance', description: 'Issue and rotate staff check-in QR codes' },
  { key: 'leave.read', label: 'View leave', category: 'leave', description: 'View leave requests and calendar' },
  { key: 'leave.request', label: 'Request leave', category: 'leave', description: 'Submit own leave requests' },
  { key: 'leave.manage', label: 'Manage leave types', category: 'leave', description: 'Configure leave types and balances' },
  { key: 'leave.approve', label: 'Approve leave', category: 'leave', description: 'Approve or reject leave requests' },
  { key: 'leave.analytics', label: 'Leave reports', category: 'leave', description: 'Leave summaries and exports' },
  { key: 'results.read', label: 'View results', category: 'results', description: 'Scores and report cards' },
  { key: 'results.manage', label: 'Enter results', category: 'results', description: 'Assessments and grades' },
  { key: 'results.approve', label: 'Approve results', category: 'results', description: 'Publish report cards' },
  { key: 'timetable.read', label: 'View timetable', category: 'academics', description: 'Class schedules' },
  { key: 'timetable.manage', label: 'Manage timetable', category: 'academics', description: 'Edit periods and class schedule' },
  { key: 'finance.read', label: 'View finance', category: 'finance', description: 'Fees and balances' },
  { key: 'finance.manage', label: 'Manage finance', category: 'finance', description: 'Payments and schedules' },
  { key: 'hr.employees.read', label: 'View employees', category: 'hr', description: 'HR employee directory and profiles' },
  { key: 'hr.employees.manage', label: 'Manage employees', category: 'hr', description: 'Edit employment and HR profiles' },
  { key: 'hr.org.manage', label: 'Manage HR org', category: 'hr', description: 'Departments and positions' },
  { key: 'payroll.view', label: 'View payroll', category: 'payroll', description: 'Payroll runs and summaries' },
  { key: 'payroll.calculate', label: 'Calculate payroll', category: 'payroll', description: 'Run payroll calculations' },
  { key: 'payroll.adjust', label: 'Adjust payroll', category: 'payroll', description: 'One-time payroll adjustments' },
  { key: 'payroll.approve', label: 'Approve payroll', category: 'payroll', description: 'Approve calculated payroll' },
  { key: 'payroll.pay', label: 'Record payroll payments', category: 'payroll', description: 'Mark salary payments' },
  { key: 'payroll.close', label: 'Close payroll', category: 'payroll', description: 'Close payroll periods' },
  { key: 'payroll.export', label: 'Export payroll', category: 'payroll', description: 'CSV and reports' },
  { key: 'payroll.settings', label: 'Payroll settings', category: 'payroll', description: 'Rules and components' },
  { key: 'payslip.self', label: 'My payslips', category: 'payroll', description: 'View own payslips' },
  { key: 'payslip.manage', label: 'Manage payslips', category: 'payroll', description: 'View employee payslips' },
  { key: 'announcements.manage', label: 'Announcements', category: 'comms', description: 'School announcements' },
  { key: 'parent.messages', label: 'Parent messages', category: 'comms', description: 'Reply to parent inquiries' },
  { key: 'library.read', label: 'View eLibrary', category: 'library', description: 'Browse digital resources' },
  { key: 'library.manage', label: 'Manage eLibrary', category: 'library', description: 'Publish and approve resources' },
  { key: 'library.upload', label: 'Upload to eLibrary', category: 'library', description: 'Add notes and materials' },
];

/** Expand patterns like `finance.*` or `students.*` into concrete keys. */
export function expandPermissionPatterns(
  patterns: string[],
): PermissionKey[] {
  const set = new Set<PermissionKey>();
  for (const pattern of patterns) {
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      for (const key of ALL_PERMISSION_KEYS) {
        if (key.startsWith(`${prefix}.`)) {
          set.add(key);
        }
      }
    } else if (ALL_PERMISSION_KEYS.includes(pattern as PermissionKey)) {
      set.add(pattern as PermissionKey);
    }
  }
  return [...set];
}

export function permissionMatches(
  userPermissions: string[],
  required: string | string[],
): boolean {
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((req) => {
    if (userPermissions.includes(req)) {
      return true;
    }
    if (req.endsWith('.*')) {
      const prefix = req.slice(0, -2);
      return userPermissions.some((p) => p.startsWith(`${prefix}.`));
    }
    const [category] = req.split('.');
    return userPermissions.includes(`${category}.*`);
  });
}
