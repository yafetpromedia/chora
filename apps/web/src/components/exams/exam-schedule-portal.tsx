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
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";

type Role = "student" | "parent" | "teacher";

type Props = {
  role: Role;
};

export function ExamSchedulePortal({ role }: Props) {
  const { t } = useLocale();
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
        setError(
          err instanceof Error ? err.message : t("examPortalUi.errLoadSchedules"),
        );
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
        setError(
          err instanceof Error ? err.message : t("examPortalUi.errLoadSchedule"),
        );
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

  const selectedSummary = list.find((row) => row.id === selectedId);

  const slotCount = useMemo(() => {
    if (!schedule) return 0;
    return schedule.days.reduce((sum, day) => sum + day.slots.length, 0);
  }, [schedule]);

  const isTeacher = role === "teacher";

  function printBoard() {
    window.print();
  }

  if (loading || (role === "parent" && parentChild.loading)) {
    return isTeacher ? (
      <div className="tch-day tch-exam">
        <p className="tch-day__loading">{t("examPortalUi.loading")}</p>
      </div>
    ) : (
      <p className="muted">{t("examPortalUi.loading")}</p>
    );
  }

  if (role === "parent" && parentChild.error) {
    return <p className="error">{parentChild.error}</p>;
  }

  const toolbar = (
    <div className="ex-portal__toolbar no-print">
      <label className="ex-portal__pick">
        <span>{t("examPortalUi.labelSchedule")}</span>
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
              ? t("examPortalUi.showGradeOnly", { grade: focusGradeName })
              : t("examPortalUi.myGradeOnly")}
          </span>
        </label>
      ) : null}

      <button
        type="button"
        className="ex-btn ex-btn--ghost"
        onClick={printBoard}
        disabled={!schedule}
      >
        {t("examPortalUi.print")}
      </button>
    </div>
  );

  const boardBlock = schedule ? (
    <ExamScheduleBoard
      title={schedule.title}
      shiftLabel={schedule.shiftLabel}
      schoolName={schoolName || undefined}
      yearName={
        [schedule.academicYear.name, schedule.academicTerm?.name]
          .filter(Boolean)
          .join(" · ") || undefined
      }
      days={boardDays}
      grades={boardGrades}
    />
  ) : (
    <p className={isTeacher ? "tch-exam__hint muted" : "muted"}>
      {t("examPortalUi.selectSchedule")}
    </p>
  );

  return (
    <div
      className={
        isTeacher ? "tch-day tch-exam ex-portal ex-portal--teacher" : "ex-page ex-portal"
      }
    >
      {isTeacher ? (
        <header className="tch-day__hero tch-exam__hero no-print">
          <div className="tch-day__hero-main">
            <div className="tch-day__brand">
              <span className="tch-day__chip">{t("examPortalUi.chipExams")}</span>
              <span className="tch-day__icon" aria-hidden>
                <DashIcon name="calendar" className="dash-icon--sm" />
              </span>
            </div>
            <h2 className="tch-day__title">
              {selectedSummary?.title ?? t("examPortalUi.fallbackTitle")}
            </h2>
            <p className="tch-day__sub">
              {selectedSummary?.shiftLabel
                ? `${selectedSummary.shiftLabel} · `
                : ""}
              {t("examPortalUi.subtitlePublished")}
              {schoolName ? ` · ${schoolName}` : ""}
            </p>
          </div>
          <div className="tch-day__stats" aria-label={t("examPortalUi.ariaSummary")}>
            <div className="tch-day__stat">
              <strong>{list.length}</strong>
              <span>{t("examPortalUi.statPublished")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>{schedule?.days.length ?? "—"}</strong>
              <span>{t("examPortalUi.statDays")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>{grades.length || "—"}</strong>
              <span>{t("examPortalUi.statGrades")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>{slotCount || "—"}</strong>
              <span>{t("examPortalUi.statSessions")}</span>
            </div>
          </div>
        </header>
      ) : null}

      {role === "parent" ? (
        <div className="no-print">
          <ParentChildBar
            options={parentChild.children}
            selectedId={parentChild.selectedId}
            onChange={parentChild.selectChild}
          />
        </div>
      ) : null}

      {error ? (
        <p className={isTeacher ? "tch-day__error" : "error"}>{error}</p>
      ) : null}

      {list.length === 0 ? (
        isTeacher ? (
          <div className="tch-day__empty">
            <div className="tch-day__empty-icon" aria-hidden>
              <DashIcon name="calendar" />
            </div>
            <h2>{t("examPortalUi.emptyTitle")}</h2>
            <p>{t("examPortalUi.emptyBodyTeacher")}</p>
          </div>
        ) : (
          <div className="ex-portal__empty">
            {t("examPortalUi.emptyBodyPortal")}
          </div>
        )
      ) : (
        <>
          {isTeacher ? (
            <section className="tch-day__board ex-portal__controls no-print">
              <div className="tch-day__board-head">
                <div>
                  <h2>{t("examPortalUi.boardHeadTitle")}</h2>
                  <p>{t("examPortalUi.boardHeadSub")}</p>
                </div>
              </div>
              {toolbar}
            </section>
          ) : (
            toolbar
          )}

          {boardBlock}

          {schedule?.notes ? (
            <p className="ex-portal__notes">{schedule.notes}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
