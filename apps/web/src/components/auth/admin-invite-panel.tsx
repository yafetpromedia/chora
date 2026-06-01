"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createSchoolInvite, listSchoolInvites, type SchoolInvite } from "@/lib/api";

const ROLES = [
  { value: "teacher" as const, label: "Teachers" },
  { value: "student" as const, label: "Students" },
  { value: "parent" as const, label: "Parents" },
];

export function AdminInvitePanel() {
  const [role, setRole] = useState<"teacher" | "student" | "parent">("teacher");
  const [label, setLabel] = useState("");
  const [invites, setInvites] = useState<SchoolInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      const data = await listSchoolInvites();
      setInvites(data);
    } catch {
      /* ignore on first load */
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await createSchoolInvite({
        role,
        label: label.trim() || undefined,
        expiresInDays: 14,
      });
      setInvites((prev) => [created, ...prev]);
      setLabel("");
      setCopied(created.inviteUrl);
      window.setTimeout(() => setCopied(null), 3000);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create invite");
    } finally {
      setLoading(false);
    }
  }

  function copyLink(url: string) {
    void navigator.clipboard.writeText(url);
    setCopied(url);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="dash-panel" style={{ marginBottom: "1.5rem" }}>
      <div className="dash-panel-head">
        <h2 className="dash-panel-title">Invitation links</h2>
        <span className="dash-panel-badge">{invites.length} active</span>
      </div>
      <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--brand-muted)" }}>
        Share a link so teachers, students, or parents join your school — no school code needed.
      </p>

      <form onSubmit={onCreate} className="dash-invite-form">
        <div className="auth-input-wrap">
          <label className="auth-input-label" htmlFor="invite-role">
            Invite as
          </label>
          <select
            id="invite-role"
            className="auth-input"
            style={{ paddingLeft: "1rem" }}
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="auth-input-wrap">
          <label className="auth-input-label" htmlFor="invite-label">
            Label (optional)
          </label>
          <input
            id="invite-label"
            className="auth-input"
            style={{ paddingLeft: "1rem" }}
            placeholder="e.g. Grade 8 teachers"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button type="submit" className="dash-btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create link"}
        </button>
      </form>

      {error ? <p className="auth-alert auth-alert--error" style={{ marginTop: "0.75rem" }}>{error}</p> : null}
      {copied ? (
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--brand-teal-dark)" }}>
          Link copied to clipboard
        </p>
      ) : null}

      {invites.length > 0 ? (
        <div className="dash-invite-list">
          {invites.map((invite) => (
            <div key={invite.id} className="dash-invite-row">
              <div>
                <span style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--lite-black)" }}>
                  {invite.role}
                </span>
                {invite.label ? (
                  <span style={{ marginLeft: "0.5rem", color: "var(--brand-muted)" }}>· {invite.label}</span>
                ) : null}
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--brand-muted)" }}>
                  {invite.useCount}
                  {invite.maxUses ? ` / ${invite.maxUses}` : ""} uses
                </p>
              </div>
              <button
                type="button"
                className="dash-copy-btn"
                onClick={() => copyLink(invite.inviteUrl)}
              >
                {copied === invite.inviteUrl ? "Copied!" : "Copy link"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dash-empty" style={{ padding: "1.5rem 1rem" }}>
          <p>No invitation links yet. Create one above to get started.</p>
        </div>
      )}
    </section>
  );
}
