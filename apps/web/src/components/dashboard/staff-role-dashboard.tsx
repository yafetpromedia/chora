"use client";

import type { Announcement } from "@/lib/api";
import { getStoredRoleTemplate } from "@/lib/staff-workspace";
import { RegistrarDashboard } from "@/components/dashboard/registrar-dashboard";
import { ReceptionDashboard } from "@/components/dashboard/reception-dashboard";
import { FinanceOfficerDashboard } from "@/components/dashboard/finance-officer-dashboard";
import { AttendanceOfficerDashboard } from "@/components/dashboard/attendance-officer-dashboard";
import { AcademicDirectorDashboard } from "@/components/dashboard/academic-director-dashboard";
import { GenericStaffDashboard } from "@/components/dashboard/generic-staff-dashboard";

type Props = {
  error: string;
  announcements: Announcement[];
};

export function StaffRoleDashboard({ error, announcements }: Props) {
  const roleTemplate = getStoredRoleTemplate();

  switch (roleTemplate) {
    case "registrar":
      return <RegistrarDashboard error={error} />;
    case "reception":
      return <ReceptionDashboard error={error} announcements={announcements} />;
    case "finance_officer":
      return <FinanceOfficerDashboard error={error} />;
    case "attendance_officer":
      return <AttendanceOfficerDashboard error={error} />;
    case "academic_director":
      return <AcademicDirectorDashboard error={error} />;
    default:
      return <GenericStaffDashboard error={error} />;
  }
}
