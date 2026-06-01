"use client";

import type { TimetableSlot } from "@/lib/timetable";

type Props = {
  slots: TimetableSlot[];
  emptyMessage?: string;
  showStudent?: boolean;
};

export function TimetableDayList({
  slots,
  emptyMessage = "No classes scheduled for this day.",
  showStudent = false,
}: Props) {
  if (slots.length === 0) {
    return <p className="tch-meta">{emptyMessage}</p>;
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
            <p className="tt-day-list__subject">{slot.subject.name}</p>
            <p className="tt-day-list__meta">
              {slot.grade.name}
              {slot.section ? ` · ${slot.section.name}` : ""}
              {slot.teacher ? ` · ${slot.teacher.name}` : ""}
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
