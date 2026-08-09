"use client";

import { DashIcon } from "@/components/dashboard/dash-icons";
import type { PlatformUser } from "@/lib/platform-auth";

const PERMISSIONS = [
  {
    key: "platform.schools.view",
    label: "View schools & dashboard",
    desc: "Read tenant list, usage, and platform KPIs",
  },
  {
    key: "platform.schools.create",
    label: "Create tenant schools",
    desc: "Onboard new schools with admin accounts",
  },
  {
    key: "platform.schools.suspend",
    label: "Suspend / activate schools",
    desc: "Control tenant access immediately",
  },
  {
    key: "platform.schools.delete",
    label: "Delete tenants",
    desc: "Permanently remove tenant workspaces and data",
    desc: "Reserved for future lifecycle (not exposed in UI)",
  },
] as const;

const ROLES: {
  id: PlatformUser["role"] | "SALES";
  title: string;
  description: string;
  icon: "settings" | "users" | "finance" | "students";
  tone: "owner" | "support" | "sales";
  grants: (typeof PERMISSIONS)[number]["key"][];
}[] = [
  {
    id: "OWNER",
    title: "Owner",
    description: "Full platform control — billing, tenants, and policy.",
    icon: "settings",
    tone: "owner",
    grants: PERMISSIONS.map((p) => p.key),
  },
  {
    id: "SUPPORT",
    title: "Support",
    description: "Day-to-day school assistance; view and suspend access.",
    icon: "users",
    tone: "support",
    grants: ["platform.schools.view", "platform.schools.suspend"],
  },
  {
    id: "SALES",
    title: "Sales",
    description: "Onboard new schools and monitor the tenant pipeline.",
    icon: "finance",
    tone: "sales",
    grants: ["platform.schools.view", "platform.schools.create"],
  },
];

type Props = {
  user: PlatformUser | null;
};

export function PlatformPermissions({ user }: Props) {
  const yourGrants = ROLES.find((r) => r.id === user?.role)?.grants ?? [];

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-permissions">
      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="settings" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Access control</p>
            <h2 className="plat-subjects-v2__title">Platform permissions</h2>
            <p className="plat-subjects-v2__sub">
              Roles define what operators can do in this console. Enforcement is
              on the API for every request.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{ROLES.length}</strong>
            <span>Roles</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{PERMISSIONS.length}</strong>
            <span>Capabilities</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{yourGrants.length}</strong>
            <span>Your grants</span>
          </div>
        </div>
      </header>

      {user ? (
        <section className="plat-access-summary">
          <div className="plat-access-summary__avatar" aria-hidden>
            {user.firstName.slice(0, 1)}
            {user.lastName.slice(0, 1)}
          </div>
          <div className="plat-access-summary__main">
            <p className="plat-access-summary__eyebrow">Your access</p>
            <h3 className="plat-access-summary__name">
              {user.firstName} {user.lastName}
            </h3>
            <p className="plat-access-summary__email">{user.email}</p>
            <div className="plat-access-summary__chips">
              <span className={`plat-role-badge plat-role-badge--${user.role.toLowerCase()}`}>
                {user.role}
              </span>
              <span className="plat-access-summary__count">
                {yourGrants.length} of {PERMISSIONS.length} capabilities
              </span>
            </div>
          </div>
          <ul className="plat-access-summary__perms">
            {PERMISSIONS.map((p) => {
              const on = yourGrants.includes(p.key);
              return (
                <li key={p.key} className={on ? "plat-access-summary__perm--on" : ""}>
                  <DashIcon
                    name={on ? "attendance" : "alert"}
                    className={`dash-icon--xs${on ? "" : " plat-access-summary__perm-off"}`}
                  />
                  {p.label}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="plat-panel">
        <h3 className="plat-panel__title">Permission matrix</h3>
        <p className="plat-panel__hint plat-panel__hint--below">
          Quick reference for support and sales teams.
        </p>
        <div className="plat-matrix-wrap">
          <table className="plat-matrix">
            <thead>
              <tr>
                <th>Capability</th>
                {ROLES.map((r) => (
                  <th key={r.id}>
                    {r.title}
                    {user?.role === r.id ? <span className="plat-matrix-you">You</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm) => (
                <tr key={perm.key}>
                  <td>
                    <strong>{perm.label}</strong>
                    <span className="plat-matrix-desc">{perm.desc}</span>
                  </td>
                  {ROLES.map((role) => {
                    const on = role.grants.includes(perm.key);
                    return (
                      <td key={role.id} className="plat-matrix-cell">
                        <span
                          className={`plat-matrix-check${on ? " plat-matrix-check--on" : ""}`}
                          aria-label={on ? "Allowed" : "Denied"}
                        >
                          {on ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="plat-role-grid plat-role-grid--modern">
        {ROLES.map((role) => {
          const isYou = user?.role === role.id;
          return (
            <article
              key={role.id}
              className={`plat-role-card-v2 plat-role-card-v2--${role.tone}${isYou ? " plat-role-card-v2--you" : ""}`}
            >
              <header className="plat-role-card-v2__head">
                <span className={`plat-role-card-v2__icon plat-role-card-v2__icon--${role.tone}`}>
                  <DashIcon name={role.icon} />
                </span>
                <div>
                  <h4>{role.title}</h4>
                  {isYou ? <span className="plat-you-pill">Your role</span> : null}
                </div>
              </header>
              <p className="plat-role-card-v2__desc">{role.description}</p>
              <p className="plat-role-card-v2__stat">
                <strong>{role.grants.length}</strong> permissions granted
              </p>
              <ul className="plat-perm-list plat-perm-list--compact">
                {PERMISSIONS.map((perm) => {
                  const on = role.grants.includes(perm.key);
                  return (
                    <li
                      key={perm.key}
                      className={on ? "plat-perm-list__on" : "plat-perm-list__off"}
                    >
                      <span className="plat-perm-dot" aria-hidden />
                      {perm.label}
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      <section className="plat-info-card">
        <DashIcon name="students" className="dash-icon--sm" />
        <div>
          <h3>School-level permissions (separate)</h3>
          <p>
            Each tenant manages staff from <strong>Admin → Teachers → Permissions</strong>.
            School admins assign module access (students, finance, results) without a platform
            login. A school admin cannot edit their own permissions — only other staff.
          </p>
        </div>
      </section>
    </div>
  );
}
