"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { StudentReportCardPanel } from "@/components/results/student-report-card-panel";
import { useParentChild } from "@/hooks/use-parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { ParentDayOverview } from "@/lib/dashboard-day";

export default function ParentReportCardPage() {
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
    let cancelled = false;
    void (async () => {
      if (!selectedId) {
        setPrivacyLoading(false);
        return;
      }
      setPrivacyLoading(true);
      try {
        const data = await apiFetch<{ day?: ParentDayOverview }>("/dashboards/me");
        const child =
          data.day?.kind === "parent_day"
            ? data.day.children.find((c) => c.profileId === selectedId)
            : null;
        if (!cancelled) setBlocked(child?.parentsCanViewResults === false);
      } catch {
        if (!cancelled) setBlocked(false);
      } finally {
        if (!cancelled) setPrivacyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <DashboardPage
      role="parent"
      title="Report card"
      subtitle="Official term or year-end academic summary"
    >
      <div className="par-portal-stack">
        <ParentChildBar
          options={children}
          selectedId={selectedId}
          onChange={selectChild}
          loading={loading}
          label="Child"
        />
        {error ? <p className="stu-res__alert stu-res__alert--error">{error}</p> : null}
        {!loading && !privacyLoading && blocked ? (
          <div className="stu-res__empty stu-res__empty--report">
            <h3>Report card is private</h3>
            <p>
              This student has turned off parent access to results. Ask them to enable
              parent access in their Profile, or contact the school.
            </p>
          </div>
        ) : null}
        {!loading && !privacyLoading && selectedId && !blocked ? (
          <StudentReportCardPanel
            key={selectedId}
            role="parent"
            studentProfileId={selectedId}
            resultsHref="/parent/results"
          />
        ) : null}
      </div>
    </DashboardPage>
  );
}
