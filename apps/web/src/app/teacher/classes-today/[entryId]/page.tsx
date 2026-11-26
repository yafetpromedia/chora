"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { useLocale } from "@/components/i18n/locale-provider";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  createAttendanceConcern,
  getClassAttendanceContext,
  type AttendanceConcernType,
  type ClassAttendanceContext,
  type ObservedAttendanceStatus,
} from "@/lib/attendance-concerns";
import { subjectCompactLabel, subjectFullLabel } from "@/lib/subject-label";

const CONCERN_TYPES: AttendanceConcernType[] = [
  "COUNT_MISMATCH",
  "STUDENT_APPEARS_ABSENT",
  "STUDENT_APPEARS_PRESENT",
  "STUDENT_LEFT_CLASS",
  "OTHER",
];

function statusTone(status: string | null) {
  if (status === "absent") return "absent";
  if (status === "late") return "late";
  if (status === "present") return "present";
  if (status === "excused" || status === "medical") return "excused";
  return "none";
}

export default function TeacherClassContextPage() {
  const { t, tp } = useLocale();
  const router = useRouter();
  const params = useParams<{ entryId: string }>();
  const entryId = typeof params.entryId === "string" ? params.entryId : "";

  const [ctx, setCtx] = useState<ClassAttendanceContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [concernType, setConcernType] =
    useState<AttendanceConcernType>("COUNT_MISMATCH");
  const [observedAbsent, setObservedAbsent] = useState("");
  const [studentId, setStudentId] = useState("");
  const [observedStatus, setObservedStatus] =
    useState<ObservedAttendanceStatus>("MISSING");
  const [note, setNote] = useState("");
  const [ackDup, setAckDup] = useState(false);

  function officialStatusLabel(status: string | null) {
    if (!status) return t("teacherClassContextUi.unmarked");
    if (status === "present") return t("common.present");
    if (status === "absent") return t("common.absent");
    if (status === "late") return t("common.late");
    if (status === "excused" || status === "medical") return t("common.excused");
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  async function loadContext() {
    if (!entryId) {
      setError(t("teacherClassContextUi.missingClassId"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getClassAttendanceContext(entryId);
      setCtx(res);
      if (res.officialAttendance.submitted) {
        setObservedAbsent(String(res.officialAttendance.absentCount));
      }
    } catch (e) {
      setCtx(null);
      setError(e instanceof Error ? e.message : t("teacherClassContextUi.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "teacher" && role !== "admin") {
      router.replace(`/${role ?? "login"}`);
      return;
    }
    void loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, router]);

  const needsStudent = useMemo(
    () =>
      concernType === "STUDENT_APPEARS_ABSENT" ||
      concernType === "STUDENT_APPEARS_PRESENT" ||
      concernType === "STUDENT_LEFT_CLASS",
    [concernType],
  );

  const absentRoster = useMemo(
    () => (ctx?.roster ?? []).filter((s) => s.officialStatus === "absent"),
    [ctx],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ctx) return;
    setSubmitting(true);
    setError(null);
    try {
      const concern = await createAttendanceConcern({
        timetableEntryId: entryId,
        concernType,
        observedAbsentCount:
          concernType === "COUNT_MISMATCH" || observedAbsent
            ? Number(observedAbsent)
            : undefined,
        studentProfileId: needsStudent ? studentId : undefined,
        observedStudentStatus: needsStudent ? observedStatus : undefined,
        description: note.trim() || undefined,
        acknowledgeDuplicate: ackDup || undefined,
      });
      router.push(`/teacher/attendance/concerns/${concern.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("teacherClassContextUi.submitFailed");
      if (msg.toLowerCase().includes("similar open concern")) {
        setAckDup(true);
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const className = ctx
    ? ctx.section
      ? `${ctx.grade.name} · ${ctx.section.name}`
      : ctx.grade.name
    : "";

  return (
    <DashboardPage role="teacher" title={tp("Class attendance")}>
      <div className="tch-day tch-class">
        <Link href="/teacher/classes-today" className="tch-day__link tch-class__back">
          {t("teacherClassContextUi.backClasses")}
        </Link>

        {loading ? (
          <div className="tch-day__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>{t("teacherClassContextUi.loadingRoster")}</p>
          </div>
        ) : null}

        {error && !ctx ? (
          <div className="tch-day__empty">
            <div className="tch-day__empty-icon" aria-hidden>
              <DashIcon name="alert" />
            </div>
            <h2>{t("teacherClassContextUi.openFailed")}</h2>
            <p>{error}</p>
            <button
              type="button"
              className="tch-day__empty-btn"
              onClick={() => void loadContext()}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : null}

        {ctx ? (
          <>
            <header className="tch-day__hero">
              <div className="tch-day__hero-main">
                <div className="tch-day__brand">
                  <span className="tch-day__chip">
                    {ctx.period.label ||
                      t("teacherClassContextUi.period", { n: ctx.period.number })}
                  </span>
                  <span className="tch-day__icon" aria-hidden>
                    <DashIcon name="users" className="dash-icon--sm" />
                  </span>
                </div>
                <h1 className="tch-day__title" title={subjectFullLabel(ctx.subject)}>
                  {subjectCompactLabel(ctx.subject)}
                </h1>
                <p className="tch-day__sub">
                  {className}
                  {ctx.period.startTime
                    ? ` · ${ctx.period.startTime} – ${ctx.period.endTime}`
                    : ""}
                  {ctx.room ? ` · ${ctx.room.name}` : ""}
                </p>
                <p className="tch-class__subject-name">{ctx.subject.name}</p>
              </div>
              <div className="tch-day__stats" aria-label={t("teacherClassContextUi.officialRoll")}>
                <div className="tch-day__stat">
                  <strong>{ctx.officialAttendance.totalStudents}</strong>
                  <span>{t("teacherClassContextUi.onRoll")}</span>
                </div>
                <div className="tch-day__stat">
                  <strong>{ctx.officialAttendance.presentCount}</strong>
                  <span>{t("common.present")}</span>
                </div>
                <div className="tch-day__stat tch-day__stat--warn">
                  <strong>{ctx.officialAttendance.absentCount}</strong>
                  <span>{t("common.absent")}</span>
                </div>
                <div className="tch-day__stat tch-day__stat--muted">
                  <strong>
                    {ctx.officialAttendance.submitted
                      ? t("teacherClassContextUi.rollIn")
                      : "—"}
                  </strong>
                  <span>{t("teacherClassContextUi.roll")}</span>
                </div>
              </div>
            </header>

            {error ? <p className="tch-day__error">{error}</p> : null}

            {ctx.message ? (
              <div className="tch-class__banner tch-class__banner--warn">
                {ctx.message} {t("teacherClassContextUi.homeroomPending")}
              </div>
            ) : null}

            {absentRoster.length > 0 ? (
              <section className="tch-class__panel tch-class__panel--absent">
                <div className="tch-class__panel-head">
                  <div>
                    <h2>{t("teacherClassContextUi.absentToday")}</h2>
                    <p>{t("teacherClassContextUi.absentTodaySub")}</p>
                  </div>
                  <span className="tch-class__count">{absentRoster.length}</span>
                </div>
                <ul className="tch-class__absent-list">
                  {absentRoster.map((s) => (
                    <li key={s.studentProfileId}>
                      <strong>{s.name}</strong>
                      <span>
                        {(s.hints ?? []).join(" · ") || t("teacherClassContextUi.markedAbsent")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : ctx.officialAttendance.submitted ? (
              <div className="tch-class__banner tch-class__banner--ok">
                {t("teacherClassContextUi.noAbsences")}
              </div>
            ) : null}

            <section className="tch-class__panel">
              <div className="tch-class__panel-head">
                <div>
                  <h2>{t("teacherClassContextUi.fullRoster")}</h2>
                  <p>{t("teacherClassContextUi.rosterSub")}</p>
                </div>
              </div>
              <ul className="tch-class__roster">
                {ctx.roster.map((s) => (
                  <li key={s.studentProfileId} className="tch-class__roster-row">
                    <div>
                      <strong>{s.name}</strong>
                      <span>{(s.hints ?? []).join(" · ") || "—"}</span>
                    </div>
                    <span
                      className={`tch-class__status tch-class__status--${statusTone(s.officialStatus)}`}
                    >
                      {officialStatusLabel(s.officialStatus)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {!showForm ? (
              <div className="tch-class__cta">
                <div>
                  <h3>{t("teacherClassContextUi.somethingWrong")}</h3>
                  <p>{t("teacherClassContextUi.ctaSub")}</p>
                </div>
                <button
                  type="button"
                  className="tch-day__empty-btn"
                  onClick={() => setShowForm(true)}
                >
                  {t("teacherClassContextUi.reportConcern")}
                </button>
              </div>
            ) : (
              <form className="tch-class__panel tch-class__form" onSubmit={onSubmit}>
                <div className="tch-class__panel-head">
                  <div>
                    <h2>{t("teacherClassContextUi.formTitle")}</h2>
                    <p>{t("teacherClassContextUi.formSub")}</p>
                  </div>
                </div>

                <label className="tch-class__field">
                  <span>{t("teacherClassContextUi.concernType")}</span>
                  <select
                    value={concernType}
                    onChange={(e) =>
                      setConcernType(e.target.value as AttendanceConcernType)
                    }
                  >
                    {CONCERN_TYPES.map((typeKey) => (
                      <option key={typeKey} value={typeKey}>
                        {t(`attendanceConcernsUi.type_${typeKey}`)}
                      </option>
                    ))}
                  </select>
                </label>

                {(concernType === "COUNT_MISMATCH" || concernType === "OTHER") && (
                  <label className="tch-class__field">
                    <span>{t("teacherClassContextUi.observedAbsent")}</span>
                    <input
                      type="number"
                      min={0}
                      value={observedAbsent}
                      onChange={(e) => setObservedAbsent(e.target.value)}
                      required={concernType === "COUNT_MISMATCH"}
                    />
                    {ctx.officialAttendance.submitted && observedAbsent ? (
                      <small>
                        {t("teacherClassContextUi.officialAbsentDiff", {
                          official: ctx.officialAttendance.absentCount,
                          diff: `${
                            Number(observedAbsent) - ctx.officialAttendance.absentCount >= 0
                              ? "+"
                              : ""
                          }${
                            Number(observedAbsent) - ctx.officialAttendance.absentCount
                          }`,
                        })}
                      </small>
                    ) : null}
                  </label>
                )}

                {needsStudent ? (
                  <>
                    <label className="tch-class__field">
                      <span>{t("teacherClassContextUi.student")}</span>
                      <select
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                      >
                        <option value="">{t("teacherClassContextUi.selectStudent")}</option>
                        {ctx.roster.map((s) => (
                          <option
                            key={s.studentProfileId}
                            value={s.studentProfileId}
                          >
                            {s.name}
                            {s.officialStatus ? ` (${s.officialStatus})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="tch-class__field">
                      <span>{t("teacherClassContextUi.observed")}</span>
                      <select
                        value={observedStatus}
                        onChange={(e) =>
                          setObservedStatus(e.target.value as ObservedAttendanceStatus)
                        }
                      >
                        <option value="MISSING">{t("teacherClassContextUi.obsMissing")}</option>
                        <option value="PRESENT">{t("teacherClassContextUi.obsPresent")}</option>
                        <option value="LEFT_CLASS">{t("teacherClassContextUi.obsLeft")}</option>
                        <option value="OTHER">{t("teacherClassContextUi.obsOther")}</option>
                      </select>
                    </label>
                  </>
                ) : null}

                <label className="tch-class__field">
                  <span>{t("teacherClassContextUi.notesOptional")}</span>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("teacherClassContextUi.notesPh")}
                  />
                </label>

                {ackDup ? (
                  <label className="tch-class__check">
                    <input
                      type="checkbox"
                      checked={ackDup}
                      onChange={(e) => setAckDup(e.target.checked)}
                    />
                    {t("teacherClassContextUi.dupAck")}
                  </label>
                ) : null}

                <div className="tch-class__actions">
                  <button
                    type="button"
                    className="tch-class__btn"
                    onClick={() => setShowForm(false)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="tch-class__btn tch-class__btn--primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? t("teacherClassContextUi.submitting")
                      : t("teacherClassContextUi.submitConcern")}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : null}
      </div>
    </DashboardPage>
  );
}