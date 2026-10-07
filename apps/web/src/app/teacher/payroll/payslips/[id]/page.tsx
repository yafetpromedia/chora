"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PayslipView } from "@/components/payroll/payslip-view";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function TeacherPayslipPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem(AUTH_ROLE_KEY) !== "teacher"
    ) {
      router.replace("/login");
      return;
    }
    if (!hasPermission(Permission.PAYSLIP_SELF)) {
      router.replace("/teacher");
    }
  }, [router]);

  return (
    <DashboardPage role="teacher" title="Payslip">
      <PayslipView payslipId={params.id} />
    </DashboardPage>
  );
}
