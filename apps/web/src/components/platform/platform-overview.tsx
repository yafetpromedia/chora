"use client";

import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { PlatformAnalytics } from "@/components/platform/platform-analytics";
import { BRAND_NAME } from "@/lib/brand";
import type { PlatformDashboard, PlatformSchoolRow, PlatformSection } from "./platform-types";

type Props = {
  dashboard: PlatformDashboard;
  schools: PlatformSchoolRow[];
  onNavigate: (section: PlatformSection) => void;
};

function schoolInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function planLabel(
  school: PlatformSchoolRow,
  t: (key: string) => string,
) {
  const plan = school.subscription?.plan;
  if (!plan) return t("platformUi.planNone");
  if (plan === "PROFESSIONAL") return t("platformUi.planProfessional");
  if (plan === "STARTER") return t("platformUi.planStarter");
  if (plan === "ENTERPRISE") return t("platformUi.planEnterprise");
  if (plan === "TRIAL") return t("platformUi.planTrial");
  return plan;
}

function tenantStatusLabel(status: string, t: (key: string) => string) {
  if (status === "ACTIVE") return t("platformUi.statusActive");
  if (status === "TRIAL") return t("platformUi.statusTrial");
  if (status === "SUSPENDED") return t("platformUi.statusSuspended");
  return status;
}

export function PlatformOverview({ dashboard, schools, onNavigate }: Props) {
  const { t, locale } = useLocale();
  const recent = schools.slice(0, 5);
  const totalTenants = dashboard.schools.total;
  const enrolledTotal = schools.reduce((sum, s) => sum + s.usage.students, 0);

  const todayLabel = new Date().toLocaleDateString(locale === "am" ? "am-ET" : undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="plat-v2 dash-admin dash-admin--modern">
      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="students" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{todayLabel}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.overviewTitle")}</h2>
            <p className="plat-subjects-v2__sub">
              {t("platformUi.overviewSub", { brand: BRAND_NAME })}
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{totalTenants}</strong>
            <span>{t("platformUi.statTenants")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{dashboard.schools.trial}</strong>
            <span>{t("platformUi.statTrial")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{dashboard.schools.paid}</strong>
            <span>{t("platformUi.statPaid")}</span>
          </div>
        </div>
      </header>

      <section className="dash-admin-kpis dash-admin-kpis--modern" aria-label={t("platformUi.overviewMetricsAria")}>
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
            <DashIcon name="students" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("platformUi.statTenants")}</p>
            <p className="dash-admin-kpi__value">{dashboard.schools.total}</p>
            <p className="dash-admin-kpi__hint">
              {t("platformUi.overviewTenantsHint", {
                active: dashboard.schools.active,
                suspended: dashboard.schools.suspended,
              })}
            </p>
          </div>
        </article>
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="users" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("platformUi.statStudents")}</p>
            <p className="dash-admin-kpi__value">{dashboard.users.students}</p>
            <p className="dash-admin-kpi__hint">
              {enrolledTotal > 0
                ? t("platformUi.overviewStudentsHintProfiles", { count: enrolledTotal })
                : t("platformUi.overviewStudentsHintAll")}
            </p>
          </div>
        </article>
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
            <DashIcon name="calendar" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("platformUi.overviewOnTrial")}</p>
            <p className="dash-admin-kpi__value">{dashboard.schools.trial}</p>
            <p className="dash-admin-kpi__hint">{t("platformUi.overviewTrialHint")}</p>
          </div>
        </article>
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
            <DashIcon name="finance" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">{t("platformUi.statPaid")}</p>
            <p className="dash-admin-kpi__value">{dashboard.schools.paid}</p>
            <p className="dash-admin-kpi__hint">
              {t("platformUi.overviewTeachersPlatform", { count: dashboard.users.teachers })}
            </p>
          </div>
        </article>
      </section>

      <PlatformAnalytics dashboard={dashboard} schools={schools} />

      {dashboard.alerts ? (
        <section
          className="plat-subjects-v2__kpis"
          aria-label={t("platformUi.overviewAlertsAria")}
          style={{ marginTop: "1rem" }}
        >
          <button
            type="button"
            className="plat-subjects-v2__kpi"
            onClick={() => onNavigate("invoices")}
            style={{ textAlign: "left", cursor: "pointer", border: "none" }}
          >
            <DashIcon name="fees" className="dash-icon--sm" />
            <div>
              <strong>{dashboard.alerts.pendingPaymentProofs}</strong>
              <span>{t("platformUi.overviewPendingReceipts")}</span>
            </div>
          </button>
          <button
            type="button"
            className="plat-subjects-v2__kpi"
            onClick={() => onNavigate("support")}
            style={{ textAlign: "left", cursor: "pointer", border: "none" }}
          >
            <DashIcon name="support" className="dash-icon--sm" />
            <div>
              <strong>{dashboard.alerts.openSupportTickets}</strong>
              <span>{t("platformUi.overviewOpenSupport")}</span>
            </div>
          </button>
          <button
            type="button"
            className="plat-subjects-v2__kpi"
            onClick={() => onNavigate("schools")}
            style={{ textAlign: "left", cursor: "pointer", border: "none" }}
          >
            <DashIcon name="alert" className="dash-icon--sm" />
            <div>
              <strong>{dashboard.alerts.openAttendanceConcerns}</strong>
              <span>{t("platformUi.overviewAttendanceConcerns")}</span>
            </div>
          </button>
        </section>
      ) : null}

      <article className="plat-v2__card plat-v2__card--wide">
        <header className="plat-v2__card-head">
          <div>
            <h3 className="plat-v2__card-title">{t("platformUi.overviewRecentTenants")}</h3>
            <p className="plat-v2__card-sub">{t("platformUi.overviewRecentSub")}</p>
          </div>
          <button
            type="button"
            className="plat-v2__link"
            onClick={() => onNavigate("schools")}
          >
            {t("common.viewAll")}
            <DashIcon name="chevron" className="dash-icon--xs" />
          </button>
        </header>
        {recent.length === 0 ? (
          <div className="plat-v2__empty">
            <p>{t("platformUi.overviewNoTenants")}</p>
            <button
              type="button"
              className="plat-btn plat-btn--primary plat-btn--sm"
              onClick={() => onNavigate("schools")}
            >
              {t("platformUi.overviewCreateFirst")}
            </button>
          </div>
        ) : (
          <ul className="plat-v2__schools">
            {recent.map((school) => (
              <li key={school.id} className="plat-v2__school">
                <span className="plat-v2__school-avatar" aria-hidden>
                  {schoolInitials(school.name)}
                </span>
                <div className="plat-v2__school-body">
                  <strong>{school.name}</strong>
                  <span>
                    {t("platformUi.overviewSchoolMeta", {
                      code: school.joinCode,
                      students: school.usage.students,
                      teachers: school.usage.teachers,
                    })}
                  </span>
                </div>
                <div className="plat-v2__school-badges">
                  <span className="plat-v2__plan">{planLabel(school, t)}</span>
                  <span
                    className={`plat-v2__status plat-v2__status--${school.status.toLowerCase()}`}
                  >
                    {tenantStatusLabel(school.status, t)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}