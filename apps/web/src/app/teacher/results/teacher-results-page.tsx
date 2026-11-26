"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ScoreMatrixPanel } from "@/components/results/score-matrix-panel";
import { StudentSubjectScoresPanel } from "@/components/results/student-subject-scores-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { useLocale } from "@/components/i18n/locale-provider";

export type TeacherResultsSection = "class-sheet" | "by-student";

type Props = {
  section: TeacherResultsSection;
};

export function TeacherResultsPage({ section }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const subtitle =
    section === "class-sheet"
      ? t("pages.teacherScores.subtitleClassSheet")
      : t("pages.teacherScores.subtitleByStudent");
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
    <DashboardPage role="teacher" title={t("pages.teacherScores.title")} subtitle={subtitle}>
      <div className="res-teacher-page tch-day tch-scores">
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
