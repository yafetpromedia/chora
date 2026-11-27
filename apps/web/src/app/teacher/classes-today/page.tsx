"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  getMyClassesToday,
  type TodayClassSlot,
} from "@/lib/attendance-concerns";
import { subjectCompactLabel, subjectFullLabel } from "@/lib/subject-label";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n";

function formatDayLabel(isoDate: string, locale: AppLocale, todayLabel: string) {
  if (!isoDate) return todayLabel;
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(locale === "am" ? "am-ET" : undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function classLabel(slot: TodayClassSlot) {
  return slot.section
    ? `${slot.grade.name} · ${slot.section.name}`
    : slot.grade.name;
}

export default function TeacherClassesTodayPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [slots, setSlots] = useState<TodayClassSlot[]>([]);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    void getMyClassesToday()
      .then((res) => {
        setSlots(res.slots);
        setDate(res.date);
      })
      .catch((e: Error) => setError(e.message || t("classesTodayUi.errLoad")))
      .finally(() => setLoading(false));
  }, [router]);

  const stats = useMemo(() => {
    const submitted = slots.filter((s) => s.officialAttendance.submitted).length;
    const absent = slots.reduce(
      (sum, s) =>
        sum + (s.officialAttendance.submitted ? s.officialAttendance.absentCount : 0),
      0,
    );
    const pending = slots.length - submitted;
    return { submitted, absent, pending, total: slots.length };
  }, [slots]);

  return (
    <DashboardPage role="teacher" title="My classes today">
      <div className="tch-day">
        <header className="tch-day__hero">
          <div className="tch-day__hero-main">
            <div className="tch-day__brand">
              <span className="tch-day__chip">{t("classesTodayUi.chip")}</span>
              <span className="tch-day__icon" aria-hidden>
                <DashIcon name="calendar" className="dash-icon--sm" />
              </span>
            </div>
            <h1 className="tch-day__title">{t("classesTodayUi.title")}</h1>
            <p className="tch-day__sub">
              {t("classesTodayUi.sub", {
                day: formatDayLabel(date, locale, t("classesTodayUi.today")),
              })}
            </p>
          </div>
          <div className="tch-day__stats" aria-label={t("classesTodayUi.ariaSummary")}>
            <div className="tch-day__stat">
              <strong>{loading ? "—" : stats.total}</strong>
              <span>{t("classesTodayUi.statPeriods")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>{loading ? "—" : stats.submitted}</strong>
              <span>{t("classesTodayUi.statRollsIn")}</span>
            </div>
            <div className="tch-day__stat tch-day__stat--warn">
              <strong>{loading ? "—" : stats.absent}</strong>
              <span>{t("classesTodayUi.statAbsent")}</span>
            </div>
            <div className="tch-day__stat tch-day__stat--muted">
              <strong>{loading ? "—" : stats.pending}</strong>
              <span>{t("classesTodayUi.statPending")}</span>
            </div>
          </div>
        </header>

        {error ? <p className="tch-day__error">{error}</p> : null}

        {loading ? (
          <div className="tch-day__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>{t("classesTodayUi.loading")}</p>
          </div>
        ) : null}

        {!loading && !error && slots.length === 0 ? (
          <div className="tch-day__empty">
            <div className="tch-day__empty-icon" aria-hidden>
              <DashIcon name="calendar" />
            </div>
            <h2>{t("classesTodayUi.emptyTitle")}</h2>
            <p>{t("classesTodayUi.emptyBody")}</p>
            <Link href="/teacher/timetable" className="tch-day__empty-btn">
              {t("classesTodayUi.viewTimetable")}
            </Link>
          </div>
        ) : null}

        {!loading && slots.length > 0 ? (
          <section className="tch-day__board">
            <div className="tch-day__board-head">
              <div>
                <h2>{t("classesTodayUi.boardTitle")}</h2>
                <p>{t("classesTodayUi.boardSub")}</p>
              </div>
              <Link href="/teacher/attendance/concerns" className="tch-day__link">
                {t("classesTodayUi.concernsLink")}
              </Link>
            </div>

            <ol className="tch-day__timeline">
              {slots.map((slot, index) => {
                const att = slot.officialAttendance;
                const time =
                  slot.period.startTime && slot.period.endTime
                    ? `${slot.period.startTime} – ${slot.period.endTime}`
                    : slot.period.label;
                const code = subjectCompactLabel(slot.subject);
                const fullSubject = subjectFullLabel(slot.subject);
                const nextUp =
                  !att.submitted &&
                  index === slots.findIndex((s) => !s.officialAttendance.submitted);

                return (
                  <li key={slot.timetableEntryId}>
                    <Link
                      href={`/teacher/classes-today/${slot.timetableEntryId}`}
                      className={`tch-day__card${nextUp ? " tch-day__card--next" : ""}${
                        att.submitted && att.absentCount > 0
                          ? " tch-day__card--alert"
                          : ""
                      }`}
                    >
                      <div className="tch-day__period">
                        <span className="tch-day__period-num">
                          {slot.period.label || `P${slot.period.number}`}
                        </span>
                        <span className="tch-day__period-time">{time}</span>
                      </div>

                      <div className="tch-day__body">
                        <div className="tch-day__row">
                          <h3 title={fullSubject}>{code}</h3>
                          {nextUp ? (
                            <span className="tch-day__pill tch-day__pill--live">
                              {t("classesTodayUi.checkNext")}
                            </span>
                          ) : null}
                        </div>
                        <p className="tch-day__class">{classLabel(slot)}</p>
                        <div className="tch-day__meta">
                          <span>{slot.subject.name}</span>
                          {slot.room ? <span>{slot.room.name}</span> : null}
                        </div>
                      </div>

                      <div className="tch-day__att">
                        {att.submitted ? (
                          <>
                            <div className="tch-day__att-grid">
                              <div>
                                <strong>{att.presentCount}</strong>
                                <span>{t("classesTodayUi.present")}</span>
                              </div>
                              <div
                                className={
                                  att.absentCount > 0
                                    ? "tch-day__att-cell--absent"
                                    : undefined
                                }
                              >
                                <strong>{att.absentCount}</strong>
                                <span>{t("classesTodayUi.absent")}</span>
                              </div>
                            </div>
                            <span className="tch-day__status tch-day__status--ok">
                              {t("classesTodayUi.rollSubmitted")}
                            </span>
                          </>
                        ) : (
                          <span className="tch-day__status tch-day__status--pending">
                            {t("classesTodayUi.rollNotSubmitted")}
                          </span>
                        )}
                        <span className="tch-day__chevron" aria-hidden>
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </div>
    </DashboardPage>
  );
}
