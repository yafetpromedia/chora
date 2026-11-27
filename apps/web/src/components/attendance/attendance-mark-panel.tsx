"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

type LocalStudent = RosterStudent & {
  localStatus: AttendanceStatus;
  localReason: AttendanceReason | null;
};

type FilterView = "all" | "exceptions";

function studentInitial(firstName: string, lastName: string) {
  const letter = (firstName.trim() || lastName.trim()).charAt(0);
  return (letter || "?").toUpperCase();
}

function formatStudentName(firstName: string, lastName: string, fallback: string) {
  const full = `${firstName} ${lastName}`.trim();
  if (!full) return fallback;
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

function AttendanceMarkFallback() {
  const { t } = useLocale();
  return <p className="tch-meta">{t("attendanceMark.loadingAttendance")}</p>;
}

export function AttendanceMarkPanel() {
  return (
    <Suspense fallback={<AttendanceMarkFallback />}>
      <AttendanceMarkPanelInner />
    </Suspense>
  );
}

function AttendanceMarkPanelInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const statusLabel: Record<AttendanceStatus, string> = useMemo(
    () => ({
      present: t("common.present"),
      absent: t("common.absent"),
      late: t("common.late"),
      excused: t("common.excused"),
    }),
    [t],
  );

  const reasons: { value: AttendanceReason; label: string }[] = useMemo(
    () => [
      { value: "sick", label: t("attendanceMark.reasonSick") },
      { value: "family_emergency", label: t("attendanceMark.reasonFamily") },
      { value: "unexcused", label: t("attendanceMark.reasonUnexcused") },
      { value: "other", label: t("attendanceMark.reasonOther") },
    ],
    [t],
  );
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<
    null | "all_present" | "selected_late" | "selected_absent"
  >(null);

  const selectedGrade = grades.find((g) => g.id === gradeId);

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
    if (!gradeId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
      setSaved(false);
    });
    void (async () => {
      try {
        const period = sessionType === "daily" ? 0 : periodNumber;
        const roster = await getAttendanceRoster({
          gradeId,
          sectionId: sectionId || undefined,
          date,
          periodNumber: period,
        });
        if (cancelled) return;
        setStudents(
          roster.map((s) => ({
            ...s,
            localStatus: s.status ?? "present",
            localReason: s.reason,
          })),
        );
        setSelected(new Set());
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t("attendanceMark.couldNotLoadClass"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeId, sectionId, date, sessionType, periodNumber]);

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
    setSelected(new Set());
    setSaved(false);
  }

  function markSelected(status: "late" | "absent") {
    setStudents((prev) =>
      prev.map((s) => {
        if (!selected.has(s.studentProfileId)) return s;
        return {
          ...s,
          localStatus: status,
          localReason: status === "absent" ? s.localReason ?? "unexcused" : null,
        };
      }),
    );
    setSaved(false);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyConfirm() {
    if (confirmAction === "all_present") markAllPresent();
    if (confirmAction === "selected_late") markSelected("late");
    if (confirmAction === "selected_absent") markSelected("absent");
    setConfirmAction(null);
  }

  async function onSave() {
    if (!gradeId || students.length === 0) return;
    if (sessionType === "period" && !subject.trim()) {
      setError(t("attendanceMark.enterSubjectPeriod"));
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
      setError(err instanceof Error ? err.message : t("attendanceMark.couldNotSave"));
    } finally {
      setSaving(false);
    }
  }

  const exceptionCount = counts.absent + counts.late + counts.excused;

  const classLabel = selectedGrade
    ? `${selectedGrade.name}${sectionId ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}` : ""}`
    : t("attendanceMark.selectClass");

  return (
    <div className="att-v4__workspace">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast
        message={
          saved ? t("attendanceMark.savedToast") : ""
        }
        tone="success"
        onDismiss={() => setSaved(false)}
      />

      <section className="att-v4__filters">
        <div className="att-v4__field">
          <span>{t("attendanceMark.grade")}</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
            }}
            disabled={grades.length === 0}
          >
            {grades.length === 0 ? (
              <option value="">{t("attendanceMark.noClassesAssigned")}</option>
            ) : null}
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="att-v4__field">
          <span>{t("attendanceMark.section")}</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">{t("attendanceMark.allSections")}</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="att-v4__field">
          <span>{t("attendanceMark.date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {mode === "BOTH" ? (
          <div className="att-v4__field">
            <span>{t("attendanceMark.session")}</span>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as "daily" | "period")}>
              <option value="daily">{t("attendanceMark.daily")}</option>
              <option value="period">{t("attendanceMark.period")}</option>
            </select>
          </div>
        ) : null}
        {(sessionType === "period" || mode === "PERIOD") && (
          <>
            <div className="att-v4__field">
              <span>{t("attendanceMark.period")}</span>
              <select value={periodNumber} onChange={(e) => setPeriodNumber(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {t("attendanceMark.periodN", { n })}
                  </option>
                ))}
              </select>
            </div>
            <div className="att-v4__field att-v4__field--wide">
              <span>{t("attendanceMark.subject")}</span>
              <input
                placeholder={t("attendanceMark.subjectPlaceholder")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
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
                {students.length}{" "}
                {students.length === 1
                  ? t("attendanceMark.studentOne")
                  : t("attendanceMark.studentsMany")}{" "}
                · {formatDisplayDate(date)}
              </p>
            </div>
            <div className="att-manual__bulk-actions">
              <button
                type="button"
                className="att-v4__btn att-v4__btn--ghost att-manual__all-present"
                onClick={() => setConfirmAction("all_present")}
              >
                {t("attendanceMark.markAllPresent")}
              </button>
              <button
                type="button"
                className="att-v4__btn att-v4__btn--ghost"
                disabled={selected.size === 0}
                onClick={() => setConfirmAction("selected_late")}
              >
                {t("attendanceMark.selectedLate", { count: selected.size })}
              </button>
              <button
                type="button"
                className="att-v4__btn att-v4__btn--ghost"
                disabled={selected.size === 0}
                onClick={() => setConfirmAction("selected_absent")}
              >
                {t("attendanceMark.selectedAbsent", { count: selected.size })}
              </button>
            </div>
          </div>
          <div className="att-manual__kpis">
            <div className="att-manual__kpi att-manual__kpi--rate">
              <span className="att-manual__kpi-value">{presentRate}%</span>
              <span className="att-manual__kpi-label">{t("attendanceMark.attendanceKpi")}</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--present">
              <span className="att-manual__kpi-value">{counts.present}</span>
              <span className="att-manual__kpi-label">{t("common.present")}</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--absent">
              <span className="att-manual__kpi-value">{counts.absent}</span>
              <span className="att-manual__kpi-label">{t("common.absent")}</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--late">
              <span className="att-manual__kpi-value">{counts.late}</span>
              <span className="att-manual__kpi-label">{t("common.late")}</span>
            </div>
            <div className="att-manual__kpi att-manual__kpi--excused">
              <span className="att-manual__kpi-value">{counts.excused}</span>
              <span className="att-manual__kpi-label">{t("common.excused")}</span>
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
            placeholder={t("attendanceMark.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="att-manual__view-tabs" role="tablist" aria-label={t("attendanceMark.rosterFilterAria")}>
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === "all"}
              className={`att-manual__view-tab${viewFilter === "all" ? " att-manual__view-tab--on" : ""}`}
              onClick={() => setViewFilter("all")}
            >
              {t("attendanceMark.all")}
              <span className="att-manual__view-count">{students.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewFilter === "exceptions"}
              className={`att-manual__view-tab${viewFilter === "exceptions" ? " att-manual__view-tab--on" : ""}`}
              onClick={() => setViewFilter("exceptions")}
            >
              {t("attendanceMark.exceptions")}
              <span className="att-manual__view-count">{exceptionCount}</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="att-manual__empty">
            <span className="att-manual__empty-spinner" aria-hidden />
            <p>{t("attendanceMark.loadingRoster")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="att-manual__empty">
            <p className="att-manual__empty-title">
              {students.length === 0
                ? t("attendanceMark.noStudentsInClass")
                : t("attendanceMark.noMatches")}
            </p>
            <span>
              {students.length === 0
                ? t("attendanceMark.noStudentsHint")
                : t("attendanceMark.noMatchesHint")}
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
                    <label className="att-manual__select">
                      <input
                        type="checkbox"
                        checked={selected.has(s.studentProfileId)}
                        onChange={() => toggleSelected(s.studentProfileId)}
                        aria-label={t("attendanceMark.selectStudentAria", {
                          name: formatStudentName(
                            s.firstName,
                            s.lastName,
                            t("attendanceMark.studentFallback"),
                          ),
                        })}
                      />
                    </label>
                    <span
                      className={`att-manual__avatar att-manual__avatar--${s.localStatus}`}
                      aria-hidden
                    >
                      {studentInitial(s.firstName, s.lastName)}
                    </span>
                    <div className="att-manual__identity">
                      <p className="att-manual__name">
                        {formatStudentName(
                          s.firstName,
                          s.lastName,
                          t("attendanceMark.studentFallback"),
                        )}
                      </p>
                      {s.sectionName ? (
                        <p className="att-manual__section">
                          {t("attendanceMark.sectionLabel", { name: s.sectionName })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="att-manual__segment"
                    role="group"
                    aria-label={t("attendanceMark.statusForAria", {
                      name: formatStudentName(
                        s.firstName,
                        s.lastName,
                        t("attendanceMark.studentFallback"),
                      ),
                    })}
                  >
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`att-manual__segment-btn att-manual__segment-btn--${st}${s.localStatus === st ? " att-manual__segment-btn--on" : ""}`}
                        onClick={() => setStatus(s.studentProfileId, st)}
                        aria-pressed={s.localStatus === st}
                      >
                        {statusLabel[st]}
                      </button>
                    ))}
                  </div>
                </div>
                {s.localStatus === "absent" ? (
                  <div className="att-manual__reasons">
                    <span className="att-manual__reasons-label">{t("attendanceMark.reason")}</span>
                    <div className="att-manual__reason-chips">
                      {reasons.map((r) => (
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
            <strong>{students.length}</strong> {t("attendanceMark.studentsFooter")}
            <span className="att-manual__footer-dot" aria-hidden>·</span>
            <span>
              {exceptionCount === 0
                ? t("attendanceMark.everyonePresent")
                : exceptionCount === 1
                  ? t("attendanceMark.exceptionsToSave", { count: exceptionCount })
                  : t("attendanceMark.exceptionsToSaveMany", { count: exceptionCount })}
            </span>
          </div>
          <button
            type="button"
            className="att-v4__btn att-v4__btn--primary att-manual__save"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? t("attendanceMark.saving") : t("attendanceMark.saveAttendance")}
          </button>
        </footer>
      ) : null}

      {confirmAction ? (
        <div className="att-manual__confirm" role="dialog" aria-modal="true">
          <div className="att-manual__confirm-card">
            <h3>
              {confirmAction === "all_present"
                ? t("attendanceMark.confirmAllPresentTitle")
                : confirmAction === "selected_late"
                  ? t("attendanceMark.confirmLateTitle", { count: selected.size })
                  : t("attendanceMark.confirmAbsentTitle", { count: selected.size })}
            </h3>
            <p>
              {confirmAction === "all_present"
                ? t("attendanceMark.confirmAllPresentBody")
                : t("attendanceMark.confirmOtherBody")}
            </p>
            <div className="att-manual__confirm-actions">
              <button
                type="button"
                className="att-v4__btn att-v4__btn--ghost"
                onClick={() => setConfirmAction(null)}
              >
                {t("attendanceMark.cancel")}
              </button>
              <button
                type="button"
                className="att-v4__btn att-v4__btn--primary"
                onClick={applyConfirm}
              >
                {t("attendanceMark.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
