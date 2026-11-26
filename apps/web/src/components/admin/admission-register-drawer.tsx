"use client";

import { FormEvent, useMemo, useState } from "react";
import type { GradeWithSections } from "@/lib/api";
import {
  createAdmissionApplication,
  type AdmissionApplication,
  type AdmissionCycle,
  type CreateApplicationPayload,
} from "@/lib/admissions";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  cycle: AdmissionCycle;
  grades: GradeWithSections[];
  onClose: () => void;
  onSuccess: (app: AdmissionApplication) => void;
};

export function AdmissionRegisterDrawer({ cycle, grades, onClose, onSuccess }: Props) {
  const { t } = useLocale();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState<"" | "MALE" | "FEMALE" | "OTHER">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [email, setEmail] = useState("");
  const [targetGradeId, setTargetGradeId] = useState(grades[0]?.id ?? "");
  const [entranceScore, setEntranceScore] = useState("");
  const [interviewScore, setInterviewScore] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return (
      firstName.trim() &&
      lastName.trim() &&
      targetGradeId &&
      fatherName.trim() &&
      fatherPhone.trim().length >= 9 &&
      motherName.trim() &&
      motherPhone.trim().length >= 9
    );
  }, [firstName, lastName, targetGradeId, fatherName, fatherPhone, motherName, motherPhone]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const body: CreateApplicationPayload = {
        cycleId: cycle.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fatherName: fatherName.trim(),
        fatherPhone: fatherPhone.trim(),
        motherName: motherName.trim(),
        motherPhone: motherPhone.trim(),
      };
      if (middleName.trim()) body.middleName = middleName.trim();
      if (gender) body.gender = gender;
      if (dateOfBirth) body.dateOfBirth = dateOfBirth;
      if (idNumber.trim()) body.idNumber = idNumber.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (email.trim()) body.email = email.trim();
      if (targetGradeId) body.targetGradeId = targetGradeId;
      if (entranceScore.trim()) body.entranceScore = Number(entranceScore);
      if (interviewScore.trim()) body.interviewScore = Number(interviewScore);
      if (notes.trim()) body.notes = notes.trim();

      const app = await createAdmissionApplication(body);
      onSuccess(app);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admissionRegisterUi.registerFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="adm-drawer"
        role="dialog"
        aria-labelledby="adm-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="adm-drawer__head">
          <div>
            <p className="adm-drawer__eyebrow">{cycle.name}</p>
            <h2 id="adm-drawer-title">{t("admissionsUi.registerApplicant")}</h2>
            <p className="adm-drawer__sub">{t("admissionRegisterUi.drawerSub")}</p>
          </div>
          <button
            type="button"
            className="adm-drawer__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </header>

        <form className="adm-drawer__form" onSubmit={handleSubmit}>
          {error ? (
            <div className="adm-alert adm-alert--err" role="alert">
              {error}
            </div>
          ) : null}

          <section className="adm-form-section">
            <h3>{t("admissionRegisterUi.sectionApplicant")}</h3>
            <div className="adm-form-grid">
              <label>
                {t("profile.firstName")}
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label>
                {t("profile.lastName")}
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
              <label>
                {t("admissionRegisterUi.middleName")}
                <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </label>
              <label>
                {t("admissionRegisterUi.idNumber")}
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </label>
              <label>
                {t("admissionRegisterUi.gender")}
                <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
                  <option value="">{t("admissionRegisterUi.genderUnset")}</option>
                  <option value="MALE">{t("studentsUi.male")}</option>
                  <option value="FEMALE">{t("studentsUi.female")}</option>
                  <option value="OTHER">{t("studentsUi.other")}</option>
                </select>
              </label>
              <label>
                {t("admissionRegisterUi.dateOfBirth")}
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </label>
              <label>
                {t("profile.phone")}
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label>
                {t("profile.email")}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="adm-form-section">
            <h3>{t("admissionRegisterUi.sectionParents")}</h3>
            <div className="adm-form-grid">
              <label>
                {t("admissionRegisterUi.fatherName")}
                <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} required />
              </label>
              <label>
                {t("admissionRegisterUi.fatherPhone")}
                <input value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} required />
              </label>
              <label>
                {t("admissionRegisterUi.motherName")}
                <input value={motherName} onChange={(e) => setMotherName(e.target.value)} required />
              </label>
              <label>
                {t("admissionRegisterUi.motherPhone")}
                <input value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)} required />
              </label>
            </div>
          </section>

          <section className="adm-form-section">
            <h3>{t("admissionRegisterUi.sectionIntake")}</h3>
            <div className="adm-form-grid">
              <label>
                {t("admissionRegisterUi.applyingForGrade")}
                <select value={targetGradeId} onChange={(e) => setTargetGradeId(e.target.value)} required>
                  <option value="">{t("admissionsUi.selectGrade")}</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("admissionRegisterUi.entranceScore")}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={entranceScore}
                  onChange={(e) => setEntranceScore(e.target.value)}
                  placeholder={t("admissionRegisterUi.entrancePlaceholder")}
                />
              </label>
              <label>
                {t("admissionRegisterUi.interviewScore")}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={interviewScore}
                  onChange={(e) => setInterviewScore(e.target.value)}
                />
              </label>
              <label className="adm-form-full">
                {t("admissionRegisterUi.notes")}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </label>
            </div>
          </section>

          <footer className="adm-drawer__foot">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={!canSubmit || loading}>
              {loading ? t("common.saving") : t("admissionsUi.registerApplicant")}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}