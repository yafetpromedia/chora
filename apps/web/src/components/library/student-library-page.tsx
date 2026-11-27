"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  LibraryHubView,
  type LibrarySection,
} from "@/components/library/library-hub";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  section: LibrarySection;
};

export function StudentLibraryPage({ section }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const subtitle =
    section === "main"
      ? t("pages.studentLibrary.subtitleMain")
      : section === "progress"
        ? t("pages.studentLibrary.subtitleProgress")
        : t("pages.studentLibrary.subtitleAi");

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "student") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage role="student" title={t("pages.studentLibrary.title")} subtitle={subtitle}>
      <LibraryHubView role="student" librarySection={section} />
    </DashboardPage>
  );
}
