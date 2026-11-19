"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientSnapshot } from "@/lib/use-client-snapshot";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  ExamScheduleBoard,
  daysFromSchedule,
} from "@/components/exams/exam-schedule-board";
import { ExamSeatingEditor } from "@/components/exams/exam-seating-editor";
import { AppToast } from "@/components/ui/app-toast";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { listSubjects, type Subject } from "@/lib/results";
import { getSchoolSettings } from "@/lib/school-settings";
import {
  getExamSchedule,
  saveExamScheduleDays,
  toDateInputValue,
  updateExamSchedule,
  type ExamSchedule,
  type ExamScheduleDayInput,
} from "@/lib/exam-schedule";

type DraftSlot = {
  key: string;
  gradeId: string;
  subjectId: string;
  subjectLabel: string;
  startTime: string;
  endTime: string;
};

type DraftDay = {
  key: string;
  examDate: string;
  isStudyDay: boolean;
  studyNote: string;
  defaultStartTime: string;
  defaultEndTime: string;
  slots: DraftSlot[];
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function scheduleToDraft(schedule: ExamSchedule): DraftDay[] {
  return schedule.days.map((d) => ({
    key: d.id,
    examDate: toDateInputValue(d.examDate),
    isStudyDay: d.isStudyDay,
    studyNote: d.studyNote ?? "",
    defaultStartTime: d.defaultStartTime ?? "",
    defaultEndTime: d.defaultEndTime ?? "",
    slots: d.slots.map((s) => ({
      key: s.id,
      gradeId: s.gradeId,
      subjectId: s.subjectId ?? "",
      subjectLabel: s.subjectLabel,
      startTime: s.startTime ?? "",
      endTime: s.endTime ?? "",
    })),
  }));
}

function draftToPayload(days: DraftDay[]): ExamScheduleDayInput[] {
  return days.map((d, i) => ({
    examDate: d.examDate,
    isStudyDay: d.isStudyDay,
    studyNote: d.studyNote.trim() || null,
    defaultStartTime: d.defaultStartTime.trim() || null,
    defaultEndTime: d.defaultEndTime.trim() || null,
    sortOrder: i,
    slots: d.isStudyDay
      ? []
      : d.slots
          .filter((s) => s.gradeId && s.subjectLabel.trim())
          .map((s, j) => ({
            gradeId: s.gradeId,
            subjectId: s.subjectId || null,
            subjectLabel: s.subjectLabel.trim(),
            startTime: s.startTime.trim() || null,
            endTime: s.endTime.trim() || null,
            sortOrder: j,
          })),
  }));
}

export default function AdminExamScheduleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const canEdit = useClientSnapshot(
    () => hasPermission(Permission.TIMETABLE_MANAGE),
    false,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [schedule, setSchedule] = useState<ExamSchedule | null>(null);
  const [days, setDays] = useState<DraftDay[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [title, setTitle] = useState("");
  const [shiftLabel, setShiftLabel] = useState("");
  const [tab, setTab] = useState<"edit" | "board" | "seating">("edit");
  const [printTarget, setPrintTarget] = useState<"board" | "seating">("board");

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        const [sch, g, sub, settings] = await Promise.all([
          getExamSchedule(id),
          listGrades(),
          listSubjects(),
          getSchoolSettings().catch(() => null),
        ]);
        setSchedule(sch);
        setTitle(sch.title);
        setShiftLabel(sch.shiftLabel ?? "");
        setDays(scheduleToDraft(sch));
        setGrades(g);
        setSubjects(sub);
        setSchoolName(settings?.name ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load schedule");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const boardDays = useMemo(
    () =>
      days.map((d) => ({
        examDate: d.examDate,
        isStudyDay: d.isStudyDay,
        studyNote: d.studyNote || null,
        defaultStartTime: d.defaultStartTime || null,
        defaultEndTime: d.defaultEndTime || null,
        slots: d.slots
          .filter((s) => s.gradeId && s.subjectLabel.trim())
          .map((s) => ({
            gradeId: s.gradeId,
            subjectLabel: s.subjectLabel.trim(),
            startTime: s.startTime || null,
            endTime: s.endTime || null,
          })),
      })),
    [days],
  );

  function addDay() {
    setDays((prev) => [
      ...prev,
      {
        key: newKey(),
        examDate: new Date().toISOString().slice(0, 10),
        isStudyDay: false,
        studyNote: "",
        defaultStartTime: "15:00",
        defaultEndTime: "19:00",
        slots: [],
      },
    ]);
  }

  function addStudyDay() {
    setDays((prev) => [
      ...prev,
      {
        key: newKey(),
        examDate: new Date().toISOString().slice(0, 10),
        isStudyDay: true,
        studyNote: "Off day for study",
        defaultStartTime: "",
        defaultEndTime: "",
        slots: [],
      },
    ]);
  }

  function updateDay(key: string, patch: Partial<DraftDay>) {
    setDays((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDay(key: string) {
    setDays((prev) => prev.filter((d) => d.key !== key));
  }

  function addSlot(dayKey: string) {
    const firstGrade = grades[0]?.id ?? "";
    setDays((prev) =>
      prev.map((d) =>
        d.key !== dayKey
          ? d
          : {
              ...d,
              slots: [
                ...d.slots,
                {
                  key: newKey(),
                  gradeId: firstGrade,
                  subjectId: "",
                  subjectLabel: "",
                  startTime: d.defaultStartTime,
                  endTime: d.defaultEndTime,
                },
              ],
            },
      ),
    );
  }

  function updateSlot(dayKey: string, slotKey: string, patch: Partial<DraftSlot>) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.key !== dayKey) return d;
        return {
          ...d,
          slots: d.slots.map((s) => (s.key === slotKey ? { ...s, ...patch } : s)),
        };
      }),
    );
  }

  function removeSlot(dayKey: string, slotKey: string) {
    setDays((prev) =>
      prev.map((d) =>
        d.key !== dayKey ? d : { ...d, slots: d.slots.filter((s) => s.key !== slotKey) },
      ),
    );
  }

  async function onSave() {
    if (!canEdit || !schedule) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const meta = await updateExamSchedule(schedule.id, {
        title: title.trim(),
        shiftLabel: shiftLabel.trim() || null,
      });
      const full = await saveExamScheduleDays(schedule.id, draftToPayload(days));
      setSchedule(full);
      setTitle(meta.title);
      setShiftLabel(meta.shiftLabel ?? "");
      setDays(scheduleToDraft(full));
      setSaved("Exam schedule saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(next: "DRAFT" | "PUBLISHED") {
    if (!canEdit || !schedule) return;
    setBusy(true);
    setError("");
    try {
      await updateExamSchedule(schedule.id, {
        title: title.trim(),
        shiftLabel: shiftLabel.trim() || null,
      });
      await saveExamScheduleDays(schedule.id, draftToPayload(days));
      const updated = await updateExamSchedule(schedule.id, { status: next });
      const full = await getExamSchedule(schedule.id);
      setSchedule(full);
      setTitle(full.title);
      setShiftLabel(full.shiftLabel ?? "");
      setDays(scheduleToDraft(full));
      setSaved(
        updated.status === "PUBLISHED" ? "Schedule published." : "Moved back to draft.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  function printBoard() {
    setPrintTarget("board");
    setTab("board");
    document.body.dataset.exPrint = "board";
    window.setTimeout(() => window.print(), 80);
  }

  function printSeating() {
    setPrintTarget("seating");
    setTab("seating");
    document.body.dataset.exPrint = "seating";
    window.setTimeout(() => window.print(), 80);
  }

  useEffect(() => {
    const clear = () => {
      delete document.body.dataset.exPrint;
    };
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  if (loading) {
    return (
      <DashboardPage role="admin" title="Exam schedule">
        <div className="ex-loading">Loading…</div>
      </DashboardPage>
    );
  }

  if (!schedule) {
    return (
      <DashboardPage role="admin" title="Exam schedule">
        <div className="ex-empty">
          <h3>Schedule not found</h3>
          <Link href="/admin/exams" className="ex-btn ex-btn--primary">
            Back to list
          </Link>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage role="admin" title="Exam schedule">
      <div className="ex-page">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

        <div className="ex-detail-bar no-print">
          <Link href="/admin/exams" className="ex-btn ex-btn--ghost">
            ← All schedules
          </Link>
          <div className="ex-detail-bar__tabs" role="group" aria-label="View">
            <button
              type="button"
              className={`ex-tab${tab === "edit" ? " is-active" : ""}`}
              onClick={() => setTab("edit")}
            >
              Edit
            </button>
            <button
              type="button"
              className={`ex-tab${tab === "board" ? " is-active" : ""}`}
              onClick={() => setTab("board")}
            >
              Board
            </button>
            <button
              type="button"
              className={`ex-tab${tab === "seating" ? " is-active" : ""}`}
              onClick={() => setTab("seating")}
            >
              Seating
            </button>
          </div>
          <div className="ex-detail-bar__actions">
            {tab === "seating" ? (
              <button type="button" className="ex-btn ex-btn--ghost" onClick={printSeating}>
                Print lists
              </button>
            ) : (
              <button type="button" className="ex-btn ex-btn--ghost" onClick={printBoard}>
                Print board
              </button>
            )}
            {canEdit && tab !== "seating" ? (
              <>
                <button
                  type="button"
                  className="ex-btn ex-btn--ghost"
                  disabled={busy}
                  onClick={() =>
                    void onPublish(schedule.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")
                  }
                >
                  {schedule.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  className="ex-btn ex-btn--primary"
                  disabled={busy}
                  onClick={() => void onSave()}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {tab === "edit" ? (
          <div className="ex-editor no-print">
            <section className="ex-editor__meta">
              <label className="ex-field">
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canEdit}
                />
              </label>
              <label className="ex-field">
                Shift
                <input
                  value={shiftLabel}
                  onChange={(e) => setShiftLabel(e.target.value)}
                  placeholder="Optional"
                  disabled={!canEdit}
                />
              </label>
              <div className="ex-editor__status">
                <span
                  className={`ex-pill ${schedule.status === "PUBLISHED" ? "ex-pill--live" : ""}`}
                >
                  {schedule.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
                <span className="ex-editor__year">{schedule.academicYear.name}</span>
              </div>
            </section>

            {canEdit ? (
              <div className="ex-editor__tools">
                <button type="button" className="ex-btn ex-btn--primary" onClick={addDay}>
                  + Exam day
                </button>
                <button type="button" className="ex-btn ex-btn--ghost" onClick={addStudyDay}>
                  + Study day
                </button>
              </div>
            ) : null}

            <div className="ex-days">
              {days.length === 0 ? (
                <div className="ex-empty ex-empty--compact">
                  <p>No days yet. Add an exam day or a study day.</p>
                </div>
              ) : (
                days.map((day, index) => (
                  <article
                    key={day.key}
                    className={`ex-day${day.isStudyDay ? " ex-day--study" : ""}`}
                  >
                    <header className="ex-day__head">
                      <span className="ex-day__num">{index + 1}</span>
                      <label className="ex-field ex-field--inline">
                        Date
                        <input
                          type="date"
                          value={day.examDate}
                          disabled={!canEdit}
                          onChange={(e) => updateDay(day.key, { examDate: e.target.value })}
                        />
                      </label>
                      <label className="ex-check">
                        <input
                          type="checkbox"
                          checked={day.isStudyDay}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateDay(day.key, { isStudyDay: e.target.checked })
                          }
                        />
                        Study day
                      </label>
                      {canEdit ? (
                        <button
                          type="button"
                          className="ex-day__remove"
                          onClick={() => removeDay(day.key)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </header>

                    {day.isStudyDay ? (
                      <label className="ex-field">
                        Note
                        <input
                          value={day.studyNote}
                          disabled={!canEdit}
                          onChange={(e) => updateDay(day.key, { studyNote: e.target.value })}
                          placeholder="Off day for study"
                        />
                      </label>
                    ) : (
                      <>
                        <div className="ex-day__times">
                          <label className="ex-field ex-field--inline">
                            Default start
                            <input
                              type="time"
                              value={day.defaultStartTime}
                              disabled={!canEdit}
                              onChange={(e) =>
                                updateDay(day.key, { defaultStartTime: e.target.value })
                              }
                            />
                          </label>
                          <label className="ex-field ex-field--inline">
                            Default end
                            <input
                              type="time"
                              value={day.defaultEndTime}
                              disabled={!canEdit}
                              onChange={(e) =>
                                updateDay(day.key, { defaultEndTime: e.target.value })
                              }
                            />
                          </label>
                        </div>

                        <div className="ex-slots">
                          {day.slots.map((slot) => (
                            <div key={slot.key} className="ex-slot">
                              <select
                                value={slot.gradeId}
                                disabled={!canEdit}
                                aria-label="Grade"
                                onChange={(e) =>
                                  updateSlot(day.key, slot.key, { gradeId: e.target.value })
                                }
                              >
                                {grades.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={slot.subjectId}
                                disabled={!canEdit}
                                aria-label="Subject"
                                onChange={(e) => {
                                  const sub = subjects.find((s) => s.id === e.target.value);
                                  updateSlot(day.key, slot.key, {
                                    subjectId: e.target.value,
                                    subjectLabel: sub?.name ?? slot.subjectLabel,
                                  });
                                }}
                              >
                                <option value="">Custom / pick</option>
                                {subjects.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={slot.subjectLabel}
                                disabled={!canEdit}
                                placeholder="Subject label"
                                aria-label="Subject label"
                                onChange={(e) =>
                                  updateSlot(day.key, slot.key, {
                                    subjectLabel: e.target.value,
                                  })
                                }
                              />
                              <input
                                type="time"
                                value={slot.startTime}
                                disabled={!canEdit}
                                aria-label="Start"
                                onChange={(e) =>
                                  updateSlot(day.key, slot.key, { startTime: e.target.value })
                                }
                              />
                              <input
                                type="time"
                                value={slot.endTime}
                                disabled={!canEdit}
                                aria-label="End"
                                onChange={(e) =>
                                  updateSlot(day.key, slot.key, { endTime: e.target.value })
                                }
                              />
                              {canEdit ? (
                                <button
                                  type="button"
                                  className="ex-slot__remove"
                                  onClick={() => removeSlot(day.key, slot.key)}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {canEdit ? (
                          <button
                            type="button"
                            className="ex-btn ex-btn--ghost"
                            onClick={() => addSlot(day.key)}
                          >
                            + Add subject
                          </button>
                        ) : null}
                      </>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        ) : tab === "board" ? (
          <div className="no-print">
            <ExamScheduleBoard
              title={title || schedule.title}
              shiftLabel={shiftLabel || schedule.shiftLabel}
              schoolName={schoolName}
              yearName={schedule.academicYear.name}
              days={boardDays}
              grades={grades.map((g) => ({ id: g.id, name: g.name }))}
            />
          </div>
        ) : (
          <ExamSeatingEditor
            scheduleId={schedule.id}
            grades={grades}
            canEdit={canEdit}
            schoolName={schoolName}
            onError={setError}
            onSaved={setSaved}
            onRequestPrint={printSeating}
          />
        )}

        {/* Always keep a board in DOM for print */}
        <div
          className={`ex-print-only ex-print-board${printTarget === "board" ? "" : " is-hidden-print"}`}
        >
          <ExamScheduleBoard
            title={title || schedule.title}
            shiftLabel={shiftLabel || schedule.shiftLabel}
            schoolName={schoolName}
            yearName={schedule.academicYear.name}
            days={
              boardDays.length
                ? boardDays
                : daysFromSchedule(schedule.days)
            }
            grades={grades.map((g) => ({ id: g.id, name: g.name }))}
          />
        </div>
      </div>
    </DashboardPage>
  );
}
