"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { TimetablePortalView } from "@/components/timetable/timetable-portal-view";
import { useParentChild } from "@/hooks/use-parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getMyTimetableToday, getMyTimetableWeek, type Weekday } from "@/lib/timetable";

export default function ParentTimetablePage() {
  const router = useRouter();
  const { children, selectedId, selectChild, loading: childrenLoading, error: childrenError } =
    useParentChild();
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
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "parent") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
      return;
    }
    void Promise.all([getMyTimetableToday(), getMyTimetableWeek()])
      .then(([today, week]) => {
        setTodayLabel(today.weekdayLabel);
        setTodayWeekday(today.weekday);
        setTodaySlots(today.slots);
        setWeekDays(week.days);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  const selectedChild = children.find((c) => c.profileId === selectedId);
  const filterName = selectedChild?.name;

  const filteredToday = useMemo(() => {
    if (!filterName || children.length <= 1) return todaySlots;
    return todaySlots.filter(
      (s) => !s.studentName || s.studentName === filterName,
    );
  }, [todaySlots, filterName, children.length]);

  const filteredWeek = useMemo(() => {
    if (!filterName || children.length <= 1) return weekDays;
    return weekDays.map((day) => ({
      ...day,
      slots: day.slots.filter(
        (s) => !s.studentName || s.studentName === filterName,
      ),
    }));
  }, [weekDays, filterName, children.length]);

  return (
    <DashboardPage
      role="parent"
      title="Timetable"
      subtitle="Today’s classes and the full school week"
    >
      <div className="par-portal-stack">
        <ParentChildBar
          options={children}
          selectedId={selectedId}
          onChange={selectChild}
          loading={childrenLoading}
          label="Child"
        />
        {childrenError ? (
          <p className="stu-res__alert stu-res__alert--error">{childrenError}</p>
        ) : null}
        <TimetablePortalView
          loading={loading || childrenLoading}
          error={error}
          todayLabel={todayLabel}
          todayWeekday={todayWeekday}
          todaySlots={filteredToday}
          weekDays={filteredWeek}
          showStudent={children.length > 1}
          heroSub={
            selectedChild
              ? `Schedule for ${selectedChild.name}.`
              : "See what your children have on today and this week."
          }
          todayEmptyMessage={
            selectedChild
              ? `No classes scheduled today for ${selectedChild.name}.`
              : "No classes scheduled today for your children."
          }
        />
      </div>
    </DashboardPage>
  );
}
