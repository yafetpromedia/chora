"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SchoolBillingNav } from "@/components/school-billing/school-billing-nav";
import { UsageMeters } from "@/components/school-billing/usage-meters";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { getSchoolBillingOverview, type SchoolBillingOverview } from "@/lib/school-billing";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function SchoolBillingPage() {
  const router = useRouter();
  const [data, setData] = useState<SchoolBillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }
    void getSchoolBillingOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load billing"))
      .finally(() => setLoading(false));
  }, [router]);

  const sub = data?.subscription;

  return (
    <DashboardPage role="admin" title="Billing" subtitle="Your CampusOne subscription">
      <SchoolBillingNav />

      {loading ? <p className="sbill-muted">Loading billing…</p> : null}
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      {sub ? (
        <>
          <div className="sbill-plan-card">
            <div>
              <p className="sbill-hero__eyebrow">Current plan</p>
              <h2 className="sbill-plan-card__plan">{sub.planLabel}</h2>
              <p className="sbill-plan-card__meta">{sub.planDescription}</p>
              {sub.plan === "TRIAL" && sub.trialEndsAt ? (
                <p className="sbill-plan-card__meta">
                  Trial ends {formatDate(sub.trialEndsAt)}
                  {sub.daysRemaining != null ? ` · ${sub.daysRemaining} days left` : ""}
                </p>
              ) : null}
              {data?.planPrice && sub.plan !== "TRIAL" && sub.plan !== "ENTERPRISE" ? (
                <p className="sbill-plan-card__meta">
                  ${data.planPrice.usdMonthly}/mo · {data.planPrice.etbMonthly.toLocaleString()} ETB/mo
                </p>
              ) : null}
            </div>
            <span
              className={`sbill-status ${
                sub.expired || !sub.isActive
                  ? "sbill-status--off"
                  : sub.plan === "TRIAL"
                    ? "sbill-status--trial"
                    : "sbill-status--active"
              }`}
            >
              {sub.expired || !sub.isActive
                ? "Inactive"
                : sub.plan === "TRIAL"
                  ? "Trial"
                  : "Active"}
            </span>
          </div>

          <div className="sbill-kpis">
            <article className="sbill-kpi">
              <p className="sbill-kpi__label">Open invoices</p>
              <p className="sbill-kpi__value">{data?.invoices.openCount ?? 0}</p>
              <p className="sbill-kpi__hint">
                {data?.invoices.total ?? 0} total on file
              </p>
            </article>
            <article className="sbill-kpi">
              <p className="sbill-kpi__label">Amount due (USD)</p>
              <p className="sbill-kpi__value">
                ${(data?.invoices.outstandingUsd ?? 0).toLocaleString()}
              </p>
              <p className="sbill-kpi__hint">
                {(data?.invoices.outstandingEtb ?? 0).toLocaleString()} ETB equivalent
              </p>
            </article>
            <article className="sbill-kpi">
              <p className="sbill-kpi__label">Next due</p>
              <p className="sbill-kpi__value" style={{ fontSize: "1rem" }}>
                {formatDate(data?.invoices.nextDueAt ?? null)}
              </p>
              <p className="sbill-kpi__hint">From CampusOne billing</p>
            </article>
          </div>

          <header className="sbill-hero">
            <h3 className="sbill-hero__title">Seat usage</h3>
            <p className="sbill-hero__sub">
              How your school uses seats on the {sub.planLabel} plan.
            </p>
          </header>
          <UsageMeters subscription={sub} />

          <div className="sbill-actions">
            <Link href="/admin/billing/usage" className="sbill-link-btn">
              View usage details
            </Link>
            <Link href="/admin/billing/invoices" className="sbill-link-btn">
              View invoices
            </Link>
            {(sub.plan === "TRIAL" || sub.expired) ? (
              <Link href="/admin/billing/plans" className="sbill-link-btn sbill-link-btn--primary">
                Upgrade plan
              </Link>
            ) : (
              <Link href="/admin/billing/plans" className="sbill-link-btn">
                Change plan
              </Link>
            )}
          </div>
        </>
      ) : null}
    </DashboardPage>
  );
}
