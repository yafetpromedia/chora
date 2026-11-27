"use client";

import { FormEvent, useMemo, useState } from "react";
import { createStudent } from "@/lib/school-setup";
import type { CreateStudentResult, GradeWithSections } from "@/lib/api";
import {
  sendFayedaCode,
  verifyFayedaCode,
  type FayedaVerifiedProfile,
} from "@/lib/fayeda";
import { useLocale } from "@/components/i18n/locale-provider";
import { StudentPhotoUpload } from "@/components/students/student-photo-upload";
import type { AppLocale } from "@/lib/i18n";

type FayedaStep = "idle" | "code-sent" | "verified";

type Props = {
  grades: GradeWithSections[];
  onClose: () => void;
  onSuccess: (result: CreateStudentResult) => void;
};

function fullName(p: FayedaVerifiedProfile) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function localeTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : "en-ET";
}

function formatDob(iso: string, locale: AppLocale) {
  try {
    return new Date(iso).toLocaleDateString(localeTag(locale), {
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
  const { t, locale } = useLocale();
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
      setError(t("studentRegisterUi.invalidFanFcn"));
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
      setError(err instanceof Error ? err.message : t("studentRegisterUi.sendCodeFailed"));
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
      setError(err instanceof Error ? err.message : t("studentRegisterUi.verifyFailed"));
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
      setError(err instanceof Error ? err.message : t("studentRegisterUi.enrollFailed"));
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
              {t("studentsUi.registerStudent")}
            </h2>
            <p className="stu-drawer__sub">{t("studentRegisterUi.drawerSub")}</p>
          </div>
          <button
            type="button"
            className="stu-drawer__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </header>

        <div className="stu-drawer__body">
          {error ? <p className="stu-toast stu-toast--error">{error}</p> : null}

          {!manualMode ? (
            <section className="fayeda-panel">
              <div className="fayeda-panel__head">
                <span className="fayeda-panel__badge">{t("studentsUi.fayeda")}</span>
                <h3 className="fayeda-panel__title">
                  {t("studentRegisterUi.verifyIdentityOptional")}
                </h3>
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
                        <dt>{t("studentRegisterUi.fanOrFcn")}</dt>
                        <dd>{fayedaProfile.fan || fayedaProfile.fcn}</dd>
                      </div>
                      <div>
                        <dt>{t("admissionRegisterUi.dateOfBirth")}</dt>
                        <dd>{formatDob(fayedaProfile.dateOfBirth, locale)}</dd>
                      </div>
                    </dl>
                    <button type="button" className="fayeda-panel__link" onClick={resetFayeda}>
                      {t("studentRegisterUi.changeStudent")}
                    </button>
                  </div>
                </div>
              ) : fayedaStep === "idle" ? (
                <>
                  <label className="fayeda-panel__label" htmlFor="reg-fayeda-id">
                    {t("studentRegisterUi.fanOrFcn")}
                  </label>
                  <input
                    id="reg-fayeda-id"
                    className="auth-input auth-input--login auth-input--login-plain fayeda-panel__input"
                    placeholder={t("studentRegisterUi.fanFcnPlaceholder")}
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
                    {fayedaBusy ? t("studentRegisterUi.sending") : t("studentRegisterUi.sendCode")}
                  </button>
                </>
              ) : (
                <>
                  <p className="fayeda-panel__sent">
                    {t("studentRegisterUi.codeSentTo", { phone: fayedaMaskedPhone })}
                  </p>
                  <input
                    className="auth-input auth-input--login auth-input--login-plain fayeda-panel__input"
                    placeholder={t("studentRegisterUi.codePlaceholder")}
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
                    {fayedaBusy ? t("studentRegisterUi.verifying") : t("studentRegisterUi.verify")}
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
                {t("studentRegisterUi.enterManually")}
              </button>
            </section>
          ) : (
            <button
              type="button"
              className="fayeda-panel__manual"
              style={{ color: "var(--brand-teal-dark)" }}
              onClick={() => setManualMode(false)}
            >
              {t("studentRegisterUi.useFayedaVerification")}
            </button>
          )}

          <form id="register-form" onSubmit={onSubmit} className="stu-register-section">
            <h3>{t("studentRegisterUi.sectionStudentInfo")}</h3>

            <StudentPhotoUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              label={
                fayedaProfile?.photoUrl
                  ? t("studentRegisterUi.photoFromFayeda")
                  : t("studentRegisterUi.photoDefault")
              }
            />

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-fn">{t("profile.firstName")}</label>
                <input
                  id="reg-fn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  readOnly={identityLocked}
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-middle">{t("admissionRegisterUi.middleName")}</label>
                <input
                  id="reg-middle"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder={t("landing.optional")}
                  readOnly={identityLocked && Boolean(fayedaProfile?.middleName)}
                />
              </div>
            </div>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-ln">{t("profile.lastName")}</label>
                <input
                  id="reg-ln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  readOnly={identityLocked}
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-id-number">{t("studentRegisterUi.fanOrFcn")}</label>
                <input
                  id="reg-id-number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={t("studentRegisterUi.fanFcnPlaceholder")}
                  readOnly={identityLocked && Boolean(fayedaProfile?.fcn)}
                  required
                />
              </div>
            </div>
            <p className="stu-field-hint">{t("studentRegisterUi.schoolIdHint")}</p>

            <div className="stu-field">
              <label htmlFor="reg-phone">{t("studentRegisterUi.studentPhone")}</label>
              <input
                id="reg-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("studentRegisterUi.phoneOptionalPlaceholder")}
              />
            </div>

            <div className="stu-field">
              <label htmlFor="reg-address">{t("studentRegisterUi.homeAddress")}</label>
              <textarea
                id="reg-address"
                className="stu-textarea"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("studentRegisterUi.addressPlaceholder")}
              />
              <p className="stu-field-hint">{t("studentRegisterUi.addressHint")}</p>
            </div>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-gender">{t("teachersUi.sex")}</label>
                <select
                  id="reg-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as typeof gender)}
                  required
                  disabled={identityLocked && Boolean(fayedaProfile?.gender)}
                >
                  <option value="">{t("teachersUi.select")}</option>
                  <option value="MALE">{t("studentsUi.male")}</option>
                  <option value="FEMALE">{t("studentsUi.female")}</option>
                  <option value="OTHER">{t("studentsUi.other")}</option>
                </select>
              </div>
              <div className="stu-field">
                <label htmlFor="reg-dob">{t("admissionRegisterUi.dateOfBirth")}</label>
                <input
                  id="reg-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  readOnly={identityLocked && Boolean(fayedaProfile?.dateOfBirth)}
                />
                {age != null ? (
                  <p className="stu-field-hint">
                    {t("studentRegisterUi.ageYears", { age })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="stu-field">
              <label htmlFor="reg-blood">{t("studentAcademicRecordUi.bloodType")}</label>
              <select
                id="reg-blood"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
              >
                <option value="">{t("studentRegisterUi.bloodOptionalSelect")}</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
              <p className="stu-field-hint">{t("studentRegisterUi.bloodHint")}</p>
            </div>

            <h3>{t("studentRegisterUi.sectionParentsGuardians")}</h3>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-father">{t("studentRegisterUi.fatherFullName")}</label>
                <input
                  id="reg-father"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder={t("studentRegisterUi.fullLegalNamePlaceholder")}
                  required
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-father-phone">{t("studentRegisterUi.fatherPhone")}</label>
                <input
                  id="reg-father-phone"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  placeholder={t("studentRegisterUi.phoneFatherPlaceholder")}
                  required
                />
              </div>
            </div>

            <div className="stu-field-row">
              <div className="stu-field">
                <label htmlFor="reg-mother">{t("studentRegisterUi.motherFullName")}</label>
                <input
                  id="reg-mother"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder={t("studentRegisterUi.fullLegalNamePlaceholder")}
                  required
                />
              </div>
              <div className="stu-field">
                <label htmlFor="reg-mother-phone">{t("studentRegisterUi.motherPhone")}</label>
                <input
                  id="reg-mother-phone"
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                  placeholder={t("studentRegisterUi.phoneMotherPlaceholder")}
                  required
                />
              </div>
            </div>

            <h3>{t("studentRegisterUi.sectionClassAssignment")}</h3>

            <div className="stu-field">
              <label htmlFor="reg-grade">{t("teachersUi.grade")}</label>
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
                <label htmlFor="reg-section">{t("teachersUi.section")}</label>
                <select
                  id="reg-section"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                >
                  <option value="">{t("studentRegisterUi.noSection")}</option>
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
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="register-form"
            className="stu-btn stu-btn--primary"
            disabled={loading || !canSubmit}
          >
            {loading ? t("studentRegisterUi.enrolling") : t("studentRegisterUi.enrollStudent")}
          </button>
        </footer>
      </aside>
    </>
  );
}
