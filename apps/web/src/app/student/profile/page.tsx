"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StudentResultsPrivacyCard } from "@/components/profile/student-results-privacy-card";
import { UserProfilePanel } from "@/components/profile/user-profile-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function StudentProfilePage() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "student") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage
      role="student"
      title="My profile"
      subtitle="Your account, privacy, and school details"
    >
      <div className="par-portal-stack">
        <StudentResultsPrivacyCard />
        <UserProfilePanel />
      </div>
    </DashboardPage>
  );
}
