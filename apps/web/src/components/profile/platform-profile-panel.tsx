"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  PLATFORM_USER_KEY,
  type PlatformUser,
} from "@/lib/platform-auth";
import {
  getPlatformProfile,
  updatePlatformProfile,
  type PlatformProfile,
} from "@/lib/platform-profile";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function PlatformProfilePanel() {
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void getPlatformProfile()
      .then((data) => {
        setProfile(data);
        setFirstName(data.user.firstName);
        setLastName(data.user.lastName);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load profile"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updatePlatformProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        newPassword: newPassword.trim() || undefined,
      });
      setProfile(updated);
      setNewPassword("");
      setToast("Profile saved.");
      const sessionUser: PlatformUser = {
        id: updated.user.id,
        email: updated.user.email,
        firstName: updated.user.firstName,
        lastName: updated.user.lastName,
        role: updated.user.role,
        scope: "platform",
      };
      localStorage.setItem(PLATFORM_USER_KEY, JSON.stringify(sessionUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="profile-loading">Loading your profile…</p>;
  }

  if (!profile) {
    return <p className="profile-loading">{error || "Profile unavailable."}</p>;
  }

  const { user } = profile;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="profile-page">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {toast ? <p className="att-toast att-toast--ok">{toast}</p> : null}

      <header className="profile-hero profile-hero--platform">
        <span className="profile-hero__avatar" aria-hidden>
          {displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="profile-hero__text">
          <h2 className="profile-hero__name">{displayName}</h2>
          <p className="profile-hero__email">{user.email}</p>
          <div className="profile-hero__chips">
            <span className="profile-chip">{user.role}</span>
            <span className="profile-chip profile-chip--muted">Platform console</span>
          </div>
        </div>
      </header>

      <div className="profile-grid">
        <section className="profile-card">
          <h3 className="profile-card__title">Account</h3>
          <dl className="profile-facts">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Permissions</dt>
              <dd>{user.permissions.length} capabilities</dd>
            </div>
          </dl>
        </section>

        <section className="profile-card profile-card--wide profile-card--form">
          <h3 className="profile-card__title">Edit profile</h3>
          <form className="profile-form" onSubmit={(e) => void onSubmit(e)}>
            <div className="profile-form__row">
              <label className="profile-field">
                <span>First name</span>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label className="profile-field">
                <span>Last name</span>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
            </div>
            <label className="profile-field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
            </label>
            <div className="profile-form__actions">
              <button type="submit" className="plat-btn plat-btn--primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
