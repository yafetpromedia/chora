"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  LibraryHubView,
  type LibrarySection,
} from "@/components/library/library-hub";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

const SUBTITLES: Record<LibrarySection, string> = {
  main: "Browse books, notes, exams, and videos for your classes",
  progress: "Track uploads waiting for approval and materials you published",
  ai: "Summarize, quiz, and translate your library materials",
};

type Props = {
  section: LibrarySection;
};

export function TeacherLibraryPage({ section }: Props) {
  const router = useRouter();
  const [canUpload, setCanUpload] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "teacher") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
    setCanUpload(hasPermission(Permission.LIBRARY_UPLOAD));
  }, [router]);

  return (
    <DashboardPage role="teacher" title="eLibrary" subtitle={SUBTITLES[section]}>
      <LibraryHubView role="teacher" canUpload={canUpload} librarySection={section} />
    </DashboardPage>
  );
}
