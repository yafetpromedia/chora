"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AppToast } from "@/components/ui/app-toast";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, type UserRole } from "@/lib/auth";
import {
  dismissAttendanceConcern,
  getAttendanceConcern,
  resolveAttendanceConcern,
  reviewAttendanceConcern,
  type AttendanceConcern,
  type AttendanceConcernResolution,
  type AttendanceConcernStatus,
} from "@/lib/attendance-concerns";
import { hasPermission, Permission } from "@/lib/permissions";
import { useLocale } from "@/components/i18n/locale-provider";

const RESOLUTIONS: AttendanceConcernResolution[] = [
  "OFFICIAL_CORRECT",
  "CORRECTED_OFFICIAL",
  "AUTHORIZED_ABSENCE",
  "LEFT_CAMPUS",
  "TEMPORARILY_OUTSIDE",
  "DUPLICATE_OR_INCORRECT",
  "OTHER",
];

export default function AdminConcernDetailPage() {
  const { t, tp } = useLocale();
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
      setToast(t("attendanceConcernDetailUi.markedReview"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("attendanceConcernDetailUi.reviewFailed"));
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
      setToast(
        mode === "resolve"
          ? t("attendanceConcernDetailUi.concernResolved")
          : t("attendanceConcernDetailUi.concernDismissed"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("attendanceConcernDetailUi.actionFailed"));
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
    <DashboardPage role={shellRole} title={tp("Attendance concern")}>
      <div className="att-concern att-concern--wide">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

        <header className="tch-v2__hero">
          <div className="tch-v2__hero-glow" aria-hidden />
          <div className="tch-v2__hero-inner">
            <div className="tch-v2__hero-main">
              <span className="tch-v2__chip">{t("attendanceConcernDetailUi.chip")}</span>
              <h2 className="tch-v2__hero-title">
                {loading
                  ? t("common.loading")
                  : classLabel || t("attendanceConcernDetailUi.concernDetail")}
              </h2>
              <p className="tch-v2__hero-sub">
                <Link
                  href="/admin/attendance/concerns"
                  className="tch-v2__hero-link"
                >
                  {t("attendanceConcernDetailUi.allConcerns")}
                </Link>
                {concern
                  ? ` · ${t(`attendanceConcernsUi.type_${concern.concernType}`)} · ${concern.date}${
                      concern.subject ? ` · ${concern.subject.name}` : ""
                    }`
                  : ` · ${t("attendanceConcernDetailUi.reviewSub")}`}
              </p>
            </div>
            {concern ? (
              <div className="tch-v2__hero-stats">
                <div className="tch-v2__stat">
                  <strong>
                    {t(`attendanceConcernsUi.status_${concern.status as AttendanceConcernStatus}`)}
                  </strong>
                  <span>{t("attendanceConcernDetailUi.status")}</span>
                </div>
                <div className="tch-v2__stat">
                  <strong>{concern.officialPresentCount ?? "—"}</strong>
                  <span>{t("attendanceConcernDetailUi.officialP")}</span>
                </div>
                <div className="tch-v2__stat">
                  <strong>{concern.observedPresentCount ?? "—"}</strong>
                  <span>{t("attendanceConcernDetailUi.observedP")}</span>
                </div>
                <div className="tch-v2__stat tch-v2__stat--accent">
                  <strong>
                    {concern.difference == null
                      ? "—"
                      : `${concern.difference > 0 ? "+" : ""}${concern.difference}`}
                  </strong>
                  <span>{t("attendanceConcernDetailUi.delta")}</span>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>{t("attendanceConcernDetailUi.loadingConcern")}</p>
          </div>
        ) : !concern ? (
          <div className="att-concern__empty-card">
            <strong>{t("attendanceConcernDetailUi.notFoundTitle")}</strong>
            <p>{t("attendanceConcernDetailUi.notFoundBody")}</p>
            <Link
              href="/admin/attendance/concerns"
              className="sa-btn sa-btn--primary"
            >
              {t("attendanceConcernDetailUi.backToList")}
            </Link>
          </div>
        ) : (
          <div className="att-concern__detail-grid">
            <section className="att-concern__panel">
              <h3 className="att-concern__panel-title">
                {t("attendanceConcernDetailUi.observation")}
              </h3>
              <dl className="att-concern__meta">
                <div>
                  <dt>{t("attendanceConcernDetailUi.reportedBy")}</dt>
                  <dd>{concern.reportedBy.name}</dd>
                </div>
                <div>
                  <dt>{t("attendanceConcernDetailUi.period")}</dt>
                  <dd>{concern.periodLabel ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("attendanceConcernDetailUi.student")}</dt>
                  <dd>
                    {concern.student?.name ?? t("attendanceConcernDetailUi.wholeClass")}
                  </dd>
                </div>
                <div>
                  <dt>{t("attendanceConcernDetailUi.officialSubmitted")}</dt>
                  <dd>
                    {concern.officialSubmitted
                      ? t("attendanceConcernDetailUi.yes")
                      : t("attendanceConcernDetailUi.no")}
                  </dd>
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
                  <span>{t("attendanceConcernDetailUi.official")}</span>
                  <strong>
                    {t("attendanceConcernDetailUi.presentAbsent", {
                      present: concern.officialPresentCount ?? "—",
                      absent: concern.officialAbsentCount ?? "—",
                    })}
                  </strong>
                </div>
                <div>
                  <span>{t("attendanceConcernDetailUi.observed")}</span>
                  <strong>
                    {t("attendanceConcernDetailUi.presentAbsent", {
                      present: concern.observedPresentCount ?? "—",
                      absent: concern.observedAbsentCount ?? "—",
                    })}
                  </strong>
                </div>
              </div>
            </section>

            <section className="att-concern__panel">
              <h3 className="att-concern__panel-title">
                {t("attendanceConcernDetailUi.reviewActions")}
              </h3>
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
                      {t("attendanceConcernDetailUi.markUnderReview")}
                    </button>
                  ) : null}
                  <form className="att-concern__resolve" onSubmit={onResolve}>
                    <label className="sa-field">
                      <span>{t("attendanceConcernDetailUi.resolution")}</span>
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
                            {t(`attendanceConcernDetailUi.resolution_${r}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="sa-field sa-field--wide">
                      <span>{t("attendanceConcernDetailUi.noteOptional")}</span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder={t("attendanceConcernDetailUi.notePlaceholder")}
                      />
                    </label>
                    <div className="att-concern__actions">
                      <button
                        type="submit"
                        className="sa-btn sa-btn--primary"
                        disabled={busy}
                      >
                        {t("attendanceConcernDetailUi.resolve")}
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost"
                        disabled={busy}
                        onClick={() => void submitOutcome("dismiss")}
                      >
                        {t("attendanceConcernDetailUi.dismiss")}
                      </button>
                    </div>
                  </form>
                  <p className="att-concern__hint">
                    {t("attendanceConcernDetailUi.resolveHint")}
                  </p>
                </>
              ) : (
                <div className="att-concern__closed">
                  <span
                    className={`att-concern__badge att-concern__badge--${concern.status.toLowerCase()}`}
                  >
                    {t(`attendanceConcernsUi.status_${concern.status as AttendanceConcernStatus}`)}
                  </span>
                  {concern.resolution ? (
                    <p>
                      <strong>
                        {t(`attendanceConcernDetailUi.resolution_${concern.resolution}`)}
                      </strong>
                    </p>
                  ) : null}
                  {concern.resolutionNote ? (
                    <p className="att-concern__note">{concern.resolutionNote}</p>
                  ) : null}
                  {concern.resolvedBy ? (
                    <p className="att-concern__hint">
                      {t("attendanceConcernDetailUi.byReviewer", {
                        name: concern.resolvedBy.name,
                      })}
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
