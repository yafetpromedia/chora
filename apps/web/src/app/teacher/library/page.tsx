"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { LibraryHubView } from "@/components/library/library-hub";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

export default function TeacherLibraryPage() {
  const router = useRouter();
  const [canUpload, setCanUpload] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "teacher") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
      return;
    }
    setCanUpload(hasPermission(Permission.LIBRARY_UPLOAD));
  }, [router]);

  return (
    <DashboardPage role="teacher" title="eLibrary" eyebrow="Resources">
      <LibraryHubView role="teacher" canUpload={canUpload} />
    </DashboardPage>
  );
}
