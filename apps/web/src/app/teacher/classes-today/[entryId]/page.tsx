"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  CONCERN_TYPE_LABELS,
  createAttendanceConcern,
  getClassAttendanceContext,
  type AttendanceConcernType,
  type ClassAttendanceContext,
  type ObservedAttendanceStatus,
} from "@/lib/attendance-concerns";

const CONCERN_TYPES = Object.keys(CONCERN_TYPE_LABELS) as AttendanceConcernType[];

export default function TeacherClassContextPage() {
  const router = useRouter();
  const params = useParams<{ entryId: string }>();
  const entryId = params.entryId;

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
    void getClassAttendanceContext(entryId)
      .then((res) => {
        setCtx(res);
        if (res.officialAttendance.submitted) {
          setObservedAbsent(String(res.officialAttendance.absentCount));
        }
      })
      .catch((e: Error) => setError(e.message || "Could not load class"))
      .finally(() => setLoading(false));
  }, [entryId, router]);

  const needsStudent = useMemo(
    () =>
      concernType === "STUDENT_APPEARS_ABSENT" ||
      concernType === "STUDENT_APPEARS_PRESENT" ||
      concernType === "STUDENT_LEFT_CLASS",
    [concernType],
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
      const msg = err instanceof Error ? err.message : "Submit failed";
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
      ? `${ctx.grade.name} ${ctx.section.name}`
      : ctx.grade.name
    : "";

  return (
    <DashboardPage role="teacher" title="Class attendance context">
      <div className="att-concern">
        <Link href="/teacher/classes-today" className="att-concern__back">
          ← My classes today
        </Link>

        {loading && (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>Loading class…</p>
          </div>
        )}
        {error && <p className="att-concern__error">{error}</p>}

        {ctx && (
          <>
            <header className="att-concern__hero">
              <p className="att-concern__eyebrow">
                Period {ctx.period.number}
                {ctx.period.startTime
                  ? ` · ${ctx.period.startTime} – ${ctx.period.endTime}`
                  : ""}
              </p>
              <h1 className="att-concern__title">{className}</h1>
              <p className="att-concern__sub">
                {ctx.subject.name}
                {ctx.teacher ? ` · ${ctx.teacher.name}` : ""}
              </p>
            </header>

            <section className="att-concern__panel">
              <h2>Official daily attendance</h2>
              {ctx.message && <p className="att-concern__warn">{ctx.message}</p>}
              <div className="att-concern__stats">
                <div>
                  <strong>{ctx.officialAttendance.totalStudents}</strong>
                  <span>Total</span>
                </div>
                <div>
                  <strong>{ctx.officialAttendance.presentCount}</strong>
                  <span>Present</span>
                </div>
                <div>
                  <strong>{ctx.officialAttendance.absentCount}</strong>
                  <span>Absent</span>
                </div>
              </div>
              <p className="att-concern__hint">
                This is the homeroom roll. You cannot change it here.
              </p>
            </section>

            <section className="att-concern__panel">
              <h2>Roster (read-only)</h2>
              <div className="att-concern__table-wrap">
                <table className="att-concern__table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Official status</th>
                      <th>Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.roster.map((s) => (
                      <tr key={s.studentProfileId}>
                        <td>{s.name}</td>
                        <td>{s.officialStatus ?? "—"}</td>
                        <td className="att-concern__hint-cell">
                          {(s.hints ?? []).join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="att-concern__hint">
                Context uses official attendance and approved leave only. Campus
                gate presence history is not available yet — observations are not
                accusations.
              </p>
            </section>

            {!showForm ? (
              <button
                type="button"
                className="att-concern__btn att-concern__btn--primary"
                onClick={() => setShowForm(true)}
              >
                Report a concern
              </button>
            ) : (
              <form className="att-concern__panel" onSubmit={onSubmit}>
                <h2>Report attendance concern</h2>
                <label className="att-concern__field">
                  <span>Concern type</span>
                  <select
                    value={concernType}
                    onChange={(e) =>
                      setConcernType(e.target.value as AttendanceConcernType)
                    }
                  >
                    {CONCERN_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {CONCERN_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>

                {(concernType === "COUNT_MISMATCH" ||
                  concernType === "OTHER") && (
                  <label className="att-concern__field">
                    <span>Observed absent count</span>
                    <input
                      type="number"
                      min={0}
                      value={observedAbsent}
                      onChange={(e) => setObservedAbsent(e.target.value)}
                      required={concernType === "COUNT_MISMATCH"}
                    />
                    {ctx.officialAttendance.submitted && observedAbsent && (
                      <small>
                        Official absent: {ctx.officialAttendance.absentCount} ·
                        Difference:{" "}
                        {Number(observedAbsent) -
                          ctx.officialAttendance.absentCount >=
                        0
                          ? "+"
                          : ""}
                        {Number(observedAbsent) -
                          ctx.officialAttendance.absentCount}
                      </small>
                    )}
                  </label>
                )}

                {needsStudent && (
                  <>
                    <label className="att-concern__field">
                      <span>Student</span>
                      <select
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                      >
                        <option value="">Select student</option>
                        {ctx.roster.map((s) => (
                          <option key={s.studentProfileId} value={s.studentProfileId}>
                            {s.name}
                            {s.officialStatus ? ` (${s.officialStatus})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="att-concern__field">
                      <span>Observed</span>
                      <select
                        value={observedStatus}
                        onChange={(e) =>
                          setObservedStatus(
                            e.target.value as ObservedAttendanceStatus,
                          )
                        }
                      >
                        <option value="MISSING">Missing from class</option>
                        <option value="PRESENT">Present</option>
                        <option value="LEFT_CLASS">Left class</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                  </>
                )}

                <label className="att-concern__field">
                  <span>Notes (optional)</span>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you observe?"
                  />
                </label>

                {ackDup && (
                  <label className="att-concern__check">
                    <input
                      type="checkbox"
                      checked={ackDup}
                      onChange={(e) => setAckDup(e.target.checked)}
                    />
                    Submit anyway — I know a similar open concern exists
                  </label>
                )}

                <div className="att-concern__actions">
                  <button
                    type="button"
                    className="att-concern__btn"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="att-concern__btn att-concern__btn--primary"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting…" : "Submit concern"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </DashboardPage>
  );
}
