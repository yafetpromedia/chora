"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SubjectsWorkspace } from "@/components/admin/subjects-workspace";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AdminSubjectsPage() {
  const router = useRouter();

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <DashboardPage role="admin" title="Subjects">
      <SubjectsWorkspace />
    </DashboardPage>
  );
}
