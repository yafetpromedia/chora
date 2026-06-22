"use client";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { StudentsWorkspace } from "@/components/admin/students-workspace";

export default function StudentsPage() {
  return (
    <DashboardPage role="admin" title="Students">
      <StudentsWorkspace />
    </DashboardPage>
  );
}
