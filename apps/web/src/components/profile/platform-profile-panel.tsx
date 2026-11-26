"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n";
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

function dateLocaleTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function formatDate(iso: string, dateLocale?: string) {
  try {
    return new Date(iso).toLocaleDateString(dateLocale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string, dateLocale?: string) {
  try {
    return new Date(iso).toLocaleDateString(dateLocale, {
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

type Props = {
  onUserUpdated?: (user: PlatformUser) => void;
};

export function PlatformProfilePanel({ onUserUpdated }: Props) {
  const { t, locale } = useLocale();
  const dateLocale = dateLocaleTag(locale);
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [email, setEmail] = useState("");
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
        setEmail(data.user.email);
        setFirstName(data.user.firstName);
        setLastName(data.user.lastName);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("platformProfileUi.loadFailed")),
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
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        newPassword: newPassword.trim() || undefined,
      });
      setProfile(updated);
      setEmail(updated.user.email);
      setFirstName(updated.user.firstName);
      setLastName(updated.user.lastName);
      setNewPassword("");
      setToast(t("platformProfileUi.profileSaved"));
      const sessionUser: PlatformUser = {
        id: updated.user.id,
        email: updated.user.email,
        firstName: updated.user.firstName,
        lastName: updated.user.lastName,
        role: updated.user.role,
        scope: "platform",
        permissions: updated.user.permissions,
      };
      localStorage.setItem(PLATFORM_USER_KEY, JSON.stringify(sessionUser));
      onUserUpdated?.(sessionUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformProfileUi.saveFailed"));
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
        {error || t("platformProfileUi.unavailable")}
      </p>
    );
  }

  const { user } = profile;
  const displayName =
    [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ") ||
    user.email;

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-profile-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon plat-profile-v2__avatar" aria-hidden>
            {initials(firstName, lastName)}
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformProfileUi.eyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{displayName}</h2>
            <p className="plat-subjects-v2__sub">{user.email}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{user.role}</strong>
            <span>{t("platformProfileUi.role")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{user.permissions.length}</strong>
            <span>{t("platformProfileUi.capabilities")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{formatShortDate(user.createdAt, dateLocale)}</strong>
            <span>{t("platformProfileUi.memberSince")}</span>
          </div>
        </div>
      </header>

      <div className="plat-profile-v2__layout">
        <section
          className="plat-profile-v2__facts"
          aria-label={t("platformProfileUi.accountDetailsAria")}
        >
          <div className="plat-profile-v2__fact">
            <span>{t("platformProfileUi.email")}</span>
            <strong>{user.email}</strong>
          </div>
          <div className="plat-profile-v2__fact">
            <span>{t("platformProfileUi.memberSince")}</span>
            <strong>{formatDate(user.createdAt, dateLocale)}</strong>
          </div>
          <div className="plat-profile-v2__fact">
            <span>{t("platformProfileUi.permissions")}</span>
            <strong>
              {t("platformProfileUi.capabilitiesCount", {
                count: user.permissions.length,
              })}
            </strong>
          </div>
        </section>

        <section className="plat-profile-v2__panel">
          <div className="plat-profile-v2__panel-head">
            <DashIcon name="profile" className="dash-icon--sm" />
            <div>
              <h3>{t("platformProfileUi.editTitle")}</h3>
              <p>{t("platformProfileUi.editSub")}</p>
            </div>
          </div>

          <form className="plat-profile-v2__form" onSubmit={(e) => void onSubmit(e)}>
            <label className="plat-field">
              <span>{t("platformProfileUi.email")}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <div className="plat-profile-v2__row">
              <label className="plat-field">
                <span>{t("platformProfileUi.firstName")}</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </label>
              <label className="plat-field">
                <span>{t("platformProfileUi.lastName")}</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </label>
            </div>
            <label className="plat-field">
              <span>{t("platformProfileUi.newPassword")}</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                placeholder={t("platformProfileUi.keepPassword")}
                autoComplete="new-password"
              />
            </label>
            <div className="plat-profile-v2__actions">
              <button
                type="submit"
                className="plat-btn plat-btn--primary"
                disabled={saving}
              >
                {saving ? t("platformProfileUi.saving") : t("platformProfileUi.saveChanges")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
