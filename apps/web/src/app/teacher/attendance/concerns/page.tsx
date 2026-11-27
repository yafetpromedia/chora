"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { useLocale } from "@/components/i18n/locale-provider";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  getAttendanceConcernsSummary,
  listAttendanceConcerns,
  type AttendanceConcern,
  type AttendanceConcernStatus,
  type AttendanceConcernType,
} from "@/lib/attendance-concerns";
import { hasPermission, Permission } from "@/lib/permissions";
import { subjectCompactLabel } from "@/lib/subject-label";

type StatusFilter = "" | AttendanceConcernStatus;

const FILTERS: { id: StatusFilter; statusKey?: AttendanceConcernStatus }[] = [
  { id: "" },
  { id: "OPEN", statusKey: "OPEN" },
  { id: "UNDER_REVIEW", statusKey: "UNDER_REVIEW" },
  { id: "RESOLVED", statusKey: "RESOLVED" },
  { id: "DISMISSED", statusKey: "DISMISSED" },
];

function classLabel(c: AttendanceConcern) {
  return c.section ? `${c.grade.name} · ${c.section.name}` : c.grade.name;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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

function statusLabel(
  filter: (typeof FILTERS)[number],
  t: (key: string) => string,
) {
  if (!filter.statusKey) return t("attendanceConcernsUi.chipAll");
  if (filter.statusKey === "UNDER_REVIEW") return t("attendanceConcernsUi.chipInReview");
  if (filter.statusKey === "OPEN") return t("attendanceConcernsUi.chipOpen");
  if (filter.statusKey === "RESOLVED") return t("attendanceConcernsUi.chipResolved");
  return t("attendanceConcernsUi.chipDismissed");
}

function concernTypeLabel(type: AttendanceConcernType, t: (key: string) => string) {
  return t(`attendanceConcernsUi.type_${type}`);
}

function concernStatusLabel(status: AttendanceConcernStatus, t: (key: string) => string) {
  return t(`attendanceConcernsUi.status_${status}`);
}

export default function TeacherAttendanceConcernsPage() {
  const { t, tp } = useLocale();
  const router = useRouter();
  const [summary, setSummary] = useState<{
    open: number;
    resolved: number;
    today: number;
  } | null>(null);
  const [items, setItems] = useState<AttendanceConcern[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canReview = hasPermission(Permission.ATTENDANCE_CONCERNS_REVIEW);

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

    const load = async () => {
      try {
        if (canReview) {
          const s = await getAttendanceConcernsSummary();
          setSummary({ open: s.open, resolved: s.resolved, today: s.today });
          setItems(s.items);
        } else {
          const list = await listAttendanceConcerns({ mine: true });
          setItems(list.items);
          setSummary({
            open: list.items.filter(
              (i) => i.status === "OPEN" || i.status === "UNDER_REVIEW",
            ).length,
            resolved: list.items.filter(
              (i) => i.status === "RESOLVED" || i.status === "DISMISSED",
            ).length,
            today: list.items.filter(
              (i) => i.date === new Date().toISOString().slice(0, 10),
            ).length,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("teacherConcernsPageUi.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [router, canReview, t]);

  const filtered = useMemo(() => {
    if (!filter) return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  return (
    <DashboardPage role="teacher" title={tp("Attendance concerns")}>
      <div className="tch-day tch-concerns">
        <header className="tch-day__hero">
          <div className="tch-day__hero-main">
            <div className="tch-day__brand">
              <span className="tch-day__chip">{t("teacherConcernsPageUi.chip")}</span>
              <span className="tch-day__icon" aria-hidden>
                <DashIcon name="attendance" className="dash-icon--sm" />
              </span>
            </div>
            <h1 className="tch-day__title">{t("teacherConcernsPageUi.title")}</h1>
            <p className="tch-day__sub">
              {canReview
                ? t("teacherConcernsPageUi.subReview")
                : t("teacherConcernsPageUi.subReport")}
            </p>
          </div>
          <div className="tch-day__stats" aria-label={t("teacherConcernsPageUi.summaryAria")}>
            <div className="tch-day__stat tch-day__stat--warn">
              <strong>{loading ? "—" : (summary?.open ?? 0)}</strong>
              <span>{t("teacherConcernsPageUi.open")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>{loading ? "—" : (summary?.resolved ?? 0)}</strong>
              <span>{t("teacherConcernsPageUi.closed")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>{loading ? "—" : (summary?.today ?? 0)}</strong>
              <span>{t("teacherConcernsPageUi.today")}</span>
            </div>
          </div>
        </header>

        <div className="tch-concerns__toolbar">
          <div
            className="tch-concerns__filters"
            role="tablist"
            aria-label={t("teacherConcernsPageUi.filterAria")}
          >
            {FILTERS.map((f) => (
              <button
                key={f.id || "all"}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`tch-concerns__filter${
                  filter === f.id ? " tch-concerns__filter--active" : ""
                }`}
                onClick={() => setFilter(f.id)}
              >
                {statusLabel(f, t)}
              </button>
            ))}
          </div>
          <Link href="/teacher/classes-today" className="tch-day__link">
            {t("teacherConcernsPageUi.myClasses")}
          </Link>
        </div>

        {error ? <p className="tch-day__error">{error}</p> : null}

        {loading ? (
          <div className="tch-day__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>{t("teacherConcernsPageUi.loading")}</p>
          </div>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <div className="tch-day__empty">
            <div className="tch-day__empty-icon" aria-hidden>
              <DashIcon name="alert" />
            </div>
            <h2>
              {items.length === 0
                ? t("teacherConcernsPageUi.emptyTitle")
                : t("teacherConcernsPageUi.emptyFilterTitle")}
            </h2>
            <p>
              {items.length === 0
                ? t("teacherConcernsPageUi.emptyBody")
                : t("teacherConcernsPageUi.emptyFilterBody")}
            </p>
            {items.length === 0 ? (
              <Link href="/teacher/classes-today" className="tch-day__empty-btn">
                {t("teacherConcernsPageUi.goClasses")}
              </Link>
            ) : (
              <button
                type="button"
                className="tch-day__empty-btn"
                onClick={() => setFilter("")}
              >
                {t("teacherConcernsPageUi.showAll")}
              </button>
            )}
          </div>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <section className="tch-day__board">
            <div className="tch-day__board-head">
              <div>
                <h2>
                  {filtered.length === 1
                    ? t("teacherConcernsPageUi.concernOne", { count: filtered.length })
                    : t("teacherConcernsPageUi.concernMany", { count: filtered.length })}
                </h2>
                <p>
                  {canReview
                    ? t("teacherConcernsPageUi.listSubReview")
                    : t("teacherConcernsPageUi.listSubStatus")}
                </p>
              </div>
            </div>

            <ul className="tch-concerns__list">
              {filtered.map((c) => {
                const headline =
                  c.concernType === "COUNT_MISMATCH" && c.difference != null
                    ? t("teacherConcernsPageUi.discrepancy", {
                        diff: `${c.difference >= 0 ? "+" : ""}${c.difference}`,
                      })
                    : concernTypeLabel(c.concernType, t);
                const subject =
                  c.subject?.code || c.subject?.name
                    ? subjectCompactLabel({
                        name: c.subject.name,
                        code: c.subject.code,
                      })
                    : null;

                return (
                  <li key={c.id}>
                    <Link
                      href={`/teacher/attendance/concerns/${c.id}`}
                      className={`tch-concerns__card tch-concerns__card--${statusTone(c.status)}`}
                    >
                      <div className="tch-concerns__card-top">
                        <div>
                          <p className="tch-concerns__class">{classLabel(c)}</p>
                          <h3>{headline}</h3>
                        </div>
                        <span
                          className={`tch-concerns__badge tch-concerns__badge--${statusTone(c.status)}`}
                        >
                          {concernStatusLabel(c.status, t)}
                        </span>
                      </div>

                      <div className="tch-concerns__meta">
                        {subject ? (
                          <span className="tch-concerns__chip">{subject}</span>
                        ) : null}
                        {c.periodLabel || c.periodNumber != null ? (
                          <span className="tch-concerns__chip">
                            {c.periodLabel ||
                              t("teacherConcernsPageUi.periodN", {
                                n: c.periodNumber ?? 0,
                              })}
                          </span>
                        ) : null}
                        {c.student ? (
                          <span className="tch-concerns__chip">{c.student.name}</span>
                        ) : null}
                      </div>

                      <div className="tch-concerns__foot">
                        <span>
                          {canReview
                            ? t("teacherConcernsPageUi.reportedByName", {
                                name: c.reportedBy.name,
                              })
                            : t("teacherConcernsPageUi.youReported")}
                        </span>
                        <span>{formatWhen(c.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </DashboardPage>
  );
}