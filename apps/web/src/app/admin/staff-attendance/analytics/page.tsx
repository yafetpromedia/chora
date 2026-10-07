"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StaffAttendanceAnalyticsPanel } from "@/components/staff-attendance/staff-attendance-analytics";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function StaffAttendanceAnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    if (!hasPermission(Permission.STAFF_ATTENDANCE_ANALYTICS)) {
      router.replace("/admin/staff-attendance");
    }
  }, [router]);

  return (
    <DashboardPage role="admin" title="Staff analytics">
      <StaffAttendanceAnalyticsPanel />
    </DashboardPage>
  );
}
