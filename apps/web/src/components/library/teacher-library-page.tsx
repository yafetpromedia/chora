"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  LibraryHubView,
  type LibrarySection,
} from "@/components/library/library-hub";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { useLocale } from "@/components/i18n/locale-provider";
import { hasPermission, Permission } from "@/lib/permissions";

type Props = {
  section: LibrarySection;
};

export function TeacherLibraryPage({ section }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const subtitle =
    section === "main"
      ? t("pages.teacherLibrary.subtitleMain")
      : section === "progress"
        ? t("pages.teacherLibrary.subtitleProgress")
        : t("pages.teacherLibrary.subtitleAi");
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const canUpload = hydrated && hasPermission(Permission.LIBRARY_UPLOAD);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "teacher") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage role="teacher" title={t("pages.teacherLibrary.title")} subtitle={subtitle}>
      <LibraryHubView
        role="teacher"
        canUpload={canUpload}
        librarySection={section}
      />
    </DashboardPage>
  );
}
