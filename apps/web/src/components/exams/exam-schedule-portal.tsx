"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExamScheduleBoard,
  daysFromSchedule,
} from "@/components/exams/exam-schedule-board";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { useParentChild } from "@/hooks/use-parent-child";
import { AUTH_SCHOOL_NAME_KEY } from "@/lib/auth";
import { useClientSnapshot } from "@/lib/use-client-snapshot";
import {
  getPublishedExamSchedule,
  listPublishedExamSchedules,
  type ExamScheduleListItem,
  type PublishedExamSchedule,
} from "@/lib/exam-schedule";

type Role = "student" | "parent" | "teacher";

type Props = {
  role: Role;
};

export function ExamSchedulePortal({ role }: Props) {
  const parentChild = useParentChild();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [list, setList] = useState<ExamScheduleListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadedSchedule, setSchedule] = useState<PublishedExamSchedule | null>(null);
  const [myGradeOnly, setMyGradeOnly] = useState(role !== "teacher");
  const schoolName = useClientSnapshot(
    () => localStorage.getItem(AUTH_SCHOOL_NAME_KEY)?.trim() ?? "",
    "",
  );

  const childId = role === "parent" ? parentChild.selectedId : undefined;
  const childrenReady =
    role !== "parent" || (!parentChild.loading && !parentChild.error);
  const schedule = selectedId && childrenReady ? loadedSchedule : null;

  useEffect(() => {
    let cancelled = false;
    void listPublishedExamSchedules()
      .then((rows) => {
        if (cancelled) return;
        setList(rows);
        setSelectedId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          return rows[0]?.id ?? "";
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load schedules");
        setList([]);
        setSelectedId("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId || !childrenReady) return;
    if (role === "parent" && !childId && parentChild.children.length > 0) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setError("");
    });
    void getPublishedExamSchedule(
      selectedId,
      role === "parent" ? childId || undefined : undefined,
    )
      .then((row) => {
        if (!cancelled) setSchedule(row);
      })
      .catch((err) => {
        if (cancelled) return;
        setSchedule(null);
        setError(err instanceof Error ? err.message : "Could not load schedule");
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedId,
    role,
    childId,
    childrenReady,
    parentChild.children.length,
  ]);

  const grades = useMemo(() => {
    if (!schedule) return [];
    const map = new Map<string, { id: string; name: string; sortOrder: number }>();
    for (const day of schedule.days) {
      for (const slot of day.slots) {
        map.set(slot.grade.id, {
          id: slot.grade.id,
          name: slot.grade.name,
          sortOrder: slot.grade.sortOrder,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [schedule]);

  const focusGradeId = schedule?.focusGradeId ?? null;
  const canFilterGrade = Boolean(focusGradeId) && role !== "teacher";

  const boardDays = useMemo(() => {
    if (!schedule) return [];
    const days = daysFromSchedule(schedule.days);
    if (!myGradeOnly || !focusGradeId) return days;
    return days.map((day) => ({
      ...day,
      slots: day.slots.filter((s) => s.gradeId === focusGradeId),
    }));
  }, [schedule, myGradeOnly, focusGradeId]);

  const boardGrades = useMemo(() => {
    if (!myGradeOnly || !focusGradeId) return grades;
    return grades.filter((g) => g.id === focusGradeId);
  }, [grades, myGradeOnly, focusGradeId]);

  const focusGradeName = grades.find((g) => g.id === focusGradeId)?.name;

  function printBoard() {
    window.print();
  }

  if (loading || (role === "parent" && parentChild.loading)) {
    return <p className="muted">Loading exam schedules…</p>;
  }

  if (role === "parent" && parentChild.error) {
    return <p className="error">{parentChild.error}</p>;
  }

  return (
    <div className="ex-page ex-portal">
      {role === "parent" ? (
        <div className="no-print">
          <ParentChildBar
            options={parentChild.children}
            selectedId={parentChild.selectedId}
            onChange={parentChild.selectChild}
          />
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      {list.length === 0 ? (
        <div className="ex-portal__empty">
          No published exam schedules yet. Check back after your school publishes one.
        </div>
      ) : (
        <>
          <div className="ex-portal__toolbar no-print">
            <label className="ex-portal__pick">
              <span>Schedule</span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {list.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title}
                    {row.shiftLabel ? ` · ${row.shiftLabel}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {canFilterGrade ? (
              <label className="ex-portal__toggle">
                <input
                  type="checkbox"
                  checked={myGradeOnly}
                  onChange={(e) => setMyGradeOnly(e.target.checked)}
                />
                <span>
                  {focusGradeName
                    ? `Show ${focusGradeName} only`
                    : "My grade only"}
                </span>
              </label>
            ) : null}

            <button
              type="button"
              className="ex-btn ex-btn--ghost"
              onClick={printBoard}
              disabled={!schedule}
            >
              Print
            </button>
          </div>

          {schedule ? (
            <ExamScheduleBoard
              title={schedule.title}
              shiftLabel={schedule.shiftLabel}
              schoolName={schoolName || undefined}
              yearName={
                [
                  schedule.academicYear.name,
                  schedule.academicTerm?.name,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              days={boardDays}
              grades={boardGrades}
            />
          ) : (
            <p className="muted">Select a schedule to view.</p>
          )}

          {schedule?.notes ? (
            <p className="ex-portal__notes">{schedule.notes}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
