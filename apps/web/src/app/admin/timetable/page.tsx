"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { getOrEnsureCurrentAcademicYear } from "@/lib/results";
import {
  ensureTimetable,
  getTimetableGrid,
  saveTimetableEntries,
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const selectedGrade = grades.find((g) => g.id === gradeId);

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
    setCells((prev) => ({
      ...prev,
      [key]: {
        subjectId: "",
        teacherUserId: "",
        roomName: "",
        ...prev[key],
        ...patch,
      },
    }));
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
                      {period.label}
                      {period.startTime ? (
                        <span>
                          {period.startTime}
                          {period.endTime ? `–${period.endTime}` : ""}
                        </span>
                      ) : null}
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
