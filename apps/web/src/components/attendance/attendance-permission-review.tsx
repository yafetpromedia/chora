"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GradeWithSections } from "@/lib/api";
import {
  listAttendancePermissionRequests,
  listGradesForAttendance,
  reviewAttendancePermissionRequest,
  type AttendancePermissionRequest,
  type AttendancePermissionType,
} from "@/lib/attendance";
import { getMyTeacherProfile } from "@/lib/teachers";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale, MessageKey } from "@/lib/i18n";

function dateLocaleTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

const TYPE_KEYS: Record<AttendancePermissionType, MessageKey> = {
  ABSENCE: "attendancePermissionReviewUi.typeAbsence",
  LATE: "attendancePermissionReviewUi.typeLate",
  EARLY_LEAVE: "attendancePermissionReviewUi.typeEarlyLeave",
  OTHER: "attendancePermissionReviewUi.typeOther",
};

const REASON_KEYS: Record<string, MessageKey> = {
  sick: "parentAttendance.sick",
  family_emergency: "parentAttendance.familyEmergency",
  unexcused: "parentAttendance.unexcused",
  other: "parentAttendance.other",
};

export function AttendancePermissionReview() {
  const { t, locale } = useLocale();
  const dateLocale = dateLocaleTag(locale);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [requests, setRequests] = useState<AttendancePermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  const selectedGrade = grades.find((g) => g.id === gradeId);

  const formatDate = useCallback(
    (iso: string) => {
      try {
        return new Date(iso + "T12:00:00").toLocaleDateString(dateLocale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      } catch {
        return iso;
      }
    },
    [dateLocale],
  );

  const typeLabel = useCallback(
    (permType: AttendancePermissionType) => t(TYPE_KEYS[permType]),
    [t],
  );

  const reasonLabel = useCallback(
    (reason: string) => t(REASON_KEYS[reason] ?? "parentAttendance.other"),
    [t],
  );

  const statusLabel = useCallback(
    (status: AttendancePermissionRequest["status"]) => {
      if (status === "PENDING") return t("attendancePermissionReviewUi.statusPending");
      if (status === "APPROVED") return t("attendancePermissionReviewUi.statusApproved");
      return t("attendancePermissionReviewUi.statusRejected");
    },
    [t],
  );

  const load = useCallback(async () => {
    if (!gradeId) return;
    setLoading(true);
    setError("");
    try {
      const rows = await listAttendancePermissionRequests({
        gradeId,
        sectionId: sectionId || undefined,
        status: filter === "PENDING" ? "PENDING" : undefined,
      });
      setRequests(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("attendancePermissionReviewUi.loadFailed"),
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [gradeId, sectionId, filter, t]);

  useEffect(() => {
    void Promise.all([listGradesForAttendance(), getMyTeacherProfile().catch(() => null)])
      .then(([g, profile]) => {
        setGrades(g);
        const homeroom = profile?.homeroom;
        const preferred =
          homeroom?.gradeId && g.some((x) => x.id === homeroom.gradeId)
            ? homeroom.gradeId
            : g[0]?.id ?? "";
        setGradeId(preferred);
        const grade = g.find((x) => x.id === preferred);
        const sectionPreferred =
          homeroom?.sectionId && grade?.sections.some((s) => s.id === homeroom.sectionId)
            ? homeroom.sectionId
            : "";
        setSectionId(sectionPreferred);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!gradeId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
    });
    void (async () => {
      try {
        const rows = await listAttendancePermissionRequests({
          gradeId,
          sectionId: sectionId || undefined,
          status: filter === "PENDING" ? "PENDING" : undefined,
        });
        if (cancelled) return;
        setRequests(rows);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : t("attendancePermissionReviewUi.loadFailed"),
        );
        setRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeId, sectionId, filter, t]);

  async function onReview(id: string, status: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setError("");
    try {
      await reviewAttendancePermissionRequest(id, { status });
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("attendancePermissionReviewUi.reviewFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "PENDING").length,
    [requests],
  );

  return (
    <div className="att-perm-review">
      <section className="att-v4__filters">
        <div className="att-v4__field">
          <span>{t("attendancePermissionReviewUi.grade")}</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
            }}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-v4__field">
          <span>{t("attendancePermissionReviewUi.section")}</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">{t("attendancePermissionReviewUi.allSections")}</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-manual__view-tabs att-perm-review__tabs">
          <button
            type="button"
            className={`att-manual__view-tab${filter === "PENDING" ? " att-manual__view-tab--on" : ""}`}
            onClick={() => setFilter("PENDING")}
          >
            {t("attendancePermissionReviewUi.tabPending")}
            <span className="att-manual__view-count">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`att-manual__view-tab${filter === "ALL" ? " att-manual__view-tab--on" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            {t("attendancePermissionReviewUi.tabAll")}
          </button>
        </div>
      </section>

      {error ? <p className="att-v4__flash att-v4__flash--err">{error}</p> : null}

      <section className="att-perm-review__list-card">
        <header className="att-perm-review__list-head">
          <h2 className="att-perm-review__list-title">
            {t("attendancePermissionReviewUi.listTitle")}
          </h2>
          <p className="att-perm-review__list-sub">{t("attendancePermissionReviewUi.listSub")}</p>
        </header>

        {loading ? (
          <div className="att-manual__empty">
            <span className="att-manual__empty-spinner" aria-hidden />
            <p>{t("attendancePermissionReviewUi.loadingRequests")}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="att-manual__empty">
            <p className="att-manual__empty-title">{t("attendancePermissionReviewUi.emptyTitle")}</p>
            <span>
              {filter === "PENDING"
                ? t("attendancePermissionReviewUi.emptyPending")
                : t("attendancePermissionReviewUi.emptyAll")}
            </span>
          </div>
        ) : (
          <ul className="att-perm-review__list">
            {requests.map((r) => (
              <li
                key={r.id}
                className={`att-perm-review__item att-perm-review__item--${r.status.toLowerCase()}`}
              >
                <div className="att-perm-review__item-main">
                  <div className="att-perm-review__item-top">
                    <p className="att-perm-review__student">{r.studentName}</p>
                    <span className={`att-perm__status att-perm__status--${r.status.toLowerCase()}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  <p className="att-perm-review__meta">
                    {typeLabel(r.type)} · {formatDate(r.date)}
                    {r.sectionName ? ` · ${r.sectionName}` : ""}
                  </p>
                  {r.reason ? (
                    <p className="att-perm-review__reason">
                      {t("attendancePermissionReviewUi.reasonPrefix")} {reasonLabel(r.reason)}
                    </p>
                  ) : null}
                  {r.note ? <p className="att-perm-review__note">{r.note}</p> : null}
                  <p className="att-perm-review__by">
                    {t("attendancePermissionReviewUi.requestedBy", {
                      name: r.requestedBy,
                      parent:
                        r.requestedByRole === "parent"
                          ? t("attendancePermissionReviewUi.requestedByParent")
                          : "",
                    })}
                  </p>
                  {r.reviewNote ? (
                    <p className="att-perm-review__review-note">
                      {t("attendancePermissionReviewUi.yourNotePrefix")} {r.reviewNote}
                    </p>
                  ) : null}
                </div>
                {r.status === "PENDING" ? (
                  <div className="att-perm-review__actions">
                    <button
                      type="button"
                      className="att-v4__btn att-v4__btn--primary"
                      disabled={busyId === r.id}
                      onClick={() => void onReview(r.id, "APPROVED")}
                    >
                      {busyId === r.id ? "…" : t("attendancePermissionReviewUi.approve")}
                    </button>
                    <button
                      type="button"
                      className="att-v4__btn att-v4__btn--ghost"
                      disabled={busyId === r.id}
                      onClick={() => void onReview(r.id, "REJECTED")}
                    >
                      {t("attendancePermissionReviewUi.reject")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}