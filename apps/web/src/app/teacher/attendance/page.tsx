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
import { getMyTeacherProfile } from "@/lib/teachers";

type Tab = "scan" | "manual" | "requests";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TeacherAttendancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scan");
  const [allowed, setAllowed] = useState<boolean | null>(null);

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
    if (role === "admin") {
      setAllowed(true);
      return;
    }
    void getMyTeacherProfile()
      .then((profile) => {
        if (!profile.canTakeAttendance) {
          router.replace("/teacher");
          return;
        }
        setAllowed(true);
      })
      .catch(() => router.replace("/teacher"));
  }, [router]);

  if (allowed !== true) {
    return (
      <DashboardPage role="teacher" title="Attendance">
        <div className="att-v4__loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>Loading attendance…</p>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage role="teacher" title="Mark attendance">
      <div className="att-v4">
        <header className="att-v4__hero">
          <div className="att-v4__hero-glow" aria-hidden />
          <div className="att-v4__hero-inner">
            <div className="att-v4__hero-main">
              <p className="att-v4__date">{todayLabel()}</p>
              <h1 className="att-v4__title">Mark attendance</h1>
              <p className="att-v4__sub">
                Scan student ID cards with your camera, or switch to manual marking.
              </p>
              <span className="att-v4__tag">Homeroom</span>
            </div>
            <Link href="/teacher" className="att-v4__back">
              ← Back to overview
            </Link>
          </div>
        </header>

        <nav className="att-v4__tabs att-v4__tabs--triple" aria-label="Attendance mode">
          <button
            type="button"
            className={`att-v4__tab${tab === "scan" ? " att-v4__tab--active" : ""}`}
            onClick={() => setTab("scan")}
          >
            <DashIcon name="attendance" className="dash-icon--xs" />
            Scan QR
          </button>
          <button
            type="button"
            className={`att-v4__tab${tab === "manual" ? " att-v4__tab--active" : ""}`}
            onClick={() => setTab("manual")}
          >
            <DashIcon name="students" className="dash-icon--xs" />
            Manual
          </button>
          <button
            type="button"
            className={`att-v4__tab${tab === "requests" ? " att-v4__tab--active" : ""}`}
            onClick={() => setTab("requests")}
          >
            <DashIcon name="alert" className="dash-icon--xs" />
            Requests
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
