"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { LeaveWorkspace } from "@/components/leave/leave-workspace";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminLeavePage() {
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
      !hasPermission(Permission.LEAVE_READ) &&
      !hasPermission(Permission.LEAVE_REQUEST)
    ) {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <DashboardPage role="admin" title="Leave">
      <LeaveWorkspace />
    </DashboardPage>
  );
}
