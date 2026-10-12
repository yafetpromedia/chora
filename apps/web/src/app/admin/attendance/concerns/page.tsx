"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminConcernsWorkspace } from "@/components/attendance/admin-concerns-workspace";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, type UserRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminAttendanceConcernsPage() {
  const router = useRouter();
  const shellRole: UserRole =
    typeof window !== "undefined" &&
    localStorage.getItem(AUTH_ROLE_KEY) === "staff"
      ? "staff"
      : "admin";

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "admin" && role !== "staff") {
      router.replace(`/${role ?? "login"}`);
      return;
    }
    if (!hasPermission(Permission.ATTENDANCE_CONCERNS_REVIEW)) {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <DashboardPage role={shellRole} title="Attendance concerns">
      <AdminConcernsWorkspace />
    </DashboardPage>
  );
}
