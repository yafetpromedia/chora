"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { UserProfilePanel } from "@/components/profile/user-profile-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, type UserRole } from "@/lib/auth";

type Props = {
  role: UserRole;
};

export function SchoolProfilePage({ role }: Props) {
  const router = useRouter();
  const shellRole: UserRole =
    role === "admin" && typeof window !== "undefined" && localStorage.getItem(AUTH_ROLE_KEY) === "staff"
      ? "staff"
      : role;

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const stored = localStorage.getItem(AUTH_ROLE_KEY);
    const allowed =
      stored === role ||
      (role === "admin" && (stored === "admin" || stored === "staff"));
    if (!allowed) {
      router.replace(`/${stored ?? "login"}`);
    }
  }, [role, router]);

  return (
    <DashboardPage
      role={shellRole}
      title="My profile"
      subtitle="Your account, school membership, and sign-in details."
      eyebrow="Account"
    >
      <UserProfilePanel />
    </DashboardPage>
  );
}
