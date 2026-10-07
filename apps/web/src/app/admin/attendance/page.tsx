"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AttendanceMarkPanel } from "@/components/attendance/attendance-mark-panel";
import { AttendanceScanner } from "@/components/attendance/attendance-scanner";
import {
  downloadAttendanceExport,
  getAttendanceAnalytics,
  type AttendanceAnalytics,
} from "@/lib/attendance";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { AppToast } from "@/components/ui/app-toast";

type Tab = "mark" | "scan";

function monthStartIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function formatHeroDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("mark");
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [analyticsDate, setAnalyticsDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportFrom, setExportFrom] = useState(monthStartIso);
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportBusy, setExportBusy] = useState(false);
  const [toast, setToast] = useState("");

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
    setLoading(true);
    try {
      setAnalytics(await getAttendanceAnalytics(date));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }

  const heroDate = formatHeroDate(analyticsDate);
  const markedLabel = useMemo(() => {
    if (!analytics) return "—";
    return `${analytics.markedToday} / ${analytics.totalStudents}`;
  }, [analytics]);

  return (
    <DashboardPage role="admin" title="Attendance">
      <div className="att-v2">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

        <header className="att-v2__hero">
          <div className="att-v2__hero-glow" aria-hidden />
          <div className="att-v2__hero-inner">
            <div className="att-v2__hero-main">
              <h2 className="att-v2__hero-title">Daily attendance</h2>
              <p className="att-v2__hero-sub">
                {tab === "mark"
                  ? `Roll call for ${heroDate} — mark students by grade and section.`
                  : `Scan student ID cards for ${heroDate}.`}
              </p>
              {analytics ? (
                <div className="att-v2__hero-badges">
                  <span className="att-v2__badge">{heroDate}</span>
                  {analytics.todayRate != null ? (
                    <span className="att-v2__badge att-v2__badge--live">
                      {analytics.todayRate}% rate
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="att-v2__hero-stats">
              <div className="att-v2__stat">
                <strong>
                  {loading || !analytics
                    ? "—"
                    : analytics.todayRate != null
                      ? `${analytics.todayRate}%`
                      : "—"}
                </strong>
                <span>Rate</span>
              </div>
              <div className="att-v2__stat">
                <strong>{loading || !analytics ? "—" : analytics.presentToday}</strong>
                <span>Present</span>
              </div>
              <div className="att-v2__stat">
                <strong>{loading || !analytics ? "—" : analytics.absentToday}</strong>
                <span>Absent</span>
              </div>
              <div className="att-v2__stat att-v2__stat--accent">
                <strong>{loading || !analytics ? "—" : markedLabel}</strong>
                <span>Marked</span>
              </div>
            </div>
          </div>
        </header>

        <div className="att-v2__toolbar">
          <nav className="att-v2__tabs" aria-label="Attendance">
            <button
              type="button"
              className={`att-v2__tab${tab === "mark" ? " att-v2__tab--active" : ""}`}
              onClick={() => setTab("mark")}
            >
              <DashIcon name="attendance" className="dash-icon--sm" />
              Mark manually
            </button>
            <button
              type="button"
              className={`att-v2__tab${tab === "scan" ? " att-v2__tab--active" : ""}`}
              onClick={() => setTab("scan")}
            >
              <DashIcon name="students" className="dash-icon--sm" />
              Scan QR
            </button>
            <Link href="/admin/settings" className="att-v2__tab att-v2__tab--link">
              <DashIcon name="settings" className="dash-icon--sm" />
              Settings
            </Link>
          </nav>

          <label className="att-v2__date">
            <DashIcon name="calendar" className="dash-icon--sm" />
            <span className="att-v2__date-label">View date</span>
            <input
              type="date"
              value={analyticsDate}
              onChange={(e) => void onDateChange(e.target.value)}
            />
          </label>
        </div>

        {hasPermission(Permission.ATTENDANCE_ANALYTICS) ? (
          <div className="att-v2__toolbar att-v2__toolbar--export">
            <label className="att-v2__date">
              <span className="att-v2__date-label">Export from</span>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
              />
            </label>
            <label className="att-v2__date">
              <span className="att-v2__date-label">Export to</span>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="att-v2__tab att-v2__tab--link"
              disabled={exportBusy}
              onClick={() => {
                setExportBusy(true);
                void downloadAttendanceExport(exportFrom, exportTo)
                  .then(() => setToast("Attendance CSV downloaded"))
                  .catch((err) =>
                    setError(err instanceof Error ? err.message : "Export failed"),
                  )
                  .finally(() => setExportBusy(false));
              }}
            >
              {exportBusy ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        ) : null}

        {tab === "mark" ? (
          <div className="att-v2__panel">
            <AttendanceMarkPanel />
          </div>
        ) : null}

        {tab === "scan" ? (
          <div className="att-v2__panel">
            <AttendanceScanner />
          </div>
        ) : null}
      </div>
    </DashboardPage>
  );
}
