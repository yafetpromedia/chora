import { apiFetch } from "@/lib/api";

export type AdminAnalyticsOverview = {
  attendanceToday: {
    rate: number | null;
    marked: number;
    present: number;
    absent: number;
    totalStudents: number;
  };
  attendanceTrend: {
    date: string;
    weekday: string;
    rate: number | null;
    marked: number;
    present: number;
    absent: number;
  }[];
  gradeAttendance: { grade: string; rate: number; marked: number }[];
  enrollment: {
    students: number;
    teachers: number;
    parents: number;
    staff: number;
    admins: number;
    portalTotal: number;
  };
  finance: {
    collectedCents: number;
    outstandingCents: number;
    expectedCents: number;
    collectedThisMonthCents: number;
    paidStudents: number;
    unpaidStudents: number;
    overdueFeesCount: number;
    collectionRate: number;
  } | null;
  insights: {
    mostAbsentGrade: { label: string; rate: number; marked: number } | null;
    mostPunctualGrade: { label: string; rate: number; marked: number } | null;
  };
};

export async function getAdminAnalytics() {
  return apiFetch<AdminAnalyticsOverview>("/dashboards/admin-analytics");
}
