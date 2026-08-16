"use client";

import type { ExamScheduleDay } from "@/lib/exam-schedule";

type GradeCol = { id: string; name: string };

type Props = {
  title: string;
  shiftLabel?: string | null;
  schoolName?: string;
  yearName?: string;
  days: Array<{
    examDate: string;
    isStudyDay: boolean;
    studyNote: string | null;
    defaultStartTime: string | null;
    defaultEndTime: string | null;
    slots: Array<{
      gradeId: string;
      subjectLabel: string;
      startTime: string | null;
      endTime: string | null;
    }>;
  }>;
  grades: GradeCol[];
};

function formatDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Normalize clock strings for display as 12-hour time, e.g. "15:00" → "3:00 PM". */
function formatClock(raw: string) {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw.trim();
  let hours = Number(m[1]);
  const minutes = m[2];
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return raw.trim();
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${suffix}`;
}

function timeRange(
  start: string | null | undefined,
  end: string | null | undefined,
  fallbackStart?: string | null,
  fallbackEnd?: string | null,
) {
  const s = (start || fallbackStart || "").trim();
  const e = (end || fallbackEnd || "").trim();
  if (!s && !e) return "";
  if (s && e) return `${formatClock(s)} – ${formatClock(e)}`;
  return formatClock(s || e);
}

function minutesOf(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Earliest start – latest end across slots (falls back to day defaults). */
function daySpanLabel(
  slots: Props["days"][number]["slots"],
  defaultStart: string | null,
  defaultEnd: string | null,
) {
  let minStart: number | null = null;
  let maxEnd: number | null = null;
  let startLabel = "";
  let endLabel = "";

  for (const slot of slots) {
    const s = slot.startTime || defaultStart;
    const e = slot.endTime || defaultEnd;
    const sm = minutesOf(s);
    const em = minutesOf(e);
    if (sm != null && (minStart == null || sm < minStart)) {
      minStart = sm;
      startLabel = s!;
    }
    if (em != null && (maxEnd == null || em > maxEnd)) {
      maxEnd = em;
      endLabel = e!;
    }
  }

  if (!startLabel && !endLabel) {
    return timeRange(null, null, defaultStart, defaultEnd) || "—";
  }
  return timeRange(startLabel, endLabel) || "—";
}

export function ExamScheduleBoard({
  title,
  shiftLabel,
  schoolName,
  yearName,
  days,
  grades,
}: Props) {
  const gradeIdsInUse = new Set<string>();
  for (const day of days) {
    for (const slot of day.slots) gradeIdsInUse.add(slot.gradeId);
  }
  const columns = grades.filter((g) => gradeIdsInUse.has(g.id));
  const visibleGrades = columns.length > 0 ? columns : grades;

  return (
    <div className="ex-board" id="ex-board-print">
      <header className="ex-board__head">
        {schoolName ? <p className="ex-board__school">{schoolName}</p> : null}
        <h2 className="ex-board__title">{title}</h2>
        <p className="ex-board__meta">
          {[yearName, shiftLabel].filter(Boolean).join(" · ")}
        </p>
      </header>

      {days.length === 0 ? (
        <div className="ex-board__empty">Add exam days to see the schedule board.</div>
      ) : (
        <div className="ex-board__scroll">
          <table className="ex-board__table">
            <thead>
              <tr>
                <th className="ex-board__th ex-board__th--date">Date</th>
                {visibleGrades.map((g) => (
                  <th key={g.id} className="ex-board__th">
                    {g.name}
                  </th>
                ))}
                <th className="ex-board__th ex-board__th--time">Time</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day, idx) => {
                if (day.isStudyDay) {
                  return (
                    <tr key={`study-${idx}`} className="ex-board__row ex-board__row--study">
                      <td className="ex-board__date">{formatDate(day.examDate)}</td>
                      <td
                        className="ex-board__study"
                        colSpan={Math.max(visibleGrades.length, 1) + 1}
                      >
                        {day.studyNote?.trim() || "Off day for study"}
                      </td>
                    </tr>
                  );
                }

                const resolved = day.slots.map((s) => ({
                  ...s,
                  label: timeRange(
                    s.startTime,
                    s.endTime,
                    day.defaultStartTime,
                    day.defaultEndTime,
                  ),
                }));
                const uniqueTimes = [
                  ...new Set(resolved.map((s) => s.label).filter(Boolean)),
                ];
                const mixedTimes = uniqueTimes.length > 1;
                const dayTime = mixedTimes
                  ? daySpanLabel(
                      day.slots,
                      day.defaultStartTime,
                      day.defaultEndTime,
                    )
                  : uniqueTimes[0] ||
                    timeRange(
                      null,
                      null,
                      day.defaultStartTime,
                      day.defaultEndTime,
                    ) ||
                    "—";

                return (
                  <tr key={`day-${idx}`} className="ex-board__row">
                    <td className="ex-board__date">{formatDate(day.examDate)}</td>
                    {visibleGrades.map((g) => {
                      const gradeSlots = resolved.filter((s) => s.gradeId === g.id);
                      return (
                        <td key={g.id} className="ex-board__cell">
                          {gradeSlots.length > 0 ? (
                            <ul className="ex-board__subjects">
                              {gradeSlots.map((slot, i) => (
                                <li key={`${slot.subjectLabel}-${i}`}>
                                  <span className="ex-board__subject-name">
                                    {slot.subjectLabel}
                                  </span>
                                  {slot.label ? (
                                    <span className="ex-board__subject-time">
                                      {slot.label}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="ex-board__dash">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="ex-board__time">
                      <span className="ex-board__time-main">{dayTime}</span>
                      {mixedTimes ? (
                        <span className="ex-board__time-hint">per subject</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function daysFromSchedule(days: ExamScheduleDay[]) {
  return days.map((d) => ({
    examDate: d.examDate,
    isStudyDay: d.isStudyDay,
    studyNote: d.studyNote,
    defaultStartTime: d.defaultStartTime,
    defaultEndTime: d.defaultEndTime,
    slots: d.slots.map((s) => ({
      gradeId: s.gradeId,
      subjectLabel: s.subjectLabel,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  }));
}
