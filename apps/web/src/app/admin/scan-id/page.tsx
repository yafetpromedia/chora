"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { IdCardLookupScanner } from "@/components/id-cards/id-card-lookup-scanner";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AdminScanIdPage() {
  const router = useRouter();

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <DashboardPage
      role="admin"
      title="Scan ID"
      subtitle="Identify students or staff from a printed QR or barcode"
    >
      <IdCardLookupScanner workspace="admin" />
    </DashboardPage>
  );
}
