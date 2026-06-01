"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ScoreMatrixPanel } from "@/components/results/score-matrix-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export function TeacherResultsInner() {
  const router = useRouter();

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
    <DashboardPage
      role="teacher"
      title="Enter scores"
      subtitle="Pick your class and subject — assessment columns come from your school's template."
      eyebrow="CampusOne"
    >
      <ScoreMatrixPanel role="teacher" />
    </DashboardPage>
  );
}
