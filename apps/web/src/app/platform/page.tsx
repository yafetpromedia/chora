"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformCurriculum } from "@/components/platform/platform-curriculum";
import { PlatformSubjects } from "@/components/platform/platform-subjects";
import { PlatformLibraryRepo } from "@/components/platform/platform-library-repo";
import { PlatformMessages } from "@/components/platform/platform-messages";
import { PlatformStructures } from "@/components/platform/platform-structures";
import { PlatformProvisioning } from "@/components/platform/platform-provisioning";
import { PlatformAssessments } from "@/components/platform/platform-assessments";
import { PlatformBilling } from "@/components/platform/platform-billing";
import { PlatformInvoices } from "@/components/platform/platform-invoices";
import { PlatformPlans } from "@/components/platform/platform-plans";
import { PlatformUsage } from "@/components/platform/platform-usage";
import { PlatformOverview } from "@/components/platform/platform-overview";
import { PlatformPermissions } from "@/components/platform/platform-permissions";
import { PlatformSchools } from "@/components/platform/platform-schools";
import { PlatformProfilePanel } from "@/components/profile/platform-profile-panel";
import { PlatformSettings } from "@/components/platform/platform-settings";
import { PlatformShell } from "@/components/platform/platform-shell";
import type {
  PlatformDashboard,
  PlatformSchoolRow,
  PlatformSection,
} from "@/components/platform/platform-types";
import {
  PLATFORM_TOKEN_KEY,
  PLATFORM_USER_KEY,
  platformFetch,
  type PlatformUser,
} from "@/lib/platform-auth";

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [dashboard, setDashboard] = useState<PlatformDashboard | null>(null);
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [section, setSection] = useState<PlatformSection>("overview");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [d, s] = await Promise.all([
      platformFetch<PlatformDashboard>("/platform/dashboard"),
      platformFetch<PlatformSchoolRow[]>("/platform/schools"),
    ]);
    setDashboard(d);
    setSchools(s);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(PLATFORM_TOKEN_KEY)) {
      router.replace("/platform/login");
      return;
    }
    const raw = localStorage.getItem(PLATFORM_USER_KEY);
    if (raw) setUser(JSON.parse(raw) as PlatformUser);

    void loadData()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router, loadData]);

  async function setStatus(
    schoolId: string,
    status: "ACTIVE" | "SUSPENDED" | "TRIAL",
  ) {
    setError("");
    await platformFetch(`/platform/schools/${schoolId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadData();
    setSchools(await platformFetch<PlatformSchoolRow[]>("/platform/schools"));
  }

  async function refreshSchools() {
    setError("");
    await loadData();
  }

  return (
    <PlatformShell user={user} section={section} onSectionChange={setSection}>
      {error ? (
        <p className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="plat-loading">Loading platform data…</p>
      ) : dashboard ? (
        <>
          {section === "overview" ? (
            <PlatformOverview
              dashboard={dashboard}
              schools={schools}
              onNavigate={setSection}
            />
          ) : null}
          {section === "schools" ? (
            <PlatformSchools
              schools={schools}
              user={user}
              onRefresh={refreshSchools}
              onStatusChange={setStatus}
            />
          ) : null}
          {section === "curriculum" ? <PlatformCurriculum /> : null}
          {section === "subjects" ? <PlatformSubjects /> : null}
          {section === "library" ? <PlatformLibraryRepo /> : null}
          {section === "messages" ? <PlatformMessages /> : null}
          {section === "structures" ? <PlatformStructures /> : null}
          {section === "provisioning" ? <PlatformProvisioning /> : null}
          {section === "assessments" ? <PlatformAssessments schools={schools} /> : null}
          {section === "billing" ? (
            <PlatformBilling
              dashboard={dashboard}
              schools={schools}
              onNavigate={setSection}
            />
          ) : null}
          {section === "invoices" ? <PlatformInvoices schools={schools} /> : null}
          {section === "usage" ? <PlatformUsage /> : null}
          {section === "plans" ? <PlatformPlans /> : null}
          {section === "permissions" ? (
            <PlatformPermissions user={user} />
          ) : null}
          {section === "profile" ? <PlatformProfilePanel /> : null}
          {section === "settings" ? (
            <PlatformSettings user={user} onOpenProfile={() => setSection("profile")} />
          ) : null}
        </>
      ) : (
        <p className="plat-empty">Could not load dashboard.</p>
      )}
    </PlatformShell>
  );
}
