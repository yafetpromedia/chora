"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { getOrEnsureCurrentAcademicYear } from "@/lib/results";
import {
  ensureTimetable,
  generateTimetable,
  getTimetableGrid,
  listTimetablePeriods,
  saveTimetableEntries,
  saveTimetablePeriods,
  type TimetableGrid,
  type Weekday,
} from "@/lib/timetable";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

type CellDraft = {
  subjectId: string;
  teacherUserId: string;
  roomName: string;
};

type PeriodDraft = {
  number: number;
  label: string;
  startTime: string;
  endTime: string;
};

function cellKey(weekday: Weekday, periodNumber: number) {
  return `${weekday}:${periodNumber}`;
}

export default function AdminTimetablePage() {
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);

  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [grid, setGrid] = useState<TimetableGrid | null>(null);
  const [cells, setCells] = useState<Record<string, CellDraft>>({});
  const [periods, setPeriods] = useState<PeriodDraft[]>([]);
  const [periodsOpen, setPeriodsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [generateScope, setGenerateScope] = useState<"school" | "class">("school");

  const selectedGrade = grades.find((g) => g.id === gradeId);

  const loadPeriods = useCallback(async () => {
    if (!academicYearId) return;
    await ensureTimetable(academicYearId);
    const rows = await listTimetablePeriods(academicYearId);
    setPeriods(
      rows.map((p) => ({
        number: p.number,
        label: p.label,
        startTime: p.startTime ?? "",
        endTime: p.endTime ?? "",
      })),
    );
  }, [academicYearId]);

  const loadGrid = useCallback(async () => {
    if (!academicYearId || !gradeId) return;
    setBusy(true);
    setError("");
    try {
      await ensureTimetable(academicYearId);
      const data = await getTimetableGrid(
        academicYearId,
        gradeId,
        sectionId || undefined,
      );
      setGrid(data);
      const next: Record<string, CellDraft> = {};
      for (const e of data.entries) {
        next[cellKey(e.weekday, e.period.number)] = {
          subjectId: e.subject.id,
          teacherUserId: e.teacher?.userId ?? "",
          roomName: e.room?.name ?? "",
        };
      }
      setCells(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load timetable");
    } finally {
      setBusy(false);
    }
  }, [academicYearId, gradeId, sectionId]);

  useEffect(() => {
    setCanEdit(hasPermission(Permission.TIMETABLE_MANAGE));
  }, []);

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void Promise.all([listGrades(), getOrEnsureCurrentAcademicYear()])
      .then(([g, year]) => {
        setGrades(g);
        setAcademicYearId(year.id);
        if (g[0]) {
          setGradeId(g[0].id);
          if (g[0].sections[0]) setSectionId(g[0].sections[0].id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!academicYearId || loading) return;
    void loadPeriods().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load periods"),
    );
  }, [academicYearId, loading, loadPeriods]);

  useEffect(() => {
    if (!academicYearId || !gradeId || loading) return;
    void loadGrid();
  }, [academicYearId, gradeId, sectionId, loading, loadGrid]);

  const weekdays = grid?.weekdays ?? [];

  const classLabel = useMemo(() => {
    if (!selectedGrade) return "";
    const sec = selectedGrade.sections.find((s) => s.id === sectionId);
    return `${selectedGrade.name}${sec ? ` · ${sec.name}` : ""}`;
  }, [selectedGrade, sectionId]);

  const filledSlots = useMemo(
    () => Object.values(cells).filter((c) => c.subjectId).length,
    [cells],
  );

  const totalSlots = useMemo(() => {
    if (!grid) return 0;
    return grid.periods.length * weekdays.length;
  }, [grid, weekdays.length]);

  const periodCount = grid?.periods.length ?? periods.length;

  const timedPeriodCount = useMemo(
    () => periods.filter((p) => p.startTime && p.endTime).length,
    [periods],
  );

  function setCell(weekday: Weekday, periodNumber: number, patch: Partial<CellDraft>) {
    const key = cellKey(weekday, periodNumber);
    setCells((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          subjectId: existing?.subjectId ?? "",
          teacherUserId: existing?.teacherUserId ?? "",
          roomName: existing?.roomName ?? "",
          ...patch,
        },
      };
    });
  }

  function addPeriod() {
    setPeriods((prev) => {
      const nextNumber = prev.length > 0 ? Math.max(...prev.map((p) => p.number)) + 1 : 1;
      return [
        ...prev,
        {
          number: nextNumber,
          label: `Period ${nextNumber}`,
          startTime: "",
          endTime: "",
        },
      ];
    });
  }

  function removePeriod(number: number) {
    setPeriods((prev) => prev.filter((p) => p.number !== number));
  }

  function updatePeriod(number: number, patch: Partial<PeriodDraft>) {
    setPeriods((prev) =>
      prev.map((p) => (p.number === number ? { ...p, ...patch } : p)),
    );
  }

  async function onSavePeriods() {
    if (!canEdit || !academicYearId) return;
    if (periods.length === 0) {
      setError("Keep at least one period in the bell schedule.");
      return;
    }
    const prevCount = grid?.periods.length ?? periods.length;
    if (
      periods.length < prevCount &&
      !window.confirm(
        "Removing periods deletes all scheduled lessons in those slots for every class. Continue?",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const normalized = periods.map((p, index) => ({
        number: index + 1,
        label: p.label.trim() || `Period ${index + 1}`,
        startTime: p.startTime.trim() || null,
        endTime: p.endTime.trim() || null,
        sortOrder: index,
      }));
      await saveTimetablePeriods({
        academicYearId,
        periods: normalized,
      });
      setPeriods(
        normalized.map((p) => ({
          number: p.number,
          label: p.label,
          startTime: p.startTime ?? "",
          endTime: p.endTime ?? "",
        })),
      );
      setSaved("Bell schedule updated.");
      await loadGrid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save periods");
    } finally {
      setBusy(false);
    }
  }

  async function onAutoGenerate() {
    if (!canEdit || !academicYearId) return;
    const scopeLabel =
      generateScope === "class" && classLabel
        ? classLabel
        : "the whole school";
    if (
      !window.confirm(
        `Auto-generate timetable for ${scopeLabel}? This replaces existing entries in that scope. Teachers will not be double-booked in the same period.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = await generateTimetable({
        academicYearId,
        replaceExisting: true,
        ...(generateScope === "class" && gradeId
          ? { gradeId, sectionId: sectionId || undefined }
          : {}),
      });
      let message = `Scheduled ${result.placed} of ${result.totalLessons} lessons across ${result.classesProcessed} classes.`;
      if (result.unplaced.length > 0) {
        message += ` ${result.unplaced.length} could not be placed — add periods or reduce clashes.`;
      }
      setSaved(message);
      if (result.unplaced.length > 0) {
        setError(
          result.unplaced
            .slice(0, 4)
            .map(
              (u) =>
                `${u.subjectName} (${u.gradeName}${u.sectionName ? ` · ${u.sectionName}` : ""}): ${u.reason}`,
            )
            .join(" "),
        );
      }
      await loadPeriods();
      await loadGrid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!canEdit || !academicYearId || !gradeId) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const entries: {
        weekday: Weekday;
        periodNumber: number;
        subjectId: string;
        teacherUserId?: string | null;
        roomName?: string | null;
      }[] = [];

      for (const [key, cell] of Object.entries(cells)) {
        if (!cell.subjectId) continue;
        const [weekday, periodStr] = key.split(":") as [Weekday, string];
        entries.push({
          weekday,
          periodNumber: Number(periodStr),
          subjectId: cell.subjectId,
          teacherUserId: cell.teacherUserId || null,
          roomName: cell.roomName?.trim() || null,
        });
      }

      await saveTimetableEntries({
        academicYearId,
        gradeId,
        sectionId: sectionId || undefined,
        entries,
      });
      setSaved(`Timetable saved for ${classLabel}.`);
      await loadGrid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage role="admin" title="Timetable">
      <div className="tt-admin">
        {error ? <p className="tt-admin__alert tt-admin__alert--err">{error}</p> : null}
        {saved ? <p className="tt-admin__alert tt-admin__alert--ok">{saved}</p> : null}

        <header className="tt-admin__hero">
          <div className="tt-admin__hero-glow" aria-hidden />
          <div className="tt-admin__hero-inner">
            <div className="tt-admin__hero-main">
              <h2 className="tt-admin__hero-title">Class timetable</h2>
              <p className="tt-admin__hero-sub">
                One <strong>subject per period</strong> per class. Doubles use two separate periods
                (e.g. Period 3 &amp; 5). Set bell times under{" "}
                <button
                  type="button"
                  className="tt-admin__hero-link"
                  onClick={() => canEdit && setPeriodsOpen(true)}
                  disabled={!canEdit}
                >
                  Manage periods
                </button>
                .
              </p>
              {classLabel ? (
                <div className="tt-admin__hero-badges">
                  <span className="tt-admin__badge">{classLabel}</span>
                  {canEdit ? (
                    <span className="tt-admin__badge tt-admin__badge--muted">
                      {generateScope === "school" ? "Whole school generate" : "This class only"}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="tt-admin__hero-stats">
              <div className="tt-admin__stat">
                <strong>{loading ? "—" : periodCount}</strong>
                <span>Periods</span>
              </div>
              <div className="tt-admin__stat">
                <strong>{loading ? "—" : weekdays.length}</strong>
                <span>Days</span>
              </div>
              <div className="tt-admin__stat">
                <strong>{loading || !grid ? "—" : filledSlots}</strong>
                <span>Scheduled</span>
              </div>
              <div className="tt-admin__stat tt-admin__stat--accent">
                <strong>{loading || !grid ? "—" : Math.max(totalSlots - filledSlots, 0)}</strong>
                <span>Open slots</span>
              </div>
            </div>
          </div>
        </header>

        <div className="tt-admin__toolbar">
          <select
            className="tt-admin__filter"
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              const g = grades.find((x) => x.id === e.target.value);
              setSectionId(g?.sections[0]?.id ?? "");
            }}
            aria-label="Grade"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {selectedGrade && selectedGrade.sections.length > 0 ? (
            <select
              className="tt-admin__filter"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              aria-label="Section"
            >
              {selectedGrade.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          {canEdit ? (
            <select
              className="tt-admin__filter"
              value={generateScope}
              onChange={(e) => setGenerateScope(e.target.value as "school" | "class")}
              aria-label="Auto-generate scope"
            >
              <option value="school">Whole school</option>
              <option value="class">This class only</option>
            </select>
          ) : null}
          <div className="tt-admin__toolbar-actions">
            {canEdit ? (
              <button
                type="button"
                className="tt-admin__btn tt-admin__btn--ghost"
                disabled={busy || !academicYearId}
                onClick={() => void onAutoGenerate()}
              >
                <DashIcon name="calendar" className="dash-icon--sm" />
                {busy ? "Working…" : "Auto-generate"}
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                className="tt-admin__btn tt-admin__btn--ghost"
                onClick={() => setPeriodsOpen(true)}
              >
                Manage periods
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                className="tt-admin__btn tt-admin__btn--primary"
                disabled={busy || !gradeId}
                onClick={() => void onSave()}
              >
                {busy ? "Saving…" : "Save timetable"}
              </button>
            ) : null}
          </div>
        </div>

        {periodsOpen && canEdit ? (
          <>
            <div
              className="stu-drawer-backdrop"
              onClick={() => setPeriodsOpen(false)}
              aria-hidden
            />
            <aside
              className="stu-drawer stu-drawer--wide tt-periods-drawer"
              role="dialog"
              aria-labelledby="tt-periods-title"
            >
              <header className="stu-drawer__head tt-periods-drawer__head">
                <div className="tt-periods-drawer__head-main">
                  <span className="tt-periods-drawer__icon" aria-hidden>
                    <DashIcon name="calendar" className="dash-icon--sm" />
                  </span>
                  <div>
                    <h2 id="tt-periods-title" className="stu-drawer__title">
                      Bell schedule
                    </h2>
                    <p className="stu-drawer__sub">
                      Periods apply to every class. Add labels and optional start/end times.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="stu-drawer__close"
                  onClick={() => setPeriodsOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </header>

              <div className="tt-periods-drawer__stats">
                <div className="tt-periods-drawer__stat">
                  <strong>{periods.length}</strong>
                  <span>Periods</span>
                </div>
                <div className="tt-periods-drawer__stat">
                  <strong>{timedPeriodCount}</strong>
                  <span>With times</span>
                </div>
                <div className="tt-periods-drawer__stat tt-periods-drawer__stat--accent">
                  <strong>{Math.max(periods.length - timedPeriodCount, 0)}</strong>
                  <span>Untimed</span>
                </div>
              </div>

              <div className="stu-drawer__body tt-periods-drawer__body">
                {periods.length === 0 ? (
                  <div className="tt-periods-drawer__empty">
                    <p>No periods yet.</p>
                    <button
                      type="button"
                      className="tt-admin__btn tt-admin__btn--primary"
                      onClick={addPeriod}
                    >
                      + Add first period
                    </button>
                  </div>
                ) : (
                  <ul className="tt-periods-drawer__list">
                    {periods.map((p, index) => (
                      <li key={`period-${index}`} className="tt-periods-drawer__item">
                        <span className="tt-periods-drawer__num">{index + 1}</span>
                        <div className="tt-periods-drawer__fields">
                          <input
                            className="tt-periods-drawer__label"
                            value={p.label}
                            onChange={(e) => updatePeriod(p.number, { label: e.target.value })}
                            placeholder={`Period ${index + 1}`}
                            aria-label={`Period ${index + 1} label`}
                          />
                          <div className="tt-periods-drawer__times">
                            <input
                              type="time"
                              value={p.startTime}
                              onChange={(e) =>
                                updatePeriod(p.number, { startTime: e.target.value })
                              }
                              aria-label={`Period ${index + 1} start`}
                            />
                            <span className="tt-periods-drawer__times-sep">to</span>
                            <input
                              type="time"
                              value={p.endTime}
                              onChange={(e) =>
                                updatePeriod(p.number, { endTime: e.target.value })
                              }
                              aria-label={`Period ${index + 1} end`}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="tt-periods-drawer__remove"
                          disabled={periods.length <= 1}
                          onClick={() => removePeriod(p.number)}
                          aria-label={`Remove period ${index + 1}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {periods.length > 0 ? (
                  <button
                    type="button"
                    className="tt-periods-drawer__add"
                    onClick={addPeriod}
                  >
                    + Add period
                  </button>
                ) : null}
              </div>

              <footer className="stu-drawer__foot tt-periods-drawer__foot">
                <button
                  type="button"
                  className="tt-admin__btn tt-admin__btn--ghost"
                  onClick={() => setPeriodsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="tt-admin__btn tt-admin__btn--primary"
                  disabled={busy || periods.length === 0}
                  onClick={() => void onSavePeriods()}
                >
                  {busy ? "Saving…" : "Save schedule"}
                </button>
              </footer>
            </aside>
          </>
        ) : null}

        {loading || (busy && !grid) ? (
          <div className="tt-admin__loading">
            <span className="tt-admin__loading-spinner" aria-hidden />
            <p>Loading timetable…</p>
          </div>
        ) : grid ? (
          <div className="tt-admin__grid-wrap">
            <table className="tt-admin__grid">
              <thead>
                <tr>
                  <th className="tt-admin__grid-corner">Period</th>
                  {weekdays.map((d) => (
                    <th key={d}>{grid.weekdayLabels[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.periods.map((period) => (
                  <tr key={period.id}>
                    <th className="tt-admin__grid-period">
                      <span className="tt-admin__grid-period-label">{period.label}</span>
                      {period.startTime && period.endTime ? (
                        <span className="tt-admin__grid-period-time">
                          {period.startTime}–{period.endTime}
                        </span>
                      ) : period.startTime ? (
                        <span className="tt-admin__grid-period-time">{period.startTime}</span>
                      ) : (
                        <span className="tt-admin__grid-period-time tt-admin__grid-period-time--muted">
                          One subject slot
                        </span>
                      )}
                    </th>
                    {weekdays.map((weekday) => {
                      const key = cellKey(weekday, period.number);
                      const cell = cells[key] ?? {
                        subjectId: "",
                        teacherUserId: "",
                        roomName: "",
                      };
                      const filled = Boolean(cell.subjectId);
                      return (
                        <td
                          key={weekday}
                          className={`tt-admin__grid-cell${filled ? " tt-admin__grid-cell--filled" : ""}`}
                        >
                          <select
                            className="tt-admin__cell-input"
                            value={cell.subjectId}
                            disabled={!canEdit}
                            aria-label={`${grid.weekdayLabels[weekday]} ${period.label} subject`}
                            onChange={(e) =>
                              setCell(weekday, period.number, {
                                subjectId: e.target.value,
                              })
                            }
                          >
                            <option value="">Subject</option>
                            {grid.subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="tt-admin__cell-input"
                            value={cell.teacherUserId}
                            disabled={!canEdit || !cell.subjectId}
                            aria-label={`${grid.weekdayLabels[weekday]} ${period.label} teacher`}
                            onChange={(e) =>
                              setCell(weekday, period.number, {
                                teacherUserId: e.target.value,
                              })
                            }
                          >
                            <option value="">Teacher</option>
                            {grid.teachers.map((t) => (
                              <option key={t.userId} value={t.userId}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <input
                            className="tt-admin__cell-input"
                            type="text"
                            placeholder="Room"
                            value={cell.roomName}
                            disabled={!canEdit || !cell.subjectId}
                            aria-label={`${grid.weekdayLabels[weekday]} ${period.label} room`}
                            onChange={(e) =>
                              setCell(weekday, period.number, {
                                roomName: e.target.value,
                              })
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </DashboardPage>
  );
}
