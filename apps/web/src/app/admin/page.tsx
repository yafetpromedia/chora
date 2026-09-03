"use client";

import { RoleDashboard } from "@/components/role-dashboard";
import { SchoolWelcomeGate } from "@/components/auth/school-welcome-gate";

export default function AdminPage() {
  return (
    <>
      <SchoolWelcomeGate />
      <RoleDashboard role="admin" />
    </>
  );
}
