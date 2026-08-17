"use client";

import { useEffect, useState } from "react";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ScoreCorrectionsPanel } from "@/components/results/score-corrections-panel";
import { listTerms, type AcademicTerm } from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function TeacherScoreReportsPage() {
  const router = useRouter();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [termId, setTermId] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "teacher" && role !== "admin") {
      router.replace(`/${role ?? "login"}`);
    }
  }, [router]);

  useEffect(() => {
    void listTerms()
      .then((t) => {
        setTerms(t);
        const current = t.find((x) => x.isCurrent) ?? t[0];
        if (current) setTermId(current.id);
      })
      .catch(() => undefined);
  }, []);

  return (
    <DashboardPage
      role="teacher"
      title="Score reports"
      subtitle="Respond to family reports on published marks"
    >
      <ScoreCorrectionsPanel
        mode="teacher"
        terms={terms}
        defaultTermId={termId}
      />
    </DashboardPage>
  );
}
