"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AttendanceMarkPanel } from "@/components/attendance/attendance-mark-panel";
import { AttendancePermissionReview } from "@/components/attendance/attendance-permission-review";
import { AttendanceScanner } from "@/components/attendance/attendance-scanner";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getAttendanceConcernsSummary } from "@/lib/attendance-concerns";
import { getMyTeacherProfile } from "@/lib/teachers";
import { useLocale } from "@/components/i18n/locale-provider";

type Tab = "scan" | "manual" | "requests";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TeacherAttendancePage() {
  const { t, tp } = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scan");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [openConcerns, setOpenConcerns] = useState(0);
  const [todayConcerns, setTodayConcerns] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "teacher" && role !== "admin") {
      router.replace(`/${role ?? "login"}`);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (role === "admin") {
        setAllowed(true);
        return;
      }
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

  useEffect(() => {
    if (allowed !== true) return;
    let cancelled = false;
    void getAttendanceConcernsSummary()
      .then((s) => {
        if (cancelled) return;
        setOpenConcerns(s.open);
        setTodayConcerns(s.today);
      })
      .catch(() => {
        if (cancelled) return;
        setOpenConcerns(0);
        setTodayConcerns(0);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (allowed !== true) {
    return (
      <DashboardPage role="teacher" title={tp("Attendance")}>
        <div className="att-v4__loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{t("teacherAttendancePageUi.loading")}</p>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage role="teacher" title={tp("Mark attendance")}>
      <div className="att-v4">
        <header className="att-v4__hero">
          <div className="att-v4__hero-glow" aria-hidden />
          <div className="att-v4__hero-inner">
            <div className="att-v4__hero-main">
              <p className="att-v4__date">{todayLabel()}</p>
              <h1 className="att-v4__title">{tp("Mark attendance")}</h1>
              <p className="att-v4__sub">{t("teacherAttendancePageUi.sub")}</p>
              <span className="att-v4__tag">{t("teacherAttendancePageUi.homeroom")}</span>
              {openConcerns > 0 ? (
                <Link
                  href="/teacher/attendance/concerns"
                  className="att-concern__hero-badge"
                >
                  {todayConcerns > 0
                    ? todayConcerns === 1
                      ? t("teacherAttendancePageUi.concernToday", { count: todayConcerns })
                      : t("teacherAttendancePageUi.concernsToday", { count: todayConcerns })
                    : openConcerns === 1
                      ? t("teacherAttendancePageUi.openConcern", { count: openConcerns })
                      : t("teacherAttendancePageUi.openConcerns", { count: openConcerns })}
                </Link>
              ) : null}
            </div>
            <div className="att-v4__hero-links">
              <Link href="/teacher/my-students" className="att-v4__back">
                {t("teacherAttendancePageUi.myStudents")}
              </Link>
              <Link href="/teacher/attendance/concerns" className="att-v4__back">
                {t("teacherAttendancePageUi.concernsLink")}
              </Link>
            </div>
          </div>
        </header>

        <nav
          className="att-v4__tabs att-v4__tabs--triple"
          aria-label={t("teacherAttendancePageUi.modeAria")}
        >
          <button
            type="button"
            className={`att-v4__tab${tab === "scan" ? " att-v4__tab--active" : ""}`}
            onClick={() => setTab("scan")}
          >
            <DashIcon name="attendance" className="dash-icon--xs" />
            {t("teacherAttendancePageUi.scan")}
          </button>
          <button
            type="button"
            className={`att-v4__tab${tab === "manual" ? " att-v4__tab--active" : ""}`}
            onClick={() => setTab("manual")}
          >
            <DashIcon name="students" className="dash-icon--xs" />
            {t("teacherAttendancePageUi.manual")}
          </button>
          <button
            type="button"
            className={`att-v4__tab${tab === "requests" ? " att-v4__tab--active" : ""}`}
            onClick={() => setTab("requests")}
          >
            <DashIcon name="alert" className="dash-icon--xs" />
            {t("teacherAttendancePageUi.requests")}
          </button>
        </nav>

        {tab === "scan" ? (
          <AttendanceScanner />
        ) : tab === "manual" ? (
          <AttendanceMarkPanel />
        ) : (
          <AttendancePermissionReview />
        )}
      </div>
    </DashboardPage>
  );
}
