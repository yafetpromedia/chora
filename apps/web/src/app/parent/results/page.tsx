"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { StudentSubjectScoresPanel } from "@/components/results/student-subject-scores-panel";
import { useParentChild } from "@/hooks/use-parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { ParentDayOverview } from "@/lib/dashboard-day";

export default function ParentResultsPage() {
  const router = useRouter();
  const { children, selectedId, selectChild, loading, error } = useParentChild();
  const [blocked, setBlocked] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "parent") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  useEffect(() => {
    if (!selectedId) {
      setPrivacyLoading(false);
      return;
    }
    setPrivacyLoading(true);
    void apiFetch<{ day?: ParentDayOverview }>("/dashboards/me")
      .then((data) => {
        const child =
          data.day?.kind === "parent_day"
            ? data.day.children.find((c) => c.profileId === selectedId)
            : null;
        setBlocked(child?.parentsCanViewResults === false);
      })
      .catch(() => setBlocked(false))
      .finally(() => setPrivacyLoading(false));
  }, [selectedId]);

  return (
    <DashboardPage
      role="parent"
      title="Results"
      subtitle="Term scores by subject for your child"
    >
      <div className="par-portal-stack">
        <ParentChildBar
          children={children}
          selectedId={selectedId}
          onChange={selectChild}
          loading={loading}
          label="Child"
        />
        {error ? <p className="stu-res__alert stu-res__alert--error">{error}</p> : null}
        {!loading && !privacyLoading && blocked ? (
          <div className="stu-res__empty stu-res__empty--report">
            <h3>Results are private</h3>
            <p>
              This student has turned off parent access to results. Ask them to enable
              “Allow parents to see my results” in their Profile, or contact the school.
            </p>
          </div>
        ) : null}
        {!loading && !privacyLoading && selectedId && !blocked ? (
          <StudentSubjectScoresPanel
            key={selectedId}
            role="parent"
            readOnly
            hideStudentPicker
            portalStudentProfileId={selectedId}
          />
        ) : null}
      </div>
    </DashboardPage>
  );
}
