import { apiFetch } from "@/lib/api";

export type AdminDayOverview = {
  kind: "admin_day";
  date: string;
  academicYear: { id: string; name: string } | null;
  currentTerm: { id: string; name: string } | null;
  attendance: {
    rate: number | null;
    marked: number;
    present: number;
    absent: number;
    totalStudents: number;
  };
  finance: {
    pendingPayments: number;
    outstandingCents?: number;
    collectedCents?: number;
    unpaidStudents?: number;
  };
  academics: {
    pendingResultApprovals: number;
    currentTerm: { id: string; name: string } | null;
  };
  staff: {
    teachersTotal: number;
    classesActive: number;
    classesMarkedToday: number;
  };
  alerts: {
    total: number;
    items: {
      type: string;
      label: string;
      count: number;
      href: string;
    }[];
  };
};

export type ParentDayChild = {
  profileId: string;
  name: string;
  grade: string;
  section: string | null;
  attendanceToday: string;
  outstandingCents: number;
  overallAverage: number | null;
  performanceLabel: string | null;
  parentsCanViewResults?: boolean;
};

export type ParentDayOverview = {
  kind: "parent_day";
  date: string;
  children: ParentDayChild[];
  totalDueCents: number;
};

export type TeacherTeachingSlot = {
  classSubjectId: string;
  label: string;
  gradeId: string;
  sectionId: string | null;
  subjectName: string;
};

export type DashboardMeResponse = Record<string, unknown> & {
  day?: AdminDayOverview | ParentDayOverview | TeacherDayBundle;
};

export type TeacherDayBundle = {
  kind: "teacher_day";
  date: string;
  academicYear: { id: string; name: string } | null;
  teachingSlots: TeacherTeachingSlot[];
  classesToday: number;
  attendancePendingCount: number;
  resultsPendingCount: number;
  classes: {
    gradeId: string;
    sectionId: string | null;
    label: string;
    studentCount: number;
    isHomeroom: boolean;
  }[];
  attendancePending: {
    gradeId: string;
    sectionId: string | null;
    label: string;
    pendingCount: number;
  }[];
  resultsPending: {
    assessmentId: string;
    name: string;
    classLabel: string;
    missingCount: number;
  }[];
};

export async function getMyDashboard() {
  return apiFetch<DashboardMeResponse>("/dashboards/me");
}
