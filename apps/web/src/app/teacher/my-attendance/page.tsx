"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { MyAttendancePanel } from "@/components/staff-attendance/my-attendance-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function TeacherMyAttendancePage() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "teacher") {
      router.replace("/login");
      return;
    }
    if (!hasPermission(Permission.STAFF_ATTENDANCE_SELF)) {
      router.replace("/teacher");
    }
  }, [router]);

  return (
    <DashboardPage role="teacher" title="My Attendance">
      <MyAttendancePanel />
    </DashboardPage>
  );
}
