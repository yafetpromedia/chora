"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  CONCERN_TYPE_LABELS,
  RESOLUTION_LABELS,
  STATUS_LABELS,
  dismissAttendanceConcern,
  getAttendanceConcern,
  resolveAttendanceConcern,
  reviewAttendanceConcern,
  type AttendanceConcern,
  type AttendanceConcernResolution,
} from "@/lib/attendance-concerns";
import { hasPermission, Permission } from "@/lib/permissions";

const RESOLUTIONS = Object.keys(
  RESOLUTION_LABELS,
) as AttendanceConcernResolution[];

export default function TeacherConcernDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [concern, setConcern] = useState<AttendanceConcern | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] =
    useState<AttendanceConcernResolution>("OFFICIAL_CORRECT");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [portalRole, setPortalRole] = useState<"teacher" | "admin">("teacher");
  const canReview = hasPermission(Permission.ATTENDANCE_CONCERNS_REVIEW);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "teacher" && role !== "admin" && role !== "staff") {
      router.replace(`/${role ?? "login"}`);
      return;
    }
    setPortalRole(role === "teacher" ? "teacher" : "admin");
    void getAttendanceConcern(params.id)
      .then(setConcern)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function onReview() {
    setBusy(true);
    try {
      setConcern(await reviewAttendanceConcern(params.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  async function onResolve(e: FormEvent, mode: "resolve" | "dismiss") {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { resolution, resolutionNote: note.trim() || undefined };
      setConcern(
        mode === "resolve"
          ? await resolveAttendanceConcern(params.id, body)
          : await dismissAttendanceConcern(params.id, body),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const open =
    concern &&
    (concern.status === "OPEN" || concern.status === "UNDER_REVIEW");

  const backHref =
    portalRole === "admin"
      ? "/admin/attendance/concerns"
      : "/teacher/attendance/concerns";

  return (
    <DashboardPage role={portalRole} title="Attendance concern">
      <div className="att-concern">
        <Link href={backHref} className="att-concern__back">
          ← Attendance concerns
        </Link>

        {loading && (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>Loading…</p>
          </div>
        )}
        {error && <p className="att-concern__error">{error}</p>}

        {concern && (
          <>
            <header className="att-concern__hero">
              <p className="att-concern__eyebrow">
                {concern.date}
                {concern.periodLabel ? ` · ${concern.periodLabel}` : ""}
              </p>
              <h1 className="att-concern__title">
                {concern.section
                  ? `${concern.grade.name} ${concern.section.name}`
                  : concern.grade.name}
              </h1>
              <p className="att-concern__sub">
                {concern.subject?.name ?? "Subject"} · Reported by{" "}
                {concern.reportedBy.name}
              </p>
              <span
                className={`att-concern__badge att-concern__badge--${concern.status.toLowerCase()}`}
              >
                {STATUS_LABELS[concern.status]}
              </span>
            </header>

            <section className="att-concern__panel">
              <h2>Concern</h2>
              <p>{CONCERN_TYPE_LABELS[concern.concernType]}</p>
              {concern.student && (
                <p>
                  Student: <strong>{concern.student.name}</strong>
                  {concern.officialStudentStatus
                    ? ` · Official: ${concern.officialStudentStatus}`
                    : ""}
                  {concern.observedStudentStatus
                    ? ` · Observed: ${concern.observedStudentStatus}`
                    : ""}
                </p>
              )}
              {concern.description && (
                <blockquote className="att-concern__note">
                  {concern.description}
                </blockquote>
              )}
            </section>

            <section className="att-concern__panel">
              <h2>Official attendance</h2>
              {!concern.officialSubmitted ? (
                <p className="att-concern__warn">
                  Official attendance had not been submitted when this was
                  reported.
                </p>
              ) : (
                <div className="att-concern__stats">
                  <div>
                    <strong>{concern.totalStudents ?? "—"}</strong>
                    <span>Total</span>
                  </div>
                  <div>
                    <strong>{concern.officialPresentCount ?? "—"}</strong>
                    <span>Present</span>
                  </div>
                  <div>
                    <strong>{concern.officialAbsentCount ?? "—"}</strong>
                    <span>Absent</span>
                  </div>
                </div>
              )}
            </section>

            <section className="att-concern__panel">
              <h2>Teacher observation</h2>
              <div className="att-concern__stats">
                <div>
                  <strong>{concern.observedAbsentCount ?? "—"}</strong>
                  <span>Observed missing</span>
                </div>
                <div>
                  <strong>
                    {concern.difference == null
                      ? "—"
                      : `${concern.difference >= 0 ? "+" : ""}${concern.difference}`}
                  </strong>
                  <span>Difference</span>
                </div>
              </div>
              {(concern.indicators ?? []).map((i) => (
                <p key={i} className="att-concern__warn">
                  {i}
                </p>
              ))}
              {(concern.leaveContext ?? []).length > 0 && (
                <div className="att-concern__leave">
                  <h3>Approved leave context</h3>
                  <ul>
                    {concern.leaveContext!.map((l, idx) => (
                      <li key={idx}>
                        {l.type} · {l.status}
                        {l.note ? ` — ${l.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {canReview && open && (
              <section className="att-concern__panel">
                <h2>Resolution</h2>
                <p className="att-concern__hint">
                  Resolving a concern does not automatically change official
                  attendance. Use Mark attendance if a correction is needed.
                </p>
                {concern.status === "OPEN" && (
                  <button
                    type="button"
                    className="att-concern__btn"
                    disabled={busy}
                    onClick={() => void onReview()}
                  >
                    Mark under review
                  </button>
                )}
                <form
                  className="att-concern__resolve"
                  onSubmit={(e) => void onResolve(e, "resolve")}
                >
                  <label className="att-concern__field">
                    <span>Resolution</span>
                    <select
                      value={resolution}
                      onChange={(e) =>
                        setResolution(
                          e.target.value as AttendanceConcernResolution,
                        )
                      }
                    >
                      {RESOLUTIONS.map((r) => (
                        <option key={r} value={r}>
                          {RESOLUTION_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="att-concern__field">
                    <span>Resolution note</span>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <div className="att-concern__actions">
                    <button
                      type="button"
                      className="att-concern__btn"
                      disabled={busy}
                      onClick={(e) =>
                        void onResolve(e as unknown as FormEvent, "dismiss")
                      }
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      className="att-concern__btn att-concern__btn--primary"
                      disabled={busy}
                    >
                      Resolve concern
                    </button>
                  </div>
                </form>
                {resolution === "CORRECTED_OFFICIAL" && (
                  <Link href="/teacher/attendance" className="att-concern__link">
                    Open Mark attendance to correct the official roll →
                  </Link>
                )}
              </section>
            )}

            {!open && concern.resolution && (
              <section className="att-concern__panel">
                <h2>Closed</h2>
                <p>{RESOLUTION_LABELS[concern.resolution]}</p>
                {concern.resolutionNote && (
                  <blockquote className="att-concern__note">
                    {concern.resolutionNote}
                  </blockquote>
                )}
                {concern.resolvedBy && (
                  <p>By {concern.resolvedBy.name}</p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </DashboardPage>
  );
}
