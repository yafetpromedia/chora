"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { fetchInvitePreview, joinInvite, type InvitePreview } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";

export default function InvitePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const router = useRouter();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    void fetchInvitePreview(token)
      .then(setPreview)
      .catch(() => setLoadError("This invitation link is invalid or has expired."));
  }, [token]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview?.valid) return;

    setLoading(true);
    setError("");
    void joinInvite({
      inviteToken: token,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username:
        preview.role === "student" ? studentId.trim() : username.trim(),
      email: email.trim() || undefined,
      password,
      externalRef: preview.role === "student" ? studentId.trim() : undefined,
    })
      .then((response) => {
        persistAuthSession(response);
        router.push(getRolePath(response.user.role));
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : "Could not join");
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="auth-scene">
      <header className="auth-topbar">
        <Link href="/" className="auth-logo no-underline">
          <span className="logo-mark">C1</span>
          <span>CampusOne</span>
        </Link>
        <Link href="/login" className="auth-topbar-link">
          Login
        </Link>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          {loadError ? (
            <>
              <h1 className="auth-heading">Invalid invitation</h1>
              <p className="auth-subheading">{loadError}</p>
              <p className="auth-card-footer mt-6">
                <Link href="/login" className="auth-link">
                  Go to sign in
                </Link>
              </p>
            </>
          ) : !preview ? (
            <p className="c-muted">Loading invitation…</p>
          ) : !preview.valid ? (
            <>
              <h1 className="auth-heading">Invitation expired</h1>
              <p className="auth-subheading">
                Ask <strong>{preview.schoolName}</strong> admin for a new link.
              </p>
            </>
          ) : (
            <>
              <p className="auth-eyebrow">You&apos;re invited</p>
              <h1 className="auth-heading">Join {preview.schoolName}</h1>
              <p className="auth-subheading">
                Create your <strong className="capitalize">{preview.role}</strong> account
                {preview.label ? ` · ${preview.label}` : ""}.
              </p>

              <form onSubmit={onSubmit} className="auth-form-stack auth-card-body">
                {preview.role === "student" ? (
                  <AuthInput
                    id="invite-student-id"
                    label="Student ID"
                    icon="none"
                    placeholder="From your school"
                    value={studentId}
                    onChange={setStudentId}
                    required
                  />
                ) : null}

                <div className="auth-name-row">
                  <AuthInput
                    id="invite-first"
                    label="First name"
                    icon="user"
                    value={firstName}
                    onChange={setFirstName}
                    required
                  />
                  <AuthInput
                    id="invite-last"
                    label="Last name"
                    icon="user"
                    value={lastName}
                    onChange={setLastName}
                    required
                  />
                </div>

                {preview.role !== "student" ? (
                  <AuthInput
                    id="invite-username"
                    label="Username"
                    icon="user"
                    value={username}
                    onChange={setUsername}
                    required
                  />
                ) : null}
                <AuthInput
                  id="invite-email"
                  label="Email (contact)"
                  type="email"
                  icon="email"
                  value={email}
                  onChange={setEmail}
                />
                <AuthInput
                  id="invite-password"
                  label="Password"
                  type="password"
                  icon="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={8}
                />

                <AuthSubmitButton loading={loading} loadingLabel="Joining…" label="Accept invitation" />
              </form>

              {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
