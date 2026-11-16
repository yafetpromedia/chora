"use client";

import { FormEvent, useMemo, useState } from "react";
import { createStudent } from "@/lib/school-setup";
import type { CreateStudentResult, GradeWithSections } from "@/lib/api";
import {
  sendFayedaCode,
  verifyFayedaCode,
  type FayedaVerifiedProfile,
} from "@/lib/fayeda";
import { StudentPhotoUpload } from "@/components/students/student-photo-upload";

type FayedaStep = "idle" | "code-sent" | "verified";

type Props = {
  grades: GradeWithSections[];
  onClose: () => void;
  onSuccess: (result: CreateStudentResult) => void;
};

function fullName(p: FayedaVerifiedProfile) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function formatDob(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function ageFromDob(iso: string) {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function toDateInputValue(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function StudentRegisterDrawer({ grades, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState<"" | "MALE" | "FEMALE" | "OTHER">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [sectionId, setSectionId] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fayedaStep, setFayedaStep] = useState<FayedaStep>("idle");
  const [fayedaId, setFayedaId] = useState("");
  const [fayedaSession, setFayedaSession] = useState<string | null>(null);
  const [fayedaMaskedPhone, setFayedaMaskedPhone] = useState("");
  const [fayedaCode, setFayedaCode] = useState("");
  const [fayedaProfile, setFayedaProfile] = useState<FayedaVerifiedProfile | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [fayedaBusy, setFayedaBusy] = useState(false);

  const selectedGrade = grades.find((g) => g.id === gradeId);
  const identityLocked = fayedaStep === "verified" && fayedaProfile !== null;
  const age = dateOfBirth ? ageFromDob(dateOfBirth) : null;

  const canSubmit = useMemo(() => {
    const base =
      idNumber.trim() &&
      gender &&
      dateOfBirth &&
      fatherName.trim() &&
      fatherPhone.trim().length >= 9 &&
      motherName.trim() &&
      motherPhone.trim().length >= 9 &&
      gradeId;
    if (manualMode || fayedaStep !== "verified") {
      return Boolean(base && firstName.trim() && lastName.trim());
    }
    return Boolean(base);
  }, [
    idNumber,
    gender,
    dateOfBirth,
    fatherName,
    fatherPhone,
    motherName,
    motherPhone,
    gradeId,
    manualMode,
    fayedaStep,
    firstName,
    lastName,
  ]);

  function resetFayeda() {
    setFayedaStep("idle");
    setFayedaSession(null);
    setFayedaMaskedPhone("");
    setFayedaCode("");
    setFayedaProfile(null);
    setFayedaId("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setIdNumber("");
    setGender("");
    setDateOfBirth("");
    setAddress("");
  }

  function suggestAddressFromFayeda(profile: FayedaVerifiedProfile) {
    return [profile.woreda, profile.zone, profile.region]
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(", ");
  }

  function applyFayedaProfile(profile: FayedaVerifiedProfile) {
    setFayedaProfile(profile);
    setFirstName(profile.firstName);
    setMiddleName(profile.middleName ?? "");
    setLastName(profile.lastName);
    setPhotoUrl(profile.photoUrl);
    if (profile.fcn) setIdNumber(profile.fcn);
    if (profile.gender) setGender(profile.gender);
    if (profile.dateOfBirth) setDateOfBirth(toDateInputValue(profile.dateOfBirth));
    if (profile.phone && !fatherPhone) setFatherPhone(profile.phone);
    const suggested = suggestAddressFromFayeda(profile);
    if (suggested) setAddress(suggested);
  }

  async function onSendFayedaCode() {
    const id = fayedaId.replace(/\D/g, "");
    if (id.length !== 12 && id.length !== 16) {
      setError("Enter a valid FAN (16 digits) or FCN (12 digits)");
      return;
    }
    setFayedaBusy(true);
    setError("");
    try {
      const result = await sendFayedaCode(id);
      setFayedaSession(result.sessionId);
      setFayedaMaskedPhone(result.maskedPhone);
      setFayedaStep("code-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code");
    } finally {
      setFayedaBusy(false);
    }
  }

  async function onVerifyFayedaCode() {
    if (!fayedaSession) return;
    setFayedaBusy(true);
    setError("");
    try {
      const profile = await verifyFayedaCode(fayedaSession, fayedaCode);
      applyFayedaProfile(profile);
      setFayedaStep("verified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setFayedaBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !gender) return;
    setLoading(true);
    setError("");
    try {
      const result = await createStudent({
        firstName,
        middleName: middleName.trim() || undefined,
        lastName,
        gradeId,
        sectionId: sectionId || undefined,
        idNumber: idNumber.trim(),
        gender,
        dateOfBirth: new Date(dateOfBirth).toISOString(),
        fatherName: fatherName.trim(),
        fatherPhone: fatherPhone.trim(),
        motherName: motherName.trim(),
        motherPhone: motherPhone.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        bloodType: bloodType.trim() || undefined,
        photoUrl: photoUrl ?? undefined,
        fayedaVerificationToken: fayedaProfile?.verificationToken,
      });
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="stu-drawer-backdrop" onClick={onClose} aria-hidden />
      <aside className="stu-drawer stu-drawer--wide" role="dialog" aria-labelledby="register-title">
        <header className="stu-drawer__head">
          <div>
            <h2 id="register-title" className="stu-drawer__title">
              Register student
            </h2>
            <p className="stu-drawer__sub">
              Student ID and portal password are assigned on enroll. Enter ID number, parents, sex,
              age, and class.
            </p>
          </div>
          <button type="button" className="stu-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="stu-drawer__body">
          {error ? <p className="stu-toast stu-toast--error">{error}</p> : null}

          {!manualMode ? (
            <section className="fayeda-panel">
              <div className="fayeda-panel__head">
                <span className="fayeda-panel__badge">Fayeda</span>
                <h3 className="fayeda-panel__title">Verify identity (optional)</h3>
              </div>

              {fayedaStep === "verified" && fayedaProfile ? (
                <div className="fayeda-profile">
                  <img
                    className="fayeda-profile__photo"
                    src={fayedaProfile.photoUrl}
                    alt=""
                    width={96}
                    height={120}
                  />
                  <div className="fayeda-profile__body">
                    <p className="fayeda-profile__name">{fullName(fayedaProfile)}</p>
                    <dl className="fayeda-profile__meta">
                      <div>
                        <dt>FAN / FCN</dt>
                        <dd>{fayedaProfile.fan || fayedaProfile.fcn}</dd>
                      </div>
                      <div>
                        <dt>Date of birth</dt>
                        <dd>{formatDob(fayedaProfile.dateOfBirth)}</dd>
                      </div>
                    </dl>
                    <button type="button" className="fayeda-panel__link" onClick={resetFayeda}>
                      Change student
                    </button>
                  </div>
                </div>
              ) : fayedaStep === "idle" ? (
                <>
                  <label className="fayeda-panel__label" htmlFor="reg-fayeda-id">
                    FAN or FCN
                  </label>
                  <input
                    id="reg-fayeda-id"
                    className="auth-input auth-input--login auth-input--login-plain fayeda-panel__input"
                    placeholder="16-digit FAN or 12-digit FCN"
                    inputMode="numeric"
                    value={fayedaId}
                    onChange={(e) => setFayedaId(e.target.value.replace(/\D/g, ""))}
                    maxLength={16}
                  />
                  <button
                    type="button"
                    className="auth-page-submit fayeda-panel__submit"
                    disabled={fayedaBusy || fayedaId.length < 12}
                    onClick={() => void onSendFayedaCode()}
                  >
                    {fayedaBusy ? "Sending…" : "Send code"}
                  </button>
                </>
              ) : (
                <>
                  <p className="fayeda-panel__sent">
                    Code sent to <strong>{fayedaMaskedPhone}</strong>
                  </p>
                  <input
                    className="auth-input auth-input--login auth-input--login-plain fayeda-panel__input"
                    placeholder="6-digit code (demo: 123456)"
                    inputMode="numeric"
                    maxLength={6}
                    value={fayedaCode}
                    onChange={(e) => setFayedaCode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button
                    type="button"
                    className="auth-page-submit fayeda-panel__submit"
                    disabled={fayedaBusy || fayedaCode.length !== 6}
                    onClick={() => void onVerifyFayedaCode()}
                  >
                    {fayedaBusy ? "Verifying…" : "Verify"}
                  </button>
                </>
              )}

              <button
                type="button"
                className="fayeda-panel__manual"
                onClick={() => {
                  resetFayeda();
                  setManualMode(true);
                }}
              >
                Enter manually instead
              </button>
            </section>
          ) : (
            <button
              type="button"
              className="fayeda-panel__manual"
              style={{ color: "var(--brand-teal-dark)" }}
              onClick={() => setManualMode(false)}
            >
              ← Use Fayeda verification
            </button>
          )}

          <form id="register-form" onSubmit={onSubmit} className="stu-register-section">
            <h3>Student information</h3>

            <StudentPhotoUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              label={fayedaProfile?.photoUrl ? "Photo (from Fayeda — upload to replace)" : "Student photo"}
            />

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-fn">First name</label>
                <input
                  id="reg-fn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  readOnly={identityLocked}
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-middle">Middle name</label>
                <input
                  id="reg-middle"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Optional"
                  readOnly={identityLocked && Boolean(fayedaProfile?.middleName)}
                />
              </div>
            </div>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-ln">Last name</label>
                <input
                  id="reg-ln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  readOnly={identityLocked}
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-id-number">FAN or FCN</label>
                <input
                  id="reg-id-number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="16-digit FAN or 12-digit FCN"
                  readOnly={identityLocked && Boolean(fayedaProfile?.fcn)}
                  required
                />
              </div>
            </div>
            <p className="stu-field-hint">
              School student ID (e.g. STU-K7H3NP2M) is generated randomly on enroll.
            </p>

            <div className="stu-field">
              <label htmlFor="reg-phone">Student phone</label>
              <input
                id="reg-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0911… (optional)"
              />
            </div>

            <div className="stu-field">
              <label htmlFor="reg-address">Home address</label>
              <textarea
                id="reg-address"
                className="stu-textarea"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no., street, woreda, city…"
              />
              <p className="stu-field-hint">
                Printed on the student ID card. Edit freely — Fayeda may pre-fill woreda/zone/region.
              </p>
            </div>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-gender">Sex</label>
                <select
                  id="reg-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as typeof gender)}
                  required
                  disabled={identityLocked && Boolean(fayedaProfile?.gender)}
                >
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="stu-field">
                <label htmlFor="reg-dob">Date of birth</label>
                <input
                  id="reg-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  readOnly={identityLocked && Boolean(fayedaProfile?.dateOfBirth)}
                />
                {age != null ? (
                  <p className="stu-field-hint">Age: {age} years</p>
                ) : null}
              </div>
            </div>

            <div className="stu-field">
              <label htmlFor="reg-blood">Blood type</label>
              <select
                id="reg-blood"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
              >
                <option value="">Optional — select blood group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
              <p className="stu-field-hint">
                Saved to the health record and shown on the student ID card.
              </p>
            </div>

            <h3>Parents / guardians</h3>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-father">Father full name</label>
                <input
                  id="reg-father"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Full legal name"
                  required
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-father-phone">Father phone</label>
                <input
                  id="reg-father-phone"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  placeholder="0911…"
                  required
                />
              </div>
            </div>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-mother">Mother full name</label>
                <input
                  id="reg-mother"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Full legal name"
                  required
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-mother-phone">Mother phone</label>
                <input
                  id="reg-mother-phone"
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                  placeholder="0912…"
                  required
                />
              </div>
            </div>

            <h3>Class assignment</h3>

            <div className="stu-field">
              <label htmlFor="reg-grade">Grade</label>
              <select
                id="reg-grade"
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setSectionId("");
                }}
                required
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedGrade && selectedGrade.sections.length > 0 ? (
              <div className="stu-field">
                <label htmlFor="reg-section">Section</label>
                <select
                  id="reg-section"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                >
                  <option value="">No section</option>
                  {selectedGrade.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </form>
        </div>

        <footer className="stu-drawer__foot">
          <button type="button" className="stu-btn stu-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="register-form"
            className="stu-btn stu-btn--primary"
            disabled={loading || !canSubmit}
          >
            {loading ? "Enrolling…" : "Enroll student"}
          </button>
        </footer>
      </aside>
    </>
  );
}
