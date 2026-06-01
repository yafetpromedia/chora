"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCardFooterLinks } from "@/components/auth/auth-card-footer-links";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  fetchCurriculumPackages,
  registerSchool,
  type CurriculumPackageOption,
  type SchoolType,
} from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";

const SCHOOL_TYPES: { value: SchoolType; label: string }[] = [
  { value: "KINDERGARTEN", label: "Kindergarten" },
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "PREPARATORY", label: "Preparatory" },
  { value: "MIXED", label: "Mixed" },
];

export default function RegisterSchoolPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType>("MIXED");
  const [address, setAddress] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [curriculumPackageKey, setCurriculumPackageKey] = useState("ETHIOPIAN_PRIVATE");
  const [packages, setPackages] = useState<CurriculumPackageOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void fetchCurriculumPackages()
      .then(setPackages)
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await registerSchool({
        schoolName: schoolName.trim(),
        schoolType,
        address: address.trim() || undefined,
        schoolEmail: schoolEmail.trim() || undefined,
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
        curriculumPackageKey,
      });
      persistAuthSession(response);
      router.push(
        response.school?.setupComplete ? "/admin" : "/admin/setup",
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardShell
      title="Register your school"
      subtitle="14-day free trial · up to 50 students · no credit card required."
      topLinkHref="/"
      topLinkLabel="Home"
      error={error || undefined}
      footer={
        <AuthCardFooterLinks
          links={[
            { href: "/login", label: "Sign in" },
            { href: "/join", label: "Join with a code" },
          ]}
        />
      }
    >
      <form onSubmit={onSubmit} className="auth-page-form auth-page-form--grid">
        <div className="auth-page-span-full">
          <AuthInput
            id="school-name"
            label="School name"
            icon="none"
            variant="login"
            placeholder="Bright Side International School"
            value={schoolName}
            onChange={setSchoolName}
            required
          />
        </div>

        <div className="auth-page-span-full auth-page-fieldset">
          <label className="auth-input-label" htmlFor="curriculum-package">
            Starter package
          </label>
          <select
            id="curriculum-package"
            className="auth-input auth-input--login auth-input--login-plain"
            value={curriculumPackageKey}
            onChange={(e) => setCurriculumPackageKey(e.target.value)}
          >
            {packages.length === 0 ? (
              <option value="ETHIOPIAN_PRIVATE">Ethiopian private school</option>
            ) : (
              packages.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="auth-page-span-full auth-page-fieldset">
          <label className="auth-input-label" htmlFor="school-type">
            School type
          </label>
          <select
            id="school-type"
            className="auth-input auth-input--login auth-input--login-plain"
            value={schoolType}
            onChange={(e) => setSchoolType(e.target.value as SchoolType)}
          >
            {SCHOOL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <AuthInput
          id="school-address"
          label="Address"
          icon="none"
          variant="login"
          placeholder="City, street"
          value={address}
          onChange={setAddress}
        />
        <AuthInput
          id="school-contact-email"
          label="School email"
          type="email"
          icon="email"
          variant="login"
          placeholder="info@school.edu"
          value={schoolEmail}
          onChange={setSchoolEmail}
        />

        <AuthInput
          id="admin-first"
          label="Your first name"
          icon="user"
          variant="login"
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
          variant="login"
          autoComplete="family-name"
          placeholder="Doe"
          value={adminLastName}
          onChange={setAdminLastName}
          required
        />

        <div className="auth-page-span-full">
          <AuthInput
            id="admin-email"
            label="Your login email"
            type="email"
            icon="email"
            variant="login"
            autoComplete="email"
            placeholder="you@school.edu"
            value={email}
            onChange={setEmail}
            required
          />
        </div>

        <AuthInput
          id="school-phone"
          label="School phone"
          icon="none"
          variant="login"
          autoComplete="tel"
          placeholder="+251 9xx"
          value={phone}
          onChange={setPhone}
        />
        <AuthInput
          id="school-country"
          label="Country"
          icon="none"
          variant="login"
          placeholder="Ethiopia"
          value={country}
          onChange={setCountry}
        />

        <div className="auth-page-span-full">
          <AuthInput
            id="school-password"
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
        </div>

        <div className="auth-page-span-full">
          <AuthSubmitButton
            variant="page"
            loading={loading}
            loadingLabel="Creating school…"
            label="Start your school"
          />
        </div>
      </form>
    </AuthCardShell>
  );
}
