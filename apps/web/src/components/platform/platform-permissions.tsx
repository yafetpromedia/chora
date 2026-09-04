"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import type { PlatformUser } from "@/lib/platform-auth";
import {
  createPlatformOperator,
  deletePlatformOperator,
  getPlatformAccessControl,
  updatePlatformOperatorRole,
  updatePlatformRoleGrants,
  type PlatformAccessControl,
  type PlatformPermissionKey,
} from "@/lib/platform-access";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";

const ROLE_META: Record<
  PlatformUser["role"],
  { icon: "settings" | "users" | "finance"; tone: "owner" | "support" | "sales" }
> = {
  OWNER: { icon: "settings", tone: "owner" },
  SUPPORT: { icon: "users", tone: "support" },
  SALES: { icon: "finance", tone: "sales" },
};

type Props = {
  user: PlatformUser | null;
};

type Draft = {
  SUPPORT: PlatformPermissionKey[];
  SALES: PlatformPermissionKey[];
};

function sameGrants(a: PlatformPermissionKey[], b: PlatformPermissionKey[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((k) => set.has(k));
}

export function PlatformPermissions({ user }: Props) {
  const isOwner = user?.role === "OWNER";
  const [data, setData] = useState<PlatformAccessControl | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<PlatformUser["role"]>("OWNER");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newOp, setNewOp] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "SUPPORT" as PlatformUser["role"],
  });

  function applyPayload(payload: PlatformAccessControl) {
    setData(payload);
    setDraft({
      SUPPORT: [...(payload.roles.find((r) => r.id === "SUPPORT")?.grants ?? [])],
      SALES: [...(payload.roles.find((r) => r.id === "SALES")?.grants ?? [])],
    });
  }

  useEffect(() => {
    setLoading(true);
    void getPlatformAccessControl()
      .then(applyPayload)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load access control"),
      )
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    const support = data.roles.find((r) => r.id === "SUPPORT")?.grants ?? [];
    const sales = data.roles.find((r) => r.id === "SALES")?.grants ?? [];
    return (
      !sameGrants(draft.SUPPORT, support) || !sameGrants(draft.SALES, sales)
    );
  }, [data, draft]);

  const yourGrants = useMemo(() => {
    if (!user || !data) return [] as PlatformPermissionKey[];
    return (
      data.roles.find((r) => r.id === user.role)?.grants ??
      (user.permissions as PlatformPermissionKey[] | undefined) ??
      []
    );
  }, [user, data]);

  function grantsFor(roleId: PlatformUser["role"]): PlatformPermissionKey[] {
    if (roleId === "OWNER") {
      return data?.catalog.map((c) => c.key) ?? [];
    }
    return draft?.[roleId] ?? [];
  }

  function toggleGrant(roleId: "SUPPORT" | "SALES", key: PlatformPermissionKey) {
    if (!isOwner || !draft) return;
    if (key === "platform.schools.view") return;
    if (roleId === "SUPPORT" && key === "platform.support.manage") return;
    setDraft((prev) => {
      if (!prev) return prev;
      const current = prev[roleId];
      const on = current.includes(key);
      return {
        ...prev,
        [roleId]: on ? current.filter((k) => k !== key) : [...current, key],
      };
    });
  }

  async function onSave() {
    if (!draft || !isOwner) return;
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updatePlatformRoleGrants({
        SUPPORT: draft.SUPPORT,
        SALES: draft.SALES,
      });
      applyPayload(updated);
      setToast("Role permissions saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save permissions");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    if (!data) return;
    setDraft({
      SUPPORT: [...(data.roles.find((r) => r.id === "SUPPORT")?.grants ?? [])],
      SALES: [...(data.roles.find((r) => r.id === "SALES")?.grants ?? [])],
    });
  }

  async function onChangeOperatorRole(userId: string, role: PlatformUser["role"]) {
    if (!isOwner) return;
    setBusyUserId(userId);
    setError("");
    setToast(null);
    try {
      const updated = await updatePlatformOperatorRole(userId, role);
      applyPayload(updated);
      setToast("Operator role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    } finally {
      setBusyUserId(null);
    }
  }

  async function onDeleteOperator() {
    if (!isOwner || !deleteTarget) return;
    setBusyUserId(deleteTarget.id);
    setError("");
    setToast(null);
    try {
      const updated = await deletePlatformOperator(deleteTarget.id);
      applyPayload(updated);
      setToast(`${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove operator");
    } finally {
      setBusyUserId(null);
    }
  }

  async function onCreateOperator(e: FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setCreating(true);
    setError("");
    setToast(null);
    try {
      const updated = await createPlatformOperator({
        firstName: newOp.firstName.trim(),
        lastName: newOp.lastName.trim(),
        email: newOp.email.trim(),
        password: newOp.password,
        role: newOp.role,
      });
      applyPayload(updated);
      setNewOp({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "SUPPORT",
      });
      setShowCreate(false);
      setToast(`${newOp.role === "SALES" ? "Sales" : newOp.role === "SUPPORT" ? "Support" : "Owner"} operator created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create operator");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="plat-access dash-admin dash-admin--modern">
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        title={`Remove ${deleteTarget?.name ?? "operator"}?`}
        message="They will lose platform console access immediately. This does not delete any school tenants."
        confirmLabel="Remove operator"
        cancelLabel="Keep"
        busy={Boolean(deleteTarget && busyUserId === deleteTarget.id)}
        onCancel={() => {
          if (busyUserId) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => void onDeleteOperator()}
      />
      <header className="plat-access__hero">
        <div className="plat-access__hero-main">
          <span className="plat-access__hero-icon" aria-hidden>
            <DashIcon name="users" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-access__eyebrow">Access control</p>
            <h2 className="plat-access__title">Platform permissions</h2>
            <p className="plat-access__sub">
              Edit what Support and Sales can do. Owner always keeps full control.
            </p>
          </div>
        </div>
        <div className="plat-access__hero-stats">
          <div className="plat-access__stat">
            <strong>{data?.roles.length ?? "—"}</strong>
            <span>Roles</span>
          </div>
          <div className="plat-access__stat">
            <strong>{data?.catalog.length ?? "—"}</strong>
            <span>Capabilities</span>
          </div>
          <div className="plat-access__stat">
            <strong>{data?.operators.length ?? "—"}</strong>
            <span>Operators</span>
          </div>
        </div>
      </header>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      {loading ? (
        <div className="plat-access__loading" aria-busy="true">
          <span className="plat-access__spinner" aria-hidden />
          <p>Loading access control…</p>
        </div>
      ) : null}

      {!loading && user ? (
        <section className="plat-access-you">
          <div className="plat-access-you__avatar" aria-hidden>
            {user.firstName.slice(0, 1)}
            {user.lastName.slice(0, 1)}
          </div>
          <div className="plat-access-you__main">
            <p className="plat-access-you__eyebrow">Signed in as</p>
            <h3>
              {user.firstName} {user.lastName}
            </h3>
            <p>{user.email}</p>
            <div className="plat-access-you__chips">
              <span className={`plat-role-badge plat-role-badge--${user.role.toLowerCase()}`}>
                {user.role}
              </span>
              <span>
                {yourGrants.length} of {data?.catalog.length ?? 0} capabilities
              </span>
            </div>
          </div>
          {!isOwner ? (
            <p className="plat-access-you__note">
              Only owners can edit the permission matrix and operator roles.
            </p>
          ) : null}
        </section>
      ) : null}

      {!loading && data && draft ? (
        <>
          <section className="plat-access-panel">
            <div className="plat-access-panel__head">
              <div>
                <h3>Permission matrix</h3>
                <p>
                  Toggle capabilities for Support and Sales. View access stays on for every
                  operator role.
                </p>
              </div>
              {isOwner ? (
                <div className="plat-access-panel__actions">
                  <button
                    type="button"
                    className="plat-v2__btn plat-v2__btn--ghost"
                    disabled={!dirty || saving}
                    onClick={onReset}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="plat-v2__btn plat-v2__btn--primary"
                    disabled={!dirty || saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="plat-access-matrix-wrap">
              <table className="plat-access-matrix">
                <thead>
                  <tr>
                    <th>Capability</th>
                    {data.roles.map((role) => (
                      <th key={role.id}>
                        <button
                          type="button"
                          className={`plat-access-matrix__role${selectedRole === role.id ? " is-active" : ""}`}
                          onClick={() => setSelectedRole(role.id)}
                        >
                          {role.title}
                          {user?.role === role.id ? <span>You</span> : null}
                          {!role.editable ? <em>Locked</em> : null}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.catalog.map((perm) => (
                    <tr key={perm.key}>
                      <td>
                        <strong>{perm.label}</strong>
                        <span>{perm.description}</span>
                      </td>
                      {data.roles.map((role) => {
                        const on = grantsFor(role.id).includes(perm.key);
                        const editable =
                          isOwner &&
                          role.editable &&
                          perm.key !== "platform.schools.view" &&
                          !(
                            role.id === "SUPPORT" &&
                            perm.key === "platform.support.manage"
                          );
                        return (
                          <td key={role.id}>
                            {editable ? (
                              <label className="plat-access-switch">
                                <input
                                  type="checkbox"
                                  role="switch"
                                  checked={on}
                                  onChange={() =>
                                    toggleGrant(
                                      role.id as "SUPPORT" | "SALES",
                                      perm.key,
                                    )
                                  }
                                  aria-label={`${perm.label} for ${role.title}`}
                                />
                                <span aria-hidden />
                              </label>
                            ) : (
                              <span
                                className={`plat-access-pill${on ? " is-on" : ""}`}
                                aria-label={on ? "Allowed" : "Denied"}
                              >
                                {on ? "On" : "Off"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="plat-access-roles">
            {data.roles.map((role) => {
              const meta = ROLE_META[role.id];
              const grants = grantsFor(role.id);
              const isYou = user?.role === role.id;
              return (
                <article
                  key={role.id}
                  className={`plat-access-role plat-access-role--${meta.tone}${isYou ? " is-you" : ""}${selectedRole === role.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <header>
                    <span className={`plat-access-role__icon plat-access-role__icon--${meta.tone}`}>
                      <DashIcon name={meta.icon} />
                    </span>
                    <div>
                      <h4>{role.title}</h4>
                      {isYou ? <span className="plat-you-pill">Your role</span> : null}
                    </div>
                  </header>
                  <p>{role.description}</p>
                  <p className="plat-access-role__stat">
                    <strong>{grants.length}</strong> permissions granted
                  </p>
                  <ul>
                    {data.catalog.map((perm) => {
                      const on = grants.includes(perm.key);
                      return (
                        <li key={perm.key} className={on ? "is-on" : "is-off"}>
                          <span aria-hidden />
                          {perm.label}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>

          <section className="plat-access-panel">
            <div className="plat-access-panel__head">
              <div>
                <h3>Operators</h3>
                <p>Create Support or Sales accounts, then assign roles as needed.</p>
              </div>
              {isOwner ? (
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--primary"
                  onClick={() => setShowCreate((v) => !v)}
                >
                  {showCreate ? "Cancel" : "Add operator"}
                </button>
              ) : null}
            </div>

            {isOwner && showCreate ? (
              <form className="plat-access-create" onSubmit={(e) => void onCreateOperator(e)}>
                <div className="plat-access-create__grid">
                  <label>
                    <span>First name</span>
                    <input
                      value={newOp.firstName}
                      onChange={(e) => setNewOp((p) => ({ ...p, firstName: e.target.value }))}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input
                      value={newOp.lastName}
                      onChange={(e) => setNewOp((p) => ({ ...p, lastName: e.target.value }))}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={newOp.email}
                      onChange={(e) => setNewOp((p) => ({ ...p, email: e.target.value }))}
                      required
                      placeholder="support@yourorg.com"
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>Temporary password</span>
                    <input
                      type="text"
                      value={newOp.password}
                      onChange={(e) => setNewOp((p) => ({ ...p, password: e.target.value }))}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    <span>Role</span>
                    <select
                      value={newOp.role}
                      onChange={(e) =>
                        setNewOp((p) => ({
                          ...p,
                          role: e.target.value as PlatformUser["role"],
                        }))
                      }
                    >
                      <option value="SUPPORT">Support</option>
                      <option value="SALES">Sales</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  </label>
                </div>
                <div className="plat-access-create__actions">
                  <button
                    type="submit"
                    className="plat-v2__btn plat-v2__btn--primary"
                    disabled={creating}
                  >
                    {creating ? "Creating…" : "Create operator"}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="plat-access-ops">
              {data.operators.map((op) => {
                const initials = `${op.firstName.slice(0, 1)}${op.lastName.slice(0, 1)}`;
                return (
                  <div key={op.id} className="plat-access-op">
                    <div className="plat-access-op__avatar" aria-hidden>
                      {initials}
                    </div>
                    <div className="plat-access-op__main">
                      <strong>
                        {op.firstName} {op.lastName}
                      </strong>
                      <span>{op.email}</span>
                    </div>
                    {isOwner ? (
                      <div className="plat-access-op__actions">
                        <select
                          className="plat-access-op__select"
                          value={op.role}
                          disabled={busyUserId === op.id}
                          onChange={(e) =>
                            void onChangeOperatorRole(
                              op.id,
                              e.target.value as PlatformUser["role"],
                            )
                          }
                          aria-label={`Role for ${op.firstName} ${op.lastName}`}
                        >
                          <option value="OWNER">Owner</option>
                          <option value="SUPPORT">Support</option>
                          <option value="SALES">Sales</option>
                        </select>
                        {op.id !== user?.id ? (
                          <button
                            type="button"
                            className="plat-access-op__remove"
                            disabled={busyUserId === op.id}
                            onClick={() =>
                              setDeleteTarget({
                                id: op.id,
                                name: `${op.firstName} ${op.lastName}`.trim() || op.email,
                              })
                            }
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className={`plat-role-badge plat-role-badge--${op.role.toLowerCase()}`}>
                        {op.role}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="plat-info-card">
            <DashIcon name="students" className="dash-icon--sm" />
            <div>
              <h3>School-level permissions (separate)</h3>
              <p>
                Each tenant manages staff from <strong>Admin → Teachers → Permissions</strong>.
                School admins assign module access without a platform login.
              </p>
            </div>
          </section>

          {isOwner && dirty ? (
            <div className="plat-access__save-bar">
              <p>Unsaved permission changes</p>
              <div>
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--ghost"
                  disabled={saving}
                  onClick={onReset}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--primary"
                  disabled={saving}
                  onClick={() => void onSave()}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
