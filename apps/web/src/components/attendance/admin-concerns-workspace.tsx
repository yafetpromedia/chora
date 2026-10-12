"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppToast } from "@/components/ui/app-toast";
import { listGradesForAttendance } from "@/lib/attendance";
import {
  CONCERN_TYPE_LABELS,
  STATUS_LABELS,
  getAttendanceConcernsSummary,
  listAttendanceConcerns,
  type AttendanceConcern,
  type AttendanceConcernStatus,
  type AttendanceConcernType,
} from "@/lib/attendance-concerns";

type GradeOpt = {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
};

type StatusFilter = AttendanceConcernStatus | "";

const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: "", label: "All" },
  { id: "OPEN", label: "Open" },
  { id: "UNDER_REVIEW", label: "In review" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "DISMISSED", label: "Dismissed" },
];

function classLabel(c: AttendanceConcern) {
  return c.section ? `${c.grade.name} ${c.section.name}` : c.grade.name;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminConcernsWorkspace() {
  const [items, setItems] = useState<AttendanceConcern[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{
    open: number;
    underReview: number;
    resolved: number;
    today: number;
  } | null>(null);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [concernType, setConcernType] = useState<AttendanceConcernType | "">(
    "",
  );
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [query, setQuery] = useState("");
  const [grades, setGrades] = useState<GradeOpt[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listGradesForAttendance()
      .then((rows) => setGrades(rows as GradeOpt[]))
      .catch(() => setGrades([]));
    void getAttendanceConcernsSummary()
      .then((s) =>
        setSummary({
          open: s.open,
          underReview: s.items.filter((i) => i.status === "UNDER_REVIEW")
            .length,
          resolved: s.resolved,
          today: s.today,
        }),
      )
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    void listAttendanceConcerns({
      date: date || undefined,
      status: status || undefined,
      concernType: concernType || undefined,
      gradeId: gradeId || undefined,
      sectionId: sectionId || undefined,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date, status, concernType, gradeId, sectionId]);

  const sections = grades.find((g) => g.id === gradeId)?.sections ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const hay = [
        classLabel(c),
        c.subject?.name,
        c.reportedBy.name,
        c.student?.name,
        CONCERN_TYPE_LABELS[c.concernType],
        c.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  function clearFilters() {
    setDate("");
    setStatus("");
    setConcernType("");
    setGradeId("");
    setSectionId("");
    setQuery("");
  }

  const hasFilters = Boolean(
    date || status || concernType || gradeId || sectionId || query.trim(),
  );

  return (
    <div className="att-concern att-concern--wide">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Attendance</span>
            <h2 className="tch-v2__hero-title">Attendance concerns</h2>
            <p className="tch-v2__hero-sub">
              School-wide observations from subject teachers. Homeroom and
              admins review without changing the official roll unless resolved
              with a correction.
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{summary?.open ?? "—"}</strong>
              <span>Open</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{summary?.today ?? "—"}</strong>
              <span>Today</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{summary?.resolved ?? "—"}</strong>
              <span>Closed</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{loading ? "—" : total}</strong>
              <span>Showing</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-stats att-concern__kpis">
        {(
          [
            ["Open", summary?.open, "late"],
            ["In review", summary?.underReview, "half"],
            ["Resolved", summary?.resolved, "present"],
            ["Today", summary?.today, "leave"],
          ] as const
        ).map(([label, value, tone]) => (
          <button
            key={label}
            type="button"
            className={`sa-stat sa-stat--${tone} att-concern__kpi-btn`}
            onClick={() => {
              if (label === "Open") setStatus("OPEN");
              else if (label === "In review") setStatus("UNDER_REVIEW");
              else if (label === "Resolved") setStatus("RESOLVED");
              else if (label === "Today") {
                setDate(new Date().toISOString().slice(0, 10));
                setStatus("");
              }
            }}
          >
            <span className="sa-stat__label">{label}</span>
            <strong className="sa-stat__value">
              {value == null ? "—" : value}
            </strong>
          </button>
        ))}
      </div>

      <div className="att-concern__chips" role="tablist" aria-label="Status">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.id || "all"}
            type="button"
            role="tab"
            aria-selected={status === chip.id}
            className={`att-concern__chip${
              status === chip.id ? " att-concern__chip--active" : ""
            }`}
            onClick={() => setStatus(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="sa-toolbar att-concern__toolbar">
        <label className="sa-field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="sa-field">
          <span>Concern type</span>
          <select
            value={concernType}
            onChange={(e) =>
              setConcernType(e.target.value as AttendanceConcernType | "")
            }
          >
            <option value="">All types</option>
            {(Object.keys(CONCERN_TYPE_LABELS) as AttendanceConcernType[]).map(
              (t) => (
                <option key={t} value={t}>
                  {CONCERN_TYPE_LABELS[t]}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="sa-field">
          <span>Grade</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field">
          <span>Section</span>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!gradeId}
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field sa-field--grow">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Class, teacher, student, type…"
          />
        </label>
        {hasFilters ? (
          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            onClick={clearFilters}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="att-concern__panel att-concern__results">
        <div className="att-concern__results-head">
          <h3>
            {loading
              ? "Loading concerns…"
              : `${filtered.length} concern${filtered.length === 1 ? "" : "s"}`}
          </h3>
          <p>
            Official attendance stays unchanged until a reviewer resolves with a
            correction.
          </p>
        </div>

        {loading ? (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>Fetching concerns…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="att-concern__empty-card">
            <strong>No concerns match</strong>
            <p>
              {hasFilters
                ? "Try clearing filters, or check another date."
                : "When subject teachers report a mismatch, it will show up here for review."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                className="sa-btn sa-btn--primary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Class / subject</th>
                  <th>Type</th>
                  <th>Reported by</th>
                  <th>Date</th>
                  <th>Counts</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{classLabel(c)}</strong>
                      <div className="sa-emp">
                        <span>
                          {c.subject?.name ?? "—"}
                          {c.periodLabel ? ` · ${c.periodLabel}` : ""}
                        </span>
                        {c.student ? (
                          <span>Student: {c.student.name}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{CONCERN_TYPE_LABELS[c.concernType]}</td>
                    <td>
                      <strong>{c.reportedBy.name}</strong>
                      <div className="sa-emp">
                        <span>{formatWhen(c.createdAt)}</span>
                      </div>
                    </td>
                    <td>{c.date}</td>
                    <td>
                      <div className="att-concern__counts">
                        <span>
                          Off{" "}
                          {c.officialPresentCount ?? "—"}/
                          {c.officialAbsentCount ?? "—"}
                        </span>
                        <span>
                          Obs{" "}
                          {c.observedPresentCount ?? "—"}/
                          {c.observedAbsentCount ?? "—"}
                        </span>
                        {c.difference != null ? (
                          <span
                            className={
                              c.difference !== 0
                                ? "att-concern__diff att-concern__diff--warn"
                                : "att-concern__diff"
                            }
                          >
                            Δ {c.difference > 0 ? "+" : ""}
                            {c.difference}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`att-concern__badge att-concern__badge--${c.status.toLowerCase()}`}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="sa-link"
                        href={`/admin/attendance/concerns/${c.id}`}
                      >
                        {c.status === "OPEN" || c.status === "UNDER_REVIEW"
                          ? "Review"
                          : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
