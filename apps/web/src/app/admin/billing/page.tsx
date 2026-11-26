"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AcademicsBadge } from "@/components/academics/academics-ui";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SchoolBillingShell } from "@/components/school-billing/school-billing-shell";
import { UsageMeters } from "@/components/school-billing/usage-meters";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { PlatformPaymentPanel } from "@/components/school-billing/platform-payment-panel";
import { getSchoolBillingOverview, type SchoolBillingOverview } from "@/lib/school-billing";
import { BRAND_NAME } from "@/lib/brand";
import { EtbAmount } from "@/components/billing/etb-amount";
import { useLocale } from "@/components/i18n/locale-provider";

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

function heroBadgeClass(sub: SchoolBillingOverview["subscription"]) {
  if (sub.expired || !sub.isActive) return "sb-v2__hero-badge--off";
  if (sub.plan === "TRIAL") return "sb-v2__hero-badge--trial";
  return "";
}

export default function SchoolBillingPage() {
  const router = useRouter();
  const { t, tp } = useLocale();
  const [data, setData] = useState<SchoolBillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function reload() {
    void getSchoolBillingOverview()
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("adminBillingPageUi.loadFailed")),
      );
  }

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }
    void getSchoolBillingOverview()
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("adminBillingPageUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [router, t]);

  const sub = data?.subscription;

  const planStatusLabel = (s: NonNullable<typeof sub>) => {
    if (s.expired || !s.isActive) return t("adminBillingPageUi.statusInactive");
    if (s.plan === "TRIAL") return t("adminBillingPageUi.statusTrial");
    return t("adminBillingPageUi.statusActive");
  };

  return (
    <DashboardPage role="admin" title={tp("Billing")}>
      <SchoolBillingShell
        title={t("adminBillingPageUi.titleBilling", { brand: BRAND_NAME })}
        subtitle={
          sub
            ? t("adminBillingPageUi.subActive", {
                plan: sub.planLabel,
                status: planStatusLabel(sub).toLowerCase(),
              })
            : t("adminBillingPageUi.subDefault", { brand: BRAND_NAME })
        }
        stats={
          sub
            ? [
                {
                  label: t("adminBillingPageUi.statOpenInvoices"),
                  value: data?.invoices.openCount ?? 0,
                  hint: t("adminBillingPageUi.statTotalHint", {
                    count: data?.invoices.total ?? 0,
                  }),
                },
                {
                  label: t("adminBillingPageUi.statAmountDue"),
                  value: `$${(data?.invoices.outstandingUsd ?? 0).toLocaleString()}`,
                  hint: `${(data?.invoices.outstandingEtb ?? 0).toLocaleString()} ETB`,
                  accent: (data?.invoices.outstandingUsd ?? 0) > 0,
                },
                {
                  label: t("adminBillingPageUi.statNextDue"),
                  value: formatDate(data?.invoices.nextDueAt ?? null),
                },
                {
                  label: t("usageMetersUi.students"),
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
        loadingLabel={t("adminBillingPageUi.loadingBilling")}
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
                      {t("adminBillingPageUi.trialEnds", { date: formatDate(sub.trialEndsAt) })}
                      {sub.daysRemaining != null
                        ? t("adminBillingPageUi.daysLeft", { days: sub.daysRemaining })
                        : ""}
                    </p>
                  ) : null}
                  {data?.planPrice && sub.plan !== "TRIAL" && sub.plan !== "ENTERPRISE" ? (
                    <p className="sb-v2__plan-price">
                      ${data.planPrice.usdMonthly}/mo ·{" "}
                      <EtbAmount amount={data.planPrice.etbMonthly} maximumFractionDigits={0} />
                      /mo
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
                    {t("adminBillingPageUi.upgradePlan")}
                  </Link>
                ) : (
                  <Link href="/admin/billing/plans" className="sb-v2__btn">
                    {t("adminBillingPageUi.changePlan")}
                  </Link>
                )}
                <Link href="/admin/billing/invoices" className="sb-v2__btn">
                  {t("adminBillingPageUi.viewInvoices")}
                </Link>
              </div>
            </article>

            <article className="sb-v2__card">
              <div className="sb-v2__card-head">
                <div>
                  <h3 className="sb-v2__card-title">{t("adminBillingPageUi.seatUsageTitle")}</h3>
                  <p className="sb-v2__card-sub">
                    {t("adminBillingPageUi.seatUsageSub", { plan: sub.planLabel })}
                  </p>
                </div>
              </div>
              <UsageMeters subscription={sub} />
              <div className="sb-v2__actions" style={{ marginTop: "0.85rem" }}>
                <Link href="/admin/billing/usage" className="sb-v2__btn">
                  {t("adminBillingPageUi.usageDetails")}
                </Link>
              </div>
            </article>
            <PlatformPaymentPanel
              payout={data.payout}
              subscription={sub}
              planPrice={data.planPrice}
              openInvoices={data.openInvoices ?? []}
              paymentProofs={data.paymentProofs ?? []}
              onSubmitted={reload}
            />
          </div>
        ) : null}
      </SchoolBillingShell>
    </DashboardPage>
  );
}
