"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { useLocale } from "@/components/i18n/locale-provider";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { TimetablePortalView } from "@/components/timetable/timetable-portal-view";
import { useParentChild } from "@/hooks/use-parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getMyTimetableToday, getMyTimetableWeek, type Weekday } from "@/lib/timetable";

export default function ParentTimetablePage() {
  const router = useRouter();
  const { t } = useLocale();
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

  const filteredToday =
    !filterName || children.length <= 1
      ? todaySlots
      : todaySlots.filter(
          (s) => !s.studentName || s.studentName === filterName,
        );

  const filteredWeek =
    !filterName || children.length <= 1
      ? weekDays
      : weekDays.map((day) => ({
          ...day,
          slots: day.slots.filter(
            (s) => !s.studentName || s.studentName === filterName,
          ),
        }));

  return (
    <DashboardPage
      role="parent"
      title={t("pages.parentTimetable.title")}
      subtitle={t("pages.parentTimetable.subtitle")}
    >
      <div className="par-portal-stack">
        <ParentChildBar
          options={children}
          selectedId={selectedId}
          onChange={selectChild}
          loading={childrenLoading}
          label={t("common.child")}
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
              ? t("timetableUi.parentHeroWithChild", { name: selectedChild.name })
              : t("timetableUi.parentHeroDefault")
          }
          todayEmptyMessage={
            selectedChild
              ? t("timetableUi.parentEmptyWithChild", { name: selectedChild.name })
              : t("timetableUi.parentEmptyDefault")
          }
        />
      </div>
    </DashboardPage>
  );
}
