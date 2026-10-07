"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PayrollWorkspace } from "@/components/payroll/payroll-workspace";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, type UserRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminPayrollPage() {
  const router = useRouter();
  const shellRole: UserRole =
    typeof window !== "undefined" &&
    localStorage.getItem(AUTH_ROLE_KEY) === "staff"
      ? "staff"
      : "admin";

  useEffect(() => {
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      (role !== "admin" && role !== "staff")
    ) {
      router.replace("/login");
      return;
    }
    if (!hasPermission(Permission.PAYROLL_VIEW)) {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <DashboardPage role={shellRole} title="Payroll">
      <PayrollWorkspace />
    </DashboardPage>
  );
}
