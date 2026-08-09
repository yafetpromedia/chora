"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  RegisterFooterLinks,
  RegisterShell,
} from "@/components/auth/register-shell";
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
  { value: "MIXED", label: "Mixed (K–12)" },
];

const COUNTRIES = [
  "Ethiopia",
  "Kenya",
  "Djibouti",
  "Somalia",
  "Eritrea",
  "South Sudan",
  "Other",
] as const;

export default function RegisterSchoolPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType>("MIXED");
  const [address, setAddress] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Ethiopia");
  const [password, setPassword] = useState("");
  const [curriculumPackageKey, setCurriculumPackageKey] = useState("ETHIOPIAN_PRIVATE");
  const [packages, setPackages] = useState<CurriculumPackageOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchCurriculumPackages()
      .then(setPackages)
      .catch(() => undefined);
  }, []);

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!schoolName.trim()) return "Enter your school name.";
      return null;
    }
    if (!adminFirstName.trim() || !adminLastName.trim()) {
      return "Enter your first and last name.";
    }
    if (!username.trim()) return "Choose a username for sign-in.";
    if (username.trim().length < 3) return "Username must be at least 3 characters.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  function goNext() {
    const message = validateStep(0);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep(1);
  }

  function goBack() {
    setError("");
    setStep(0);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) {
      goNext();
      return;
    }
    const message = validateStep(1);
    if (message) {
      setError(message);
      return;
    }
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
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        phone: phone.trim() || undefined,
        country: country.trim() || "Ethiopia",
        curriculumPackageKey,
      });
      persistAuthSession(response);
      router.push(response.school?.setupComplete ? "/admin" : "/admin/setup");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RegisterShell
      activeStep={step}
      error={error || undefined}
      footer={<RegisterFooterLinks />}
    >
      <form onSubmit={(e) => void onSubmit(e)} className="reg-form">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.section
              key="school"
              className="reg-form__step"
              aria-labelledby="reg-school"
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <header className="reg-form__head">
                <h2 id="reg-school" className="reg-form__title">
                  School details
                </h2>
                <p className="reg-form__lead">
                  Tell us about the school. You can edit contact info later.
                </p>
              </header>
              <div className="reg-form__grid">
                <div className="reg-form__full">
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
                <div className="reg-field">
                  <label className="auth-input-label" htmlFor="curriculum-package">
                    Starter package
                  </label>
                  <select
                    id="curriculum-package"
                    className="auth-input auth-input--login auth-input--login-plain reg-select"
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
                <div className="reg-field">
                  <label className="auth-input-label" htmlFor="school-type">
                    School type
                  </label>
                  <select
                    id="school-type"
                    className="auth-input auth-input--login auth-input--login-plain reg-select"
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
                <div className="reg-form__full">
                  <AuthInput
                    id="school-address"
                    label="Address"
                    icon="none"
                    variant="login"
                    placeholder="Bole, Addis Ababa"
                    value={address}
                    onChange={setAddress}
                  />
                </div>
                <AuthInput
                  id="school-contact-email"
                  label="School email"
                  type="email"
                  icon="email"
                  variant="login"
                  placeholder="info@brightside.edu.et"
                  value={schoolEmail}
                  onChange={setSchoolEmail}
                />
                <AuthInput
                  id="school-phone"
                  label="Phone"
                  icon="none"
                  variant="login"
                  autoComplete="tel"
                  placeholder="+251 911 234 567"
                  value={phone}
                  onChange={setPhone}
                />
                <div className="reg-field reg-form__full">
                  <label className="auth-input-label" htmlFor="school-country">
                    Country
                  </label>
                  <select
                    id="school-country"
                    className="auth-input auth-input--login auth-input--login-plain reg-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="admin"
              className="reg-form__step"
              aria-labelledby="reg-admin"
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <header className="reg-form__head">
                <h2 id="reg-admin" className="reg-form__title">
                  Admin login
                </h2>
                <p className="reg-form__lead">
                  This is how you&apos;ll sign in to manage the school.
                </p>
              </header>
              <div className="reg-form__grid">
                <AuthInput
                  id="admin-first"
                  label="First name"
                  icon="none"
                  variant="login"
                  autoComplete="given-name"
                  placeholder="Jane"
                  value={adminFirstName}
                  onChange={setAdminFirstName}
                  required
                />
                <AuthInput
                  id="admin-last"
                  label="Last name"
                  icon="none"
                  variant="login"
                  autoComplete="family-name"
                  placeholder="Doe"
                  value={adminLastName}
                  onChange={setAdminLastName}
                  required
                />
                <AuthInput
                  id="admin-username"
                  label="Username"
                  icon="none"
                  variant="login"
                  autoComplete="username"
                  placeholder="jane.admin"
                  value={username}
                  onChange={setUsername}
                  required
                />
                <AuthInput
                  id="admin-email"
                  label="Email (optional)"
                  type="email"
                  icon="email"
                  variant="login"
                  autoComplete="email"
                  placeholder="jane@brightside.edu.et"
                  value={email}
                  onChange={setEmail}
                />
                <div className="reg-form__full">
                  <AuthInput
                    id="school-password"
                    label="Password"
                    type="password"
                    icon="password"
                    variant="login"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={setPassword}
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="reg-form__actions">
          {step > 0 ? (
            <button
              type="button"
              className="reg-form__back"
              onClick={goBack}
              disabled={loading}
            >
              ← Back
            </button>
          ) : (
            <span className="reg-form__spacer" aria-hidden />
          )}
          {step === 0 ? (
            <button type="submit" className="reg-form__next">
              Continue →
            </button>
          ) : (
            <AuthSubmitButton
              variant="page"
              loading={loading}
              loadingLabel="Creating school…"
              label="Create workspace"
            />
          )}
        </div>
      </form>
    </RegisterShell>
  );
}
