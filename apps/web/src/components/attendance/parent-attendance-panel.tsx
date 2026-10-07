"use client";

import { useEffect, useState } from "react";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { useParentChild } from "@/hooks/use-parent-child";
import {
  getAttendanceSummary,
  type AttendanceSummary,
} from "@/lib/attendance";
import { AppToast } from "@/components/ui/app-toast";

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export function ParentAttendancePanel() {
  const { children, selectedId, selectChild, loading, error } = useParentChild();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!selectedId) {
      setSummary(null);
      return;
    }
    setBusy(true);
    setLoadError("");
    void getAttendanceSummary(selectedId)
      .then(setSummary)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Could not load"),
      )
      .finally(() => setBusy(false));
  }, [selectedId]);

  return (
    <div className="att-v4__workspace">
      <AppToast message={loadError || error} tone="error" onDismiss={() => setLoadError("")} />

      <ParentChildBar
        children={children}
        selectedId={selectedId}
        onChange={selectChild}
        loading={loading}
        label="Child"
      />

      {!loading && !selectedId ? (
        <div className="att-manual__empty">
          <p className="att-manual__empty-title">No linked children</p>
          <span>Ask the school to link a student to your parent account.</span>
        </div>
      ) : null}

      {busy ? (
        <div className="att-manual__empty">
          <span className="att-manual__empty-spinner" aria-hidden />
          <p>Loading attendance…</p>
        </div>
      ) : null}

      {!busy && summary ? (
        <>
          <section className="att-manual__summary">
            <div className="att-manual__summary-top">
              <div>
                <h2 className="att-manual__class">{summary.student.name}</h2>
                <p className="att-manual__meta">
                  {summary.student.grade}
                  {summary.student.section
                    ? ` · ${summary.student.section}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="att-manual__kpis">
              <div className="att-manual__kpi att-manual__kpi--rate">
                <span className="att-manual__kpi-value">{summary.rate}%</span>
                <span className="att-manual__kpi-label">Attendance</span>
              </div>
              <div className="att-manual__kpi att-manual__kpi--present">
                <span className="att-manual__kpi-value">
                  {summary.counts.present}
                </span>
                <span className="att-manual__kpi-label">Present</span>
              </div>
              <div className="att-manual__kpi att-manual__kpi--late">
                <span className="att-manual__kpi-value">{summary.counts.late}</span>
                <span className="att-manual__kpi-label">Late</span>
              </div>
              <div className="att-manual__kpi att-manual__kpi--absent">
                <span className="att-manual__kpi-value">
                  {summary.counts.absent}
                </span>
                <span className="att-manual__kpi-label">Absent</span>
              </div>
              <div className="att-manual__kpi att-manual__kpi--excused">
                <span className="att-manual__kpi-value">
                  {summary.counts.excused}
                </span>
                <span className="att-manual__kpi-label">Excused</span>
              </div>
            </div>
            <div className="att-manual__progress" aria-hidden>
              <div
                className="att-manual__progress-fill"
                style={{ width: `${summary.rate}%` }}
              />
            </div>
          </section>

          <section className="att-manual__roster">
            <header className="att-manual__roster-head">
              <h3 className="att-manual__class" style={{ margin: 0, fontSize: "1.05rem" }}>
                Recent days
              </h3>
            </header>
            {summary.recent.length === 0 ? (
              <div className="att-manual__empty">
                <p className="att-manual__empty-title">No records yet</p>
              </div>
            ) : (
              <ul className="att-manual__list">
                {summary.recent.map((r) => (
                  <li key={r.id} className={`att-manual__row att-manual__row--${r.status}`}>
                    <div className="att-manual__row-main">
                      <div className="att-manual__identity">
                        <p className="att-manual__name">{r.date}</p>
                        <p className="att-manual__section">
                          {STATUS_LABEL[r.status] ?? r.status}
                          {r.reason ? ` · ${r.reason.replace(/_/g, " ")}` : ""}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
