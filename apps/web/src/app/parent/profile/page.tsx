"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentLinkedChildren } from "@/components/parent/parent-linked-children";
import { UserProfilePanel } from "@/components/profile/user-profile-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentProfilePage() {
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
      title="My profile"
      subtitle="Your account and linked children"
    >
      <div className="par-portal-stack">
        <UserProfilePanel />
        <ParentLinkedChildren />
      </div>
    </DashboardPage>
  );
}
