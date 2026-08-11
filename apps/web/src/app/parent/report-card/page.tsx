"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { StudentReportCardPanel } from "@/components/results/student-report-card-panel";
import { useParentChild } from "@/hooks/use-parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentReportCardPage() {
  const router = useRouter();
  const { children, selectedId, selectChild, loading, error } = useParentChild();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "parent") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
    }
  }, [router]);

  return (
    <DashboardPage
      role="parent"
      title="Report card"
      subtitle="Official term or year-end academic summary"
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
        {!loading && selectedId ? (
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
