"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { MyStudentIdCardPanel } from "@/components/students/my-student-id-card-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function StudentIdCardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_ROLE_KEY) !== "student") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <DashboardPage
      role="student"
      title="Campus ID card"
      eyebrow="Student"
    >
      <MyStudentIdCardPanel />
    </DashboardPage>
  );
}
