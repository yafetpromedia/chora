"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminDayOverview } from "@/lib/dashboard-day";
import { StaffDashboardShell, StaffKpiGrid } from "@/components/dashboard/staff-dashboard-shared";
import { loadStaffDashboardBase } from "@/components/dashboard/staff-dashboard-data";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  getStaffWorkspaceLabel,
  getStaffWorkspaceSubtitle,
  staffQuickLinks,
} from "@/lib/staff-workspace";

type Props = {
  error: string;
};

export function GenericStaffDashboard({ error }: Props) {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("CampusOne");
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
      loadingText="Loading your workspace…"
    >
      {links.length > 0 ? (
        <StaffKpiGrid label="Your tools">
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
                <p className="dash-admin-kpi__label">{link.label}</p>
                <p className="dash-admin-kpi__value">Open</p>
                <p className="dash-admin-kpi__hint">{link.description}</p>
              </div>
            </Link>
          ))}
        </StaffKpiGrid>
      ) : null}

      <section className="da-analytics" aria-label="Workspace tools">
        <div className="da-analytics__grid">
          <article className="da-card da-card--span2">
            <header className="da-card__head">
              <div>
                <h2 className="da-card__title">Your workspaces</h2>
                <p className="da-card__sub">Areas you have access to</p>
              </div>
            </header>
            {links.length === 0 ? (
              <div className="da-feed-empty">
                <p>No modules assigned to your role yet.</p>
              </div>
            ) : (
              <ul className="reg-recent">
                {links.map((link) => (
                  <li key={link.href} className="reg-recent__item">
                    <div>
                      <p className="reg-recent__name">{link.label}</p>
                      <p className="reg-recent__meta">{link.description}</p>
                    </div>
                    <Link href={link.href} className="da-card__link">
                      Open <DashIcon name="chevron" className="dash-icon--xs" />
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
