"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ClassworkSubmissionsPage } from "@/components/classwork/classwork-submissions-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function TeacherAssignmentSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

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
      title="Assignment submissions"
      subtitle="Review student work and grade as you go"
    >
      <ClassworkSubmissionsPage mode="ASSIGNMENT" assignmentId={id} />
    </DashboardPage>
  );
}
