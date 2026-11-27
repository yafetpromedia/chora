"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { SubscriptionStatus } from "@/lib/api";
import { redeemSchoolCoupon } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  subscription: SubscriptionStatus;
  role: "admin" | "staff" | "teacher" | "parent" | "student";
  onRedeemed?: (next: SubscriptionStatus) => void;
};

export function TrialPaywall({ subscription, role, onRedeemed }: Props) {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isAdmin = role === "admin";

  async function onRedeem(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await redeemSchoolCoupon(code.trim());
      setMessage(next.coupon?.result ?? next.message ?? t("trialPaywall.couponApplied"));
      onRedeemed?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("trialPaywall.applyFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="trial-paywall" role="dialog" aria-labelledby="trial-paywall-title">
      <div className="trial-paywall__card">
        <p className="trial-paywall__eyebrow">{BRAND_NAME}</p>
        <h2 id="trial-paywall-title" className="trial-paywall__title">
          {t("trialPaywall.title")}
        </h2>
        <p className="trial-paywall__text">
          {isAdmin ? t("trialPaywall.bodyAdmin") : t("trialPaywall.bodyOther")}
        </p>

        {isAdmin ? (
          <>
            <form className="trial-paywall__form" onSubmit={(e) => void onRedeem(e)}>
              <label>
                <span>{t("trialPaywall.couponCode")}</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="PILOT14"
                  autoComplete="off"
                />
              </label>
              <button type="submit" disabled={busy || !code.trim()}>
                {busy ? t("trialPaywall.applying") : t("trialPaywall.applyCoupon")}
              </button>
            </form>
            {error ? <p className="trial-paywall__error">{error}</p> : null}
            {message ? <p className="trial-paywall__ok">{message}</p> : null}
            {subscription.couponCode ? (
              <p className="trial-paywall__hint">
                {t("trialPaywall.savedCoupon", { code: subscription.couponCode })}
              </p>
            ) : null}
            <Link href="/admin/billing/plans" className="trial-paywall__cta">
              {t("trialPaywall.payForPlan")}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
