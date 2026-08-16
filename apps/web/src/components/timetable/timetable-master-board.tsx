"use client";

import { useMemo } from "react";
import type {
  TimetablePeriod,
  TimetableSlot,
  TimetableStackClass,
  Weekday,
} from "@/lib/timetable";

type Props = {
  weekdays: Weekday[];
  weekdayLabels: Record<Weekday, string>;
  periods: TimetablePeriod[];
  classes: TimetableStackClass[];
  onEditClass: (cls: TimetableStackClass) => void;
};

const DAY_SHORT: Partial<Record<Weekday, string>> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

function shortClassLabel(gradeName: string, sectionName: string | null) {
  const grade = gradeName.replace(/^grade\s+/i, "").trim();
  if (!sectionName) return grade;
  const section = sectionName.trim();
  if (section.length <= 4 && !/\s/.test(section)) {
    return `${grade}${section}`;
  }
  return `${grade}·${section}`;
}

function subjectLabel(entry: TimetableSlot) {
  const name = entry.subject.name.trim();
  const code = entry.subject.code?.trim();
  if (code && code.toLowerCase() !== name.toLowerCase()) {
    return { full: `${name} (${code})`, compact: code };
  }
  return { full: name, compact: name.length > 8 ? name.slice(0, 7) : name };
}

function findEntry(
  entries: TimetableSlot[],
  weekday: Weekday,
  periodNumber: number,
) {
  return entries.find(
    (e) => e.weekday === weekday && e.period.number === periodNumber,
  );
}

/** Hide weekend days unless the school actually schedules them. */
export function boardWeekdays(
  weekdays: Weekday[],
  classes: TimetableStackClass[],
): Weekday[] {
  const used = new Set<Weekday>();
  for (const cls of classes) {
    for (const entry of cls.entries) {
      used.add(entry.weekday);
    }
  }
  return weekdays.filter((day) => {
    if (day === "SUNDAY") return used.has("SUNDAY");
    if (day === "SATURDAY") return used.has("SATURDAY");
    return true;
  });
}

export function TimetableMasterBoard({
  weekdays,
  weekdayLabels,
  periods,
  classes,
  onEditClass,
}: Props) {
  const visibleDays = useMemo(
    () => boardWeekdays(weekdays, classes),
    [weekdays, classes],
  );

  if (classes.length === 0 || periods.length === 0) {
    return (
      <div className="tt-admin__empty">
        <p>No classes to show on the board.</p>
      </div>
    );
  }

  return (
    <div className="tt-board" id="tt-board-print">
      <h2 className="tt-board__print-title">School timetable</h2>
      <div className="tt-board__scroll">
        <table className="tt-board__table">
          <thead>
            <tr>
              <th className="tt-board__corner tt-board__corner--day">Day</th>
              <th className="tt-board__corner tt-board__corner--period">#</th>
              {classes.map((cls) => {
                const label = shortClassLabel(cls.gradeName, cls.sectionName);
                return (
                  <th key={`${cls.gradeId}:${cls.sectionId ?? ""}`} className="tt-board__class">
                    <button
                      type="button"
                      className="tt-board__class-btn"
                      onClick={() => onEditClass(cls)}
                      title={`Edit ${label}`}
                    >
                      {label}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleDays.map((weekday, dayIndex) =>
              periods.map((period, periodIndex) => {
                const isFirstPeriod = periodIndex === 0;
                const isLastPeriod = periodIndex === periods.length - 1;
                const time =
                  period.startTime && period.endTime
                    ? `${period.startTime}–${period.endTime}`
                    : period.startTime || "";
                return (
                  <tr
                    key={`${weekday}:${period.id}`}
                    className={[
                      "tt-board__row",
                      isFirstPeriod ? "tt-board__row--day-start" : "",
                      isLastPeriod ? "tt-board__row--day-end" : "",
                      dayIndex % 2 === 1 ? "tt-board__row--alt" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isFirstPeriod ? (
                      <th
                        className="tt-board__day"
                        rowSpan={periods.length}
                        scope="rowgroup"
                      >
                        <span className="tt-board__day-abbr">
                          {DAY_SHORT[weekday] ?? weekdayLabels[weekday].slice(0, 3)}
                        </span>
                      </th>
                    ) : null}
                    <th className="tt-board__period" scope="row" title={period.label}>
                      <span className="tt-board__period-num">
                        {period.number || periodIndex + 1}
                      </span>
                      {time ? <span className="tt-board__period-time">{time}</span> : null}
                    </th>
                    {classes.map((cls) => {
                      const entry = findEntry(cls.entries, weekday, period.number);
                      const key = `${cls.gradeId}:${cls.sectionId ?? ""}:${weekday}:${period.number}`;
                      return (
                        <td
                          key={key}
                          className={
                            entry
                              ? "tt-board__cell tt-board__cell--filled"
                              : "tt-board__cell"
                          }
                        >
                          {entry ? (
                            <button
                              type="button"
                              className="tt-board__slot"
                              onClick={() => onEditClass(cls)}
                              title={
                                entry.teacher
                                  ? `${entry.subject.name} · ${entry.teacher.name}`
                                  : entry.subject.name
                              }
                            >
                              {(() => {
                                const label = subjectLabel(entry);
                                return (
                                  <>
                                    <span className="tt-board__slot-screen">{label.full}</span>
                                    <span className="tt-board__slot-print">{label.compact}</span>
                                  </>
                                );
                              })()}
                            </button>
                          ) : (
                            <span className="tt-board__empty" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
