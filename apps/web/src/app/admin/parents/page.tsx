"use client";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentsWorkspace } from "@/components/admin/parents-workspace";

export default function AdminParentsPage() {
  return (
    <DashboardPage role="admin" title="Parents & guardians">
      <ParentsWorkspace />
    </DashboardPage>
  );
}
