"use client";

import Link from "next/link";
import type { SubscriptionStatus } from "@/lib/api";

type TrialBannerProps = {
  subscription: SubscriptionStatus;
};

export function TrialBanner({ subscription }: TrialBannerProps) {
  const isTrial = subscription.plan === "TRIAL";
  const expired = subscription.expired || !subscription.isActive;

  if (!isTrial && !expired) {
    return null;
  }

  const studentLimit = subscription.limits.students ?? 50;
  const teacherLimit = subscription.limits.teachers ?? 10;
  const studentPct = Math.min(
    100,
    Math.round((subscription.usage.students / studentLimit) * 100),
  );

  if (expired) {
    return (
      <section className="trial-banner trial-banner--expired" role="alert">
        <div className="trial-banner-body">
          <h2 className="trial-banner-title">Your CampusOne trial has ended</h2>
          <p className="trial-banner-text">
            Upgrade to continue managing attendance, results, and announcements for your school.
          </p>
        </div>
        <Link href="/admin/upgrade" className="trial-banner-cta">
          Upgrade plan
        </Link>
      </section>
    );
  }

  return (
    <section className="trial-banner" aria-label="Trial status">
      <div className="trial-banner-body">
        <p className="trial-banner-eyebrow">CampusOne trial</p>
        <h2 className="trial-banner-title">
          {subscription.daysRemaining ?? 0} day
          {(subscription.daysRemaining ?? 0) === 1 ? "" : "s"} remaining
        </h2>
        <p className="trial-banner-text">
          {subscription.usage.students} / {studentLimit} students ·{" "}
          {subscription.usage.teachers} / {teacherLimit} teachers · No credit card required
        </p>
        <div className="trial-banner-meter" aria-hidden>
          <span className="trial-banner-meter-fill" style={{ width: `${studentPct}%` }} />
        </div>
      </div>
      <Link href="/admin/upgrade" className="trial-banner-cta trial-banner-cta--outline">
        Upgrade plan
      </Link>
    </section>
  );
}
