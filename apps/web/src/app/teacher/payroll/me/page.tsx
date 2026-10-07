"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { MyPayslipsPanel } from "@/components/payroll/my-payslips-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function TeacherMyPayslipsPage() {
  const router = useRouter();

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem(AUTH_ROLE_KEY) !== "teacher"
    ) {
      router.replace("/login");
      return;
    }
    if (!hasPermission(Permission.PAYSLIP_SELF)) {
      router.replace("/teacher");
    }
  }, [router]);

  return (
    <DashboardPage role="teacher" title="My Payslips">
      <MyPayslipsPanel role="teacher" />
    </DashboardPage>
  );
}
