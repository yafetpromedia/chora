"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { telHref } from "@/lib/student-photo";
import {
  listParents,
  resetParentPassword,
  updateParentAccount,
  type ParentRecord,
} from "@/lib/parents";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

function childLine(c: ParentRecord["children"][0]) {
  const grade = c.sectionName ? `${c.gradeName} · ${c.sectionName}` : c.gradeName;
  return `${c.name} (${grade})`;
}

export function ParentsWorkspace() {
  const { t } = useLocale();
  const router = useRouter();
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [search, setSearch] = useState("");
  const [manageTarget, setManageTarget] = useState<ParentRecord | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const emptyDash = t("parentsUi.emptyDash");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => {
      const hay = [
        p.name,
        p.username,
        p.email,
        p.phone,
        ...p.children.map((c) => c.name),
        ...p.children.map((c) => c.gradeName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [parents, search]);

  const linkedChildren = parents.reduce((n, p) => n + p.children.length, 0);

  const load = () => {
    void listParents()
      .then((rows) =>
        setParents(
          rows.map((p) => ({
            ...p,
            username: p.username ?? "",
          })),
        ),
      )
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("parentsUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount
  }, [router]);

  function openManage(parent: ParentRecord) {
    setManageTarget(parent);
    setFirstName(parent.firstName ?? "");
    setLastName(parent.lastName ?? "");
    setPhone(parent.phone ?? "");
    setUsername(parent.username ?? "");
    setNewPassword("");
    setTempPassword("");
    setError("");
    setSaved("");
  }

  function closeManage() {
    setManageTarget(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setUsername("");
    setNewPassword("");
    setTempPassword("");
  }

  async function onResetPassword() {
    if (!manageTarget) return;
    setResetBusy(true);
    setError("");
    setSaved("");
    setTempPassword("");
    try {
      const result = await resetParentPassword(manageTarget.userId);
      setTempPassword(result.tempPassword);
      setUsername(result.username ?? "");
      setSaved(t("parentsUi.tempPasswordGenerated"));
      setParents((rows) =>
        rows.map((p) =>
          p.userId === manageTarget.userId
            ? { ...p, username: result.username ?? "" }
            : p,
        ),
      );
      setManageTarget((p) =>
        p ? { ...p, username: result.username ?? "" } : p,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("parentsUi.resetFailed"));
    } finally {
      setResetBusy(false);
    }
  }

  async function onSaveAccount(e: FormEvent) {
    e.preventDefault();
    if (!manageTarget) return;
    const body: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      username?: string;
      password?: string;
    } = {};
    if (firstName.trim() && firstName.trim() !== manageTarget.firstName) {
      body.firstName = firstName.trim();
    }
    if (lastName.trim() && lastName.trim() !== manageTarget.lastName) {
      body.lastName = lastName.trim();
    }
    const nextPhone = phone.trim() || null;
    if (nextPhone !== (manageTarget.phone ?? null)) {
      body.phone = nextPhone;
    }
    if (username.trim() && username.trim() !== manageTarget.username) {
      body.username = username.trim();
    }
    if (newPassword.trim()) {
      body.password = newPassword.trim();
    }
    if (
      !body.firstName &&
      !body.lastName &&
      body.phone === undefined &&
      !body.username &&
      !body.password
    ) {
      setError(t("parentsUi.needChange"));
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = await updateParentAccount(manageTarget.userId, body);
      setSaved(
        result.passwordUpdated
          ? t("parentsUi.loginUpdated")
          : t("parentsUi.usernameUpdated"),
      );
      setNewPassword("");
      setParents((rows) =>
        rows.map((p) =>
          p.userId === manageTarget.userId
            ? {
                ...p,
                username: result.username,
                email: result.email,
                phone: result.phone,
                firstName: result.firstName,
                lastName: result.lastName,
                name: result.name,
              }
            : p,
        ),
      );
      setManageTarget((p) =>
        p
          ? {
              ...p,
              username: result.username,
              email: result.email,
              phone: result.phone,
              firstName: result.firstName,
              lastName: result.lastName,
              name: result.name,
            }
          : p,
      );
      setFirstName(result.firstName);
      setLastName(result.lastName);
      setPhone(result.phone ?? "");
      setUsername(result.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("parentsUi.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="par-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

      <header className="par-v2__hero">
        <div className="par-v2__hero-glow" aria-hidden />
        <div className="par-v2__hero-inner">
          <div className="par-v2__hero-main">
            <span className="par-v2__chip">{t("parentsUi.chip")}</span>
            <h2 className="par-v2__hero-title">{t("parentsUi.title")}</h2>
            <p className="par-v2__hero-sub">{t("parentsUi.heroSub")}</p>
          </div>
          <div className="par-v2__hero-stats">
            <div className="par-v2__stat">
              <strong>{parents.length}</strong>
              <span>{t("parentsUi.statAccounts")}</span>
            </div>
            <div className="par-v2__stat par-v2__stat--accent">
              <strong>{linkedChildren}</strong>
              <span>{t("parentsUi.statStudentLinks")}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="par-v2__toolbar">
        <label className="par-v2__search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("parentsUi.searchPlaceholder")}
            aria-label={t("common.search")}
          />
        </label>
        <p className="par-v2__toolbar-meta">
          {t("parentsUi.ofShown", { shown: filtered.length, total: parents.length })}
        </p>
      </div>

      {loading ? (
        <div className="par-v2__loading">
          <span className="par-v2__spinner" aria-hidden />
          <p>{t("parentsUi.loading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="par-v2__empty">
          <DashIcon name="users" className="dash-icon--lg" />
          <h3>
            {parents.length === 0 ? t("parentsUi.noParentsYet") : t("parentsUi.noMatches")}
          </h3>
          <p>
            {parents.length === 0
              ? t("parentsUi.noParentsHint")
              : t("parentsUi.trySearch")}
          </p>
        </div>
      ) : (
        <div className="par-v2__table-wrap">
          <table className="par-v2__table">
            <thead>
              <tr>
                <th>{t("parentsUi.colParent")}</th>
                <th>{t("parentsUi.colPortalLogin")}</th>
                <th>{t("parentsUi.colContact")}</th>
                <th>{t("parentsUi.colChildren")}</th>
                <th aria-label={t("common.actions")} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.userId}>
                  <td>
                    <strong className="par-v2__name">{p.name}</strong>
                    {p.username ? (
                      <code className="par-v2__username par-v2__username--inline">
                        @{p.username}
                      </code>
                    ) : (
                      <span className="par-v2__meta">{t("parentsUi.noPortalUsername")}</span>
                    )}
                  </td>
                  <td>
                    <code className="par-v2__username">{p.username || emptyDash}</code>
                  </td>
                  <td>
                    {p.phone ? (
                      <a className="par-v2__phone" href={telHref(p.phone) ?? "#"}>
                        {p.phone}
                      </a>
                    ) : (
                      <span className="par-v2__meta">{emptyDash}</span>
                    )}
                  </td>
                  <td>
                    {p.children.length === 0 ? (
                      <span className="par-v2__meta">{t("parentsUi.noStudentsLinked")}</span>
                    ) : (
                      <ul className="par-v2__children">
                        {p.children.map((c) => (
                          <li key={c.profileId}>
                            <Link href="/admin/students" className="par-v2__child-link">
                              {childLine(c)}
                            </Link>
                            {c.studentId ? (
                              <span className="par-v2__meta"> · {c.studentId}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="par-v2__actions">
                    <button
                      type="button"
                      className="par-v2__btn"
                      onClick={() => openManage(p)}
                    >
                      {t("parentsUi.manageLogin")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {manageTarget ? (
        <>
          <div className="par-v2__backdrop" onClick={closeManage} aria-hidden />
          <aside className="par-v2__drawer" role="dialog" aria-labelledby="par-drawer-title">
            <header className="par-v2__drawer-head">
              <div>
                <p className="par-v2__drawer-eyebrow">{t("parentsUi.drawerEyebrow")}</p>
                <h3 id="par-drawer-title">{manageTarget.name}</h3>
                <p className="par-v2__drawer-sub">
                  {t("parentsUi.drawerSub")}{" "}
                  <strong>{t("parentsUi.drawerSubStrong")}</strong>
                  {t("parentsUi.drawerSubEnd")}
                </p>
              </div>
              <button
                type="button"
                className="par-v2__close"
                onClick={closeManage}
                aria-label={t("common.close")}
              >
                ×
              </button>
            </header>

            {tempPassword ? (
              <div className="par-v2__cred-box">
                <p className="par-v2__cred-label">{t("parentsUi.tempPasswordLabel")}</p>
                <div className="par-v2__cred-row">
                  <code>{tempPassword}</code>
                  <button
                    type="button"
                    className="par-v2__btn par-v2__btn--ghost"
                    onClick={() => void navigator.clipboard.writeText(tempPassword)}
                  >
                    {t("common.copy")}
                  </button>
                </div>
                <p className="par-v2__cred-hint">
                  {t("parentsUi.credHint")} <strong>{username}</strong> ·{" "}
                  {t("parentsUi.credHintEnd")}
                </p>
              </div>
            ) : null}

            <form className="par-v2__form" onSubmit={(e) => void onSaveAccount(e)}>
              <label className="par-v2__field">
                <span>{t("parentsUi.firstName")}</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </label>

              <label className="par-v2__field">
                <span>{t("parentsUi.lastName")}</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </label>

              <label className="par-v2__field">
                <span>{t("parentsUi.phone")}</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("parentsUi.phonePlaceholder")}
                  autoComplete="tel"
                />
              </label>

              <label className="par-v2__field">
                <span>{t("parentsUi.username")}</span>
                <input
                  value={username ?? ""}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("parentsUi.usernamePlaceholder")}
                  autoComplete="off"
                  required
                />
                <em>{t("parentsUi.usernameHint")}</em>
              </label>

              <label className="par-v2__field">
                <span>{t("parentsUi.newPasswordOptional")}</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("parentsUi.minSixChars")}
                  autoComplete="new-password"
                />
                <em>{t("parentsUi.passwordHint")}</em>
              </label>

              <div className="par-v2__readonly">
                <div>
                  <span>{t("parentsUi.portalEmail")}</span>
                  <strong>{manageTarget.email}</strong>
                  <em>{t("parentsUi.portalEmailHint")}</em>
                </div>
              </div>

              {manageTarget.children.length > 0 ? (
                <div className="par-v2__linked">
                  <span className="par-v2__linked-label">{t("parentsUi.linkedStudents")}</span>
                  <ul>
                    {manageTarget.children.map((c) => (
                      <li key={c.profileId}>{childLine(c)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="par-v2__form-actions">
                <button
                  type="button"
                  className="par-v2__btn par-v2__btn--warn"
                  disabled={resetBusy || busy}
                  onClick={() => void onResetPassword()}
                >
                  {resetBusy ? t("parentsUi.resetting") : t("parentsUi.resetPassword")}
                </button>
                <button type="submit" className="par-v2__btn par-v2__btn--primary" disabled={busy}>
                  {busy ? t("common.saving") : t("parentsUi.saveChanges")}
                </button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}