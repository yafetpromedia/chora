"use client";

import { useEffect } from "react";
import { useClientSnapshot } from "@/lib/use-client-snapshot";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { LibraryHubView } from "@/components/library/library-hub";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminLibraryPage() {
  const router = useRouter();
  const canManage = useClientSnapshot(
    () => hasPermission(Permission.LIBRARY_MANAGE),
    false,
  );
  const canUpload = useClientSnapshot(
    () =>
      hasPermission(Permission.LIBRARY_UPLOAD) ||
      hasPermission(Permission.LIBRARY_MANAGE),
    false,
  );

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
      title="eLibrary"
      subtitle="Manage and publish your school's digital learning resources"
    >
      <LibraryHubView role="admin" canManage={canManage} canUpload={canUpload} />
    </DashboardPage>
  );
}
