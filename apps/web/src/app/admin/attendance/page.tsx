"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AttendanceMarkPanel } from "@/components/attendance/attendance-mark-panel";
import { AttendanceScanner } from "@/components/attendance/attendance-scanner";
import {
  getAttendanceAnalytics,
  type AttendanceAnalytics,
} from "@/lib/attendance";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

type Tab = "overview" | "mark" | "scan";

export default function AdminAttendancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [analyticsDate, setAnalyticsDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void getAttendanceAnalytics()
      .then(setAnalytics)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onDateChange(date: string) {
    setAnalyticsDate(date);
    try {
      setAnalytics(await getAttendanceAnalytics(date));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Attendance"
      subtitle="Mark rolls and view school-wide stats. Configure rules in Settings."
      eyebrow="Management"
    >
      <div className="att-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}

        <nav className="att-tabs" aria-label="Attendance">
          <button
            type="button"
            className={`att-tab${tab === "overview" ? " att-tab--active" : ""}`}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`att-tab${tab === "mark" ? " att-tab--active" : ""}`}
            onClick={() => setTab("mark")}
          >
            Mark manually
          </button>
          <button
            type="button"
            className={`att-tab${tab === "scan" ? " att-tab--active" : ""}`}
            onClick={() => setTab("scan")}
          >
            Scan QR
          </button>
          <Link href="/admin/settings" className="att-tab" style={{ textDecoration: "none" }}>
            ⚙️ Settings
          </Link>
        </nav>

        {tab === "overview" && (
          <>
            <div className="att-field" style={{ maxWidth: "12rem" }}>
              <span>View date</span>
              <input
                type="date"
                value={analyticsDate}
                onChange={(e) => void onDateChange(e.target.value)}
              />
            </div>

            {loading ? (
              <p className="setup-hint">Loading analytics…</p>
            ) : analytics ? (
              <>
                <div className="att-stats">
                  <div className="att-stat-card att-stat-card--rate">
                    <span className="att-stat-card__label">Attendance rate</span>
                    <span className="att-stat-card__value">
                      {analytics.todayRate != null ? `${analytics.todayRate}%` : "—"}
                    </span>
                    <span className="att-stat-card__sub">School-wide</span>
                  </div>
                  <div className="att-stat-card att-stat-card--present">
                    <span className="att-stat-card__label">Present</span>
                    <span className="att-stat-card__value">{analytics.presentToday}</span>
                  </div>
                  <div className="att-stat-card att-stat-card--absent">
                    <span className="att-stat-card__label">Absent</span>
                    <span className="att-stat-card__value">{analytics.absentToday}</span>
                  </div>
                  <div className="att-stat-card att-stat-card--marked">
                    <span className="att-stat-card__label">Marked</span>
                    <span className="att-stat-card__value">
                      {analytics.markedToday}
                      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--brand-muted)" }}>
                        {" "}/ {analytics.totalStudents}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="att-insights">
                  {analytics.mostAbsentGrade ? (
                    <div className="att-insight">
                      <span className="att-insight__label">Needs attention</span>
                      <p className="att-insight__value">{analytics.mostAbsentGrade.label}</p>
                      <p className="att-insight__meta">
                        {analytics.mostAbsentGrade.rate}% present · {analytics.mostAbsentGrade.marked} marked
                      </p>
                    </div>
                  ) : null}
                  {analytics.mostPunctualGrade ? (
                    <div className="att-insight">
                      <span className="att-insight__label">Most punctual</span>
                      <p className="att-insight__value">{analytics.mostPunctualGrade.label}</p>
                      <p className="att-insight__meta">
                        {analytics.mostPunctualGrade.rate}% present
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="att-panel">
                  <h3 className="att-panel__title">Quick actions</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <button type="button" className="att-btn att-btn--primary" onClick={() => setTab("scan")}>
                      Scan student IDs →
                    </button>
                    <button type="button" className="att-btn att-btn--ghost" onClick={() => setTab("mark")}>
                      Mark manually
                    </button>
                    <Link href="/admin/students/cards" className="att-btn att-btn--ghost">
                      Print ID cards
                    </Link>
                    <Link href="/admin/settings" className="att-btn att-btn--ghost">
                      Attendance settings
                    </Link>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {tab === "mark" && <AttendanceMarkPanel />}

        {tab === "scan" && <AttendanceScanner />}
      </div>
    </DashboardPage>
  );
}
