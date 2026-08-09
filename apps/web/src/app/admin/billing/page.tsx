"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AcademicsBadge } from "@/components/academics/academics-ui";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SchoolBillingShell } from "@/components/school-billing/school-billing-shell";
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

function planStatusClass(sub: SchoolBillingOverview["subscription"]) {
  if (sub.expired || !sub.isActive) return "sb-v2__status--off";
  if (sub.plan === "TRIAL") return "sb-v2__status--trial";
  return "sb-v2__status--active";
}

function planStatusLabel(sub: SchoolBillingOverview["subscription"]) {
  if (sub.expired || !sub.isActive) return "Inactive";
  if (sub.plan === "TRIAL") return "Trial";
  return "Active";
}

function heroBadgeClass(sub: SchoolBillingOverview["subscription"]) {
  if (sub.expired || !sub.isActive) return "sb-v2__hero-badge--off";
  if (sub.plan === "TRIAL") return "sb-v2__hero-badge--trial";
  return "";
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
    <DashboardPage role="admin" title="Billing">
      <SchoolBillingShell
        title="CampusOne billing"
        subtitle={
          sub
            ? `${sub.planLabel} plan · ${planStatusLabel(sub).toLowerCase()} subscription for your school workspace`
            : "Manage your CampusOne subscription, invoices, and seat usage."
        }
        stats={
          sub
            ? [
                {
                  label: "Open invoices",
                  value: data?.invoices.openCount ?? 0,
                  hint: `${data?.invoices.total ?? 0} total`,
                },
                {
                  label: "Amount due",
                  value: `$${(data?.invoices.outstandingUsd ?? 0).toLocaleString()}`,
                  hint: `${(data?.invoices.outstandingEtb ?? 0).toLocaleString()} ETB`,
                  accent: (data?.invoices.outstandingUsd ?? 0) > 0,
                },
                {
                  label: "Next due",
                  value: formatDate(data?.invoices.nextDueAt ?? null),
                },
                {
                  label: "Students",
                  value: `${sub.usage.students}${sub.limits.students != null ? ` / ${sub.limits.students}` : ""}`,
                },
              ]
            : undefined
        }
        badges={
          sub ? (
            <>
              <AcademicsBadge variant="live">{sub.planLabel}</AcademicsBadge>
              <span className={`sb-v2__hero-badge ${heroBadgeClass(sub)}`.trim()}>
                {planStatusLabel(sub)}
              </span>
            </>
          ) : undefined
        }
        error={error}
        onDismissError={() => setError("")}
        loading={loading}
        loadingLabel="Loading billing overview…"
      >
        {sub ? (
          <div className="sb-v2__grid sb-v2__grid--2">
            <article className="sb-v2__card">
              <div className="sb-v2__card-head">
                <div>
                  <h3 className="sb-v2__plan-name">{sub.planLabel}</h3>
                  <p className="sb-v2__card-sub">{sub.planDescription}</p>
                  {sub.plan === "TRIAL" && sub.trialEndsAt ? (
                    <p className="sb-v2__card-sub">
                      Trial ends {formatDate(sub.trialEndsAt)}
                      {sub.daysRemaining != null ? ` · ${sub.daysRemaining} days left` : ""}
                    </p>
                  ) : null}
                  {data?.planPrice && sub.plan !== "TRIAL" && sub.plan !== "ENTERPRISE" ? (
                    <p className="sb-v2__plan-price">
                      ${data.planPrice.usdMonthly}/mo · {data.planPrice.etbMonthly.toLocaleString()} ETB/mo
                    </p>
                  ) : null}
                </div>
                <span className={`sb-v2__status ${planStatusClass(sub)}`}>
                  {planStatusLabel(sub)}
                </span>
              </div>
              <div className="sb-v2__actions">
                {sub.plan === "TRIAL" || sub.expired ? (
                  <Link href="/admin/billing/plans" className="sb-v2__btn sb-v2__btn--primary">
                    Upgrade plan
                  </Link>
                ) : (
                  <Link href="/admin/billing/plans" className="sb-v2__btn">
                    Change plan
                  </Link>
                )}
                <Link href="/admin/billing/invoices" className="sb-v2__btn">
                  View invoices
                </Link>
              </div>
            </article>

            <article className="sb-v2__card">
              <div className="sb-v2__card-head">
                <div>
                  <h3 className="sb-v2__card-title">Seat usage</h3>
                  <p className="sb-v2__card-sub">
                    Students, teachers, and admins on your {sub.planLabel} plan.
                  </p>
                </div>
              </div>
              <UsageMeters subscription={sub} />
              <div className="sb-v2__actions" style={{ marginTop: "0.85rem" }}>
                <Link href="/admin/billing/usage" className="sb-v2__btn">
                  Usage details
                </Link>
              </div>
            </article>
          </div>
        ) : null}
      </SchoolBillingShell>
    </DashboardPage>
  );
}
