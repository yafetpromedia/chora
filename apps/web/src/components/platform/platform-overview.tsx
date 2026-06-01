"use client";

import { DashIcon } from "@/components/dashboard/dash-icons";
import type { PlatformDashboard, PlatformSchoolRow, PlatformSection } from "./platform-types";

type Props = {
  dashboard: PlatformDashboard;
  schools: PlatformSchoolRow[];
  onNavigate: (section: PlatformSection) => void;
};

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

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function PlatformOverview({ dashboard, schools, onNavigate }: Props) {
  const recent = schools.slice(0, 5);

  return (
    <div className="dash-admin plat-admin">
      <header className="dash-admin-hero plat-hero">
        <div className="dash-admin-hero__text">
          <p className="dash-admin-hero__eyebrow">{todayLabel()}</p>
          <h2 className="dash-admin-hero__title">Tenant control center</h2>
          <p className="dash-admin-hero__sub">
            Monitor every school on CampusOne — enrollment, trials, billing, and access
            from one console.
          </p>
        </div>
        <div className="plat-hero-actions">
          <button
            type="button"
            className="plat-btn plat-btn--primary"
            onClick={() => onNavigate("schools")}
          >
            <DashIcon name="plus" className="dash-icon--sm" />
            Manage schools
          </button>
          <button
            type="button"
            className="plat-btn plat-btn--ghost"
            onClick={() => onNavigate("billing")}
          >
            View billing
          </button>
        </div>
      </header>

      <div className="dash-admin-kpis plat-kpis">
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--teal">
            <DashIcon name="students" />
          </div>
          <p className="dash-admin-kpi__label">Schools</p>
          <p className="dash-admin-kpi__value">{dashboard.schools.total}</p>
          <p className="dash-admin-kpi__hint">
            {dashboard.schools.active} active · {dashboard.schools.suspended} suspended
          </p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--blue">
            <DashIcon name="users" />
          </div>
          <p className="dash-admin-kpi__label">Students</p>
          <p className="dash-admin-kpi__value">{dashboard.users.students}</p>
          <p className="dash-admin-kpi__hint">Across all tenants</p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--amber">
            <DashIcon name="calendar" />
          </div>
          <p className="dash-admin-kpi__label">On trial</p>
          <p className="dash-admin-kpi__value">{dashboard.schools.trial}</p>
          <p className="dash-admin-kpi__hint">Trial plan subscriptions</p>
        </article>
        <article className="dash-admin-kpi">
          <div className="dash-admin-kpi__icon dash-admin-kpi__icon--green">
            <DashIcon name="finance" />
          </div>
          <p className="dash-admin-kpi__label">Paid</p>
          <p className="dash-admin-kpi__value">{dashboard.schools.paid}</p>
          <p className="dash-admin-kpi__hint">
            {dashboard.users.teachers} teachers platform-wide
          </p>
        </article>
      </div>

      <div className="plat-bento">
        <section className="plat-panel">
          <div className="plat-panel__head">
            <h3 className="plat-panel__title">Quick actions</h3>
          </div>
          <div className="dash-admin-quick plat-quick">
            <button
              type="button"
              className="dash-admin-quick__card"
              onClick={() => onNavigate("schools")}
            >
              <DashIcon name="students" className="dash-admin-quick__icon" />
              <span className="dash-admin-quick__label">Schools</span>
              <span className="dash-admin-quick__desc">Suspend, activate, inspect</span>
            </button>
            <button
              type="button"
              className="dash-admin-quick__card"
              onClick={() => onNavigate("billing")}
            >
              <DashIcon name="finance" className="dash-admin-quick__icon" />
              <span className="dash-admin-quick__label">Billing</span>
              <span className="dash-admin-quick__desc">MRR & subscriptions</span>
            </button>
            <button
              type="button"
              className="dash-admin-quick__card"
              onClick={() => onNavigate("invoices")}
            >
              <DashIcon name="fees" className="dash-admin-quick__icon" />
              <span className="dash-admin-quick__label">Invoices</span>
              <span className="dash-admin-quick__desc">Issue & track payments</span>
            </button>
            <button
              type="button"
              className="dash-admin-quick__card"
              onClick={() => onNavigate("usage")}
            >
              <DashIcon name="students" className="dash-admin-quick__icon" />
              <span className="dash-admin-quick__label">Usage</span>
              <span className="dash-admin-quick__desc">Limits per school</span>
            </button>
            <button
              type="button"
              className="dash-admin-quick__card"
              onClick={() => onNavigate("permissions")}
            >
              <DashIcon name="users" className="dash-admin-quick__icon" />
              <span className="dash-admin-quick__label">Permissions</span>
              <span className="dash-admin-quick__desc">Owner, support, sales</span>
            </button>
            <button
              type="button"
              className="dash-admin-quick__card"
              onClick={() => onNavigate("profile")}
            >
              <DashIcon name="profile" className="dash-admin-quick__icon" />
              <span className="dash-admin-quick__label">Profile</span>
              <span className="dash-admin-quick__desc">Your operator account</span>
            </button>
            <button
              type="button"
              className="dash-admin-quick__card"
              onClick={() => onNavigate("settings")}
            >
              <DashIcon name="settings" className="dash-admin-quick__icon" />
              <span className="dash-admin-quick__label">Settings</span>
              <span className="dash-admin-quick__desc">Links & operations</span>
            </button>
          </div>
        </section>

        <section className="plat-panel">
          <div className="plat-panel__head">
            <h3 className="plat-panel__title">Recent schools</h3>
            <button
              type="button"
              className="plat-link-btn"
              onClick={() => onNavigate("schools")}
            >
              View all
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="plat-empty">No schools yet. Create your first tenant.</p>
          ) : (
            <ul className="plat-recent-list">
              {recent.map((s) => (
                <li key={s.id} className="plat-recent-item">
                  <div>
                    <strong>{s.name}</strong>
                    <span className="plat-recent-meta">
                      {s.joinCode} · {s.usage.students} students
                    </span>
                  </div>
                  <span className={`plat-status plat-status--${s.status.toLowerCase()}`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="plat-panel plat-panel--muted">
        <h3 className="plat-panel__title">Platform snapshot</h3>
        <dl className="plat-snapshot">
          <div>
            <dt>Teachers (all schools)</dt>
            <dd>{dashboard.users.teachers}</dd>
          </div>
          <div>
            <dt>Suspended tenants</dt>
            <dd>{dashboard.schools.suspended}</dd>
          </div>
          <div>
            <dt>Latest enrollment</dt>
            <dd>
              {schools[0] ? `${schools[0].name} · ${formatDate(schools[0].createdAt)}` : "—"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
