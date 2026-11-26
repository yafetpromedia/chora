"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";
import type { PlatformUser } from "@/lib/platform-auth";
import {
  createPlatformOperator,
  deletePlatformOperator,
  getPlatformAccessAudit,
  getPlatformAccessControl,
  invitePlatformOperator,
  resendPlatformOperatorInvite,
  setPlatformOperatorActive,
  updatePlatformOperatorRole,
  updatePlatformRoleGrants,
  type PlatformAccessControl,
  type PlatformAuditLog,
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

const AUDIT_ACTION_KEYS: Record<string, string> = {
  OPERATOR_CREATED: "platformUi.permOperatorCreated",
  OPERATOR_INVITED: "platformUi.permOperatorInvited",
  OPERATOR_INVITE_RESENT: "platformUi.permInviteResent",
  OPERATOR_INVITE_ACCEPTED: "platformUi.permAcceptedInvite",
  OPERATOR_ROLE_CHANGED: "platformUi.permChangedRole",
  OPERATOR_DEACTIVATED: "platformUi.permOperatorDeactivated",
  OPERATOR_ACTIVATED: "platformUi.permOperatorReactivated",
  OPERATOR_DELETED: "platformUi.permOperatorRemoved",
  ROLE_GRANTS_UPDATED: "platformUi.permUpdatedGrants",
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

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function PlatformPermissions({ user }: Props) {
  const { t } = useLocale();
  const AUDIT_LABELS: Record<string, string> = Object.fromEntries(
    Object.entries(AUDIT_ACTION_KEYS).map(([k, key]) => [k, t(key)]),
  );
  const isOwner = user?.role === "OWNER";
  const [data, setData] = useState<PlatformAccessControl | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [audit, setAudit] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<PlatformUser["role"]>("OWNER");
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"invite" | "password">("invite");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
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

  async function refreshAudit() {
    if (!isOwner) return;
    try {
      setAudit(await getPlatformAccessAudit(40));
    } catch {
      /* non-blocking */
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void getPlatformAccessControl()
        .then(async (payload) => {
          applyPayload(payload);
          if (user?.role === "OWNER") {
            try {
              setAudit(await getPlatformAccessAudit(40));
            } catch {
              /* ignore */
            }
          }
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : t("platformUi.permErrLoad")),
        )
        .finally(() => setLoading(false));
    });
  }, [user?.role]);

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
      await refreshAudit();
      setToast(t("platformUi.permRoleSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.permErrSave"));
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
      await refreshAudit();
      setToast(t("platformUi.permRoleUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.permErrRole"));
    } finally {
      setBusyUserId(null);
    }
  }

  async function onToggleActive(userId: string, nextActive: boolean, name: string) {
    if (!isOwner) return;
    setBusyUserId(userId);
    setError("");
    setToast(null);
    try {
      const updated = await setPlatformOperatorActive(userId, nextActive);
      applyPayload(updated);
      await refreshAudit();
      setToast(nextActive ? `${name} reactivated.` : `${name} deactivated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.permErrStatus"));
    } finally {
      setBusyUserId(null);
    }
  }

  async function onResendInvite(userId: string, name: string) {
    if (!isOwner) return;
    setBusyUserId(userId);
    setError("");
    setToast(null);
    try {
      const result = await resendPlatformOperatorInvite(userId);
      applyPayload(result);
      setInviteUrl(result.inviteUrl);
      await refreshAudit();
      setToast(
        result.emailSent
          ? `Invite resent to ${name}.`
          : `Invite link ready for ${name} (email not sent — copy the link).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.permErrResend"));
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
      await refreshAudit();
      setToast(`${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.permErrRemove"));
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
    setInviteUrl(null);
    try {
      const roleLabel =
        newOp.role === "SALES"
          ? t("platformUi.permRoleSales")
          : newOp.role === "SUPPORT"
            ? t("platformUi.permRoleSupport")
            : t("platformUi.permRoleOwner");

      if (createMode === "invite") {
        const result = await invitePlatformOperator({
          firstName: newOp.firstName.trim(),
          lastName: newOp.lastName.trim(),
          email: newOp.email.trim(),
          role: newOp.role,
        });
        applyPayload(result);
        setInviteUrl(result.inviteUrl);
        await refreshAudit();
        setToast(
          result.emailSent
            ? `${roleLabel} invite emailed.`
            : `${roleLabel} invite created — copy the link below (email not configured).`,
        );
      } else {
        const updated = await createPlatformOperator({
          firstName: newOp.firstName.trim(),
          lastName: newOp.lastName.trim(),
          email: newOp.email.trim(),
          password: newOp.password,
          role: newOp.role,
        });
        applyPayload(updated);
        await refreshAudit();
        setToast(`${roleLabel} operator created.`);
      }

      setNewOp({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "SUPPORT",
      });
      if (createMode === "password") setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.permErrCreate"));
    } finally {
      setCreating(false);
    }
  }

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setToast(t("platformUi.permInviteCopied"));
    } catch {
      setError(t("platformUi.permErrCopy"));
    }
  }

  return (
    <div className="plat-access dash-admin dash-admin--modern">
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        title={`Remove ${deleteTarget?.name ?? "operator"}?`}
        message="They will lose platform console access immediately. This does not delete any school tenants."
        confirmLabel={t("platformUi.permRemoveOperator")}
        cancelLabel={t("platformUi.permKeep")}
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
            <p className="plat-access__eyebrow">{t("platformUi.permEyebrow")}</p>
            <h2 className="plat-access__title">{t("platformUi.permTitle")}</h2>
            <p className="plat-access__sub">
              {t("platformUi.permSub")}
            </p>
          </div>
        </div>
        <div className="plat-access__hero-stats">
          <div className="plat-access__stat">
            <strong>{data?.roles.length ?? "—"}</strong>
            <span>{t("platformUi.permStatRoles")}</span>
          </div>
          <div className="plat-access__stat">
            <strong>{data?.catalog.length ?? "—"}</strong>
            <span>{t("platformUi.permStatCapabilities")}</span>
          </div>
          <div className="plat-access__stat">
            <strong>{data?.operators.length ?? "—"}</strong>
            <span>{t("platformUi.permStatOperators")}</span>
          </div>
        </div>
      </header>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      {loading ? (
        <div className="plat-access__loading" aria-busy="true">
          <span className="plat-access__spinner" aria-hidden />
          <p>{t("platformUi.permLoading")}</p>
        </div>
      ) : null}

      {!loading && user ? (
        <section className="plat-access-you">
          <div className="plat-access-you__avatar" aria-hidden>
            {user.firstName.slice(0, 1)}
            {user.lastName.slice(0, 1)}
          </div>
          <div className="plat-access-you__main">
            <p className="plat-access-you__eyebrow">{t("platformUi.permSignedInAs")}</p>
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
              {t("platformUi.permOwnerOnly")}
            </p>
          ) : null}
        </section>
      ) : null}

      {!loading && data && draft ? (
        <>
          <section className="plat-access-panel">
            <div className="plat-access-panel__head">
              <div>
                <h3>{t("platformUi.permMatrixTitle")}</h3>
                <p>{t("platformUi.permMatrixSub")}</p>
              </div>
              {isOwner ? (
                <div className="plat-access-panel__actions">
                  <button
                    type="button"
                    className="plat-v2__btn plat-v2__btn--ghost"
                    disabled={!dirty || saving}
                    onClick={onReset}
                  >
                    {t("platformUi.permReset")}
                  </button>
                  <button
                    type="button"
                    className="plat-v2__btn plat-v2__btn--primary"
                    disabled={!dirty || saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? t("platformUi.saving") : t("platformUi.saveChanges")}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="plat-access-matrix-wrap">
              <table className="plat-access-matrix">
                <thead>
                  <tr>
                    <th>{t("platformUi.permCapability")}</th>
                    {data.roles.map((role) => (
                      <th key={role.id}>
                        <button
                          type="button"
                          className={`plat-access-matrix__role${selectedRole === role.id ? " is-active" : ""}`}
                          onClick={() => setSelectedRole(role.id)}
                        >
                          {role.title}
                          {user?.role === role.id ? <span>{t("platformUi.permYou")}</span> : null}
                          {!role.editable ? <em>{t("platformUi.permLocked")}</em> : null}
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
                                aria-label={on ? t("platformUi.permAllowed") : t("platformUi.permDenied")}
                              >
                                {on ? t("platformUi.billingActive") : t("platformUi.permOff")}
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
                      {isYou ? <span className="plat-you-pill">{t("platformUi.permYourRole")}</span> : null}
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
                <h3>{t("platformUi.permStatOperators")}</h3>
                <p>
                  Invite by email, deactivate access, or remove a login. Capability limits come
                  from the matrix above.
                </p>
              </div>
              {isOwner ? (
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--primary"
                  onClick={() => {
                    setShowCreate((v) => !v);
                    setInviteUrl(null);
                  }}
                >
                  {showCreate ? t("common.cancel") : t("platformUi.permAddOperator")}
                </button>
              ) : null}
            </div>

            {isOwner && showCreate ? (
              <form className="plat-access-create" onSubmit={(e) => void onCreateOperator(e)}>
                <div className="plat-access-create__modes" role="tablist" aria-label={t("platformUi.permAddMethod")}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={createMode === "invite"}
                    className={createMode === "invite" ? "is-active" : undefined}
                    onClick={() => setCreateMode("invite")}
                  >
                    {t("platformUi.permEmailInvite")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={createMode === "password"}
                    className={createMode === "password" ? "is-active" : undefined}
                    onClick={() => setCreateMode("password")}
                  >
                    {t("platformUi.permSetPassword")}
                  </button>
                </div>
                <div className="plat-access-create__grid">
                  <label>
                    <span>{t("platformUi.permFirstName")}</span>
                    <input
                      value={newOp.firstName}
                      onChange={(e) => setNewOp((p) => ({ ...p, firstName: e.target.value }))}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>{t("platformUi.permLastName")}</span>
                    <input
                      value={newOp.lastName}
                      onChange={(e) => setNewOp((p) => ({ ...p, lastName: e.target.value }))}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span>{t("platformUi.permEmail")}</span>
                    <input
                      type="email"
                      value={newOp.email}
                      onChange={(e) => setNewOp((p) => ({ ...p, email: e.target.value }))}
                      required
                      placeholder="support@yourorg.com"
                      autoComplete="off"
                    />
                  </label>
                  {createMode === "password" ? (
                    <label>
                      <span>{t("platformUi.permTempPassword")}</span>
                      <input
                        type="text"
                        value={newOp.password}
                        onChange={(e) => setNewOp((p) => ({ ...p, password: e.target.value }))}
                        required
                        minLength={8}
                        placeholder={t("platformUi.permPasswordHint")}
                        autoComplete="new-password"
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>{t("platformUi.permRole")}</span>
                    <select
                      value={newOp.role}
                      onChange={(e) =>
                        setNewOp((p) => ({
                          ...p,
                          role: e.target.value as PlatformUser["role"],
                        }))
                      }
                    >
                      <option value="SUPPORT">{t("platformUi.permRoleSupport")}</option>
                      <option value="SALES">{t("platformUi.permRoleSales")}</option>
                      <option value="OWNER">{t("platformUi.permRoleOwner")}</option>
                    </select>
                  </label>
                </div>
                <div className="plat-access-create__actions">
                  <button
                    type="submit"
                    className="plat-v2__btn plat-v2__btn--primary"
                    disabled={creating}
                  >
                    {creating
                      ? createMode === "invite"
                        ? t("platformUi.sending")
                        : t("platformUi.creating")
                      : createMode === "invite"
                        ? t("platformUi.permSendInvite")
                        : t("platformUi.permCreateOperator")}
                  </button>
                </div>
              </form>
            ) : null}

            {inviteUrl ? (
              <div className="plat-access-invite-link">
                <p>{t("platformUi.permInviteLink")}</p>
                <code>{inviteUrl}</code>
                <button type="button" className="plat-v2__btn plat-v2__btn--ghost" onClick={() => void copyInviteUrl()}>
                  {t("platformUi.permCopyLink")}
                </button>
              </div>
            ) : null}

            <div className="plat-access-ops">
              {data.operators.map((op) => {
                const initials = `${op.firstName.slice(0, 1)}${op.lastName.slice(0, 1)}`;
                const isYou = op.id === user?.id;
                const name = `${op.firstName} ${op.lastName}`.trim() || op.email;
                return (
                  <div
                    key={op.id}
                    className={`plat-access-op${isYou ? " is-you" : ""}${!op.isActive ? " is-inactive" : ""}`}
                  >
                    <div className="plat-access-op__avatar" aria-hidden>
                      {initials}
                    </div>
                    <div className="plat-access-op__main">
                      <strong>
                        {op.firstName} {op.lastName}
                        {isYou ? <span className="plat-you-pill">{t("platformUi.permYou")}</span> : null}
                        {!op.isActive ? (
                          <span className="plat-status-pill plat-status-pill--off">{t("platformUi.permInactive")}</span>
                        ) : null}
                        {op.invitePending ? (
                          <span className="plat-status-pill plat-status-pill--invite">{t("platformUi.permInvitePending")}</span>
                        ) : null}
                      </strong>
                      <span>{op.email}</span>
                      <em className="plat-access-op__perms">
                        {op.permissions.length} of {data.catalog.length} capabilities · Last login{" "}
                        {formatWhen(op.lastLoginAt)}
                      </em>
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
                          <option value="OWNER">{t("platformUi.permRoleOwner")}</option>
                          <option value="SUPPORT">{t("platformUi.permRoleSupport")}</option>
                          <option value="SALES">{t("platformUi.permRoleSales")}</option>
                        </select>
                        {!isYou ? (
                          <>
                            {op.invitePending ? (
                              <button
                                type="button"
                                className="plat-access-op__secondary"
                                disabled={busyUserId === op.id}
                                onClick={() => void onResendInvite(op.id, name)}
                              >
                                Resend invite
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="plat-access-op__secondary"
                              disabled={busyUserId === op.id}
                              onClick={() =>
                                void onToggleActive(op.id, !op.isActive, name)
                              }
                            >
                              {op.isActive ? t("platformUi.permDeactivate") : t("platformUi.permReactivate")}
                            </button>
                            <button
                              type="button"
                              className="plat-access-op__remove"
                              disabled={busyUserId === op.id}
                              onClick={() =>
                                setDeleteTarget({
                                  id: op.id,
                                  name,
                                })
                              }
                            >
                              {t("platformUi.permRemove")}
                            </button>
                          </>
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

          {isOwner ? (
            <section className="plat-access-panel">
              <div className="plat-access-panel__head">
                <div>
                  <h3>{t("platformUi.permAuditTitle")}</h3>
                  <p>{t("platformUi.permAuditSub")}</p>
                </div>
              </div>
              {audit.length === 0 ? (
                <p className="plat-access-audit__empty">{t("platformUi.permNoEvents")}</p>
              ) : (
                <ul className="plat-access-audit">
                  {audit.map((row) => (
                    <li key={row.id}>
                      <strong>{AUDIT_LABELS[row.action] ?? row.action}</strong>
                      <span>
                        {row.actorEmail}
                        {row.targetEmail ? ` → ${row.targetEmail}` : ""}
                      </span>
                      <time dateTime={row.createdAt}>{formatWhen(row.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="plat-info-card">
            <DashIcon name="students" className="dash-icon--sm" />
            <div>
              <h3>{t("platformUi.permSchoolLevelTitle")}</h3>
              <p>
                Each tenant manages staff from <strong>{t("platformUi.permSchoolLevelPath")}</strong>.
                School admins assign module access without a platform login.
              </p>
            </div>
          </section>

          {isOwner && dirty ? (
            <div className="plat-access__save-bar">
              <p>{t("platformUi.permUnsavedTitle")}</p>
              <div>
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--ghost"
                  disabled={saving}
                  onClick={onReset}
                >
                  {t("platformUi.permDiscard")}
                </button>
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--primary"
                  disabled={saving}
                  onClick={() => void onSave()}
                >
                  {saving ? t("platformUi.saving") : t("platformUi.saveChanges")}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
