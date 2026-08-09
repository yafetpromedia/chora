"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AcademicsBadge } from "@/components/academics/academics-ui";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SchoolBillingShell } from "@/components/school-billing/school-billing-shell";
import { UsageMeters } from "@/components/school-billing/usage-meters";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getSchoolSubscription, type SubscriptionStatus } from "@/lib/api";

function seatPct(used: number, limit: number | null) {
  if (limit == null || limit <= 0) return null;
  return Math.round(Math.min(100, (used / limit) * 100));
}

export default function SchoolUsagePage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }
    void getSchoolSubscription()
      .then(setSubscription)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load usage"))
      .finally(() => setLoading(false));
  }, [router]);

  const anyOver = useMemo(() => {
    if (!subscription) return false;
    return (
      (subscription.limits.students != null &&
        subscription.usage.students > subscription.limits.students) ||
      (subscription.limits.teachers != null &&
        subscription.usage.teachers > subscription.limits.teachers) ||
      (subscription.limits.admins != null &&
        subscription.usage.admins > subscription.limits.admins)
    );
  }, [subscription]);

  return (
    <DashboardPage role="admin" title="Usage">
      <SchoolBillingShell
        title="Seat usage"
        subtitle={
          subscription
            ? `Track students, teachers, and admins against your ${subscription.planLabel} plan limits.`
            : "Monitor capacity across your school workspace."
        }
        stats={
          subscription
            ? [
                {
                  label: "Students",
                  value: `${subscription.usage.students}${subscription.limits.students != null ? ` / ${subscription.limits.students}` : ""}`,
                  hint:
                    seatPct(subscription.usage.students, subscription.limits.students) != null
                      ? `${seatPct(subscription.usage.students, subscription.limits.students)}% used`
                      : "Unlimited",
                },
                {
                  label: "Teachers",
                  value: `${subscription.usage.teachers}${subscription.limits.teachers != null ? ` / ${subscription.limits.teachers}` : ""}`,
                },
                {
                  label: "Admins",
                  value: `${subscription.usage.admins}${subscription.limits.admins != null ? ` / ${subscription.limits.admins}` : ""}`,
                },
                {
                  label: "Plan",
                  value: subscription.planLabel,
                },
              ]
            : undefined
        }
        badges={
          subscription ? (
            <AcademicsBadge variant="live">{subscription.planLabel}</AcademicsBadge>
          ) : undefined
        }
        error={error}
        onDismissError={() => setError("")}
        loading={loading}
        loadingLabel="Loading usage…"
      >
        {anyOver ? (
          <p className="sb-v2__warn-banner" role="alert">
            You are over the limit on one or more seat types. Upgrade your plan to add more users.
          </p>
        ) : null}

        {subscription ? (
          <article className="sb-v2__card">
            <div className="sb-v2__card-head">
              <div>
                <h3 className="sb-v2__card-title">Capacity breakdown</h3>
                <p className="sb-v2__card-sub">
                  Live counts from your school directory against plan limits.
                </p>
              </div>
            </div>
            <UsageMeters subscription={subscription} />
            <div className="sb-v2__actions" style={{ marginTop: "1rem" }}>
              <Link href="/admin/billing/plans" className="sb-v2__btn sb-v2__btn--primary">
                View plans & upgrade
              </Link>
              <Link href="/admin/students" className="sb-v2__btn">
                Manage students
              </Link>
              <Link href="/admin/teachers" className="sb-v2__btn">
                Manage teachers
              </Link>
            </div>
          </article>
        ) : null}
      </SchoolBillingShell>
    </DashboardPage>
  );
}
