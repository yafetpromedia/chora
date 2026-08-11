"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { StudentSubjectScoresPanel } from "@/components/results/student-subject-scores-panel";
import { useParentChild } from "@/hooks/use-parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentResultsPage() {
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
        {!loading && selectedId ? (
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
