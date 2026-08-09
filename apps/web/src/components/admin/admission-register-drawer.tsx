"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GradeWithSections } from "@/lib/api";
import {
  createAdmissionApplication,
  type AdmissionApplication,
  type AdmissionCycle,
  type AdmissionStatus,
  type CreateApplicationPayload,
} from "@/lib/admissions";

type Props = {
  cycle: AdmissionCycle;
  grades: GradeWithSections[];
  onClose: () => void;
  onSuccess: (app: AdmissionApplication) => void;
};

export function AdmissionRegisterDrawer({ cycle, grades, onClose, onSuccess }: Props) {
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
      setError(err instanceof Error ? err.message : "Could not register applicant");
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
            <h2 id="adm-drawer-title">Register applicant</h2>
            <p className="adm-drawer__sub">
              Select the grade they are applying for — placement uses rules for that grade.
            </p>
          </div>
          <button type="button" className="adm-drawer__close" onClick={onClose} aria-label="Close">
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
            <h3>Applicant</h3>
            <div className="adm-form-grid">
              <label>
                First name
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label>
                Last name
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
              <label>
                Middle name
                <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </label>
              <label>
                ID number
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </label>
              <label>
                Gender
                <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                Date of birth
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </label>
              <label>
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="adm-form-section">
            <h3>Parents</h3>
            <div className="adm-form-grid">
              <label>
                Father name
                <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} required />
              </label>
              <label>
                Father phone
                <input value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} required />
              </label>
              <label>
                Mother name
                <input value={motherName} onChange={(e) => setMotherName(e.target.value)} required />
              </label>
              <label>
                Mother phone
                <input value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)} required />
              </label>
            </div>
          </section>

          <section className="adm-form-section">
            <h3>Intake & scores</h3>
            <div className="adm-form-grid">
              <label>
                Applying for grade
                <select value={targetGradeId} onChange={(e) => setTargetGradeId(e.target.value)} required>
                  <option value="">Select grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Entrance exam score
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={entranceScore}
                  onChange={(e) => setEntranceScore(e.target.value)}
                  placeholder="e.g. 78"
                />
              </label>
              <label>
                Interview score
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={interviewScore}
                  onChange={(e) => setInterviewScore(e.target.value)}
                />
              </label>
              <label className="adm-form-full">
                Notes
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </label>
            </div>
          </section>

          <footer className="adm-drawer__foot">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={!canSubmit || loading}>
              {loading ? "Saving…" : "Register applicant"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
