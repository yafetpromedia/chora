"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/dashboard/staff-dashboard-shared";
import { AppToast } from "@/components/ui/app-toast";
import {
  STAFF_DEPARTMENT_LABELS,
  downloadStaffPayrollCsv,
  formatWorkedHours,
  getStaffAttendanceAnalytics,
  type StaffAttendanceAnalytics,
  type StaffDepartment,
} from "@/lib/staff-attendance";

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function StaffAttendanceAnalyticsPanel() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [department, setDepartment] = useState<StaffDepartment | "">("");
  const [data, setData] = useState<StaffAttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(
        await getStaffAttendanceAnalytics({
          from,
          to,
          department: department || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load()
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, department]);

  const c = data?.counts;

  const lateRows = useMemo(
    () =>
      (data?.mostLate ?? []).map((u) => ({
        label: u.name,
        value: u.lateMinutes,
        color: "#b45309",
      })),
    [data?.mostLate],
  );
  const absentRows = useMemo(
    () =>
      (data?.mostAbsent ?? []).map((u) => ({
        label: u.name,
        value: u.absent,
        color: "#b91c1c",
      })),
    [data?.mostAbsent],
  );
  const trendRows = useMemo(
    () =>
      (data?.trend ?? []).map((t) => ({
        label: t.date.slice(5),
        value: t.present + t.late,
        color: "var(--brand-teal)",
      })),
    [data?.trend],
  );

  return (
    <div className="sa-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Analytics</span>
            <h2 className="tch-v2__hero-title">Staff attendance analytics</h2>
            <p className="tch-v2__hero-sub">
              Rates exclude approved leave from the denominator. Rankings are
              administrative reports only. Back to{" "}
              <Link
                href="/admin/staff-attendance"
                className="tch-v2__hero-link"
              >
                Staff Attendance
              </Link>
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>
                {loading || data?.rate == null ? "—" : `${data.rate}%`}
              </strong>
              <span>Rate</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading || c == null ? "—" : c.present}</strong>
              <span>Present</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading || c == null ? "—" : c.absent}</strong>
              <span>Absent</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {loading || data == null ? "—" : data.overtimeMinutes}
              </strong>
              <span>OT min</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-hero__actions">
        <button
          type="button"
          className="sa-btn sa-btn--primary"
          onClick={() =>
            void downloadStaffPayrollCsv({
              from,
              to,
              department: department || undefined,
            })
              .then(() => setToast("Payroll hours exported"))
              .catch((err) =>
                setError(err instanceof Error ? err.message : "Export failed"),
              )
          }
        >
          Export payroll hours
        </button>
      </div>

      <div className="sa-toolbar">
        <label className="sa-field">
          <span>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="sa-field">
          <span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="sa-field">
          <span>Department</span>
          <select
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value as StaffDepartment | "")
            }
          >
            <option value="">All</option>
            {Object.entries(STAFF_DEPARTMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sa-stats">
        {(
          [
            ["Rate", data?.rate != null ? `${data.rate}%` : "—", "present"],
            ["Present", c?.present, "present"],
            ["Late", c?.late, "late"],
            ["Absent", c?.absent, "absent"],
            ["On leave", c?.on_leave, "leave"],
            ["OT minutes", data?.overtimeMinutes, "half"],
          ] as const
        ).map(([label, value, tone]) => (
          <div key={label} className={`sa-stat sa-stat--${tone}`}>
            <span className="sa-stat__label">{label}</span>
            <strong className="sa-stat__value">
              {loading || value == null ? "—" : value}
            </strong>
          </div>
        ))}
      </div>

      <p className="sa-hours-note">
        Worked {formatWorkedHours(data?.workedMinutes ?? null)} · Late total{" "}
        {data?.lateMinutes ?? 0} min · Leave days {data?.leaveDays ?? 0}
      </p>

      <div className="sa-analytics-charts">
        <section className="sa-analytics-chart">
          <h3>Attendance trend (present + late)</h3>
          <BarChart rows={trendRows} emptyText="No trend data in range." />
        </section>
        <section className="sa-analytics-chart">
          <h3>Most late (minutes)</h3>
          <BarChart rows={lateRows} emptyText="No lateness in range." />
        </section>
        <section className="sa-analytics-chart">
          <h3>Most absent (days)</h3>
          <BarChart rows={absentRows} emptyText="No absences in range." />
        </section>
      </div>
    </div>
  );
}
