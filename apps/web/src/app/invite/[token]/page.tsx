"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { fetchInvitePreview, joinInvite, type InvitePreview } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

export default function InvitePage() {
  const { t } = useLocale();
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
      .catch(() => setLoadError(t("inviteAcceptUi.loadInvalid")));
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
        setError(submitError instanceof Error ? submitError.message : t("inviteAcceptUi.joinFailed"));
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="auth-scene">
      <header className="auth-topbar">
        <Link href="/" className="auth-logo no-underline">
          <BrandMark className="logo-mark" />
          <span>{BRAND_NAME}</span>
        </Link>
        <Link href="/login" className="auth-topbar-link">
          {t("inviteAcceptUi.login")}
        </Link>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          {loadError ? (
            <>
              <h1 className="auth-heading">{t("inviteAcceptUi.invalidTitle")}</h1>
              <p className="auth-subheading">{loadError}</p>
              <p className="auth-card-footer mt-6">
                <Link href="/login" className="auth-link">
                  {t("inviteAcceptUi.goSignIn")}
                </Link>
              </p>
            </>
          ) : !preview ? (
            <p className="c-muted">{t("inviteAcceptUi.loading")}</p>
          ) : !preview.valid ? (
            <>
              <h1 className="auth-heading">{t("inviteAcceptUi.expiredTitle")}</h1>
              <p className="auth-subheading">
                {t("inviteAcceptUi.expiredBody", { school: preview.schoolName })}
              </p>
            </>
          ) : (
            <>
              <p className="auth-eyebrow">{t("inviteAcceptUi.eyebrow")}</p>
              <h1 className="auth-heading">
                {t("inviteAcceptUi.joinSchool", { school: preview.schoolName })}
              </h1>
              <p className="auth-subheading">
                {preview.label
                  ? t("inviteAcceptUi.createRoleLabel", {
                      role: preview.role,
                      label: preview.label,
                    })
                  : t("inviteAcceptUi.createRole", { role: preview.role })}
              </p>

              <form onSubmit={onSubmit} className="auth-form-stack auth-card-body">
                {preview.role === "student" ? (
                  <AuthInput
                    id="invite-student-id"
                    label={t("inviteAcceptUi.studentId")}
                    icon="none"
                    placeholder={t("inviteAcceptUi.studentIdPh")}
                    value={studentId}
                    onChange={setStudentId}
                    required
                  />
                ) : null}

                <div className="auth-name-row">
                  <AuthInput
                    id="invite-first"
                    label={t("inviteAcceptUi.firstName")}
                    icon="user"
                    value={firstName}
                    onChange={setFirstName}
                    required
                  />
                  <AuthInput
                    id="invite-last"
                    label={t("inviteAcceptUi.lastName")}
                    icon="user"
                    value={lastName}
                    onChange={setLastName}
                    required
                  />
                </div>

                {preview.role !== "student" ? (
                  <AuthInput
                    id="invite-username"
                    label={t("inviteAcceptUi.username")}
                    icon="user"
                    value={username}
                    onChange={setUsername}
                    required
                  />
                ) : null}
                <AuthInput
                  id="invite-email"
                  label={t("inviteAcceptUi.email")}
                  type="email"
                  icon="email"
                  value={email}
                  onChange={setEmail}
                />
                <AuthInput
                  id="invite-password"
                  label={t("inviteAcceptUi.password")}
                  type="password"
                  icon="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={8}
                />

                <AuthSubmitButton
                  loading={loading}
                  loadingLabel={t("inviteAcceptUi.joining")}
                  label={t("inviteAcceptUi.accept")}
                />
              </form>

              {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
