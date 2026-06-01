"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SchoolBillingNav } from "@/components/school-billing/school-billing-nav";
import { UsageMeters } from "@/components/school-billing/usage-meters";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getSchoolSubscription, type SubscriptionStatus } from "@/lib/api";

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

  const anyOver =
    subscription &&
    ((subscription.limits.students != null &&
      subscription.usage.students > subscription.limits.students) ||
      (subscription.limits.teachers != null &&
        subscription.usage.teachers > subscription.limits.teachers) ||
      (subscription.limits.admins != null &&
        subscription.usage.admins > subscription.limits.admins));

  return (
    <DashboardPage role="admin" title="Usage" subtitle="Seats used on your plan">
      <SchoolBillingNav />

      <header className="sbill-hero">
        <p className="sbill-hero__eyebrow">Capacity</p>
        <h2 className="sbill-hero__title">Usage vs plan limits</h2>
        <p className="sbill-hero__sub">
          Track students, teachers, and admins against what your {subscription?.planLabel ?? "current"}{" "}
          plan allows.
        </p>
      </header>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {loading ? <p className="sbill-muted">Loading usage…</p> : null}

      {anyOver ? (
        <p className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>
          You are over the limit on one or more seat types. Upgrade your plan to add more users.
        </p>
      ) : null}

      {subscription ? (
        <>
          <UsageMeters subscription={subscription} />
          <div className="sbill-actions">
            <Link href="/admin/billing/plans" className="sbill-link-btn sbill-link-btn--primary">
              View plans & upgrade
            </Link>
            <Link href="/admin/students" className="sbill-link-btn">
              Manage students
            </Link>
            <Link href="/admin/teachers" className="sbill-link-btn">
              Manage teachers
            </Link>
          </div>
        </>
      ) : null}
    </DashboardPage>
  );
}
