"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ExamSchedulePortal } from "@/components/exams/exam-schedule-portal";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentExamsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "parent") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage
      role="parent"
      title="Exam schedule"
      subtitle="Published exam dates for your child's grade"
    >
      <ExamSchedulePortal role="parent" />
    </DashboardPage>
  );
}
