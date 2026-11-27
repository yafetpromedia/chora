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
import { useLocale } from "@/components/i18n/locale-provider";

function seatPct(used: number, limit: number | null) {
  if (limit == null || limit <= 0) return null;
  return Math.round(Math.min(100, (used / limit) * 100));
}

export default function SchoolUsagePage() {
  const router = useRouter();
  const { t, tp } = useLocale();
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
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("adminBillingPageUi.loadUsageFailed")),
      )
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
    <DashboardPage role="admin" title={tp("Usage")}>
      <SchoolBillingShell
        title={t("adminBillingPageUi.titleUsage")}
        subtitle={
          subscription
            ? t("adminBillingPageUi.subUsage", { plan: subscription.planLabel })
            : t("adminBillingPageUi.subUsageDefault")
        }
        stats={
          subscription
            ? [
                {
                  label: t("usageMetersUi.students"),
                  value: `${subscription.usage.students}${subscription.limits.students != null ? ` / ${subscription.limits.students}` : ""}`,
                  hint:
                    seatPct(subscription.usage.students, subscription.limits.students) != null
                      ? t("adminBillingPageUi.percentUsed", {
                          pct: seatPct(subscription.usage.students, subscription.limits.students)!,
                        })
                      : t("adminBillingPageUi.unlimited"),
                },
                {
                  label: t("usageMetersUi.teachers"),
                  value: `${subscription.usage.teachers}${subscription.limits.teachers != null ? ` / ${subscription.limits.teachers}` : ""}`,
                },
                {
                  label: t("usageMetersUi.admins"),
                  value: `${subscription.usage.admins}${subscription.limits.admins != null ? ` / ${subscription.limits.admins}` : ""}`,
                },
                {
                  label: t("adminBillingPageUi.statPlan"),
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
        loadingLabel={t("adminBillingPageUi.loadingUsage")}
      >
        {anyOver ? (
          <p className="sb-v2__warn-banner" role="alert">
            {t("adminBillingPageUi.overLimitWarn")}
          </p>
        ) : null}

        {subscription ? (
          <article className="sb-v2__card">
            <div className="sb-v2__card-head">
              <div>
                <h3 className="sb-v2__card-title">{t("adminBillingPageUi.capacityTitle")}</h3>
                <p className="sb-v2__card-sub">{t("adminBillingPageUi.capacitySub")}</p>
              </div>
            </div>
            <UsageMeters subscription={subscription} />
            <div className="sb-v2__actions" style={{ marginTop: "1rem" }}>
              <Link href="/admin/billing/plans" className="sb-v2__btn sb-v2__btn--primary">
                {t("adminBillingPageUi.viewPlansUpgrade")}
              </Link>
              <Link href="/admin/students" className="sb-v2__btn">
                {t("adminBillingPageUi.manageStudents")}
              </Link>
              <Link href="/admin/teachers" className="sb-v2__btn">
                {t("adminBillingPageUi.manageTeachers")}
              </Link>
            </div>
          </article>
        ) : null}
      </SchoolBillingShell>
    </DashboardPage>
  );
}
