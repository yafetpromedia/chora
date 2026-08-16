"use client";

import type { ExamSeatingPlan } from "@/lib/exam-schedule";

type Props = {
  plan: ExamSeatingPlan;
  schoolName?: string;
};

export function ExamSeatingPrint({ plan, schoolName }: Props) {
  return (
    <div className="ex-seat-print" id="ex-seat-print">
      {schoolName ? (
        <p className="ex-seat-print__school no-print">{schoolName}</p>
      ) : null}
      <div className="ex-seat-print__grid">
        {plan.rooms.map((room) => {
          const count = room.assignments?.length ?? 0;
          return (
            <section key={room.id} className="ex-seat-sheet">
              <header className="ex-seat-sheet__head">
                <h3 className="ex-seat-sheet__title">{room.name}</h3>
                <p className="ex-seat-sheet__meta">
                  {[room.roomRef, `${count} students`, "Names A-Z"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </header>
              <table className="ex-seat-sheet__table">
                <thead>
                  <tr>
                    <th className="ex-seat-sheet__th ex-seat-sheet__th--no">No</th>
                    <th className="ex-seat-sheet__th">Grade</th>
                    <th className="ex-seat-sheet__th">Section</th>
                    <th className="ex-seat-sheet__th ex-seat-sheet__th--name">
                      Name (A-Z)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(room.assignments ?? []).map((a) => (
                    <tr key={a.id}>
                      <td className="ex-seat-sheet__no">{a.seatNo}</td>
                      <td>{a.gradeLabel}</td>
                      <td>{a.sectionLabel || "—"}</td>
                      <td className="ex-seat-sheet__name">{a.studentName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}
