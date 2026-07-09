"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ReportCardsWorkspace } from "@/components/admin/report-cards-workspace";
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AdminReportCardsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void listStudents()
      .then(setStudents)
      .catch(() => {});
  }, [router]);

  return (
    <DashboardPage role="admin" title="Report cards" eyebrow="Academics">
      <ReportCardsWorkspace students={students} />
    </DashboardPage>
  );
}
