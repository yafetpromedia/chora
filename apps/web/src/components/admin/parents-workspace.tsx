"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
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
  const router = useRouter();
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [search, setSearch] = useState("");
  const [manageTarget, setManageTarget] = useState<ParentRecord | null>(null);
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

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
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load parents"))
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
  }, [router]);

  function openManage(parent: ParentRecord) {
    setManageTarget(parent);
    setUsername(parent.username ?? "");
    setNewPassword("");
    setTempPassword("");
    setError("");
    setSaved("");
  }

  function closeManage() {
    setManageTarget(null);
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
      setSaved("New temporary password generated. Share it securely with the parent.");
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
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setResetBusy(false);
    }
  }

  async function onSaveAccount(e: FormEvent) {
    e.preventDefault();
    if (!manageTarget) return;
    const body: { username?: string; password?: string } = {};
    if (username.trim() && username.trim() !== manageTarget.username) {
      body.username = username.trim();
    }
    if (newPassword.trim()) {
      body.password = newPassword.trim();
    }
    if (!body.username && !body.password) {
      setError("Change the username or enter a new password to save.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = await updateParentAccount(manageTarget.userId, body);
      setSaved(
        result.passwordUpdated
          ? "Login details updated."
          : "Username updated.",
      );
      setNewPassword("");
      setParents((rows) =>
        rows.map((p) =>
          p.userId === manageTarget.userId ? { ...p, username: result.username } : p,
        ),
      );
      setManageTarget((p) => (p ? { ...p, username: result.username } : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="par-v2">
      {error && !manageTarget ? (
        <div className="par-v2__alert par-v2__alert--err" role="alert">
          {error}
        </div>
      ) : null}

      <header className="par-v2__hero">
        <div className="par-v2__hero-glow" aria-hidden />
        <div className="par-v2__hero-inner">
          <div className="par-v2__hero-main">
            <span className="par-v2__chip">Families</span>
            <h2 className="par-v2__hero-title">Parents &amp; guardians</h2>
            <p className="par-v2__hero-sub">
              Manage parent portal logins, reset forgotten passwords, and view linked students.
            </p>
          </div>
          <div className="par-v2__hero-stats">
            <div className="par-v2__stat">
              <strong>{parents.length}</strong>
              <span>Accounts</span>
            </div>
            <div className="par-v2__stat par-v2__stat--accent">
              <strong>{linkedChildren}</strong>
              <span>Student links</span>
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
            placeholder="Search name, username, phone, child, grade…"
          />
        </label>
        <p className="par-v2__toolbar-meta">
          {filtered.length} of {parents.length} shown
        </p>
      </div>

      {loading ? (
        <div className="par-v2__loading">
          <span className="par-v2__spinner" aria-hidden />
          <p>Loading parents…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="par-v2__empty">
          <DashIcon name="users" className="dash-icon--lg" />
          <h3>{parents.length === 0 ? "No parent accounts yet" : "No matches"}</h3>
          <p>
            {parents.length === 0
              ? "Add students with parent phone numbers — parent accounts are created automatically."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="par-v2__table-wrap">
          <table className="par-v2__table">
            <thead>
              <tr>
                <th>Parent / guardian</th>
                <th>Portal login</th>
                <th>Contact</th>
                <th>Children</th>
                <th aria-label="Actions" />
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
                      <span className="par-v2__meta">No portal username</span>
                    )}
                    <span className="par-v2__meta">{p.email}</span>
                  </td>
                  <td>
                    <code className="par-v2__username">{p.username || "—"}</code>
                  </td>
                  <td>
                    {p.phone ? (
                      <a className="par-v2__phone" href={telHref(p.phone) ?? "#"}>
                        {p.phone}
                      </a>
                    ) : (
                      <span className="par-v2__meta">—</span>
                    )}
                  </td>
                  <td>
                    {p.children.length === 0 ? (
                      <span className="par-v2__meta">No students linked</span>
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
                      Manage login
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
                <p className="par-v2__drawer-eyebrow">Parent portal</p>
                <h3 id="par-drawer-title">{manageTarget.name}</h3>
                <p className="par-v2__drawer-sub">
                  Parents sign in with <strong>school code + username + password</strong>.
                </p>
              </div>
              <button type="button" className="par-v2__close" onClick={closeManage} aria-label="Close">
                ×
              </button>
            </header>

            {error ? (
              <div className="par-v2__alert par-v2__alert--err" role="alert">
                {error}
              </div>
            ) : null}
            {saved ? (
              <div className="par-v2__alert par-v2__alert--ok" role="status">
                {saved}
              </div>
            ) : null}

            {tempPassword ? (
              <div className="par-v2__cred-box">
                <p className="par-v2__cred-label">Temporary password (share once)</p>
                <div className="par-v2__cred-row">
                  <code>{tempPassword}</code>
                  <button
                    type="button"
                    className="par-v2__btn par-v2__btn--ghost"
                    onClick={() => void navigator.clipboard.writeText(tempPassword)}
                  >
                    Copy
                  </button>
                </div>
                <p className="par-v2__cred-hint">
                  Username: <strong>{username}</strong> · Share with the parent along with your school code.
                </p>
              </div>
            ) : null}

            <form className="par-v2__form" onSubmit={(e) => void onSaveAccount(e)}>
              <label className="par-v2__field">
                <span>Username</span>
                <input
                  value={username ?? ""}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Portal username"
                  autoComplete="off"
                  required
                />
                <em>Used on the login page with your school code.</em>
              </label>

              <label className="par-v2__field">
                <span>Set new password (optional)</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                />
                <em>Leave blank unless you want to set a specific password.</em>
              </label>

              <div className="par-v2__readonly">
                <div>
                  <span>Email on file</span>
                  <strong>{manageTarget.email}</strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{manageTarget.phone ?? "—"}</strong>
                </div>
              </div>

              {manageTarget.children.length > 0 ? (
                <div className="par-v2__linked">
                  <span className="par-v2__linked-label">Linked students</span>
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
                  {resetBusy ? "Resetting…" : "Reset password"}
                </button>
                <button type="submit" className="par-v2__btn par-v2__btn--primary" disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}
