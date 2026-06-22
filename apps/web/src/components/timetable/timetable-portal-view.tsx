"use client";

import { TimetableDayList } from "@/components/timetable/timetable-day-list";
import type { TimetableDayListSlot } from "@/components/timetable/timetable-day-list";
import type { Weekday } from "@/lib/timetable";

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
  heroSub = "Your class schedule for today and the full school week.",
  todayEmptyMessage = "No classes on your timetable today.",
}: Props) {
  const weekTotal = weekDays.reduce((sum, day) => sum + day.slots.length, 0);
  const activeDays = weekDays.filter((day) => day.slots.length > 0).length;

  if (loading) {
    return (
      <div className="tt-loading">
        <div className="tt-loading__spinner" aria-hidden />
        <p>Loading your schedule…</p>
      </div>
    );
  }

  return (
    <div className="tt-page">
      {error ? <p className="tt-alert tt-alert--error">{error}</p> : null}

      <header className="tt-hero">
        <div className="tt-hero__main">
          <div className="tt-hero__brand">
            <span className="tt-hero__chip">Schedule</span>
            <span className="tt-hero__icon" aria-hidden>
              <CalendarIcon />
            </span>
          </div>
          <h2 className="tt-hero__title">Today — {todayLabel}</h2>
          <p className="tt-hero__sub">{heroSub}</p>
        </div>
        <div className="tt-hero__stats">
          <div className="tt-stat">
            <span className="tt-stat__value">{todaySlots.length}</span>
            <span className="tt-stat__label">Today</span>
          </div>
          <div className="tt-stat">
            <span className="tt-stat__value">{weekTotal}</span>
            <span className="tt-stat__label">This week</span>
          </div>
          {weekDays.length > 0 ? (
            <div className="tt-stat">
              <span className="tt-stat__value">{activeDays}</span>
              <span className="tt-stat__label">Active days</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className="tt-layout">
        <section className="tt-card tt-card--today">
          <div className="tt-card__head">
            <div>
              <h3 className="tt-card__title">Today&apos;s classes</h3>
              <p className="tt-card__sub">{todayLabel}</p>
            </div>
            <span className="tt-card__badge">
              {todaySlots.length} {todaySlots.length === 1 ? "class" : "classes"}
            </span>
          </div>
          <TimetableDayList
            slots={todaySlots}
            layout="timeline"
            showStudent={showStudent}
            emptyMessage={todayEmptyMessage}
          />
        </section>

        {weekDays.length > 0 ? (
          <section className="tt-card">
            <div className="tt-card__head">
              <div>
                <h3 className="tt-card__title">Full week</h3>
                <p className="tt-card__sub">All scheduled periods at a glance</p>
              </div>
              <span className="tt-card__badge">{weekTotal} total</span>
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
                    <p className="tt-week-day__empty">Free</p>
                  ) : (
                    <ul className="tt-week-day__slots">
                      {day.slots.map((slot) => (
                        <li key={slot.id} className="tt-week-day__slot">
                          <strong>{slot.subject.name}</strong>
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
