"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { StaffDashboardShell, StaffKpiGrid } from "@/components/dashboard/staff-dashboard-shared";
import { loadStaffDashboardBase } from "@/components/dashboard/staff-dashboard-data";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  getStaffWorkspaceLabel,
  getStaffWorkspaceSubtitle,
  staffQuickLinks,
} from "@/lib/staff-workspace";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  error: string;
};

export function GenericStaffDashboard({ error }: Props) {
  const { t, tn } = useLocale();
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(BRAND_NAME);
  const [adminDay, setAdminDay] = useState<AdminDayOverview | null>(null);
  const links = staffQuickLinks();

  useEffect(() => {
    const load = async () => {
      try {
        const base = await loadStaffDashboardBase();
        setSchoolName(base.schoolName);
        setAdminDay(base.adminDay);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <StaffDashboardShell
      roleLabel={getStaffWorkspaceLabel()}
      schoolName={schoolName}
      subtitle={getStaffWorkspaceSubtitle()}
      adminDay={adminDay}
      error={error}
      loading={loading}
      loadingText={t("dash.loadingWorkspace")}
    >
      {links.length > 0 ? (
        <StaffKpiGrid label={t("staffDash.yourTools")}>
          {links.slice(0, 4).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="dash-admin-kpi dash-admin-kpi--modern dash-admin-kpi--link"
            >
              <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
                <DashIcon name={link.icon} />
              </span>
              <div>
                <p className="dash-admin-kpi__label">{tn(link.label)}</p>
                <p className="dash-admin-kpi__value">{t("dash.open")}</p>
                <p className="dash-admin-kpi__hint">{link.description}</p>
              </div>
            </Link>
          ))}
        </StaffKpiGrid>
      ) : null}

      <section className="da-analytics" aria-label={t("staffDash.workspaceToolsAria")}>
        <div className="da-analytics__grid">
          <article className="da-card da-card--span2">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">{t("staffDash.yourWorkspaces")}</h2>
                <p className="da-card__sub">{t("staffDash.areasYouHaveAccess")}</p>
              </div>
            </header>
            {links.length === 0 ? (
              <div className="da-feed-empty">
                <p>{t("staffDash.noModulesAssigned")}</p>
              </div>
            ) : (
              <ul className="reg-recent">
                {links.map((link) => (
                  <li key={link.href} className="reg-recent__item">
                    <div>
                      <p className="reg-recent__name">{tn(link.label)}</p>
                      <p className="reg-recent__meta">{link.description}</p>
                    </div>
                    <Link href={link.href} className="da-card__link">
                      {t("dash.open")} <DashIcon name="chevron" className="dash-icon--xs" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </StaffDashboardShell>
  );
}