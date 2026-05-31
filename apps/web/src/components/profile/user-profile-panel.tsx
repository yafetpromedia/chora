"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import {
  getMyProfile,
  updateMyProfile,
  type UserProfile,
} from "@/lib/profile";

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

function roleLabel(role: string) {
  if (role === "admin") return "School admin";
  if (role === "staff") return "Staff";
  if (role === "teacher") return "Teacher";
  if (role === "parent") return "Parent";
  if (role === "student") return "Student";
  return role;
}

export function UserProfilePanel() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getMyProfile();
      setProfile(data);
      setFirstName(data.user.firstName);
      setLastName(data.user.lastName);
      setPhone(data.user.phone ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
      setProfile(updated);
      setNewPassword("");
      setToast("Profile saved.");
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

  const { user, school, student, teacher, children } = profile;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const templateLabel =
    user.roleTemplateName ??
    (user.roleTemplateSlug ? ROLE_TEMPLATE_LABELS[user.roleTemplateSlug] : null);

  return (
    <div className="profile-page">
      {error ? <p className="att-toast att-toast--error">{error}</p> : null}
      {toast ? <p className="att-toast att-toast--ok">{toast}</p> : null}

      <header className="profile-hero">
        <span className="profile-hero__avatar" aria-hidden>
          {displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="profile-hero__text">
          <h2 className="profile-hero__name">{displayName}</h2>
          <p className="profile-hero__email">{user.email}</p>
          <div className="profile-hero__chips">
            <span className="profile-chip">{roleLabel(user.role)}</span>
            {templateLabel ? <span className="profile-chip profile-chip--muted">{templateLabel}</span> : null}
            <span className="profile-chip profile-chip--muted">{school.name}</span>
          </div>
        </div>
      </header>

      <div className="profile-grid">
        <section className="profile-card">
          <h3 className="profile-card__title">
            <DashIcon name="settings" className="dash-icon--sm" />
            Account details
          </h3>
          <dl className="profile-facts">
            <div>
              <dt>School</dt>
              <dd>{school.name}</dd>
            </div>
            <div>
              <dt>Join code</dt>
              <dd>
                <code>{school.joinCode}</code>
              </dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            {user.externalRef ? (
              <div>
                <dt>ID / ref</dt>
                <dd>{user.externalRef}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {student ? (
          <section className="profile-card">
            <h3 className="profile-card__title">
              <DashIcon name="students" className="dash-icon--sm" />
              Student record
            </h3>
            <dl className="profile-facts">
              <div>
                <dt>Grade</dt>
                <dd>
                  {student.grade}
                  {student.section ? ` · ${student.section}` : ""}
                </dd>
              </div>
              {student.fan ? (
                <div>
                  <dt>FAN</dt>
                  <dd>{student.fan}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {teacher ? (
          <section className="profile-card">
            <h3 className="profile-card__title">
              <DashIcon name="teachers" className="dash-icon--sm" />
              Teaching
            </h3>
            <dl className="profile-facts">
              <div>
                <dt>Homeroom</dt>
                <dd>
                  {teacher.homeroomGrade ?
                    `${teacher.homeroomGrade}${teacher.homeroomSection ? ` · ${teacher.homeroomSection}` : ""}`
                  : "—"}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        {children.length > 0 ? (
          <section className="profile-card profile-card--wide">
            <h3 className="profile-card__title">
              <DashIcon name="users" className="dash-icon--sm" />
              Linked students
            </h3>
            <ul className="profile-children">
              {children.map((c) => (
                <li key={`${c.name}-${c.grade}`}>
                  <strong>{c.name}</strong>
                  <span>
                    {c.grade}
                    {c.section ? ` · ${c.section}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="profile-card profile-card--wide profile-card--form">
          <h3 className="profile-card__title">Edit profile</h3>
          <p className="profile-card__hint">
            Update your name, phone, or password. Email changes require your school admin.
          </p>
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
              <span>Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251…"
              />
            </label>
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
              <button type="submit" className="att-btn att-btn--primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
