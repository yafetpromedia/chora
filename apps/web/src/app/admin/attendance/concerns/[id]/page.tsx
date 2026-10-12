"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AppToast } from "@/components/ui/app-toast";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, type UserRole } from "@/lib/auth";
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

export default function AdminConcernDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const shellRole: UserRole =
    typeof window !== "undefined" &&
    localStorage.getItem(AUTH_ROLE_KEY) === "staff"
      ? "staff"
      : "admin";
  const [concern, setConcern] = useState<AttendanceConcern | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] =
    useState<AttendanceConcernResolution>("OFFICIAL_CORRECT");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = hasPermission(Permission.ATTENDANCE_CONCERNS_REVIEW);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "admin" && role !== "staff") {
      router.replace(`/${role ?? "login"}`);
      return;
    }
    if (!canReview) {
      router.replace("/admin");
      return;
    }
    void getAttendanceConcern(params.id)
      .then(setConcern)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id, router, canReview]);

  async function onReview() {
    setBusy(true);
    setError("");
    try {
      setConcern(await reviewAttendanceConcern(params.id));
      setToast("Marked under review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitOutcome(mode: "resolve" | "dismiss") {
    setBusy(true);
    setError("");
    try {
      const body = { resolution, resolutionNote: note.trim() || undefined };
      setConcern(
        mode === "resolve"
          ? await resolveAttendanceConcern(params.id, body)
          : await dismissAttendanceConcern(params.id, body),
      );
      setToast(mode === "resolve" ? "Concern resolved" : "Concern dismissed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function onResolve(e: FormEvent) {
    e.preventDefault();
    void submitOutcome("resolve");
  }

  const classLabel = concern
    ? concern.section
      ? `${concern.grade.name} ${concern.section.name}`
      : concern.grade.name
    : "";

  return (
    <DashboardPage role={shellRole} title="Attendance concern">
      <div className="att-concern att-concern--wide">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

        <header className="tch-v2__hero">
          <div className="tch-v2__hero-glow" aria-hidden />
          <div className="tch-v2__hero-inner">
            <div className="tch-v2__hero-main">
              <span className="tch-v2__chip">Concern</span>
              <h2 className="tch-v2__hero-title">
                {loading ? "Loading…" : classLabel || "Concern detail"}
              </h2>
              <p className="tch-v2__hero-sub">
                <Link
                  href="/admin/attendance/concerns"
                  className="tch-v2__hero-link"
                >
                  All concerns
                </Link>
                {concern
                  ? ` · ${CONCERN_TYPE_LABELS[concern.concernType]} · ${concern.date}${
                      concern.subject ? ` · ${concern.subject.name}` : ""
                    }`
                  : " · Review observation against official attendance."}
              </p>
            </div>
            {concern ? (
              <div className="tch-v2__hero-stats">
                <div className="tch-v2__stat">
                  <strong>{STATUS_LABELS[concern.status]}</strong>
                  <span>Status</span>
                </div>
                <div className="tch-v2__stat">
                  <strong>{concern.officialPresentCount ?? "—"}</strong>
                  <span>Official P</span>
                </div>
                <div className="tch-v2__stat">
                  <strong>{concern.observedPresentCount ?? "—"}</strong>
                  <span>Observed P</span>
                </div>
                <div className="tch-v2__stat tch-v2__stat--accent">
                  <strong>
                    {concern.difference == null
                      ? "—"
                      : `${concern.difference > 0 ? "+" : ""}${concern.difference}`}
                  </strong>
                  <span>Delta</span>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>Loading concern…</p>
          </div>
        ) : !concern ? (
          <div className="att-concern__empty-card">
            <strong>Concern not found</strong>
            <p>It may have been removed or you no longer have access.</p>
            <Link
              href="/admin/attendance/concerns"
              className="sa-btn sa-btn--primary"
            >
              Back to list
            </Link>
          </div>
        ) : (
          <div className="att-concern__detail-grid">
            <section className="att-concern__panel">
              <h3 className="att-concern__panel-title">Observation</h3>
              <dl className="att-concern__meta">
                <div>
                  <dt>Reported by</dt>
                  <dd>{concern.reportedBy.name}</dd>
                </div>
                <div>
                  <dt>Period</dt>
                  <dd>{concern.periodLabel ?? "—"}</dd>
                </div>
                <div>
                  <dt>Student</dt>
                  <dd>{concern.student?.name ?? "Whole class"}</dd>
                </div>
                <div>
                  <dt>Official submitted</dt>
                  <dd>{concern.officialSubmitted ? "Yes" : "No"}</dd>
                </div>
              </dl>
              {concern.description ? (
                <p className="att-concern__note">{concern.description}</p>
              ) : null}
              {concern.indicators && concern.indicators.length > 0 ? (
                <ul className="att-concern__indicators">
                  {concern.indicators.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              ) : null}
              <div className="att-concern__counts att-concern__counts--lg">
                <div>
                  <span>Official</span>
                  <strong>
                    {concern.officialPresentCount ?? "—"} present ·{" "}
                    {concern.officialAbsentCount ?? "—"} absent
                  </strong>
                </div>
                <div>
                  <span>Observed</span>
                  <strong>
                    {concern.observedPresentCount ?? "—"} present ·{" "}
                    {concern.observedAbsentCount ?? "—"} absent
                  </strong>
                </div>
              </div>
            </section>

            <section className="att-concern__panel">
              <h3 className="att-concern__panel-title">Review actions</h3>
              {concern.status === "OPEN" ||
              concern.status === "UNDER_REVIEW" ? (
                <>
                  {concern.status === "OPEN" ? (
                    <button
                      type="button"
                      className="sa-btn sa-btn--ghost"
                      disabled={busy}
                      onClick={() => void onReview()}
                    >
                      Mark under review
                    </button>
                  ) : null}
                  <form className="att-concern__resolve" onSubmit={onResolve}>
                    <label className="sa-field">
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
                    <label className="sa-field sa-field--wide">
                      <span>Note (optional)</span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="Explain the outcome for the audit trail"
                      />
                    </label>
                    <div className="att-concern__actions">
                      <button
                        type="submit"
                        className="sa-btn sa-btn--primary"
                        disabled={busy}
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost"
                        disabled={busy}
                        onClick={() => void submitOutcome("dismiss")}
                      >
                        Dismiss
                      </button>
                    </div>
                  </form>
                  <p className="att-concern__hint">
                    Resolving with “Correct official attendance” does not edit
                    the roll here — follow your school’s attendance correction
                    process after confirming.
                  </p>
                </>
              ) : (
                <div className="att-concern__closed">
                  <span
                    className={`att-concern__badge att-concern__badge--${concern.status.toLowerCase()}`}
                  >
                    {STATUS_LABELS[concern.status]}
                  </span>
                  {concern.resolution ? (
                    <p>
                      <strong>{RESOLUTION_LABELS[concern.resolution]}</strong>
                    </p>
                  ) : null}
                  {concern.resolutionNote ? (
                    <p className="att-concern__note">{concern.resolutionNote}</p>
                  ) : null}
                  {concern.resolvedBy ? (
                    <p className="att-concern__hint">
                      By {concern.resolvedBy.name}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
