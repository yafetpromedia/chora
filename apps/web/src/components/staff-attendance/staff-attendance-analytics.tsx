"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/dashboard/staff-dashboard-shared";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { t, tn } = useLocale();
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
      setError(
        err instanceof Error ? err.message : t("staffAttendanceAnalyticsUi.loadFailed"),
      );
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
      (data?.trend ?? []).map((tRow) => ({
        label: tRow.date.slice(5),
        value: tRow.present + tRow.late,
        color: "var(--brand-teal)",
      })),
    [data?.trend],
  );

  const statLabels = {
    Rate: t("staffAttendanceAnalyticsUi.rate"),
    Present: t("staffAttendanceAnalyticsUi.present"),
    Late: t("staffAttendanceAnalyticsUi.late"),
    Absent: t("staffAttendanceAnalyticsUi.absent"),
    "On leave": t("staffAttendanceAnalyticsUi.onLeave"),
    "OT minutes": t("staffAttendanceAnalyticsUi.otMin"),
  } as const;

  return (
    <div className="sa-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("staffAttendanceAnalyticsUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{t("staffAttendanceAnalyticsUi.title")}</h2>
            <p className="tch-v2__hero-sub">
              {t("staffAttendanceAnalyticsUi.heroSub")}
              <Link
                href="/admin/staff-attendance"
                className="tch-v2__hero-link"
              >
                {tn("Staff Attendance")}
              </Link>
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>
                {loading || data?.rate == null ? "—" : `${data.rate}%`}
              </strong>
              <span>{t("staffAttendanceAnalyticsUi.rate")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading || c == null ? "—" : c.present}</strong>
              <span>{t("staffAttendanceAnalyticsUi.present")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading || c == null ? "—" : c.absent}</strong>
              <span>{t("staffAttendanceAnalyticsUi.absent")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {loading || data == null ? "—" : data.overtimeMinutes}
              </strong>
              <span>{t("staffAttendanceAnalyticsUi.otMin")}</span>
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
              .then(() => setToast(t("staffAttendanceAnalyticsUi.exportOk")))
              .catch((err) =>
                setError(
                  err instanceof Error ? err.message : t("staffAttendanceAnalyticsUi.exportFailed"),
                ),
              )
          }
        >
          {t("staffAttendanceAnalyticsUi.exportPayroll")}
        </button>
      </div>

      <div className="sa-toolbar">
        <label className="sa-field">
          <span>{t("staffAttendanceAnalyticsUi.from")}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="sa-field">
          <span>{t("staffAttendanceAnalyticsUi.to")}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="sa-field">
          <span>{t("staffAttendanceAnalyticsUi.department")}</span>
          <select
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value as StaffDepartment | "")
            }
          >
            <option value="">{t("common.all")}</option>
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
            <span className="sa-stat__label">{statLabels[label]}</span>
            <strong className="sa-stat__value">
              {loading || value == null ? "—" : value}
            </strong>
          </div>
        ))}
      </div>

      <p className="sa-hours-note">
        {t("staffAttendanceAnalyticsUi.hoursNote", {
          worked: formatWorkedHours(data?.workedMinutes ?? null),
          late: data?.lateMinutes ?? 0,
          leave: data?.leaveDays ?? 0,
        })}
      </p>

      <div className="sa-analytics-charts">
        <section className="sa-analytics-chart">
          <h3>{t("staffAttendanceAnalyticsUi.trendTitle")}</h3>
          <BarChart rows={trendRows} emptyText={t("staffAttendanceAnalyticsUi.trendEmpty")} />
        </section>
        <section className="sa-analytics-chart">
          <h3>{t("staffAttendanceAnalyticsUi.mostLateTitle")}</h3>
          <BarChart rows={lateRows} emptyText={t("staffAttendanceAnalyticsUi.mostLateEmpty")} />
        </section>
        <section className="sa-analytics-chart">
          <h3>{t("staffAttendanceAnalyticsUi.mostAbsentTitle")}</h3>
          <BarChart rows={absentRows} emptyText={t("staffAttendanceAnalyticsUi.mostAbsentEmpty")} />
        </section>
      </div>
    </div>
  );
}