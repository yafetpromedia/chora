"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { TimetablePortalView } from "@/components/timetable/timetable-portal-view";
import { getMyTimetableToday, type Weekday } from "@/lib/timetable";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const [todayWeekday, setTodayWeekday] = useState<Weekday | undefined>();
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
        setTodayWeekday(today.weekday);
        setTodaySlots(today.slots);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage
      role="parent"
      title="Children's timetable"
      subtitle="Today's classes for your linked students"
    >
      <TimetablePortalView
        loading={loading}
        error={error}
        todayLabel={todayLabel}
        todayWeekday={todayWeekday}
        todaySlots={todaySlots}
        showStudent
        heroSub="See what your children have on today."
        todayEmptyMessage="No classes scheduled today for your children."
      />
    </DashboardPage>
  );
}
