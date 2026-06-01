"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GradeWithSections } from "@/lib/api";
import {
  getAttendanceRoster,
  getAttendanceSettings,
  listGradesForAttendance,
  saveBulkAttendance,
  type AttendanceMode,
  type AttendanceReason,
  type AttendanceStatus,
  type RosterStudent,
} from "@/lib/attendance";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

const REASONS: { value: AttendanceReason; label: string }[] = [
  { value: "sick", label: "Sick" },
  { value: "family_emergency", label: "Family" },
  { value: "unexcused", label: "Unexcused" },
  { value: "other", label: "Other" },
];

type LocalStudent = RosterStudent & {
  localStatus: AttendanceStatus;
  localReason: AttendanceReason | null;
};

type FilterView = "all" | "exceptions";

export function AttendanceMarkPanel() {
  const searchParams = useSearchParams();
  const initialGradeId = searchParams.get("gradeId") ?? "";
  const initialSectionId = searchParams.get("sectionId") ?? "";

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [mode, setMode] = useState<AttendanceMode>("DAILY");
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(today);
  const [sessionType, setSessionType] = useState<"daily" | "period">("daily");
  const [periodNumber, setPeriodNumber] = useState(1);
  const [subject, setSubject] = useState("");
  const [students, setStudents] = useState<LocalStudent[]>([]);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<FilterView>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedGrade = grades.find((g) => g.id === gradeId);

  const loadRoster = useCallback(async () => {
    if (!gradeId) return;
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const period = sessionType === "daily" ? 0 : periodNumber;
      const roster = await getAttendanceRoster({
        gradeId,
        sectionId: sectionId || undefined,
        date,
        periodNumber: period,
      });
      setStudents(
        roster.map((s) => ({
          ...s,
          localStatus: s.status ?? "present",
          localReason: s.reason,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load class");
    } finally {
      setLoading(false);
    }
  }, [gradeId, sectionId, date, sessionType, periodNumber]);

  useEffect(() => {
    void Promise.all([listGradesForAttendance(), getAttendanceSettings()])
      .then(([g, settings]) => {
        setGrades(g);
        setMode(settings.mode);
        if (settings.mode === "PERIOD") setSessionType("period");
        const preferred =
          initialGradeId && g.some((x) => x.id === initialGradeId)
            ? initialGradeId
            : g[0]?.id ?? "";
        setGradeId(preferred);
        if (
          initialSectionId &&
          g.find((x) => x.id === preferred)?.sections.some((s) => s.id === initialSectionId)
        ) {
          setSectionId(initialSectionId);
        }
      })
      .catch(() => undefined);
  }, [initialGradeId, initialSectionId]);

  useEffect(() => {
    if (gradeId) void loadRoster();
  }, [gradeId, sectionId, date, sessionType, periodNumber, loadRoster]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const s of students) c[s.localStatus]++;
    return c;
  }, [students]);

  const presentRate =
    students.length > 0
      ? Math.round(((counts.present + counts.late + counts.excused) / students.length) * 100)
      : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (viewFilter === "exceptions" && s.localStatus === "present") return false;
      if (!q) return true;
      return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
    });
  }, [students, search, viewFilter]);

  function setStatus(id: string, status: AttendanceStatus) {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentProfileId !== id) return s;
        return {
          ...s,
          localStatus: status,
          localReason: status === "absent" ? s.localReason ?? "unexcused" : null,
        };
      }),
    );
    setSaved(false);
  }

  function setReason(id: string, reason: AttendanceReason) {
    setStudents((prev) =>
      prev.map((s) => (s.studentProfileId === id ? { ...s, localReason: reason } : s)),
    );
    setSaved(false);
  }

  function markAllPresent() {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, localStatus: "present" as const, localReason: null })),
    );
    setSaved(false);
  }

  async function onSave() {
    if (!gradeId || students.length === 0) return;
    if (sessionType === "period" && !subject.trim()) {
      setError("Enter the subject for this period");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveBulkAttendance({
        gradeId,
        sectionId: sectionId || undefined,
        date,
        periodNumber: sessionType === "daily" ? 0 : periodNumber,
        subject: sessionType === "period" ? subject.trim() : undefined,
        records: students.map((s) => ({
          studentProfileId: s.studentProfileId,
          status: s.localStatus,
          ...(s.localStatus === "absent" && s.localReason ? { reason: s.localReason } : {}),
        })),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const exceptionCount = counts.absent + counts.late + counts.excused;

  return (
    <div className="att-page">
      {error ? <p className="att-toast att-toast--error">{error}</p> : null}
      {saved ? (
        <p className="att-toast" role="status">
          Attendance saved. Parents are notified for absences and late arrivals.
        </p>
      ) : null}

      <div className="att-mark-toolbar">
        <div className="att-field">
          <span>Grade</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
            }}
            disabled={grades.length === 0}
          >
            {grades.length === 0 ? (
              <option value="">No classes assigned</option>
            ) : null}
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="att-field">
          <span>Section</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="att-field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {mode === "BOTH" ? (
          <div className="att-field">
            <span>Session</span>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as "daily" | "period")}>
              <option value="daily">Daily</option>
              <option value="period">Period</option>
            </select>
          </div>
        ) : null}
        {(sessionType === "period" || mode === "PERIOD") && (
          <>
            <div className="att-field">
              <span>Period</span>
              <select value={periodNumber} onChange={(e) => setPeriodNumber(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>Period {n}</option>
                ))}
              </select>
            </div>
            <div className="att-field att-field--wide">
              <span>Subject</span>
              <input placeholder="Math, English…" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </>
        )}
        <div className="att-mark-actions">
          <button type="button" className="att-btn att-btn--ghost" onClick={markAllPresent}>
            All present
          </button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="att-progress">
          <div className="att-progress__head">
            <span>{selectedGrade?.name}{sectionId && selectedGrade ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name}` : ""}</span>
            <span>{presentRate}% attendance · {students.length} students</span>
          </div>
          <div className="att-progress__bar">
            <div className="att-progress__fill" style={{ width: `${presentRate}%` }} />
          </div>
          <div className="att-progress__legend">
            <span><span className="att-legend-dot att-legend-dot--present" />{counts.present} present</span>
            <span><span className="att-legend-dot att-legend-dot--absent" />{counts.absent} absent</span>
            <span><span className="att-legend-dot att-legend-dot--late" />{counts.late} late</span>
            <span><span className="att-legend-dot att-legend-dot--excused" />{counts.excused} excused</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <input
          className="att-search"
          type="search"
          placeholder="Search student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className={`att-filter-chip${viewFilter === "all" ? " att-filter-chip--on" : ""}`}
          onClick={() => setViewFilter("all")}
        >
          All ({students.length})
        </button>
        <button
          type="button"
          className={`att-filter-chip${viewFilter === "exceptions" ? " att-filter-chip--on" : ""}`}
          onClick={() => setViewFilter("exceptions")}
        >
          Exceptions ({exceptionCount})
        </button>
      </div>

      {loading ? (
        <div className="att-empty">
          <p className="att-empty__title">Loading class roster…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="att-empty">
          <p className="att-empty__title">
            {students.length === 0 ? "No students in this class" : "No matches"}
          </p>
        </div>
      ) : (
        <div className="att-roster-grid">
          {filtered.map((s) => (
            <article
              key={s.studentProfileId}
              className={`att-student-card att-student-card--${s.localStatus}`}
            >
              <div className="att-student-card__top">
                <div>
                  <div className="att-student-card__name">
                    {s.firstName} {s.lastName}
                  </div>
                  {s.sectionName ? (
                    <div className="att-student-card__meta">Section {s.sectionName}</div>
                  ) : null}
                </div>
              </div>
              <div className="att-status-pills">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`att-status-pill att-status-pill--${st}${s.localStatus === st ? " att-status-pill--on" : ""}`}
                    onClick={() => setStatus(s.studentProfileId, st)}
                  >
                    {STATUS_LABEL[st]}
                  </button>
                ))}
              </div>
              {s.localStatus === "absent" ? (
                <div className="att-reason-row">
                  {REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`att-reason-chip${s.localReason === r.value ? " att-reason-chip--on" : ""}`}
                      onClick={() => setReason(s.studentProfileId, r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {students.length > 0 && (
        <div className="att-save-bar">
          <span className="att-save-bar__hint">
            Tap status pills to mark · {exceptionCount} exception{exceptionCount !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="att-btn att-btn--primary"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : `Save attendance${exceptionCount > 0 ? ` (${exceptionCount})` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
