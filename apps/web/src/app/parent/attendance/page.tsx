"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentAttendancePanel } from "@/components/attendance/parent-attendance-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentAttendancePage() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "parent") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage
      role="parent"
      title="Attendance"
      subtitle="Daily attendance for your linked children"
    >
      <ParentAttendancePanel />
    </DashboardPage>
  );
}
