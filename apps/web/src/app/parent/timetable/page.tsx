"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { TimetableDayList } from "@/components/timetable/timetable-day-list";
import { getMyTimetableToday } from "@/lib/timetable";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const [todaySlots, setTodaySlots] = useState<
    Awaited<ReturnType<typeof getMyTimetableToday>>["slots"]
  >([]);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    void getMyTimetableToday()
      .then((today) => {
        setTodayLabel(today.weekdayLabel);
        setTodaySlots(today.slots);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage
      role="parent"
      title="Children's timetable"
    >
      <div className="att-page tt-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}
        {loading ? (
          <p className="setup-hint">Loading schedule…</p>
        ) : (
          <section className="tt-panel">
            <h2 className="tt-panel__title">Today — {todayLabel}</h2>
            <TimetableDayList
              slots={todaySlots}
              showStudent
              emptyMessage="No classes scheduled today for your children."
            />
          </section>
        )}
      </div>
    </DashboardPage>
  );
}
