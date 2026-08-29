"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { SubscriptionStatus } from "@/lib/api";
import { redeemSchoolCoupon } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  subscription: SubscriptionStatus;
  role: "admin" | "staff" | "teacher" | "parent" | "student";
  onRedeemed?: (next: SubscriptionStatus) => void;
};

export function TrialPaywall({ subscription, role, onRedeemed }: Props) {
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
      setMessage(next.coupon?.result ?? next.message ?? "Coupon applied.");
      onRedeemed?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply coupon");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="trial-paywall" role="dialog" aria-labelledby="trial-paywall-title">
      <div className="trial-paywall__card">
        <p className="trial-paywall__eyebrow">{BRAND_NAME}</p>
        <h2 id="trial-paywall-title" className="trial-paywall__title">
          Your trial has ended
        </h2>
        <p className="trial-paywall__text">
          {isAdmin
            ? "Pay for a plan to keep using the school workspace, or enter a coupon code if you have one."
            : "This school’s trial has ended. Ask the administrator to pay for a plan or enter a coupon code."}
        </p>

        {isAdmin ? (
          <>
            <form className="trial-paywall__form" onSubmit={(e) => void onRedeem(e)}>
              <label>
                <span>Coupon code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="PILOT14"
                  autoComplete="off"
                />
              </label>
              <button type="submit" disabled={busy || !code.trim()}>
                {busy ? "Applying…" : "Apply coupon"}
              </button>
            </form>
            {error ? <p className="trial-paywall__error">{error}</p> : null}
            {message ? <p className="trial-paywall__ok">{message}</p> : null}
            {subscription.couponCode ? (
              <p className="trial-paywall__hint">Saved coupon: {subscription.couponCode}</p>
            ) : null}
            <Link href="/admin/billing/plans" className="trial-paywall__cta">
              Pay for a plan
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
