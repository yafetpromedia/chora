"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
import { useLocale } from "@/components/i18n/locale-provider";
import type { GradeWithSections, StudentRecord } from "@/lib/api";
import { resetStudentPortalPassword, updateStudent } from "@/lib/school-setup";
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

function genderLabel(
  value: string,
  t: (key: string) => string,
): string {
  if (value === "MALE") return t("studentsUi.male");
  if (value === "FEMALE") return t("studentsUi.female");
  if (value === "OTHER") return t("studentsUi.other");
  return value;
}

export function StudentManageDrawer({
  student,
  grades,
  busy,
  onClose,
  onSaved,
  onRemove,
  onViewIdCard,
}: Props) {
  const { t } = useLocale();
  const mounted = useMounted();
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
  const [address, setAddress] = useState(student.address ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(student.photoUrl);
  const [gradeId, setGradeId] = useState(student.grade.id);
  const [sectionId, setSectionId] = useState(student.section?.id ?? "");
  const [fatherName, setFatherName] = useState(() => {
    const father = student.parents[0]?.parent;
    return father ? `${father.firstName} ${father.lastName}`.trim() : "";
  });
  const [fatherPhone, setFatherPhone] = useState(student.parents[0]?.parent?.phone ?? "");
  const [motherName, setMotherName] = useState(() => {
    const mother = student.parents[1]?.parent;
    return mother ? `${mother.firstName} ${mother.lastName}`.trim() : "";
  });
  const [motherPhone, setMotherPhone] = useState(student.parents[1]?.parent?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [portalTempPassword, setPortalTempPassword] = useState(
    student.portalTempPassword,
  );
  const [portalResetBusy, setPortalResetBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedGrade = grades.find((g) => g.id === gradeId);
  const age = dateOfBirth ? ageFromDob(dateOfBirth) : null;
  const displayName = studentName(student);

  const [prevStudent, setPrevStudent] = useState(student);
  if (student !== prevStudent) {
    setPrevStudent(student);
    const father = student.parents[0]?.parent;
    const mother = student.parents[1]?.parent;
    setFatherName(father ? `${father.firstName} ${father.lastName}`.trim() : "");
    setFatherPhone(father?.phone ?? "");
    setMotherName(mother ? `${mother.firstName} ${mother.lastName}`.trim() : "");
    setMotherPhone(mother?.phone ?? "");
    setAddress(student.address ?? "");
    setPortalTempPassword(student.portalTempPassword);
    setTab("contact");
  }

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

  const tabs: { id: ManageTab; label: string }[] = useMemo(
    () => [
      { id: "contact", label: t("studentsUi.contact") },
      { id: "profile", label: t("studentManageUi.tabProfile") },
      { id: "parents", label: t("studentsUi.parents") },
      { id: "class", label: t("studentsUi.class") },
      { id: "idcard", label: t("studentsUi.idCard") },
    ],
    [t],
  );

  const idCardKey = tab === "idcard" ? student.id : "";
  const [prevIdCardKey, setPrevIdCardKey] = useState("");
  if (idCardKey !== prevIdCardKey) {
    setPrevIdCardKey(idCardKey);
    if (idCardKey) setIdCardLoading(true);
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (tab !== "idcard") return;
    void getStudentIdCard(student.id)
      .then(setIdCard)
      .catch(() => setIdCard(null))
      .finally(() => setIdCardLoading(false));
  }, [tab, student.id]);

  async function onResetPortalPassword() {
    setPortalResetBusy(true);
    setError("");
    try {
      const result = await resetStudentPortalPassword(student.id);
      setPortalTempPassword(result.tempPassword);
      if (result.portalUsername !== studentId.trim()) {
        setStudentId(result.portalUsername);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studentManageUi.resetPortalFailed"));
    } finally {
      setPortalResetBusy(false);
    }
  }

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
        address: address.trim() || null,
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
      setError(err instanceof Error ? err.message : t("studentManageUi.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const drawer = (
    <>
      <div className="stu-drawer-backdrop stu-manage-backdrop" onClick={onClose} aria-hidden />
      <aside
        className="stu-drawer stu-drawer--wide stu-manage-drawer"
        role="dialog"
        aria-modal="true"
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
                <p className="stu-manage-hero__eyebrow">{t("studentManageUi.manageStudent")}</p>
                <h2 id="manage-title" className="stu-manage-hero__title">
                  {displayName}
                </h2>
                <p style={{ marginTop: "0.35rem" }}>
                  <Link
                    href={`/admin/students/${student.id}/history`}
                    className="stu-manage-record-link"
                  >
                    {t("studentManageUi.openAcademicRecord")}
                  </Link>
                </p>
                <p className="stu-manage-hero__ids">
                  <span>{student.user.externalRef ?? t("studentsUi.emptyDash")}</span>
                  {student.fan || student.fcn ? (
                    <span>
                      {t("studentManageUi.fanWithId", {
                        fan: student.fan ?? student.fcn ?? "",
                      })}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="stu-drawer__close stu-manage-close"
              onClick={onClose}
              aria-label={t("common.close")}
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
                {age} {t("studentsUi.yrs")}
              </span>
            ) : null}
            {gender ? (
              <span className="stu-manage-badge stu-manage-badge--muted">
                {genderLabel(gender, t)}
              </span>
            ) : null}
          </div>

          <nav
            className="stu-manage-tabs"
            role="tablist"
            aria-label={t("studentManageUi.tabSectionsAria")}
          >
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={tab === tabItem.id}
                className={`stu-manage-tab${tab === tabItem.id ? " stu-manage-tab--active" : ""}`}
                onClick={() => setTab(tabItem.id)}
              >
                {tabItem.label}
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
                  {t("studentManageUi.reachFamily")}
                </h3>
                <p className="stu-manage-card__hint">{t("studentManageUi.reachFamilyHint")}</p>
                <StudentContactLinks
                  label={t("studentsUi.student")}
                  name={displayName}
                  phone={contactPreview.studentPhone}
                />
                <StudentContactLinks
                  label={t("studentsUi.father")}
                  name={contactPreview.fatherName}
                  phone={contactPreview.fatherPhone}
                />
                <StudentContactLinks
                  label={t("studentsUi.mother")}
                  name={contactPreview.motherName}
                  phone={contactPreview.motherPhone}
                />
              </section>
            ) : null}

            {tab === "profile" ? (
              <>
              <section className="stu-manage-card stu-portal-login">
                <h3 className="stu-manage-card__title">
                  {t("studentManageUi.studentPortalLogin")}
                </h3>
                <p className="stu-field-hint">{t("studentManageUi.portalSignInHint")}</p>
                <dl className="stu-portal-login__fields">
                  <div>
                    <dt>{t("studentManageUi.username")}</dt>
                    <dd>
                      {student.user.username?.trim() ||
                        student.user.externalRef?.trim() ||
                        t("studentsUi.emptyDash")}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("auth.password")}</dt>
                    <dd>
                      {portalTempPassword ? (
                        <code className="stu-portal-login__code">{portalTempPassword}</code>
                      ) : (
                        <span className="stu-portal-login__changed">
                          {t("studentManageUi.portalPasswordChanged")}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("studentManageUi.loginEmail")}</dt>
                    <dd className="stu-portal-login__email">{student.user.email}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="stu-btn stu-btn--ghost"
                  disabled={portalResetBusy || saving}
                  onClick={() => void onResetPortalPassword()}
                >
                  {portalResetBusy
                    ? t("studentManageUi.resetting")
                    : t("studentManageUi.resetPortalPassword")}
                </button>
              </section>

              <section className="stu-manage-card">
                <h3 className="stu-manage-card__title">{t("studentManageUi.profileAndPhoto")}</h3>
                <StudentPhotoUpload
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  label={t("studentRegisterUi.photoDefault")}
                />
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-fn">{t("profile.firstName")}</label>
                    <input
                      id="m-fn"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-middle">{t("admissionRegisterUi.middleName")}</label>
                    <input
                      id="m-middle"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-ln">{t("profile.lastName")}</label>
                    <input
                      id="m-ln"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-id-number">{t("studentRegisterUi.fanOrFcn")}</label>
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
                    <label htmlFor="m-student-id">{t("studentsUi.studentIdLabel")}</label>
                    <input
                      id="m-student-id"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-phone">{t("studentRegisterUi.studentPhone")}</label>
                    <input
                      id="m-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("studentRegisterUi.phoneFatherPlaceholder")}
                    />
                  </div>
                </div>
                <div className="stu-field">
                  <label htmlFor="m-address">{t("studentRegisterUi.homeAddress")}</label>
                  <textarea
                    id="m-address"
                    className="stu-textarea"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("studentRegisterUi.addressPlaceholder")}
                  />
                  <p className="stu-field-hint">{t("studentManageUi.idCardAddressHint")}</p>
                </div>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-gender">{t("teachersUi.sex")}</label>
                    <select
                      id="m-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="">{t("teachersUi.select")}</option>
                      <option value="MALE">{t("studentsUi.male")}</option>
                      <option value="FEMALE">{t("studentsUi.female")}</option>
                      <option value="OTHER">{t("studentsUi.other")}</option>
                    </select>
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-dob">{t("admissionRegisterUi.dateOfBirth")}</label>
                    <input
                      id="m-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                    {age != null ? (
                      <p className="stu-field-hint">
                        {t("studentRegisterUi.ageYears", { age })}
                      </p>
                    ) : null}
                  </div>
                </div>
                {student.fayedaVerifiedAt ? (
                  <p className="stu-field-hint stu-manage-verified">
                    {t("studentManageUi.fayedaVerifiedFan", {
                      fan: student.fan ?? t("studentsUi.emptyDash"),
                    })}
                  </p>
                ) : null}
              </section>
              </>
            ) : null}

            {tab === "parents" ? (
              <section className="stu-manage-card">
                <h3 className="stu-manage-card__title">
                  {t("studentRegisterUi.sectionParentsGuardians")}
                </h3>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-father">{t("studentRegisterUi.fatherFullName")}</label>
                    <input
                      id="m-father"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-father-phone">{t("studentRegisterUi.fatherPhone")}</label>
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
                    <label htmlFor="m-mother">{t("studentRegisterUi.motherFullName")}</label>
                    <input
                      id="m-mother"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="stu-field">
                    <label htmlFor="m-mother-phone">{t("studentRegisterUi.motherPhone")}</label>
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
                <h3 className="stu-manage-card__title">{t("studentManageUi.classPlacement")}</h3>
                <div className="stu-field-row">
                  <div className="stu-field">
                    <label htmlFor="m-grade">{t("teachersUi.grade")}</label>
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
                      <label htmlFor="m-section">{t("teachersUi.section")}</label>
                      <select
                        id="m-section"
                        value={sectionId}
                        onChange={(e) => setSectionId(e.target.value)}
                      >
                        <option value="">{t("studentRegisterUi.noSection")}</option>
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
                <h3 className="stu-manage-card__title">{t("studentManageUi.campusIdPreview")}</h3>
                {idCardLoading ? (
                  <p className="stu-field-hint">{t("studentManageUi.loadingCard")}</p>
                ) : idCard ? (
                  <div className="sid-manage-preview">
                    <StudentIdCardView card={idCard} variant="standard" />
                  </div>
                ) : (
                  <p className="stu-field-hint">{t("studentManageUi.loadCardFailed")}</p>
                )}
                {onViewIdCard ? (
                  <button
                    type="button"
                    className="stu-btn stu-btn--primary"
                    style={{ marginTop: "0.75rem" }}
                    onClick={onViewIdCard}
                  >
                    {t("studentManageUi.openFullCardPrint")}
                  </button>
                ) : null}
              </section>
            ) : null}
          </form>
        </div>

        <footer className="stu-drawer__foot stu-manage-foot">
          {tab !== "idcard" ? (
            <button
              type="submit"
              form="manage-form"
              className="stu-btn stu-btn--primary stu-manage-foot__save"
              disabled={saving}
            >
              {saving ? t("common.saving") : t("profile.saveChanges")}
            </button>
          ) : null}
          <div className="stu-manage-foot__row">
            <button type="button" className="stu-btn stu-btn--ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="stu-btn stu-btn--ghost-danger"
              disabled={busy || saving}
              onClick={() => onRemove(student)}
            >
              {t("studentsUi.remove")}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );

  if (!mounted) return null;
  return createPortal(drawer, document.body);
}
