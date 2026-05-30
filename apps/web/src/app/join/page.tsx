"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell
      mode="login"
      title="Join your school"
        subtitle="Use your school code, or open an invitation link from your admin."
      footer={
        <>
          Running a school?{" "}
          <Link href="/register" className="auth-link">
            Register your school
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="auth-form-stack">
        <AuthInput
          id="join-code"
          label="School code"
          icon="none"
          placeholder="e.g. BRIGHT1"
          value={schoolCode}
          onChange={(v) => setSchoolCode(v.toUpperCase())}
          required
        />

        <fieldset className="auth-fieldset">
          <legend className="auth-input-label">I am a</legend>
          <JoinRoleSelector value={role} onChange={setRole} />
        </fieldset>

        {role === "student" ? (
          <AuthInput
            id="student-id"
            label="Student ID"
            icon="none"
            placeholder="Roll number from your school"
            value={studentId}
            onChange={setStudentId}
            required
          />
        ) : null}

        <div className="auth-name-row">
          <AuthInput
            id="join-first"
            label="First name"
            icon="user"
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
            autoComplete="family-name"
            placeholder="Doe"
            value={lastName}
            onChange={setLastName}
            required
          />
        </div>

        <AuthInput
          id="join-email"
          label="Email"
          type="email"
          icon="email"
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
        />

        <AuthSubmitButton loading={loading} loadingLabel="Joining…" label="Join school" />
      </form>

      {error ? (
        <p className="auth-alert auth-alert--error" role="alert">
          {error}
        </p>
      ) : null}
    </AuthShell>
  );
}
