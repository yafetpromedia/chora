"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StudentFeesPanel } from "@/components/finance/student-fees-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getStudentFinanceSummary, type StudentFinanceSummary } from "@/lib/finance";
import { getMyStudentIdCard } from "@/lib/student-cards";

export default function StudentFeesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<StudentFinanceSummary | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "student") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
      return;
    }

    void getMyStudentIdCard()
      .then((card) => getStudentFinanceSummary(card.studentProfileId))
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage role="student" title="Fees">
      {error ? <p className="stu-fees__alert stu-fees__alert--error">{error}</p> : null}

      {loading ? (
        <div className="stu-fees__loading">
          <span className="stu-fees__spinner" aria-hidden />
          <p>Loading fee summary…</p>
        </div>
      ) : summary ? (
        <StudentFeesPanel summary={summary} />
      ) : null}
    </DashboardPage>
  );
}
