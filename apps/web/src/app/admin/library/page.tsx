"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { LibraryHubView } from "@/components/library/library-hub";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function AdminLibraryPage() {
  const router = useRouter();
  const [canManage, setCanManage] = useState(false);
  const [canUpload, setCanUpload] = useState(false);

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    setCanManage(hasPermission(Permission.LIBRARY_MANAGE));
    setCanUpload(
      hasPermission(Permission.LIBRARY_UPLOAD) ||
        hasPermission(Permission.LIBRARY_MANAGE),
    );
  }, [router]);

  return (
    <DashboardPage role="admin" title="eLibrary" eyebrow="Digital hub">
      <LibraryHubView role="admin" canManage={canManage} canUpload={canUpload} />
    </DashboardPage>
  );
}
