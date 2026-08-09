"use client";

import { DashIcon } from "@/components/dashboard/dash-icons";
import { PlatformAnalytics } from "@/components/platform/platform-analytics";
import type { PlatformDashboard, PlatformSchoolRow, PlatformSection } from "./platform-types";

type Props = {
  dashboard: PlatformDashboard;
  schools: PlatformSchoolRow[];
  onNavigate: (section: PlatformSection) => void;
};

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function schoolInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function planLabel(school: PlatformSchoolRow) {
  const plan = school.subscription?.plan;
  if (!plan) return "No plan";
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function PlatformOverview({ dashboard, schools, onNavigate }: Props) {
  const recent = schools.slice(0, 5);
  const totalTenants = dashboard.schools.total;
  const enrolledTotal = schools.reduce((sum, s) => sum + s.usage.students, 0);

  return (
    <div className="plat-v2 dash-admin dash-admin--modern">
      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="students" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{todayLabel()}</p>
            <h2 className="plat-subjects-v2__title">Tenant control center</h2>
            <p className="plat-subjects-v2__sub">
              Monitor every tenant on CampusOne — enrollment, trials, billing,
              and access from one console.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{totalTenants}</strong>
            <span>Tenants</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{dashboard.schools.trial}</strong>
            <span>Trial</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{dashboard.schools.paid}</strong>
            <span>Paid</span>
          </div>
        </div>
      </header>

      <section className="dash-admin-kpis dash-admin-kpis--modern" aria-label="Platform metrics">
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
            <DashIcon name="students" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Tenants</p>
            <p className="dash-admin-kpi__value">{dashboard.schools.total}</p>
            <p className="dash-admin-kpi__hint">
              {dashboard.schools.active} active · {dashboard.schools.suspended} suspended
            </p>
          </div>
        </article>
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="users" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Students</p>
            <p className="dash-admin-kpi__value">{dashboard.users.students}</p>
            <p className="dash-admin-kpi__hint">
              {enrolledTotal > 0 ? `${enrolledTotal} across tenant profiles` : "Across all tenants"}
            </p>
          </div>
        </article>
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
            <DashIcon name="calendar" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">On trial</p>
            <p className="dash-admin-kpi__value">{dashboard.schools.trial}</p>
            <p className="dash-admin-kpi__hint">Trial plan subscriptions</p>
          </div>
        </article>
        <article className="dash-admin-kpi dash-admin-kpi--modern">
          <span className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
            <DashIcon name="finance" />
          </span>
          <div>
            <p className="dash-admin-kpi__label">Paid</p>
            <p className="dash-admin-kpi__value">{dashboard.schools.paid}</p>
            <p className="dash-admin-kpi__hint">
              {dashboard.users.teachers} teachers platform-wide
            </p>
          </div>
        </article>
      </section>

      <PlatformAnalytics dashboard={dashboard} schools={schools} />

      <article className="plat-v2__card plat-v2__card--wide">
        <header className="plat-v2__card-head">
          <div>
            <h3 className="plat-v2__card-title">Recent tenants</h3>
            <p className="plat-v2__card-sub">Latest tenants on the platform</p>
          </div>
          <button
            type="button"
            className="plat-v2__link"
            onClick={() => onNavigate("schools")}
          >
            View all
            <DashIcon name="chevron" className="dash-icon--xs" />
          </button>
        </header>
        {recent.length === 0 ? (
          <div className="plat-v2__empty">
            <p>No tenants yet.</p>
            <button
              type="button"
              className="plat-btn plat-btn--primary plat-btn--sm"
              onClick={() => onNavigate("schools")}
            >
              Create first tenant
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
                    {school.joinCode} · {school.usage.students} students ·{" "}
                    {school.usage.teachers} teachers
                  </span>
                </div>
                <div className="plat-v2__school-badges">
                  <span className="plat-v2__plan">{planLabel(school)}</span>
                  <span
                    className={`plat-v2__status plat-v2__status--${school.status.toLowerCase()}`}
                  >
                    {school.status}
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
