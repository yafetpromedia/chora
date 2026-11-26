"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  subjectCompactLabel,
  subjectFullLabel,
} from "@/lib/subject-label";

/** Minimal slot shape for day lists (dashboard, portal views). */
export type TimetableDayListSlot = {
  id: string;
  period: { label: string; startTime: string | null; endTime: string | null };
  subject: { name: string; code?: string | null };
  grade: { name: string };
  section: { name: string } | null;
  teacher: { name: string } | null;
  room: { name: string } | null;
  studentName?: string;
};

type Props = {
  slots: TimetableDayListSlot[];
  emptyMessage?: string;
  showStudent?: boolean;
  /** Hide on the teacher's own timetable (name is redundant). */
  showTeacher?: boolean;
  layout?: "timeline" | "legacy";
};

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function SubjectTitle({ subject }: { subject: TimetableDayListSlot["subject"] }) {
  const compact = subjectCompactLabel(subject);
  const full = subjectFullLabel(subject);
  const showNameUnder =
    Boolean(subject.code?.trim()) &&
    subject.name.trim().toLowerCase() !== subject.code!.trim().toLowerCase();

  return (
    <>
      <p className="tt-timeline__subject" title={full}>
        {compact}
      </p>
      {showNameUnder ? (
        <p className="tt-timeline__subject-name">{subject.name}</p>
      ) : null}
    </>
  );
}

export function TimetableDayList({
  slots,
  emptyMessage,
  showStudent = false,
  showTeacher = true,
  layout = "legacy",
}: Props) {
  const { t } = useLocale();
  const fallbackEmpty = emptyMessage ?? t("timetableUi.emptyDayDefault");
  if (slots.length === 0) {
    if (layout === "legacy" && !emptyMessage) return null;
    if (layout === "legacy") {
      return <p className="tch-meta">{fallbackEmpty}</p>;
    }
    return (
      <div className="tt-empty">
        <div className="tt-empty__icon" aria-hidden>
          <CalendarIcon />
        </div>
        <p className="tt-empty__title">{t("timetableUi.emptyScheduledTitle")}</p>
        <p className="tt-empty__sub">{fallbackEmpty}</p>
      </div>
    );
  }

  if (layout === "timeline") {
    return (
      <ul className="tt-timeline">
        {slots.map((slot) => (
          <li key={slot.id} className="tt-timeline__item">
            <div className="tt-timeline__period">
              <strong>{slot.period.label}</strong>
              {slot.period.startTime && slot.period.endTime ? (
                <span>
                  {slot.period.startTime}
                  <br />
                  {slot.period.endTime}
                </span>
              ) : null}
            </div>
            <div className="tt-timeline__body">
              <SubjectTitle subject={slot.subject} />
              <div className="tt-timeline__meta">
                <span className="tt-timeline__tag">
                  {slot.grade.name}
                  {slot.section ? ` · ${slot.section.name}` : ""}
                </span>
                {slot.room ? <span className="tt-timeline__tag">{slot.room.name}</span> : null}
                {showTeacher && slot.teacher ? (
                  <span className="tt-timeline__tag">{slot.teacher.name}</span>
                ) : null}
              </div>
              {showStudent && slot.studentName ? (
                <p className="tt-timeline__child">{slot.studentName}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="tt-day-list">
      {slots.map((slot) => (
        <li key={slot.id} className="tt-day-list__item">
          <div className="tt-day-list__time">
            <strong>{slot.period.label}</strong>
            {slot.period.startTime && slot.period.endTime ? (
              <span>
                {slot.period.startTime} – {slot.period.endTime}
              </span>
            ) : null}
          </div>
          <div className="tt-day-list__main">
            <p
              className="tt-day-list__subject"
              title={subjectFullLabel(slot.subject)}
            >
              {subjectCompactLabel(slot.subject)}
            </p>
            <p className="tt-day-list__meta">
              {slot.grade.name}
              {slot.section ? ` · ${slot.section.name}` : ""}
              {showTeacher && slot.teacher ? ` · ${slot.teacher.name}` : ""}
              {slot.room ? ` · ${slot.room.name}` : ""}
            </p>
            {showStudent && slot.studentName ? (
              <p className="tt-day-list__child">{slot.studentName}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
