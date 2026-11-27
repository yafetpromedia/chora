"use client";

import Link from "next/link";
import type { Announcement, SubscriptionStatus } from "@/lib/api";
import { TrialBanner } from "@/components/trial-banner";
import { EtbAmount } from "@/components/billing/etb-amount";
import type { AdminAnalyticsOverview } from "@/lib/dashboard-analytics";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { AdminAnalyticsSection } from "@/components/dashboard/admin-analytics";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n";

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

function localeTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function todayLabel(locale: AppLocale) {
  return new Date().toLocaleDateString(localeTag(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDate(iso: string, locale: AppLocale) {
  try {
    return new Date(iso).toLocaleDateString(localeTag(locale), {
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
  const { t, locale } = useLocale();
  const att = analytics?.attendanceToday;
  const staffAtt = analytics?.staffAttendanceToday;
  const fin = analytics?.finance;
  const enroll = analytics?.enrollment;

  return (
    <div className="dash-admin dash-admin--modern">
      <header className="dash-admin-hero dash-admin-hero--modern">
        <div className="dash-admin-hero__text">
          <p className="dash-admin-hero__eyebrow">{todayLabel(locale)}</p>
          <h1 className="dash-admin-hero__title">
            {isPrincipalView ? `${schoolName}` : schoolName}
          </h1>
          <p className="dash-admin-hero__sub">
            {isPrincipalView ? t("adminDash.leadershipSub") : t("adminDash.realtimeSub")}
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
              <span>{t("adminDash.studentsEnrolled", { count: enroll.students })}</span>
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
        <section className="dash-admin-kpis dash-admin-kpis--modern" aria-label={t("adminDash.keyMetrics")}>
          <article className="dash-admin-kpi dash-admin-kpi--modern">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
              <DashIcon name="attendance" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">{t("adminDash.attendanceToday")}</p>
              <p className="dash-admin-kpi__value">
                {att?.rate != null ? `${att.rate}%` : "—"}
              </p>
              <p className="dash-admin-kpi__hint">
                {t("adminDash.markedAbsent", {
                  marked: att?.marked ?? 0,
                  absent: att?.absent ?? 0,
                })}
              </p>
            </div>
          </article>

          <Link
            href="/admin/staff-attendance"
            className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link"
          >
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
              <DashIcon name="users" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">{t("adminDash.staffAttendance")}</p>
              <p className="dash-admin-kpi__value">
                {staffAtt
                  ? `${staffAtt.present + staffAtt.late}`
                  : "—"}
              </p>
              <p className="dash-admin-kpi__hint">
                {staffAtt
                  ? t("adminDash.staffMarked", {
                      marked: staffAtt.marked,
                      total: staffAtt.totalStaff,
                      late: staffAtt.late,
                    })
                  : t("adminDash.teachersStaff")}
              </p>
            </div>
          </Link>

          {canViewFinance && fin ? (
            <Link href="/admin/finance" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
                <DashIcon name="finance" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("adminDash.collected")}</p>
                <p className="dash-admin-kpi__value"><EtbAmount cents={fin.collectedCents} symbolSize={18} /></p>
                <p className="dash-admin-kpi__hint">
                  {t("adminDash.ofBilled", { rate: fin.collectionRate })}
                </p>
              </div>
            </Link>
          ) : (
            <article className="dash-admin-kpi dash-admin-kpi--modern">
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
                <DashIcon name="announcements" />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{t("adminDash.announcements")}</p>
                <p className="dash-admin-kpi__value">{announcements.length}</p>
                <p className="dash-admin-kpi__hint">{t("adminDash.campusUpdates")}</p>
              </div>
            </article>
          )}

          <Link href="/admin/teachers" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
              <DashIcon name="teachers" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">{t("adminDash.teachers")}</p>
              <p className="dash-admin-kpi__value">{enroll?.teachers ?? "—"}</p>
              <p className="dash-admin-kpi__hint">
                {t("adminDash.classesActive", { count: adminDay?.staff.classesActive ?? 0 })}
              </p>
            </div>
          </Link>

          <Link href="/admin/parents" className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link">
            <span className="dash-admin-kpi__icon dash-admin-kpi__icon--slate">
              <DashIcon name="users" />
            </span>
            <div>
              <p className="dash-admin-kpi__label">{t("adminDash.families")}</p>
              <p className="dash-admin-kpi__value">{enroll?.parents ?? "—"}</p>
              <p className="dash-admin-kpi__hint">
                {t("adminDash.portalAccounts", { count: enroll?.portalTotal ?? 0 })}
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
            <h2 className="da-card__title">{t("adminDash.announcements")}</h2>
            <p className="da-card__sub">{t("adminDash.latestUpdates")}</p>
          </div>
          <Link href="/admin/announcements" className="da-card__link">
            {t("adminDash.manage")} <DashIcon name="chevron" className="dash-icon--xs" />
          </Link>
        </header>
        {announcements.length === 0 ? (
          <div className="da-feed-empty">
            <p>{t("adminDash.noAnnouncements")}</p>
            {!isPrincipalView ? (
              <Link href="/admin/announcements" className="att-btn att-btn--primary">
                {t("adminDash.postAnnouncement")}
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="dash-admin-feed">
            {announcements.slice(0, 4).map((item) => (
              <li key={item.id} className="dash-admin-feed__item">
                <div>
                  <p className="dash-admin-feed__title">{item.title}</p>
                  <p className="dash-admin-feed__meta">{formatDate(item.createdAt, locale)}</p>
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
