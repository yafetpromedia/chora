import { UserRole } from '@prisma/client';

export type DefaultRoleTemplate = {
  slug: string;
  name: string;
  description: string;
  portalRole: UserRole;
  permissionPatterns: string[];
};

/**
 * System role templates — copied to each school on creation.
 * Assign via User.roleTemplateId; customize per school in DB later.
 */
export const DEFAULT_ROLE_TEMPLATES: DefaultRoleTemplate[] = [
  {
    slug: 'school_admin',
    name: 'School admin',
    description: 'Full access to all school modules',
    portalRole: UserRole.admin,
    permissionPatterns: ['*'],
  },
  {
    slug: 'principal',
    name: 'Principal',
    description: 'Leadership dashboards and school-wide read access',
    portalRole: UserRole.admin,
    permissionPatterns: [
      'school.dashboard',
      'attendance.analytics',
      'finance.read',
      'results.read',
      'students.read',
      'teachers.read',
      'announcements.manage',
    ],
  },
  {
    slug: 'academic_director',
    name: 'Academic director',
    description: 'Results, subjects, exams, teacher assignments',
    portalRole: UserRole.staff,
    permissionPatterns: [
      'results.*',
      'attendance.analytics',
      'teachers.read',
      'teachers.manage',
      'students.read',
      'announcements.manage',
    ],
  },
  {
    slug: 'registrar',
    name: 'Registrar',
    description: 'Admissions, student records, transfers, ID cards',
    portalRole: UserRole.staff,
    permissionPatterns: ['students.*', 'admissions.*', 'students.cards'],
  },
  {
    slug: 'finance_officer',
    name: 'Finance officer',
    description: 'Fees, payments, receipts, financial reports',
    portalRole: UserRole.staff,
    permissionPatterns: ['finance.*', 'students.read'],
  },
  {
    slug: 'reception',
    name: 'Reception',
    description: 'Front desk, visitors, and family inquiries',
    portalRole: UserRole.staff,
    permissionPatterns: [
      'students.read',
      'admissions.read',
      'parent.messages',
      'announcements.manage',
    ],
  },
  {
    slug: 'attendance_officer',
    name: 'Attendance officer',
    description: 'Gate checks, QR scan, and attendance monitoring',
    portalRole: UserRole.staff,
    permissionPatterns: [
      'attendance.read',
      'attendance.manage',
      'attendance.analytics',
      'students.read',
    ],
  },
  {
    slug: 'homeroom_teacher',
    name: 'Homeroom teacher',
    description: 'Class attendance, parent comms, class performance',
    portalRole: UserRole.teacher,
    permissionPatterns: [
      'attendance.manage',
      'attendance.read',
      'attendance.analytics',
      'results.read',
      'announcements.manage',
      'parent.messages',
    ],
  },
  {
    slug: 'subject_teacher',
    name: 'Subject teacher',
    description: 'Scores and attendance for assigned classes only',
    portalRole: UserRole.teacher,
    permissionPatterns: [
      'attendance.manage',
      'attendance.read',
      'results.read',
      'results.manage',
    ],
  },
];
