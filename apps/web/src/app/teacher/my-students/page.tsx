"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { useLocale } from "@/components/i18n/locale-provider";
import { MyStudentsPanel } from "@/components/teacher/my-students-panel";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getMyTeacherProfile } from "@/lib/teachers";

export default function TeacherMyStudentsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "teacher") {
      router.replace(role ? `/${role}` : "/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const profile = await getMyTeacherProfile();
        if (cancelled) return;
        if (!profile.canTakeAttendance) {
          router.replace("/teacher");
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) router.replace("/teacher");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed !== true) {
    return (
      <DashboardPage role="teacher" title={t("pages.teacherMyStudents.title")}>
        <div className="ms-panel ms-panel--loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{t("common.loading")}</p>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      role="teacher"
      title={t("pages.teacherMyStudents.title")}
      subtitle={t("pages.teacherMyStudents.subtitle")}
    >
      <MyStudentsPanel />
    </DashboardPage>
  );
}
