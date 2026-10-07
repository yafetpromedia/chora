"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { MyAttendancePanel } from "@/components/staff-attendance/my-attendance-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminMyAttendancePage() {
  const router = useRouter();

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    if (!hasPermission(Permission.STAFF_ATTENDANCE_SELF)) {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <DashboardPage role="admin" title="My Attendance">
      <MyAttendancePanel />
    </DashboardPage>
  );
}
