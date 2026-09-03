"use client";

import Link from "next/link";
import type { Announcement, SubscriptionStatus } from "@/lib/api";
import { TrialBanner } from "@/components/trial-banner";
import { EtbAmount } from "@/components/billing/etb-amount";
import type { AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { AdminAnalyticsSection } from "@/components/dashboard/admin-analytics";
import { DashIcon } from "@/components/dashboard/dash-icons";

type Props = {
  schoolName: string;
  subscription: SubscriptionStatus | null;
  adminDay: AdminDayOverview | null;
  analytics: AdminAnalyticsOverview | null;
  announcements: Announcement[];
  isPrincipalView: boolean;
  canViewFinance: boolean;
  error: string;
};

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDate(iso: string) {
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

export function AdminDashboard({
  schoolName,
  subscription,
  adminDay,
  analytics,
  announcements,
  isPrincipalView,
  canViewFinance,
  error,
}: Props) {
  const att = analytics?.attendanceToday;
  const fin = analytics?.finance;
  const enroll = analytics?.enrollment;

  return (
    <div className="dash-admin dash-admin--modern">
      <header className="dash-admin-hero dash-admin-hero--modern">
        <div className="dash-admin-hero__text">
          <p className="dash-admin-hero__eyebrow">{todayLabel()}</p>
          <h1 className="dash-admin-hero__title">
            {isPrincipalView ? `${schoolName}` : schoolName}
          </h1>
          <p className="dash-admin-hero__sub">
            {isPrincipalView
              ? "Leadership overview — attendance, fees, and academics."
              : "Real-time analytics for your campus operations."}
          </p>
        </div>
        <div className="dash-admin-hero__aside">
          {adminDay?.academicYear ? (
            <div className="dash-admin-hero__chip">
              <DashIcon name="calendar" className="dash-icon--sm" />
              <span>{adminDay.academicYear.name}</span>
              {adminDay.currentTerm ? (
                <span className="dash-admin-hero__chip-term">· {adminDay.currentTerm.name}</span>
              ) : null}
            </div>
          ) : null}
          {enroll ? (
            <div className="dash-admin-hero__chip dash-admin-hero__chip--muted">
              <DashIcon name="students" className="dash-icon--sm" />
              <span>{enroll.students} students enrolled</span>
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <section className="auth-alert auth-alert--error dash-alert" role="alert">
          {error}
        </section>
      ) : null}

      {subscription && !isPrincipalView ? <TrialBanner subscription={subscription} /> : null}

      {analytics ? (
        <section className="dash-admin-kpis dash-admin-kpis--modern" aria-label="Key metrics">
          <article className="dash-admin-kpi dash-admin-kpi--modern">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
              <DashIcon name="attendance" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">Attendance today</p>
              <p className="dash-admin-kpi__value">
                {att?.rate != null ? `${att.rate}%` : "—"}
              </p>
              <p className="dash-admin-kpi__hint">
                {att?.marked ?? 0} marked · {att?.absent ?? 0} absent
              </p>
            </div>
          </article>

          {canViewFinance && fin ? (
            <Link href="/admin/finance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
                <DashIcon name="finance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Collected</p>
                <p className="dash-admin-kpi__value"><EtbAmount cents={fin.collectedCents} symbolSize={18} /></p>
                <p className="dash-admin-kpi__hint">{fin.collectionRate}% of billed fees</p>
              </div>
            </Link>
          ) : (
            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
                <DashIcon name="announcements" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">Announcements</p>
                <p className="dash-admin-kpi__value">{announcements.length}</p>
                <p className="dash-admin-kpi__hint">Campus updates</p>
              </div>
            </article>
          )}

          <Link href="/admin/teachers" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
              <DashIcon name="teachers" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">Teachers</p>
              <p className="dash-admin-kpi__value">{enroll?.teachers ?? "—"}</p>
              <p className="dash-admin-kpi__hint">
                {adminDay?.staff.classesActive ?? 0} classes active
              </p>
            </div>
          </Link>

          <Link href="/admin/parents" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
              <DashIcon name="users" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">Families</p>
              <p className="dash-admin-kpi__value">{enroll?.parents ?? "—"}</p>
              <p className="dash-admin-kpi__hint">
                {enroll?.portalTotal ?? 0} portal accounts
              </p>
            </div>
          </Link>
        </section>
      ) : null}

      {analytics ? (
        <AdminAnalyticsSection analytics={analytics} canViewFinance={canViewFinance} />
      ) : null}

      <article className="da-card da-card--feed">
        <header className="da-card__head">
          <div>
            <h2 className="da-card__title">Announcements</h2>
            <p className="da-card__sub">Latest campus updates</p>
          </div>
          <Link href="/admin/announcements" className="da-card__link">
            Manage <DashIcon name="chevron" className="dash-icon--xs" />
          </Link>
        </header>
        {announcements.length === 0 ? (
          <div className="da-feed-empty">
            <p>No announcements yet.</p>
            {!isPrincipalView ? (
              <Link href="/admin/announcements" className="att-btn att-btn--primary">
                Post announcement
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="dash-admin-feed">
            {announcements.slice(0, 4).map((item) => (
              <li key={item.id} className="dash-admin-feed__item">
                <div>
                  <p className="dash-admin-feed__title">{item.title}</p>
                  <p className="dash-admin-feed__meta">{formatDate(item.createdAt)}</p>
                </div>
                {item.body ? (
                  <p className="dash-admin-feed__body">
                    {item.body.slice(0, 140)}
                    {item.body.length > 140 ? "…" : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
