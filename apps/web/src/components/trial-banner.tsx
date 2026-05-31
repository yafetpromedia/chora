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
  const daysLeft = subscription.daysRemaining ?? 0;
  const trialDays = 14;
  const timeUsedPct = Math.min(
    100,
    Math.max(0, Math.round(((trialDays - daysLeft) / trialDays) * 100)),
  );
  const urgency =
    daysLeft <= 3 ? "critical" : daysLeft <= 7 ? "urgent" : "normal";

  if (expired) {
    return (
      <section className="trial-banner trial-banner--expired" role="alert">
        <div className="trial-banner-body">
          <h2 className="trial-banner-title">Your CampusOne trial has ended</h2>
          <p className="trial-banner-text">
            Upgrade to continue managing attendance, results, and announcements for your school.
          </p>
        </div>
        <Link href="/admin/billing/plans" className="trial-banner-cta">
          Upgrade plan
        </Link>
      </section>
    );
  }

  return (
    <section
      className={`trial-banner trial-banner--countdown trial-banner--${urgency}`}
      aria-label="Trial countdown"
    >
      <div className="trial-banner-countdown" aria-hidden>
        <span className="trial-banner-countdown__n">{daysLeft}</span>
        <span className="trial-banner-countdown__unit">
          day{daysLeft === 1 ? "" : "s"}
          <br />
          left
        </span>
      </div>
      <div className="trial-banner-body">
        <p className="trial-banner-eyebrow">
          {urgency === "critical"
            ? "Trial ending soon"
            : urgency === "urgent"
              ? "Free trial · time running out"
              : "Free trial active"}
        </p>
        <h2 className="trial-banner-title">
          {daysLeft} day{daysLeft === 1 ? "" : "s"} remaining on CampusOne
        </h2>
        <p className="trial-banner-text">
          {subscription.usage.students} / {studentLimit} students ·{" "}
          {subscription.usage.teachers} / {teacherLimit} teachers · Upgrade before your trial
          ends
        </p>
        <div
          className="trial-banner-meter"
          role="progressbar"
          aria-valuenow={timeUsedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${timeUsedPct}% of trial period used`}
        >
          <span className="trial-banner-meter-fill" style={{ width: `${timeUsedPct}%` }} />
        </div>
      </div>
      <Link href="/admin/billing/plans" className="trial-banner-cta">
        Upgrade plan
      </Link>
    </section>
  );
}
