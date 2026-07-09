"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ScoreMatrixPanel } from "@/components/results/score-matrix-panel";
import { StudentSubjectScoresPanel } from "@/components/results/student-subject-scores-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export type TeacherResultsSection = "class-sheet" | "by-student";

const SUBTITLES: Record<TeacherResultsSection, string> = {
  "class-sheet": "Enter scores for all students in one subject",
  "by-student": "One row per subject — columns from your assessment templates",
};

type Props = {
  section: TeacherResultsSection;
};

export function TeacherResultsPage({ section }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassSubjectId = searchParams.get("classSubjectId");

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

  return (
    <DashboardPage role="teacher" title="Scores" subtitle={SUBTITLES[section]}>
      <div className="res-teacher-page">
        {section === "class-sheet" ? (
          <ScoreMatrixPanel
            role="teacher"
            initialClassSubjectId={initialClassSubjectId}
          />
        ) : (
          <StudentSubjectScoresPanel
            role="teacher"
            loadStudentsFromClasses
            initialClassSubjectId={initialClassSubjectId}
          />
        )}
      </div>
    </DashboardPage>
  );
}
