"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  LibraryHubView,
  type LibrarySection,
} from "@/components/library/library-hub";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

const SUBTITLES: Record<LibrarySection, string> = {
  main: "Browse books, notes, exams, and videos from your teachers",
  progress: "Continue reading and manage your saved books",
  ai: "Summarize, quiz, and translate your library materials",
};

type Props = {
  section: LibrarySection;
};

export function StudentLibraryPage({ section }: Props) {
  const router = useRouter();

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
    <DashboardPage role="student" title="eLibrary" subtitle={SUBTITLES[section]}>
      <LibraryHubView role="student" librarySection={section} />
    </DashboardPage>
  );
}
