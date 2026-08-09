"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  PLATFORM_USER_KEY,
  type PlatformUser,
} from "@/lib/platform-auth";
import {
  getPlatformProfile,
  updatePlatformProfile,
  type PlatformProfile,
} from "@/lib/platform-profile";
import { AppToast } from "@/components/ui/app-toast";

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

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function initials(first: string, last: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
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
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="auth-alert auth-alert--error">
        {error || "Profile unavailable."}
      </p>
    );
  }

  const { user } = profile;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-profile-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon plat-profile-v2__avatar" aria-hidden>
            {initials(user.firstName, user.lastName)}
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Platform operator</p>
            <h2 className="plat-subjects-v2__title">{displayName}</h2>
            <p className="plat-subjects-v2__sub">{user.email}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{user.role}</strong>
            <span>Role</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{user.permissions.length}</strong>
            <span>Capabilities</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{formatShortDate(user.createdAt)}</strong>
            <span>Member since</span>
          </div>
        </div>
      </header>

      <div className="plat-profile-v2__layout">
        <section className="plat-profile-v2__facts" aria-label="Account details">
          <div className="plat-profile-v2__fact">
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="plat-profile-v2__fact">
            <span>Member since</span>
            <strong>{formatDate(user.createdAt)}</strong>
          </div>
          <div className="plat-profile-v2__fact">
            <span>Permissions</span>
            <strong>{user.permissions.length} capabilities</strong>
          </div>
        </section>

        <section className="plat-profile-v2__panel">
          <div className="plat-profile-v2__panel-head">
            <DashIcon name="profile" className="dash-icon--sm" />
            <div>
              <h3>Edit profile</h3>
              <p>Update your name or set a new password.</p>
            </div>
          </div>

          <form className="plat-profile-v2__form" onSubmit={(e) => void onSubmit(e)}>
            <div className="plat-profile-v2__row">
              <label className="plat-field">
                <span>First name</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </label>
              <label className="plat-field">
                <span>Last name</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </label>
            </div>
            <label className="plat-field">
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
            <div className="plat-profile-v2__actions">
              <button
                type="submit"
                className="plat-btn plat-btn--primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
