"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GradeWithSections } from "@/lib/api";
import { getMyTeacherProfile } from "@/lib/teachers";
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
import { AppToast } from "@/components/ui/app-toast";

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

function studentInitial(firstName: string, lastName: string) {
  const letter = (firstName.trim() || lastName.trim()).charAt(0);
  return (letter || "?").toUpperCase();
}

function formatStudentName(firstName: string, lastName: string) {
  const full = `${firstName} ${lastName}`.trim();
  if (!full) return "Student";
  return full
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDisplayDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AttendanceMarkPanel() {
  return (
    <Suspense fallback={<p className="tch-meta">Loading attendance…</p>}>
      <AttendanceMarkPanelInner />
    </Suspense>
  );
}

function AttendanceMarkPanelInner() {
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
    void Promise.all([
      listGradesForAttendance(),
      getAttendanceSettings(),
      getMyTeacherProfile().catch(() => null),
    ])
      .then(([g, settings, profile]) => {
        setGrades(g);
        setMode(settings.mode);
        if (settings.mode === "PERIOD") setSessionType("period");
        const homeroom = profile?.homeroom;
        const preferred =
          initialGradeId && g.some((x) => x.id === initialGradeId)
            ? initialGradeId
            : homeroom?.gradeId && g.some((x) => x.id === homeroom.gradeId)
              ? homeroom.gradeId
              : g[0]?.id ?? "";
        setGradeId(preferred);
        const grade = g.find((x) => x.id === preferred);
        const sectionPreferred =
          initialSectionId && grade?.sections.some((s) => s.id === initialSectionId)
            ? initialSectionId
            : homeroom?.sectionId && grade?.sections.some((s) => s.id === homeroom.sectionId)
              ? homeroom.sectionId
              : "";
        setSectionId(sectionPreferred);
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

  const classLabel = selectedGrade
    ? `${selectedGrade.name}${sectionId ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}` : ""}`
    : "Select class";

  return (
    <div className="att-v4__workspace">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast
        message={
          saved
            ? "Attendance saved. Parents are notified for absences and late arrivals."
            : ""
        }
        tone="success"
        onDismiss={() => setSaved(false)}
      />

      <section className="att-v4__filters">
        <div className="att-v4__field">
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
        <div className="att-v4__field">
          <span>Section</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="att-v4__field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {mode === "BOTH" ? (
          <div className="att-v4__field">
            <span>Session</span>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as "daily" | "period")}>
              <option value="daily">Daily</option>
              <option value="period">Period</option>
            </select>
          </div>
        ) : null}
        {(sessionType === "period" || mode === "PERIOD") && (
          <>
            <div className="att-v4__field">
              <span>Period</span>
              <select value={periodNumber} onChange={(e) => setPeriodNumber(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>Period {n}</option>
                ))}
              </select>
            </div>
            <div className="att-v4__field att-v4__field--wide">
              <span>Subject</span>
              <input placeholder="Math, English…" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </>
        )}
      </section>

      {students.length > 0 ? (
        <section className="att-manual__summary">
          <div className="att-manual__summary-top">
            <div>
              <h2 className="att-manual__class">{classLabel}</h2>
              <p className="att-manual__meta">
                {students.length} student{students.length === 1 ? "" : "s"} · {formatDisplayDate(date)}
              </p>
            </div>
            <button
              type="button"
              className="att-v4__btn att-v4__btn--ghost att-manual__all-present"
              onClick={markAllPresent}
            >
              Mark all present
            </button>
          </div>
          <div className="att-manual__kpis">
            <div className="att-manual__kpi att-manual__kpi--rate">
              <span className="att-manual__kpi-value">{presentRate}%</span>
              <span className="att-manual__kpi-label">Attendance</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--present">
              <span className="att-manual__kpi-value">{counts.present}</span>
              <span className="att-manual__kpi-label">Present</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--absent">
              <span className="att-manual__kpi-value">{counts.absent}</span>
              <span className="att-manual__kpi-label">Absent</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--late">
              <span className="att-manual__kpi-value">{counts.late}</span>
              <span className="att-manual__kpi-label">Late</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--excused">
              <span className="att-manual__kpi-value">{counts.excused}</span>
              <span className="att-manual__kpi-label">Excused</span>
            </div>
          </div>
          <div className="att-manual__progress" aria-hidden>
            <div className="att-manual__progress-fill" style={{ width: `${presentRate}%` }} />
          </div>
        </section>
      ) : null}

      <section className="att-manual__roster">
        <header className="att-manual__roster-head">
          <input
            className="att-manual__search"
            type="search"
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="att-manual__view-tabs" role="tablist" aria-label="Roster filter">
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === "all"}
              className={`att-manual__view-tab${viewFilter === "all" ? " att-manual__view-tab--on" : ""}`}
              onClick={() => setViewFilter("all")}
            >
              All
              <span className="att-manual__view-count">{students.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === "exceptions"}
              className={`att-manual__view-tab${viewFilter === "exceptions" ? " att-manual__view-tab--on" : ""}`}
              onClick={() => setViewFilter("exceptions")}
            >
              Exceptions
              <span className="att-manual__view-count">{exceptionCount}</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="att-manual__empty">
            <span className="att-manual__empty-spinner" aria-hidden />
            <p>Loading class roster…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="att-manual__empty">
            <p className="att-manual__empty-title">
              {students.length === 0 ? "No students in this class" : "No matches"}
            </p>
            <span>
              {students.length === 0
                ? "Choose another grade or section above."
                : "Try a different search or show all students."}
            </span>
          </div>
        ) : (
          <ul className="att-manual__list">
            {filtered.map((s) => (
              <li
                key={s.studentProfileId}
                className={`att-manual__row att-manual__row--${s.localStatus}`}
              >
                <div className="att-manual__row-main">
                  <div className="att-manual__student">
                    <span
                      className={`att-manual__avatar att-manual__avatar--${s.localStatus}`}
                      aria-hidden
                    >
                      {studentInitial(s.firstName, s.lastName)}
                    </span>
                    <div className="att-manual__identity">
                      <p className="att-manual__name">
                        {formatStudentName(s.firstName, s.lastName)}
                      </p>
                      {s.sectionName ? (
                        <p className="att-manual__section">Section {s.sectionName}</p>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="att-manual__segment"
                    role="group"
                    aria-label={`Status for ${formatStudentName(s.firstName, s.lastName)}`}
                  >
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`att-manual__segment-btn att-manual__segment-btn--${st}${s.localStatus === st ? " att-manual__segment-btn--on" : ""}`}
                        onClick={() => setStatus(s.studentProfileId, st)}
                        aria-pressed={s.localStatus === st}
                      >
                        {STATUS_LABEL[st]}
                      </button>
                    ))}
                  </div>
                </div>
                {s.localStatus === "absent" ? (
                  <div className="att-manual__reasons">
                    <span className="att-manual__reasons-label">Reason</span>
                    <div className="att-manual__reason-chips">
                      {REASONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          className={`att-manual__reason${s.localReason === r.value ? " att-manual__reason--on" : ""}`}
                          onClick={() => setReason(s.studentProfileId, r.value)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {students.length > 0 ? (
        <footer className="att-manual__footer">
          <div className="att-manual__footer-info">
            <strong>{students.length}</strong> students
            <span className="att-manual__footer-dot" aria-hidden>·</span>
            <span>
              {exceptionCount === 0
                ? "Everyone marked present"
                : `${exceptionCount} exception${exceptionCount === 1 ? "" : "s"} to save`}
            </span>
          </div>
          <button
            type="button"
            className="att-v4__btn att-v4__btn--primary att-manual__save"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : "Save attendance"}
          </button>
        </footer>
      ) : null}
    </div>
  );
}
