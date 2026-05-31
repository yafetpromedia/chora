"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GradeWithSections, StudentRecord } from "@/lib/api";
import { updateStudent } from "@/lib/school-setup";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { StudentContactLinks } from "@/components/students/student-contact-links";
import { StudentPhotoUpload } from "@/components/students/student-photo-upload";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { getStudentIdCard } from "@/lib/student-cards";
import type { StudentIdCard } from "@/lib/student-cards";

function studentName(s: StudentRecord) {
  return [s.user.firstName, s.middleName, s.user.lastName].filter(Boolean).join(" ");
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
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

type ManageTab = "contact" | "profile" | "parents" | "class" | "idcard";

type Props = {
  student: StudentRecord;
  grades: GradeWithSections[];
  busy: boolean;
  onClose: () => void;
  onSaved: (updated: StudentRecord) => void;
  onRemove: (student: StudentRecord) => void;
  onViewIdCard?: () => void;
};

export function StudentManageDrawer({
  student,
  grades,
  busy,
  onClose,
  onSaved,
  onRemove,
  onViewIdCard,
}: Props) {
  const [tab, setTab] = useState<ManageTab>("contact");
  const [idCard, setIdCard] = useState<StudentIdCard | null>(null);
  const [idCardLoading, setIdCardLoading] = useState(false);
  const [firstName, setFirstName] = useState(student.user.firstName);
  const [middleName, setMiddleName] = useState(student.middleName ?? "");
  const [lastName, setLastName] = useState(student.user.lastName);
  const [studentId, setStudentId] = useState(student.user.externalRef ?? "");
  const [idNumber, setIdNumber] = useState(student.fcn ?? "");
  const [gender, setGender] = useState(student.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(student.dateOfBirth));
  const [phone, setPhone] = useState(student.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(student.photoUrl);
  const [gradeId, setGradeId] = useState(student.grade.id);
  const [sectionId, setSectionId] = useState(student.section?.id ?? "");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedGrade = grades.find((g) => g.id === gradeId);
  const age = dateOfBirth ? ageFromDob(dateOfBirth) : null;
  const displayName = studentName(student);

  useEffect(() => {
    const father = student.parents[0]?.parent;
    const mother = student.parents[1]?.parent;
    setFatherName(father ? `${father.firstName} ${father.lastName}`.trim() : "");
    setFatherPhone(father?.phone ?? "");
    setMotherName(mother ? `${mother.firstName} ${mother.lastName}`.trim() : "");
    setMotherPhone(mother?.phone ?? "");
    setTab("contact");
  }, [student]);

  const contactPreview = useMemo(
    () => ({
      studentPhone: phone,
      fatherPhone,
      motherPhone,
      fatherName,
      motherName,
    }),
    [phone, fatherPhone, motherPhone, fatherName, motherName],
  );

  const tabs: { id: ManageTab; label: string }[] = [
    { id: "contact", label: "Contact" },
    { id: "profile", label: "Profile" },
    { id: "parents", label: "Parents" },
    { id: "class", label: "Class" },
    { id: "idcard", label: "ID card" },
  ];

  useEffect(() => {
    if (tab !== "idcard") return;
    setIdCardLoading(true);
    void getStudentIdCard(student.id)
      .then(setIdCard)
      .catch(() => setIdCard(null))
      .finally(() => setIdCardLoading(false));
  }, [tab, student.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await updateStudent(student.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        studentId: studentId.trim() || undefined,
        idNumber: idNumber.trim() || undefined,
        gender: gender ? (gender as "MALE" | "FEMALE" | "OTHER") : undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        phone: phone.trim() || undefined,
        photoUrl,
        gradeId,
        sectionId: sectionId || null,
        fatherName: fatherName.trim(),
        fatherPhone: fatherPhone.trim(),
        motherName: motherName.trim(),
        motherPhone: motherPhone.trim(),
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="stu-drawer-backdrop stu-manage-backdrop" onClick={onClose} aria-hidden />
      <aside
        className="stu-drawer stu-drawer--wide stu-manage-drawer"
        role="dialog"
        aria-labelledby="manage-title"
      >
        <header className="stu-manage-hero">
          <div className="stu-manage-hero__top">
            <div className="stu-manage-hero__identity">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="stu-manage-hero__photo" />
              ) : (
                <span className="stu-manage-hero__photo stu-manage-hero__photo--placeholder" aria-hidden>
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <p className="stu-manage-hero__eyebrow">Manage student</p>
                <h2 id="manage-title" className="stu-manage-hero__title">
                  {displayName}
                </h2>
                <p className="stu-manage-hero__ids">
                  <span>{student.user.externalRef ?? "—"}</span>
                  {student.fcn ? <span> · ID {student.fcn}</span> : null}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="stu-drawer__close stu-manage-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="stu-manage-badges">
            <span className="stu-manage-badge">
              <DashIcon name="students" className="dash-icon--xs" />
              {student.grade.name}
              {student.section ? ` · ${student.section.name}` : ""}
            </span>
            {age != null ? (
              <span className="stu-manage-badge">
                <DashIcon name="calendar" className="dash-icon--xs" />
                {age} yrs
              </span>
            ) : null}
            {gender ? (
              <span className="stu-manage-badge stu-manage-badge--muted">{gender}</span>
            ) : null}
          </div>

          <nav className="stu-manage-tabs" role="tablist" aria-label="Student sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`stu-manage-tab${tab === t.id ? " stu-manage-tab--active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="stu-drawer__body stu-manage-body">
          {error ? <p className="stu-toast stu-toast--error">{error}</p> : null}

          <form id="manage-form" onSubmit={onSubmit} className="stu-manage-form">
            {tab === "contact" ? (
              <section className="stu-manage-card stu-manage-card--contact">
                <h3 className="stu-manage-card__title">
                  <DashIcon name="students" className="dash-icon--sm" />
                  Reach family & student
                </h3>
                <p className="stu-manage-card__hint">Call or SMS directly from this panel.</p>
                <StudentContactLinks
                  label="Student"
                  name={displayName}
                  phone={contactPreview.studentPhone}
                />
                <StudentContactLinks
                  label="Father"
                  name={contactPreview.fatherName}
                  phone={contactPreview.fatherPhone}
                />
                <StudentContactLinks
                  label="Mother"
                  name={contactPreview.motherName}
                  phone={contactPreview.motherPhone}
                />
              </section>
            ) : null}

            {tab === "profile" ? (
              <section className="stu-manage-card">
                <h3 className="stu-manage-card__title">Profile & photo</h3>
                <StudentPhotoUpload value={photoUrl} onChange={setPhotoUrl} />
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-fn">First name</label>
                    <input
                      id="m-fn"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-middle">Middle name</label>
                    <input
                      id="m-middle"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-ln">Last name</label>
                    <input
                      id="m-ln"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-id-number">ID number</label>
                    <input
                      id="m-id-number"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-student-id">Student ID</label>
                    <input
                      id="m-student-id"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-phone">Student phone</label>
                    <input
                      id="m-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0911…"
                    />
                  </div>
                </div>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-gender">Sex</label>
                    <select
                      id="m-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-dob">Date of birth</label>
                    <input
                      id="m-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                    {age != null ? <p className="stu-field-hint">Age: {age} years</p> : null}
                  </div>
                </div>
                {student.fayedaVerifiedAt ? (
                  <p className="stu-field-hint stu-manage-verified">
                    Fayeda verified · FAN {student.fan ?? "—"}
                  </p>
                ) : null}
              </section>
            ) : null}

            {tab === "parents" ? (
              <section className="stu-manage-card">
                <h3 className="stu-manage-card__title">Parents / guardians</h3>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-father">Father full name</label>
                    <input
                      id="m-father"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-father-phone">Father phone</label>
                    <input
                      id="m-father-phone"
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-mother">Mother full name</label>
                    <input
                      id="m-mother"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-mother-phone">Mother phone</label>
                    <input
                      id="m-mother-phone"
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "class" ? (
              <section className="stu-manage-card">
                <h3 className="stu-manage-card__title">Class placement</h3>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-grade">Grade</label>
                    <select
                      id="m-grade"
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
                      <label htmlFor="m-section">Section</label>
                      <select
                        id="m-section"
                        value={sectionId}
                        onChange={(e) => setSectionId(e.target.value)}
                      >
                        <option value="">No section</option>
                        {selectedGrade.sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {tab === "idcard" ? (
              <section className="stu-manage-card">
                <h3 className="stu-manage-card__title">Campus ID preview</h3>
                {idCardLoading ? (
                  <p className="stu-field-hint">Loading card…</p>
                ) : idCard ? (
                  <div className="sid-manage-preview">
                    <StudentIdCardView card={idCard} variant="compact" />
                  </div>
                ) : (
                  <p className="stu-field-hint">Could not load ID card.</p>
                )}
                {onViewIdCard ? (
                  <button
                    type="button"
                    className="stu-btn stu-btn--primary"
                    style={{ marginTop: "0.75rem" }}
                    onClick={onViewIdCard}
                  >
                    Open full card · Print
                  </button>
                ) : null}
              </section>
            ) : null}
          </form>
        </div>

        <footer className="stu-drawer__foot stu-manage-foot">
          <button
            type="button"
            className="stu-btn stu-btn--danger stu-btn--ghost-danger"
            disabled={busy || saving}
            onClick={() => onRemove(student)}
          >
            Remove
          </button>
          <div className="stu-drawer__foot-actions">
            <button type="button" className="stu-btn stu-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            {tab !== "idcard" ? (
              <button
                type="submit"
                form="manage-form"
                className="stu-btn stu-btn--primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            ) : null}
          </div>
        </footer>
      </aside>
    </>
  );
}
