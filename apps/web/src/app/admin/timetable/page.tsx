"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
    <DashboardPage
      role="admin"
      title="Timetable"
      eyebrow="Academics"
    >
      <div className="att-page tt-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}
        {saved ? <p className="att-toast">{saved}</p> : null}

        <p className="tt-rule-hint">
          Each <strong>period</strong> is one fixed time slot — <strong>one subject only</strong> per
          class. Doubles use <strong>two periods</strong> (e.g. Period 3 &amp; 5 same day), never
          two subjects in the same period. Set bell times under <strong>Manage periods</strong>.
        </p>

        <div className="tt-toolbar">
          <label>
            Grade
            <select
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                const g = grades.find((x) => x.id === e.target.value);
                setSectionId(g?.sections[0]?.id ?? "");
              }}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          {selectedGrade && selectedGrade.sections.length > 0 ? (
            <label>
              Section
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {selectedGrade.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {canEdit ? (
            <label>
              Auto-generate
              <select
                value={generateScope}
                onChange={(e) => setGenerateScope(e.target.value as "school" | "class")}
              >
                <option value="school">Whole school</option>
                <option value="class">This class only</option>
              </select>
            </label>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="att-btn att-btn--ghost"
              disabled={busy || !academicYearId}
              onClick={() => void onAutoGenerate()}
            >
              {busy ? "Working…" : "Auto-generate"}
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="att-btn att-btn--ghost"
              onClick={() => setPeriodsOpen((v) => !v)}
            >
              {periodsOpen ? "Hide periods" : "Manage periods"}
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="att-btn att-btn--primary"
              disabled={busy || !gradeId}
              onClick={() => void onSave()}
            >
              {busy ? "Saving…" : "Save timetable"}
            </button>
          ) : null}
        </div>

        {periodsOpen && canEdit ? (
          <section className="tt-periods">
            <header className="tt-periods__head">
              <div>
                <h2 className="tt-periods__title">Bell schedule</h2>
                <p className="tt-periods__sub">
                  Add or remove periods for the whole school. Set labels and optional start/end times.
                </p>
              </div>
              <div className="tt-periods__head-actions">
                <button type="button" className="att-btn att-btn--ghost" onClick={addPeriod}>
                  + Add period
                </button>
                <button
                  type="button"
                  className="att-btn att-btn--primary"
                  disabled={busy || periods.length === 0}
                  onClick={() => void onSavePeriods()}
                >
                  {busy ? "Saving…" : "Save periods"}
                </button>
              </div>
            </header>
            {periods.length === 0 ? (
              <p className="setup-hint">No periods yet. Add your first period above.</p>
            ) : (
              <ul className="tt-periods__list">
                {periods.map((p, index) => (
                  <li key={`period-${index}`} className="tt-periods__row">
                    <span className="tt-periods__order">#{p.number}</span>
                    <label>
                      Label
                      <input
                        value={p.label}
                        onChange={(e) => updatePeriod(p.number, { label: e.target.value })}
                        placeholder="Period 1"
                      />
                    </label>
                    <label>
                      Start
                      <input
                        type="time"
                        value={p.startTime}
                        onChange={(e) => updatePeriod(p.number, { startTime: e.target.value })}
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="time"
                        value={p.endTime}
                        onChange={(e) => updatePeriod(p.number, { endTime: e.target.value })}
                      />
                    </label>
                    <button
                      type="button"
                      className="tt-periods__remove"
                      disabled={periods.length <= 1}
                      onClick={() => removePeriod(p.number)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {loading || (busy && !grid) ? (
          <p className="setup-hint">Loading timetable…</p>
        ) : grid ? (
          <div className="tt-grid-wrap">
            <table className="tt-grid">
              <thead>
                <tr>
                  <th>Period</th>
                  {weekdays.map((d) => (
                    <th key={d}>{grid.weekdayLabels[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.periods.map((period) => (
                  <tr key={period.id}>
                    <th className="tt-grid__period">
                      <span className="tt-grid__period-label">{period.label}</span>
                      {period.startTime && period.endTime ? (
                        <span className="tt-grid__period-time">
                          {period.startTime}–{period.endTime}
                        </span>
                      ) : period.startTime ? (
                        <span className="tt-grid__period-time">{period.startTime}</span>
                      ) : (
                        <span className="tt-grid__period-time tt-grid__period-time--muted">
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
                      return (
                        <td key={weekday} className="tt-grid__cell">
                          <select
                            value={cell.subjectId}
                            disabled={!canEdit}
                            onChange={(e) =>
                              setCell(weekday, period.number, {
                                subjectId: e.target.value,
                              })
                            }
                          >
                            <option value="">—</option>
                            {grid.subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={cell.teacherUserId}
                            disabled={!canEdit || !cell.subjectId}
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
                            type="text"
                            placeholder="Room"
                            value={cell.roomName}
                            disabled={!canEdit || !cell.subjectId}
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
