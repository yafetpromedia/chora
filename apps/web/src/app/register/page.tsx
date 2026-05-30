"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { GoogleOAuthProviderWrapper } from "@/components/auth/google-oauth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { registerSchool } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";

export default function RegisterSchoolPage() {
  const [schoolName, setSchoolName] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function completeAuth(action: () => ReturnType<typeof registerSchool>) {
    setLoading(true);
    setError("");
    try {
      const response = await action();
      persistAuthSession(response);
      router.push(getRolePath(response.user.role));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void completeAuth(() =>
      registerSchool({
        schoolName: schoolName.trim(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
      }),
    );
  }

  return (
    <GoogleOAuthProviderWrapper>
      <AuthShell
        mode="register"
        title="Register your school"
        subtitle="For principals and school administrators. Creates your campus workspace and admin account."
        footer={
          <>
            Staff or family member?{" "}
            <Link href="/join" className="auth-link">
              Join with school code
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} className="auth-form-stack">
          <AuthInput
            id="school-name"
            label="School name"
            icon="none"
            placeholder="Bright Side International School"
            value={schoolName}
            onChange={setSchoolName}
            required
          />

          <div className="auth-name-row">
            <AuthInput
              id="admin-first"
              label="Your first name"
              icon="user"
              autoComplete="given-name"
              placeholder="Jane"
              value={adminFirstName}
              onChange={setAdminFirstName}
              required
            />
            <AuthInput
              id="admin-last"
              label="Your last name"
              icon="user"
              autoComplete="family-name"
              placeholder="Doe"
              value={adminLastName}
              onChange={setAdminLastName}
              required
            />
          </div>

          <AuthInput
            id="school-email"
            label="Work email"
            type="email"
            icon="email"
            autoComplete="email"
            placeholder="principal@yourschool.edu"
            value={email}
            onChange={setEmail}
            required
          />

          <AuthInput
            id="school-phone"
            label="Phone (optional)"
            icon="none"
            autoComplete="tel"
            placeholder="+251 9xx xxx xxx"
            value={phone}
            onChange={setPhone}
          />

          <AuthInput
            id="school-country"
            label="Country (optional)"
            icon="none"
            placeholder="Ethiopia"
            value={country}
            onChange={setCountry}
          />

          <AuthInput
            id="school-password"
            label="Password"
            type="password"
            icon="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={setPassword}
            required
            minLength={8}
          />

          <AuthSubmitButton loading={loading} loadingLabel="Creating school…" label="Start your school" />
        </form>

        <p className="auth-legal">
          Students and teachers cannot register here. Your admin will share a school code after setup.
        </p>

        {error ? (
          <p className="auth-alert auth-alert--error" role="alert">
            {error}
          </p>
        ) : null}
      </AuthShell>
    </GoogleOAuthProviderWrapper>
  );
}
