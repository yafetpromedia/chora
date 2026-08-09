"use client";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AdmissionsWorkspace } from "@/components/admin/admissions-workspace";

export default function AdmissionsPage() {
  return (
    <DashboardPage role="admin" title="Admissions">
      <AdmissionsWorkspace />
    </DashboardPage>
  );
}
