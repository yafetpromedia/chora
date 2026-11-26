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
import { SchoolWelcomeDialog } from "@/components/auth/school-welcome-dialog";
import {
  fetchCurriculumPackages,
  registerSchool,
  type CurriculumPackageOption,
  type SchoolType,
} from "@/lib/api";
import { persistAuthSession } from "@/lib/auth-session";
import {
  persistPendingSchoolWelcome,
  readPendingSchoolWelcome,
  clearPendingSchoolWelcome,
  type PendingSchoolWelcome,
} from "@/lib/school-welcome";
import { useLocale } from "@/components/i18n/locale-provider";

const SCHOOL_TYPES: { value: SchoolType; labelKey: string }[] = [
  { value: "KINDERGARTEN", labelKey: "register.kindergarten" },
  { value: "PRIMARY", labelKey: "register.primary" },
  { value: "SECONDARY", labelKey: "register.secondary" },
  { value: "PREPARATORY", labelKey: "register.preparatory" },
  { value: "MIXED", labelKey: "register.mixed" },
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
  const { t } = useLocale();
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
  const [welcome, setWelcome] = useState<PendingSchoolWelcome | null>(null);

  useEffect(() => {
    void fetchCurriculumPackages()
      .then(setPackages)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void (async () => {
      const pending = readPendingSchoolWelcome();
      if (pending) setWelcome(pending);
    })();
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
      const joinCode = response.school?.joinCode;
      const registeredName = response.school?.name ?? schoolName.trim();
      const nextPath = response.school?.setupComplete ? "/admin" : "/admin/setup";
      if (joinCode) {
        const pending: PendingSchoolWelcome = {
          schoolName: registeredName,
          joinCode,
          nextPath,
          adminUsername: username.trim(),
        };
        persistPendingSchoolWelcome(pending);
        setWelcome(pending);
      } else {
        router.push(nextPath);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
                  {t("register.schoolDetails")}
                </h2>
                <p className="reg-form__lead">{t("register.schoolDetailsLead")}</p>
              </header>
              <div className="reg-form__grid">
                <div className="reg-form__full">
                  <AuthInput
                    id="school-name"
                    label={t("register.schoolName")}
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
                    {t("register.starterPackage")}
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
                    {t("register.schoolType")}
                  </label>
                  <select
                    id="school-type"
                    className="auth-input auth-input--login auth-input--login-plain reg-select"
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value as SchoolType)}
                  >
                    {SCHOOL_TYPES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {t(st.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="reg-form__full">
                  <AuthInput
                    id="school-address"
                    label={t("register.address")}
                    icon="none"
                    variant="login"
                    placeholder="Bole, Addis Ababa"
                    value={address}
                    onChange={setAddress}
                  />
                </div>
                <AuthInput
                  id="school-contact-email"
                  label={t("register.schoolEmail")}
                  type="email"
                  icon="email"
                  variant="login"
                  placeholder="info@brightside.edu.et"
                  value={schoolEmail}
                  onChange={setSchoolEmail}
                />
                <AuthInput
                  id="school-phone"
                  label={t("register.phone")}
                  icon="none"
                  variant="login"
                  autoComplete="tel"
                  placeholder="+251 911 234 567"
                  value={phone}
                  onChange={setPhone}
                />
                <div className="reg-field reg-form__full">
                  <label className="auth-input-label" htmlFor="school-country">
                    {t("register.country")}
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
                  {t("register.adminLogin")}
                </h2>
                <p className="reg-form__lead">{t("register.adminLoginLead")}</p>
              </header>
              <div className="reg-form__grid">
                <AuthInput
                  id="admin-first"
                  label={t("register.firstName")}
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
                  label={t("register.lastName")}
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
                  label={t("register.username")}
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
                  label={t("register.emailOptional")}
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
                    label={t("register.password")}
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
              ← {t("register.back")}
            </button>
          ) : (
            <span className="reg-form__spacer" aria-hidden />
          )}
          {step === 0 ? (
            <button type="submit" className="reg-form__next">
              {t("register.next")} →
            </button>
          ) : (
            <AuthSubmitButton
              variant="page"
              loading={loading}
              loadingLabel={t("register.creating")}
              label={t("register.createWorkspace")}
            />
          )}
        </div>
      </form>
    </RegisterShell>

      <SchoolWelcomeDialog
        open={welcome !== null}
        schoolName={welcome?.schoolName ?? ""}
        joinCode={welcome?.joinCode ?? ""}
        adminUsername={welcome?.adminUsername ?? ""}
        onContinue={() => {
          const path = welcome?.nextPath ?? "/admin/setup";
          clearPendingSchoolWelcome();
          setWelcome(null);
          router.push(path);
        }}
      />
    </>
  );
}
