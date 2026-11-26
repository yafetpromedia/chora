"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { createSchoolInvite, listSchoolInvites, type SchoolInvite } from "@/lib/api";
import { AppToast } from "@/components/ui/app-toast";

export function AdminInvitePanel() {
  const { t } = useLocale();
  const roles = useMemo(
    () =>
      [
        { value: "teacher" as const, label: t("adminInviteUi.roleTeachers") },
        { value: "student" as const, label: t("adminInviteUi.roleStudents") },
        { value: "parent" as const, label: t("adminInviteUi.roleParents") },
      ] as const,
    [t],
  );
  const [role, setRole] = useState<"teacher" | "student" | "parent">("teacher");
  const [label, setLabel] = useState("");
  const [invites, setInvites] = useState<SchoolInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listSchoolInvites();
        if (!cancelled) setInvites(data);
      } catch {
        /* ignore on first load */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setError(
        createError instanceof Error
          ? createError.message
          : t("adminInviteUi.createFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  function copyLink(url: string) {
    void navigator.clipboard.writeText(url);
    setCopied(url);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function roleLabelFor(value: string) {
    const found = roles.find((r) => r.value === value);
    return found?.label ?? value;
  }

  return (
    <section className="dash-panel" style={{ marginBottom: "1.5rem" }}>
      <div className="dash-panel-head">
        <h2 className="dash-panel-title">{t("adminInviteUi.title")}</h2>
        <span className="dash-panel-badge">
          {t("adminInviteUi.activeCount", { count: invites.length })}
        </span>
      </div>
      <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--brand-muted)" }}>
        {t("adminInviteUi.intro")}
      </p>

      <form onSubmit={onCreate} className="dash-invite-form">
        <div className="auth-input-wrap">
          <label className="auth-input-label" htmlFor="invite-role">
            {t("adminInviteUi.inviteAs")}
          </label>
          <select
            id="invite-role"
            className="auth-input"
            style={{ paddingLeft: "1rem" }}
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="auth-input-wrap">
          <label className="auth-input-label" htmlFor="invite-label">
            {t("adminInviteUi.labelOptional")}
          </label>
          <input
            id="invite-label"
            className="auth-input"
            style={{ paddingLeft: "1rem" }}
            placeholder={t("adminInviteUi.labelPh")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button type="submit" className="dash-btn-primary" disabled={loading}>
          {loading ? t("adminInviteUi.creating") : t("adminInviteUi.createLink")}
        </button>
      </form>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast
        message={copied ? t("adminInviteUi.linkCopied") : ""}
        tone="success"
        onDismiss={() => setCopied(null)}
      />

      {invites.length > 0 ? (
        <div className="dash-invite-list">
          {invites.map((invite) => (
            <div key={invite.id} className="dash-invite-row">
              <div>
                <span style={{ fontWeight: 700, color: "var(--lite-black)" }}>
                  {roleLabelFor(invite.role)}
                </span>
                {invite.label ? (
                  <span style={{ marginLeft: "0.5rem", color: "var(--brand-muted)" }}>
                    · {invite.label}
                  </span>
                ) : null}
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--brand-muted)" }}>
                  {t("adminInviteUi.uses", {
                    used: invite.useCount,
                    max: invite.maxUses
                      ? t("adminInviteUi.usesMax", { max: invite.maxUses })
                      : "",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="dash-copy-btn"
                onClick={() => copyLink(invite.inviteUrl)}
              >
                {copied === invite.inviteUrl
                  ? t("adminInviteUi.copied")
                  : t("adminInviteUi.copyLink")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dash-empty" style={{ padding: "1.5rem 1rem" }}>
          <p>{t("adminInviteUi.empty")}</p>
        </div>
      )}
    </section>
  );
}