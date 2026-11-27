"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import type { AppLocale } from "@/lib/i18n";
import {
  getMyProfile,
  updateMyProfile,
  type UserProfile,
} from "@/lib/profile";
import { AppToast } from "@/components/ui/app-toast";

function dateLocaleTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function formatDate(iso: string, dateLocale?: string) {
  try {
    return new Date(iso).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const ROLE_KEYS = ["admin", "staff", "teacher", "parent", "student"] as const;

function roleLabel(role: string, t: (key: string) => string) {
  if ((ROLE_KEYS as readonly string[]).includes(role)) {
    return t(`roles.${role}`);
  }
  return role;
}

function isPlaceholderInbox(email: string) {
  return /@(parent|users)\.(chora|campusone)\.app$/i.test(email.trim());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export function UserProfilePanel() {
  const { t, locale } = useLocale();
  const dateLocale = dateLocaleTag(locale);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getMyProfile();
        setProfile(data);
        setUsername(data.user.username);
        setEmail(data.user.email);
        setFirstName(data.user.firstName);
        setLastName(data.user.lastName);
        setPhone(data.user.phone ?? "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("profile.unavailable"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updateMyProfile({
        username: username.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
      setProfile(updated);
      setUsername(updated.user.username);
      setEmail(updated.user.email);
      setFirstName(updated.user.firstName);
      setLastName(updated.user.lastName);
      setPhone(updated.user.phone ?? "");
      setNewPassword("");
      setToast(t("profile.profileSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.unavailable"));
    } finally {
      setSaving(false);
    }
  }

  async function copyJoinCode() {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.school.joinCode);
      setToast(t("profile.joinCopied"));
    } catch {
      setError(t("profile.unavailable"));
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-empty profile-empty--loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{t("profile.loadingProfile")}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-empty">
          <DashIcon name="profile" />
          <p>{error || t("profile.unavailable")}</p>
        </div>
      </div>
    );
  }

  const { user, school, student, teacher, children } = profile;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const templateLabel =
    user.roleTemplateName ??
    (user.roleTemplateSlug ? ROLE_TEMPLATE_LABELS[user.roleTemplateSlug] : null);
  const homeroomLabel = teacher?.homeroomGrade
    ? `${teacher.homeroomGrade}${teacher.homeroomSection ? ` · ${teacher.homeroomSection}` : ""}`
    : null;

  return (
    <div className="profile-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

      <header className="profile-hero">
        <div className="profile-hero__identity">
          <span className="profile-hero__avatar" aria-hidden>
            {initials(displayName)}
          </span>
          <div className="profile-hero__main">
            <p className="profile-hero__eyebrow">{t("profile.yourAccount")}</p>
            <h2 className="profile-hero__name">{displayName}</h2>
            <p className="profile-hero__email">
              @{user.username}
              <span className="profile-hero__email-sep"> · </span>
              {user.email}
            </p>
            <div className="profile-hero__chips">
              <span className="profile-chip">{roleLabel(user.role, t)}</span>
              {templateLabel ? (
                <span className="profile-chip profile-chip--muted">
                  {templateLabel}
                </span>
              ) : null}
              <span className="profile-chip profile-chip--muted">
                {school.name}
              </span>
            </div>
          </div>
        </div>
        <div className="profile-hero__stats">
          <button
            type="button"
            className="profile-stat profile-stat--action"
            onClick={() => void copyJoinCode()}
            title={t("common.copy")}
          >
            <strong>{school.joinCode}</strong>
            <span>{t("profile.joinCodeTap")}</span>
          </button>
          <div className="profile-stat">
            <strong>{formatDate(user.createdAt, dateLocale)}</strong>
            <span>{t("profile.memberSince")}</span>
          </div>
          <div className="profile-stat">
            <strong>{user.phone?.trim() || "—"}</strong>
            <span>{t("profile.phone")}</span>
          </div>
        </div>
      </header>

      <div className="profile-layout">
        <aside className="profile-aside">
          <section className="profile-card">
            <div className="profile-card__head">
              <div>
                <h3 className="profile-card__title">{t("profile.accountDetails")}</h3>
                <p className="profile-card__sub">{t("profile.accountDetailsSub")}</p>
              </div>
              <span className="profile-card__icon" aria-hidden>
                <DashIcon name="settings" />
              </span>
            </div>
            <dl className="profile-facts">
              <div>
                <dt>{t("profile.school")}</dt>
                <dd>{school.name}</dd>
              </div>
              <div>
                <dt>{t("profile.usernameValue")}</dt>
                <dd>
                  <code>{user.username}</code>
                </dd>
              </div>
              <div>
                <dt>{t("profile.email")}</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>{t("profile.joinCode")}</dt>
                <dd>
                  <code>{school.joinCode}</code>
                </dd>
              </div>
              <div>
                <dt>{t("profile.memberSince")}</dt>
                <dd>{formatDate(user.createdAt, dateLocale)}</dd>
              </div>
              {user.externalRef ? (
                <div>
                  <dt>{t("profile.idRef")}</dt>
                  <dd>{user.externalRef}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {student ? (
            <section className="profile-card">
              <div className="profile-card__head">
                <div>
                  <h3 className="profile-card__title">{t("profile.studentRecord")}</h3>
                  <p className="profile-card__sub">{t("profile.enrollment")}</p>
                </div>
                <span className="profile-card__icon" aria-hidden>
                  <DashIcon name="students" />
                </span>
              </div>
              <dl className="profile-facts">
                <div>
                  <dt>{t("profile.grade")}</dt>
                  <dd>
                    {student.grade}
                    {student.section ? ` · ${student.section}` : ""}
                  </dd>
                </div>
                {student.fan ? (
                  <div>
                    <dt>{t("profile.fan")}</dt>
                    <dd>{student.fan}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {teacher ? (
            <section className="profile-card">
              <div className="profile-card__head">
                <div>
                  <h3 className="profile-card__title">{t("profile.teaching")}</h3>
                  <p className="profile-card__sub">{t("profile.campusRole")}</p>
                </div>
                <span className="profile-card__icon" aria-hidden>
                  <DashIcon name="teachers" />
                </span>
              </div>
              {homeroomLabel ? (
                <dl className="profile-facts">
                  <div>
                    <dt>{t("profile.homeroom")}</dt>
                    <dd>{homeroomLabel}</dd>
                  </div>
                  {templateLabel ? (
                    <div>
                      <dt>{t("profile.role")}</dt>
                      <dd>{templateLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="profile-facts__empty">{t("profile.noHomeroom")}</p>
              )}
            </section>
          ) : null}

          {children.length > 0 ? (
            <section className="profile-card">
              <div className="profile-card__head">
                <div>
                  <h3 className="profile-card__title">{t("profile.linkedStudents")}</h3>
                  <p className="profile-card__sub">
                    {t("profile.linked", { count: children.length })}
                  </p>
                </div>
                <span className="profile-card__icon" aria-hidden>
                  <DashIcon name="users" />
                </span>
              </div>
              <ul className="profile-children">
                {children.map((c) => (
                  <li key={`${c.name}-${c.grade}`}>
                    <span className="profile-children__avatar" aria-hidden>
                      {initials(c.name)}
                    </span>
                    <div>
                      <strong>{c.name}</strong>
                      <span>
                        {c.grade}
                        {c.section ? ` · ${c.section}` : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        <main className="profile-main">
          <section className="profile-card profile-card--form">
            <div className="profile-card__head">
              <div>
                <h3 className="profile-card__title">{t("profile.editProfile")}</h3>
                <p className="profile-card__sub">{t("profile.editProfileSub")}</p>
              </div>
              <span className="profile-card__icon" aria-hidden>
                <DashIcon name="profile" />
              </span>
            </div>
            <p className="profile-card__hint">
              {t("profile.editHint", { code: school.joinCode })}
            </p>
            <form className="profile-form" onSubmit={(e) => void onSubmit(e)}>
              <label className="profile-field">
                <span>{t("profile.username")}</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  autoComplete="username"
                  placeholder={t("profile.usernamePlaceholder")}
                />
              </label>
              <label className="profile-field">
                <span>{t("profile.email")}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder={t("profile.emailPlaceholder")}
                />
                <p
                  className={
                    isPlaceholderInbox(email)
                      ? "profile-card__hint"
                      : "profile-card__sub"
                  }
                >
                  {isPlaceholderInbox(email)
                    ? t("profile.emailPlaceholderHint")
                    : t("profile.emailOwnHint")}
                </p>
              </label>
              <div className="profile-form__row">
                <label className="profile-field">
                  <span>{t("profile.firstName")}</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </label>
                <label className="profile-field">
                  <span>{t("profile.lastName")}</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="profile-field">
                <span>{t("profile.phone")}</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("profile.phonePlaceholder")}
                  inputMode="tel"
                />
              </label>
              <label className="profile-field">
                <span>{t("profile.newPassword")}</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  placeholder={t("profile.keepPassword")}
                  autoComplete="new-password"
                />
              </label>
              <div className="profile-form__actions">
                <button type="submit" className="profile-btn" disabled={saving}>
                  {saving ? t("common.saving") : t("profile.saveChanges")}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}