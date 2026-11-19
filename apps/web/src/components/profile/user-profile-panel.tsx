"use client";



import { FormEvent, useEffect, useState } from "react";

import { DashIcon } from "@/components/dashboard/dash-icons";

import { ROLE_TEMPLATE_LABELS } from "@/lib/permissions";

import {

  getMyProfile,

  updateMyProfile,

  type UserProfile,

} from "@/lib/profile";
import { AppToast } from "@/components/ui/app-toast";

function formatDate(iso: string) {

  try {

    return new Date(iso).toLocaleDateString(undefined, {

      month: "short",

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

        setError(err instanceof Error ? err.message : "Could not load profile");

      } finally {

        setLoading(false);

      }

    })();

  }, []);



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

      setNewPassword("");

      setToast("Profile saved.");

    } catch (err) {

      setError(err instanceof Error ? err.message : "Could not save profile");

    } finally {

      setSaving(false);

    }

  }



  if (loading) {

    return (

      <div className="profile-loading">

        <div className="profile-loading__spinner" aria-hidden />

        <p>Loading your profile…</p>

      </div>

    );

  }



  if (!profile) {

    return (

      <div className="profile-loading">

        <p>{error || "Profile unavailable."}</p>

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

        <span className="profile-hero__avatar" aria-hidden>

          {displayName.slice(0, 2).toUpperCase()}

        </span>

        <div className="profile-hero__text">

          <p className="profile-hero__eyebrow">Your account</p>

          <h2 className="profile-hero__name">{displayName}</h2>

          <p className="profile-hero__email">

            @{user.username}

            <span className="profile-hero__email-sep"> · </span>

            {user.email}

          </p>

          <div className="profile-hero__chips">

            <span className="profile-chip">{roleLabel(user.role)}</span>

            {templateLabel ? (

              <span className="profile-chip profile-chip--muted">{templateLabel}</span>

            ) : null}

          </div>

        </div>

        <div className="profile-hero__stats">

          <div className="profile-stat">

            <span className="profile-stat__value">{school.joinCode}</span>

            <span className="profile-stat__label">Join code</span>

          </div>

          <div className="profile-stat">

            <span className="profile-stat__value">{formatDate(user.createdAt)}</span>

            <span className="profile-stat__label">Member since</span>

          </div>

          {user.phone ? (

            <div className="profile-stat">

              <span className="profile-stat__value">{user.phone}</span>

              <span className="profile-stat__label">Phone</span>

            </div>

          ) : null}

        </div>

      </header>



      <div className="profile-layout">

        <aside className="profile-aside">

          <section className="profile-card">

            <div className="profile-card__head">

              <div>

                <h3 className="profile-card__title">Account details</h3>

                <p className="profile-card__sub">{school.name}</p>

              </div>

              <span className="profile-card__icon" aria-hidden>

                <DashIcon name="settings" />

              </span>

            </div>

            <dl className="profile-facts">

              <div>

                <dt>School</dt>

                <dd>{school.name}</dd>

              </div>

              <div>

                <dt>Username</dt>

                <dd>

                  <code>{user.username}</code>

                </dd>

              </div>

              <div>

                <dt>Email</dt>

                <dd>{user.email}</dd>

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

              <div className="profile-card__head">

                <div>

                  <h3 className="profile-card__title">Student record</h3>

                  <p className="profile-card__sub">Enrollment details</p>

                </div>

                <span className="profile-card__icon" aria-hidden>

                  <DashIcon name="students" />

                </span>

              </div>

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

              <div className="profile-card__head">

                <div>

                  <h3 className="profile-card__title">Teaching</h3>

                  <p className="profile-card__sub">Your campus role</p>

                </div>

                <span className="profile-card__icon" aria-hidden>

                  <DashIcon name="teachers" />

                </span>

              </div>

              {homeroomLabel ? (

                <dl className="profile-facts">

                  <div>

                    <dt>Homeroom</dt>

                    <dd>{homeroomLabel}</dd>

                  </div>

                  {templateLabel ? (

                    <div>

                      <dt>Role</dt>

                      <dd>{templateLabel}</dd>

                    </div>

                  ) : null}

                </dl>

              ) : (

                <p className="profile-facts__empty">

                  No homeroom assigned yet. Your admin can link you to a class.

                </p>

              )}

            </section>

          ) : null}



          {children.length > 0 ? (

            <section className="profile-card">

              <div className="profile-card__head">

                <div>

                  <h3 className="profile-card__title">Linked students</h3>

                  <p className="profile-card__sub">{children.length} linked</p>

                </div>

                <span className="profile-card__icon" aria-hidden>

                  <DashIcon name="users" />

                </span>

              </div>

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

        </aside>



        <main className="profile-main">

          <section className="profile-card profile-card--form">

            <div className="profile-card__head">

              <div>

                <h3 className="profile-card__title">Edit profile</h3>

                <p className="profile-card__sub">Update your sign-in details</p>

              </div>

              <span className="profile-card__icon" aria-hidden>

                <DashIcon name="profile" />

              </span>

            </div>

            <p className="profile-card__hint">

              Update your username, email, name, phone, or password. Sign in with username and school code{" "}

              <code>{school.joinCode}</code>, or with your email.

            </p>

            <form className="profile-form" onSubmit={(e) => void onSubmit(e)}>

              <label className="profile-field">

                <span>Username (sign-in)</span>

                <input

                  value={username}

                  onChange={(e) => setUsername(e.target.value)}

                  required

                  minLength={3}

                  autoComplete="username"

                  placeholder="Letters, numbers, . _ -"

                />

              </label>

              <label className="profile-field">

                <span>Email</span>

                <input

                  type="email"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                  required

                  autoComplete="email"

                  placeholder="you@example.com"

                />

              </label>

              <div className="profile-form__row">

                <label className="profile-field">

                  <span>First name</span>

                  <input

                    value={firstName}

                    onChange={(e) => setFirstName(e.target.value)}

                    required

                  />

                </label>

                <label className="profile-field">

                  <span>Last name</span>

                  <input

                    value={lastName}

                    onChange={(e) => setLastName(e.target.value)}

                    required

                  />

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

                <button type="submit" className="profile-btn" disabled={saving}>

                  {saving ? "Saving…" : "Save changes"}

                </button>

              </div>

            </form>

          </section>

        </main>

      </div>

    </div>

  );

}

