"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { EmployeeDetailPanel } from "@/components/hr/employee-detail-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, type UserRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminHrEmployeeDetailPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
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
    if (!hasPermission(Permission.HR_EMPLOYEES_READ)) {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <DashboardPage role={shellRole} title="Employee">
      <EmployeeDetailPanel userId={params.userId} />
    </DashboardPage>
  );
}
