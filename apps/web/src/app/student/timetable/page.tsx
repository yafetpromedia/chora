"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { TimetableDayList } from "@/components/timetable/timetable-day-list";
import { getMyTimetableToday, getMyTimetableWeek } from "@/lib/timetable";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export default function StudentTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const [todaySlots, setTodaySlots] = useState<
    Awaited<ReturnType<typeof getMyTimetableToday>>["slots"]
  >([]);
  const [weekDays, setWeekDays] = useState<
    Awaited<ReturnType<typeof getMyTimetableWeek>>["days"]
  >([]);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    void Promise.all([getMyTimetableToday(), getMyTimetableWeek()])
      .then(([today, week]) => {
        setTodayLabel(today.weekdayLabel);
        setTodaySlots(today.slots);
        setWeekDays(week.days);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage
      role="student"
      title="My timetable"
    >
      <div className="att-page tt-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}
        {loading ? (
          <p className="setup-hint">Loading schedule…</p>
        ) : (
          <>
            <section className="tt-panel">
              <h2 className="tt-panel__title">Today — {todayLabel}</h2>
              <TimetableDayList
                slots={todaySlots}
                emptyMessage="No classes scheduled today."
              />
            </section>
            {weekDays.length > 0 ? (
              <section className="tt-panel">
                <h2 className="tt-panel__title">Full week</h2>
                {weekDays.map((day) => (
                  <div key={day.weekday} className="tt-panel__day">
                    <h3>{day.weekdayLabel}</h3>
                    <TimetableDayList slots={day.slots} emptyMessage="" />
                  </div>
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </DashboardPage>
  );
}
