"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  getMyClassesToday,
  type TodayClassSlot,
} from "@/lib/attendance-concerns";

export default function TeacherClassesTodayPage() {
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
      .catch((e: Error) => setError(e.message || "Could not load classes"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage role="teacher" title="My classes today">
      <div className="att-concern">
        <header className="att-concern__hero">
          <p className="att-concern__eyebrow">{date || "Today"}</p>
          <h1 className="att-concern__title">My classes today</h1>
          <p className="att-concern__sub">
            Open a scheduled class to view official attendance context and report
            a concern if something does not match.
          </p>
        </header>

        {loading && (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>Loading schedule…</p>
          </div>
        )}
        {error && <p className="att-concern__error">{error}</p>}

        {!loading && !error && slots.length === 0 && (
          <p className="att-concern__empty">
            No published timetable classes for you today.
          </p>
        )}

        <ul className="att-concern__slot-list">
          {slots.map((slot) => {
            const time =
              slot.period.startTime && slot.period.endTime
                ? `${slot.period.startTime} – ${slot.period.endTime}`
                : slot.period.label;
            const className = slot.section
              ? `${slot.grade.name} ${slot.section.name}`
              : slot.grade.name;
            const att = slot.officialAttendance;
            return (
              <li key={slot.timetableEntryId}>
                <Link
                  href={`/teacher/classes-today/${slot.timetableEntryId}`}
                  className="att-concern__slot"
                >
                  <div className="att-concern__slot-time">{time}</div>
                  <div className="att-concern__slot-main">
                    <strong>{className}</strong>
                    <span>
                      {slot.subject.name}
                      {slot.room ? ` · ${slot.room.name}` : ""}
                    </span>
                  </div>
                  <div className="att-concern__slot-att">
                    {att.submitted ? (
                      <>
                        <span>{att.presentCount} present</span>
                        <span>{att.absentCount} absent</span>
                      </>
                    ) : (
                      <span>Roll not submitted</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </DashboardPage>
  );
}
