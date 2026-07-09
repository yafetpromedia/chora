"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ResultsWorkspace } from "@/components/admin/results-workspace";
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AdminResultsPage() {
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
    <DashboardPage role="admin" title="Results" eyebrow="Academics">
      <Suspense
        fallback={
          <div className="res-scores-loading" style={{ padding: "2rem" }}>
            <span className="res-scores-loading__spinner" aria-hidden />
            <p>Loading results workspace…</p>
          </div>
        }
      >
        <ResultsWorkspace students={students} />
      </Suspense>
    </DashboardPage>
  );
}
