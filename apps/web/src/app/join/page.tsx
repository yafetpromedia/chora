"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthInput } from "@/components/auth/auth-input";
import { JoinFooterLinks, JoinShell } from "@/components/auth/join-shell";
import { validateSchoolCode, verifyStudentEnrollment } from "@/lib/api";

const STEPS = [
  { label: "School code", desc: "Verify your school" },
  { label: "Student check", desc: "Confirm enrollment" },
] as const;

export default function JoinSchoolPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [verified, setVerified] = useState<{
    studentName: string;
    joinCode: string;
    studentId: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onValidateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = schoolCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter your school code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const school = await validateSchoolCode(code);
      setSchoolCode(school.joinCode);
      setSchoolName(school.name);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid school code");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter your first and last name.");
      return;
    }
    if (!studentId.trim()) {
      setError("Enter your student ID.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await verifyStudentEnrollment({
        schoolCode,
        studentId: studentId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setVerified({
        studentName: result.studentName,
        joinCode: result.joinCode,
        studentId: result.studentId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify enrollment");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError("");
    setVerified(null);
    setStep(0);
  }

  return (
    <JoinShell
      activeStep={step}
      stepCount={STEPS.length}
      stepLabel={STEPS[step].label}
      schoolCode={schoolCode}
      schoolName={schoolName}
      error={error || undefined}
      footer={<JoinFooterLinks />}
    >
      <form
        onSubmit={(e) =>
          void (step === 0 ? onValidateSchool(e) : onVerifyStudent(e))
        }
        className="reg-form"
      >
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.section
              key="code"
              className="reg-form__step"
              aria-labelledby="join-step-code"
              initial={reduce ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -10 }}
              transition={{ duration: 0.28 }}
            >
              <h2 id="join-step-code" className="reg-form__title">
                Student portal check
              </h2>
              <p className="join-form__hint">
                Only enrolled students can use the portal. Enter your school code
                to begin.
              </p>
              <p className="join-form__invite-note">
                <strong>Teachers &amp; parents:</strong> ask your school admin for
                an invite link — you cannot self-register here.
              </p>

              <div className="reg-form__grid reg-form__grid--single">
                <AuthInput
                  id="join-code"
                  label="School code"
                  icon="none"
                  variant="login"
                  placeholder="e.g. WWHE84"
                  value={schoolCode}
                  onChange={(v) => setSchoolCode(v.toUpperCase())}
                  required
                />
              </div>
            </motion.section>
          ) : null}

          {step === 1 && !verified ? (
            <motion.section
              key="account"
              className="reg-form__step"
              aria-labelledby="join-step-account"
              initial={reduce ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -10 }}
              transition={{ duration: 0.28 }}
            >
              <div className="login-form__school-bar">
                <div>
                  <p className="login-form__school-label">School verified</p>
                  <p className="login-form__school-name">{schoolName}</p>
                  <p className="login-form__school-code">Code: {schoolCode}</p>
                </div>
              </div>

              <h2 id="join-step-account" className="reg-form__title">
                Confirm you are enrolled
              </h2>
              <p className="join-form__hint">
                We match your <strong>Student ID</strong> and name against school
                records. This stops someone from joining as the wrong role.
              </p>

              <div className="reg-form__grid">
                <div className="reg-form__full">
                  <AuthInput
                    id="student-id"
                    label="Student ID"
                    icon="none"
                    variant="login"
                    placeholder="STU-XXXXXXXX"
                    value={studentId}
                    onChange={setStudentId}
                    required
                  />
                </div>
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
              </div>
            </motion.section>
          ) : null}

          {verified ? (
            <motion.section
              key="done"
              className="reg-form__step"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="join-form__success">
                <p className="join-form__success-eyebrow">Verified</p>
                <h2 className="join-form__success-title">{verified.studentName}</h2>
                <p className="join-form__success-sub">
                  You are enrolled at <strong>{schoolName}</strong>. Sign in with
                  school code <strong>{verified.joinCode}</strong>, student ID{" "}
                  <strong>{verified.studentId}</strong>, and the password your
                  admin gave you.
                </p>
                <button
                  type="button"
                  className="reg-form__next"
                  onClick={() => router.push("/login")}
                >
                  Go to sign in →
                </button>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        {!verified ? (
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
              <span />
            )}
            <button type="submit" className="reg-form__next" disabled={loading}>
              {loading
                ? step === 0
                  ? "Checking…"
                  : "Verifying…"
                : step === 0
                  ? "Continue →"
                  : "Verify enrollment →"}
            </button>
          </div>
        ) : null}
      </form>
    </JoinShell>
  );
}
