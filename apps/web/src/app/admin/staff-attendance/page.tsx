"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StaffAttendanceWorkspace } from "@/components/staff-attendance/staff-attendance-workspace";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminStaffAttendancePage() {
  const router = useRouter();

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    if (
      !hasPermission(Permission.STAFF_ATTENDANCE_READ) &&
      !hasPermission(Permission.STAFF_ATTENDANCE_MANAGE)
    ) {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <DashboardPage role="admin" title="Staff Attendance">
      <Suspense fallback={<p className="sa-empty">Loading staff attendance…</p>}>
        <StaffAttendanceWorkspace />
      </Suspense>
    </DashboardPage>
  );
}
