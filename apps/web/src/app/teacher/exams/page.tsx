"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ExamSchedulePortal } from "@/components/exams/exam-schedule-portal";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function TeacherExamsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "teacher") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage
      role="teacher"
      title="Exam schedule"
      subtitle="Published school exam timetable"
    >
      <ExamSchedulePortal role="teacher" />
    </DashboardPage>
  );
}
