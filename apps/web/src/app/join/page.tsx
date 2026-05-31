"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCardFooterLinks } from "@/components/auth/auth-card-footer-links";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { JoinRoleSelector, type JoinRole } from "@/components/auth/join-role-selector";
import { joinSchool } from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import { getRolePath } from "@/lib/auth";

export default function JoinSchoolPage() {
  const [schoolCode, setSchoolCode] = useState("");
  const [role, setRole] = useState<JoinRole>("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function completeAuth(action: () => ReturnType<typeof joinSchool>) {
    setLoading(true);
    setError("");
    try {
      const response = await action();
      persistAuthSession(response);
      router.push(getRolePath(response.user.role));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not join school");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void completeAuth(() =>
      joinSchool({
        schoolCode: schoolCode.trim().toUpperCase(),
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        externalRef: role === "student" ? studentId.trim() : undefined,
      }),
    );
  }

  return (
    <AuthCardShell
      title="Join your school"
      subtitle="Enter your school code and create your account."
      topLinkHref="/"
      topLinkLabel="Home"
      error={error || undefined}
      hint="Demo code: BRIGHT1"
      footer={
        <AuthCardFooterLinks
          links={[
            { href: "/login", label: "Sign in" },
            { href: "/register", label: "Register your school" },
          ]}
        />
      }
    >
      <form onSubmit={onSubmit} className="auth-page-form auth-page-form--grid">
        <div className="auth-page-span-full">
          <AuthInput
            id="join-code"
            label="School code"
            icon="none"
            variant="login"
            placeholder="e.g. BRIGHT1"
            value={schoolCode}
            onChange={(v) => setSchoolCode(v.toUpperCase())}
            required
          />
        </div>

        <fieldset className="auth-page-fieldset auth-page-span-full">
          <legend className="auth-input-label">I am a</legend>
          <JoinRoleSelector value={role} onChange={setRole} compact />
        </fieldset>

        {role === "student" ? (
          <div className="auth-page-span-full">
            <AuthInput
              id="student-id"
              label="Student ID"
              icon="none"
              variant="login"
              placeholder="Roll number"
              value={studentId}
              onChange={setStudentId}
              required
            />
          </div>
        ) : null}

        <AuthInput
          id="join-first"
          label="First name"
          icon="user"
          variant="login"
          autoComplete="given-name"
          placeholder="Jane"
          value={firstName}
          onChange={setFirstName}
          required
        />
        <AuthInput
          id="join-last"
          label="Last name"
          icon="user"
          variant="login"
          autoComplete="family-name"
          placeholder="Doe"
          value={lastName}
          onChange={setLastName}
          required
        />

        <AuthInput
          id="join-email"
          label="Email"
          type="email"
          icon="email"
          variant="login"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={setEmail}
          required
        />
        <AuthInput
          id="join-password"
          label="Password"
          type="password"
          icon="password"
          variant="login"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
        />

        <div className="auth-page-span-full">
          <AuthSubmitButton
            variant="page"
            loading={loading}
            loadingLabel="Joining…"
            label="Join school"
          />
        </div>
      </form>
    </AuthCardShell>
  );
}
