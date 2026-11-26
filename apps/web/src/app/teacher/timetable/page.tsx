"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { TimetablePortalView } from "@/components/timetable/timetable-portal-view";
import { getMyTimetableToday, getMyTimetableWeek, type Weekday } from "@/lib/timetable";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { useLocale } from "@/components/i18n/locale-provider";

export default function TeacherTimetablePage() {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const [todayWeekday, setTodayWeekday] = useState<Weekday | undefined>();
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
        setTodayWeekday(today.weekday);
        setTodaySlots(today.slots);
        setWeekDays(week.days);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("timetableUi.errLoad")),
      )
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage
      role="teacher"
      title="My timetable"
      subtitle="Today's classes and your full teaching week"
    >
      <TimetablePortalView
        loading={loading}
        error={error}
        todayLabel={todayLabel}
        todayWeekday={todayWeekday}
        todaySlots={todaySlots}
        weekDays={weekDays}
        showTeacher={false}
        heroSub={t("timetableUi.teacherHeroSub")}
        todayEmptyMessage={t("timetableUi.teacherEmptyToday")}
      />
    </DashboardPage>
  );
}
