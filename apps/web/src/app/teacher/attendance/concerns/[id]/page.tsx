"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { useLocale } from "@/components/i18n/locale-provider";
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
import { subjectCompactLabel, subjectFullLabel } from "@/lib/subject-label";

const RESOLUTIONS: AttendanceConcernResolution[] = [
  "OFFICIAL_CORRECT",
  "CORRECTED_OFFICIAL",
  "AUTHORIZED_ABSENCE",
  "LEFT_CAMPUS",
  "TEMPORARILY_OUTSIDE",
  "DUPLICATE_OR_INCORRECT",
  "OTHER",
];

function statusTone(status: AttendanceConcernStatus) {
  switch (status) {
    case "OPEN":
      return "open";
    case "UNDER_REVIEW":
      return "review";
    case "RESOLVED":
      return "resolved";
    case "DISMISSED":
      return "dismissed";
    default:
      return "open";
  }
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function observedLabel(
  value: string | null,
  translate: (key: string) => string,
) {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "MISSING") return translate("teacherClassContextUi.obsMissing");
  if (upper === "PRESENT") return translate("teacherClassContextUi.obsPresent");
  if (upper === "LEFT_CLASS") return translate("teacherClassContextUi.obsLeft");
  if (upper === "OTHER") return translate("teacherClassContextUi.obsOther");
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function TeacherConcernDetailPage() {
  const { t, tp } = useLocale();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const concernId = typeof params.id === "string" ? params.id : "";
  const [concern, setConcern] = useState<AttendanceConcern | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] =
    useState<AttendanceConcernResolution>("OFFICIAL_CORRECT");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [portalRole, setPortalRole] = useState<"teacher" | "admin">("teacher");
  const canReview = hasPermission(Permission.ATTENDANCE_CONCERNS_REVIEW);

  async function loadConcern() {
    if (!concernId) {
      setError(t("attendanceConcernDetailUi.missingId"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setConcern(await getAttendanceConcern(concernId));
    } catch (e) {
      setConcern(null);
      setError(e instanceof Error ? e.message : t("attendanceConcernDetailUi.loadFailed"));
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
    if (role !== "teacher" && role !== "admin" && role !== "staff") {
      router.replace(`/${role ?? "login"}`);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialize the role from browser authentication storage.
    setPortalRole(role === "teacher" ? "teacher" : "admin");
    void loadConcern();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concernId, router]);

  async function onReview() {
    setBusy(true);
    setError(null);
    try {
      setConcern(await reviewAttendanceConcern(concernId));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("attendanceConcernDetailUi.reviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onResolve(e: FormEvent, mode: "resolve" | "dismiss") {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { resolution, resolutionNote: note.trim() || undefined };
      setConcern(
        mode === "resolve"
          ? await resolveAttendanceConcern(concernId, body)
          : await dismissAttendanceConcern(concernId, body),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("attendanceConcernDetailUi.actionFailed"));
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

  const classLabel = concern
    ? concern.section
      ? `${concern.grade.name} · ${concern.section.name}`
      : concern.grade.name
    : "";

  const subjectCode = concern?.subject
    ? subjectCompactLabel({
        name: concern.subject.name,
        code: concern.subject.code,
      })
    : null;

  return (
    <DashboardPage role={portalRole} title={tp("Attendance concern")}>
      <div className="tch-day tch-concern-detail">
        <Link href={backHref} className="tch-day__link tch-concern-detail__back">
          {t("attendanceConcernDetailUi.backConcerns")}
        </Link>

        {loading ? (
          <div className="tch-day__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>{t("attendanceConcernDetailUi.loadingConcern")}</p>
          </div>
        ) : null}

        {error && !concern ? (
          <div className="tch-day__empty">
            <div className="tch-day__empty-icon" aria-hidden>
              <DashIcon name="alert" />
            </div>
            <h2>{t("attendanceConcernDetailUi.couldntOpenTitle")}</h2>
            <p>{error}</p>
            <button
              type="button"
              className="tch-day__empty-btn"
              onClick={() => void loadConcern()}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : null}

        {concern ? (
          <>
            <header className="tch-day__hero">
              <div className="tch-day__hero-main">
                <div className="tch-day__brand">
                  <span className="tch-day__chip">
                    {concern.periodLabel ||
                      (concern.periodNumber != null
                        ? t("attendanceConcernDetailUi.periodN", {
                            n: concern.periodNumber,
                          })
                        : t("attendanceConcernDetailUi.chip"))}
                  </span>
                  <span className="tch-day__icon" aria-hidden>
                    <DashIcon name="users" className="dash-icon--sm" />
                  </span>
                </div>
                <h1 className="tch-day__title">{classLabel}</h1>
                <p className="tch-day__sub">
                  {subjectCode ? (
                    <span title={subjectFullLabel({
                      name: concern.subject?.name ?? "",
                      code: concern.subject?.code,
                    })}>
                      {subjectCode}
                    </span>
                  ) : (
                    t("attendanceConcernDetailUi.subjectLabel")
                  )}
                  {" · "}
                  {t("attendanceConcernDetailUi.reportedByName", {
                    name: concern.reportedBy.name,
                  })}
                  {" · "}
                  {formatWhen(concern.createdAt)}
                </p>
              </div>
              <div className="tch-day__stats" aria-label={t("attendanceConcernDetailUi.snapshotAria")}>
                <div className="tch-day__stat">
                  <strong>{concern.officialPresentCount ?? "—"}</strong>
                  <span>{t("common.present")}</span>
                </div>
                <div className="tch-day__stat tch-day__stat--warn">
                  <strong>{concern.officialAbsentCount ?? "—"}</strong>
                  <span>{t("common.absent")}</span>
                </div>
                <div className="tch-day__stat">
                  <strong>
                    {concern.difference == null
                      ? "—"
                      : `${concern.difference >= 0 ? "+" : ""}${concern.difference}`}
                  </strong>
                  <span>{t("attendanceConcernDetailUi.delta")}</span>
                </div>
                <div className="tch-day__stat">
                  <strong className="tch-concern-detail__status-stat">
                    {t(`attendanceConcernsUi.status_${concern.status}`)}
                  </strong>
                  <span>{t("attendanceConcernDetailUi.status")}</span>
                </div>
              </div>
            </header>

            {error ? <p className="tch-day__error">{error}</p> : null}

            <section className="tch-concern-detail__grid">
              <article
                className={`tch-concern-detail__card tch-concern-detail__card--${statusTone(concern.status)}`}
              >
                <div className="tch-concern-detail__card-head">
                  <h2>{t("attendanceConcernDetailUi.whatReported")}</h2>
                  <span
                    className={`tch-concerns__badge tch-concerns__badge--${statusTone(concern.status)}`}
                  >
                    {t(`attendanceConcernsUi.status_${concern.status}`)}
                  </span>
                </div>
                <p className="tch-concern-detail__headline">
                  {t(`attendanceConcernsUi.type_${concern.concernType}`)}
                </p>
                {concern.student ? (
                  <div className="tch-concern-detail__chips">
                    <span className="tch-concerns__chip">
                      {t("attendanceConcernDetailUi.student")} · {concern.student.name}
                    </span>
                    {concern.officialStudentStatus ? (
                      <span className="tch-concerns__chip">
                        {t("attendanceConcernDetailUi.official")} · {concern.officialStudentStatus}
                      </span>
                    ) : null}
                    {concern.observedStudentStatus ? (
                      <span className="tch-concerns__chip">
                        {t("attendanceConcernDetailUi.observed")} ·{" "}
                        {observedLabel(concern.observedStudentStatus, t)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {concern.description ? (
                  <blockquote className="tch-concern-detail__quote">
                    {concern.description}
                  </blockquote>
                ) : null}
                <p className="tch-concern-detail__meta">
                  {concern.date}
                  {concern.subject?.name ? ` · ${concern.subject.name}` : ""}
                </p>
              </article>

              <article className="tch-concern-detail__card">
                <div className="tch-concern-detail__card-head">
                  <h2>{t("attendanceConcernDetailUi.officialRollHeading")}</h2>
                </div>
                {!concern.officialSubmitted ? (
                  <div className="tch-class__banner tch-class__banner--warn">
                    {t("attendanceConcernDetailUi.notSubmittedBanner")}
                  </div>
                ) : (
                  <div className="tch-concern-detail__metrics">
                    <div>
                      <strong>{concern.totalStudents ?? "—"}</strong>
                      <span>{t("attendanceConcernDetailUi.onRoll")}</span>
                    </div>
                    <div>
                      <strong>{concern.officialPresentCount ?? "—"}</strong>
                      <span>{t("common.present")}</span>
                    </div>
                    <div>
                      <strong>{concern.officialAbsentCount ?? "—"}</strong>
                      <span>{t("common.absent")}</span>
                    </div>
                  </div>
                )}
              </article>

              <article className="tch-concern-detail__card">
                <div className="tch-concern-detail__card-head">
                  <h2>{t("attendanceConcernDetailUi.teacherObservation")}</h2>
                </div>
                <div className="tch-concern-detail__metrics">
                  <div>
                    <strong>{concern.observedAbsentCount ?? "—"}</strong>
                    <span>{t("attendanceConcernDetailUi.observedMissing")}</span>
                  </div>
                  <div>
                    <strong>
                      {concern.difference == null
                        ? "—"
                        : `${concern.difference >= 0 ? "+" : ""}${concern.difference}`}
                    </strong>
                    <span>{t("attendanceConcernDetailUi.difference")}</span>
                  </div>
                </div>
                {(concern.indicators ?? []).map((item) => (
                  <div
                    key={item}
                    className="tch-class__banner tch-class__banner--warn"
                  >
                    {item}
                  </div>
                ))}
                {(concern.leaveContext ?? []).length > 0 ? (
                  <div className="tch-concern-detail__leave">
                    <h3>{t("attendanceConcernDetailUi.approveLeave")}</h3>
                    <ul>
                      {concern.leaveContext!.map((leave, idx) => (
                        <li key={`${leave.type}-${idx}`}>
                          <strong>{leave.type}</strong>
                          <span>
                            {leave.status}
                            {leave.note ? ` — ${leave.note}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            </section>

            {canReview && open ? (
              <section className="tch-concern-detail__resolve">
                <div className="tch-concern-detail__card-head">
                  <div>
                    <h2>{t("attendanceConcernDetailUi.resolution")}</h2>
                    <p>{t("attendanceConcernDetailUi.resolveIntro")}</p>
                  </div>
                </div>

                {concern.status === "OPEN" ? (
                  <button
                    type="button"
                    className="tch-class__btn"
                    disabled={busy}
                    onClick={() => void onReview()}
                  >
                    {t("attendanceConcernDetailUi.markUnderReview")}
                  </button>
                ) : null}

                <form
                  className="tch-concern-detail__form"
                  onSubmit={(e) => void onResolve(e, "resolve")}
                >
                  <label className="tch-class__field">
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
                  <label className="tch-class__field">
                    <span>{t("attendanceConcernDetailUi.resolutionNote")}</span>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t("attendanceConcernDetailUi.noteRecordPh")}
                    />
                  </label>
                  <div className="tch-class__actions">
                    <button
                      type="button"
                      className="tch-class__btn"
                      disabled={busy}
                      onClick={(e) =>
                        void onResolve(e as unknown as FormEvent, "dismiss")
                      }
                    >
                      {t("attendanceConcernDetailUi.dismiss")}
                    </button>
                    <button
                      type="submit"
                      className="tch-class__btn tch-class__btn--primary"
                      disabled={busy}
                    >
                      {busy
                        ? t("common.saving")
                        : t("attendanceConcernDetailUi.resolveConcern")}
                    </button>
                  </div>
                </form>

                {resolution === "CORRECTED_OFFICIAL" ? (
                  <Link
                    href={
                      portalRole === "admin"
                        ? "/admin/attendance"
                        : "/teacher/attendance"
                    }
                    className="tch-day__link"
                  >
                    {t("attendanceConcernDetailUi.openMarkAttendance")}
                  </Link>
                ) : null}
              </section>
            ) : null}

            {!open && concern.resolution ? (
              <section className="tch-concern-detail__closed">
                <div className="tch-concern-detail__card-head">
                  <h2>{t("attendanceConcernDetailUi.closed")}</h2>
                  <span
                    className={`tch-concerns__badge tch-concerns__badge--${statusTone(concern.status)}`}
                  >
                    {t(`attendanceConcernsUi.status_${concern.status}`)}
                  </span>
                </div>
                <p className="tch-concern-detail__headline">
                  {t(`attendanceConcernDetailUi.resolution_${concern.resolution}`)}
                </p>
                {concern.resolutionNote ? (
                  <blockquote className="tch-concern-detail__quote">
                    {concern.resolutionNote}
                  </blockquote>
                ) : null}
                {concern.resolvedBy ? (
                  <p className="tch-concern-detail__meta">
                    {t("attendanceConcernDetailUi.closedBy", {
                      name: concern.resolvedBy.name,
                    })}
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </DashboardPage>
  );
}
