"use client";

import { TimetableDayList } from "@/components/timetable/timetable-day-list";
import type { TimetableDayListSlot } from "@/components/timetable/timetable-day-list";
import {
  subjectCompactLabel,
  subjectFullLabel,
} from "@/lib/subject-label";
import type { Weekday } from "@/lib/timetable";
import { useLocale } from "@/components/i18n/locale-provider";

type WeekDay = {
  weekday: Weekday;
  weekdayLabel: string;
  slots: TimetableDayListSlot[];
};

type Props = {
  todayLabel: string;
  todayWeekday?: Weekday;
  todaySlots: TimetableDayListSlot[];
  weekDays?: WeekDay[];
  loading?: boolean;
  error?: string;
  showStudent?: boolean;
  showTeacher?: boolean;
  heroSub?: string;
  todayEmptyMessage?: string;
};

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function TimetablePortalView({
  todayLabel,
  todayWeekday,
  todaySlots,
  weekDays = [],
  loading = false,
  error = "",
  showStudent = false,
  showTeacher = true,
  heroSub,
  todayEmptyMessage,
}: Props) {
  const { t } = useLocale();
  const resolvedHeroSub = heroSub ?? t("timetableUi.defaultHeroSub");
  const resolvedEmpty = todayEmptyMessage ?? t("timetableUi.defaultTodayEmpty");
  const weekTotal = weekDays.reduce((sum, day) => sum + day.slots.length, 0);
  const activeDays = weekDays.filter((day) => day.slots.length > 0).length;

  if (loading) {
    return (
      <div className="tt-page tch-day">
        <div className="tch-day__loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{t("timetableUi.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tt-page tch-day">
      {error ? <p className="tch-day__error">{error}</p> : null}

      <header className="tt-hero">
        <div className="tt-hero__main">
          <div className="tt-hero__brand">
            <span className="tt-hero__chip">{t("timetableUi.chipSchedule")}</span>
            <span className="tt-hero__icon" aria-hidden>
              <CalendarIcon />
            </span>
          </div>
          <h2 className="tt-hero__title">
            {t("timetableUi.heroToday", { label: todayLabel })}
          </h2>
          <p className="tt-hero__sub">{resolvedHeroSub}</p>
        </div>
        <div className="tt-hero__stats">
          <div className="tt-stat">
            <strong>{todaySlots.length}</strong>
            <span>{t("timetableUi.statToday")}</span>
          </div>
          <div className="tt-stat">
            <strong>{weekTotal}</strong>
            <span>{t("timetableUi.statThisWeek")}</span>
          </div>
          {weekDays.length > 0 ? (
            <div className="tt-stat">
              <strong>{activeDays}</strong>
              <span>{t("timetableUi.statActiveDays")}</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className="tt-layout">
        <section className="tt-card tt-card--today">
          <div className="tt-card__head">
            <div>
              <h3 className="tt-card__title">{t("timetableUi.todayClasses")}</h3>
              <p className="tt-card__sub">{todayLabel}</p>
            </div>
            <span className="tt-card__badge">
              {todaySlots.length}{" "}
              {todaySlots.length === 1
                ? t("timetableUi.classOne")
                : t("timetableUi.classMany")}
            </span>
          </div>
          <TimetableDayList
            slots={todaySlots}
            layout="timeline"
            showStudent={showStudent}
            showTeacher={showTeacher}
            emptyMessage={resolvedEmpty}
          />
        </section>

        {weekDays.length > 0 ? (
          <section className="tt-card">
            <div className="tt-card__head">
              <div>
                <h3 className="tt-card__title">{t("timetableUi.fullWeek")}</h3>
                <p className="tt-card__sub">{t("timetableUi.fullWeekSub")}</p>
              </div>
              <span className="tt-card__badge">
                {t("timetableUi.total", { count: weekTotal })}
              </span>
            </div>
            <div className="tt-week-grid">
              {weekDays.map((day) => (
                <article
                  key={day.weekday}
                  className={`tt-week-day${todayWeekday === day.weekday ? " tt-week-day--today" : ""}`}
                >
                  <header className="tt-week-day__head">
                    <h4 className="tt-week-day__name">{day.weekdayLabel}</h4>
                    <span className="tt-week-day__count">{day.slots.length}</span>
                  </header>
                  {day.slots.length === 0 ? (
                    <p className="tt-week-day__empty">{t("timetableUi.free")}</p>
                  ) : (
                    <ul className="tt-week-day__slots">
                      {day.slots.map((slot) => (
                        <li
                          key={slot.id}
                          className="tt-week-day__slot"
                          title={subjectFullLabel(slot.subject)}
                        >
                          <strong>{subjectCompactLabel(slot.subject)}</strong>
                          <span>
                            {slot.period.label}
                            {slot.period.startTime ? ` · ${slot.period.startTime}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}