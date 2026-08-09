"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StaffWorkspace } from "@/components/admin/staff-workspace";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, type UserRole } from "@/lib/auth";

export default function AdminStaffPage() {
  const router = useRouter();
  const shellRole: UserRole =
    typeof window !== "undefined" && localStorage.getItem(AUTH_ROLE_KEY) === "staff"
      ? "staff"
      : "admin";

  useEffect(() => {
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!localStorage.getItem(AUTH_TOKEN_KEY) || (role !== "admin" && role !== "staff")) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <DashboardPage role={shellRole} title="Staff & teams">
      <StaffWorkspace />
    </DashboardPage>
  );
}
