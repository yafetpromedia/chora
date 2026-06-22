"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StudentAcademicRecord } from "@/components/students/student-academic-record";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function StudentHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "admin" && role !== "staff") {
      router.replace(`/${role ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage
      role="admin"
      title="Student academic record"
      subtitle="Permanent record center"
      eyebrow="Students"
    >
      <StudentAcademicRecord profileId={profileId} />
    </DashboardPage>
  );
}
