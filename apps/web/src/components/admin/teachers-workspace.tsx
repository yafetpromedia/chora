"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { AdminStaffPhotoField } from "@/components/admin/admin-staff-photo-field";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppToast } from "@/components/ui/app-toast";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { TEACHER_ROLE_SLUGS } from "@/lib/people";
import { hasPermission, Permission, ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import {
  createTeacher,
  deleteTeacher,
  listRoleTemplates,
  listTeacherPhotoRequests,
  listTeachers,
  reviewTeacherPhoto,
  updateTeacher,
  type RoleTemplate,
  type TeacherPhotoRequest,
  type TeacherRecord,
} from "@/lib/teachers";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeacherAvatar({ teacher }: { teacher: TeacherRecord }) {
  const label = displayName(teacher);
  if (teacher.photoUrl) {
    return (
      <span className="tch-v2__avatar tch-v2__avatar--photo" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={teacher.photoUrl} alt="" />
      </span>
    );
  }
  return (
    <span className="tch-v2__avatar" aria-hidden>
      {initials(label)}
    </span>
  );
}

function displayName(t: TeacherRecord) {
  const parts = [t.firstName, t.lastName].filter(Boolean).join(" ").trim();
  const raw = parts || t.name;
  return raw.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function homeroomLine(h: TeacherRecord["homeroom"]) {
  if (!h) return null;
  return `${h.gradeName}${h.sectionName ? ` · ${h.sectionName}` : ""}`;
}

function teachingSlotClass(slot: TeacherRecord["teachingSlots"][0]) {
  return slot.sectionName ? `${slot.gradeName} · ${slot.sectionName}` : slot.gradeName;
}

/** Unique subject names a teacher teaches (class-subject assignments). */
function subjectNames(t: TeacherRecord) {
  const names = new Set<string>();
  for (const slot of t.teachingSlots) {
    if (slot.subjectName?.trim()) names.add(slot.subjectName.trim());
  }
  for (const a of t.assignments) {
    if (!a.isHomeroom && a.subjectName?.trim()) names.add(a.subjectName.trim());
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function SubjectsCell({
  teacher,
  emptyDash,
}: {
  teacher: TeacherRecord;
  emptyDash: string;
}) {
  const subjects = subjectNames(teacher);
  if (subjects.length === 0) {
    return <span className="tch-v2__dash">{emptyDash}</span>;
  }
  const shown = subjects.slice(0, 3);
  const rest = subjects.length - shown.length;
  return (
    <div className="tch-v2__chips" title={subjects.join(", ")}>
      {shown.map((name) => (
        <span key={name} className="tch-v2__chip tch-v2__chip--subject">
          {name}
        </span>
      ))}
      {rest > 0 ? (
        <span className="tch-v2__chip tch-v2__chip--more">+{rest}</span>
      ) : null}
    </div>
  );
}

function assignSlotHref(
  teacher: TeacherRecord,
  slot: TeacherRecord["teachingSlots"][0],
  grades: GradeWithSections[],
) {
  const q = new URLSearchParams();
  q.set("teacherId", teacher.userId);
  const grade = grades.find((g) => g.name === slot.gradeName);
  if (grade) {
    q.set("gradeId", grade.id);
    if (slot.sectionName) {
      const section = grade.sections.find((s) => s.name === slot.sectionName);
      if (section) q.set("sectionId", section.id);
    }
  } else if (teacher.homeroom?.gradeId) {
    q.set("gradeId", teacher.homeroom.gradeId);
    if (teacher.homeroom.sectionId) q.set("sectionId", teacher.homeroom.sectionId);
  }
  return `/admin/subjects/assign?${q}`;
}

function assignSubjectsHref(teacher: TeacherRecord, grades: GradeWithSections[]) {
  const q = new URLSearchParams();
  q.set("teacherId", teacher.userId);
  if (teacher.homeroom?.gradeId) q.set("gradeId", teacher.homeroom.gradeId);
  if (teacher.homeroom?.sectionId) q.set("sectionId", teacher.homeroom.sectionId);
  if (!teacher.homeroom?.gradeId && teacher.teachingSlots[0]) {
    const first = teacher.teachingSlots[0];
    const grade = grades.find((g) => g.name === first.gradeName);
    if (grade) {
      q.set("gradeId", grade.id);
      if (first.sectionName) {
        const section = grade.sections.find((s) => s.name === first.sectionName);
        if (section) q.set("sectionId", section.id);
      }
    }
  }
  return `/admin/subjects/assign?${q}`;
}

function roleLabel(person: TeacherRecord, tr: (key: string) => string) {
  return (
    person.roleTemplateName ??
    (person.roleTemplateSlug
      ? ROLE_TEMPLATE_LABELS[person.roleTemplateSlug]
      : tr("teachersUi.defaultRoleTeacher"))
  );
}

export function TeachersWorkspace() {
  const { t, tn, tp } = useLocale();
  const [people, setPeople] = useState<TeacherRecord[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTargetState, setEditTarget] = useState<TeacherRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoRequests, setPhotoRequests] = useState<TeacherPhotoRequest[]>([]);
  const [photoBusyId, setPhotoBusyId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<TeacherRecord | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"" | "MALE" | "FEMALE" | "OTHER">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [roleTemplateSlug, setRoleTemplateSlug] = useState("subject_teacher");
  const [hasHomeroom, setHasHomeroom] = useState(false);
  const [homeroomGradeId, setHomeroomGradeId] = useState("");
  const [homeroomSectionId, setHomeroomSectionId] = useState("");

  const homeroomGrade = grades.find((g) => g.id === homeroomGradeId);
  const homeroomNeedsSection = hasHomeroom && (homeroomGrade?.sections.length ?? 0) > 0;

  const homeroomCount = people.filter((t) => t.homeroom).length;
  const subjectTeacherCount = people.filter((t) => t.roleTemplateSlug === "subject_teacher").length;

  const filterGrade = grades.find((g) => g.id === gradeFilter);
  const hasFilterSections = (filterGrade?.sections.length ?? 0) > 0;

  const teacherRoles = useMemo(
    () =>
      templates
        .filter((tpl) => (TEACHER_ROLE_SLUGS as readonly string[]).includes(tpl.slug))
        .map((tpl) => ({ slug: tpl.slug, name: tpl.name })),
    [templates],
  );

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(roleFilter) ||
    Boolean(gradeFilter) ||
    Boolean(sectionFilter);

  const filtered = useMemo(() => {
    let rows = people;
    const q = search.trim().toLowerCase();

    if (q) {
      rows = rows.filter(
        (person) =>
          displayName(person).toLowerCase().includes(q) ||
          person.email.toLowerCase().includes(q) ||
          (person.teacherId ?? "").toLowerCase().includes(q) ||
          (person.homeroom?.gradeName ?? "").toLowerCase().includes(q) ||
          (person.homeroom?.sectionName ?? "").toLowerCase().includes(q) ||
          roleLabel(person, t).toLowerCase().includes(q) ||
          subjectNames(person).some((s) => s.toLowerCase().includes(q)),
      );
    }

    if (roleFilter) {
      rows = rows.filter((person) => person.roleTemplateSlug === roleFilter);
    }

    if (gradeFilter) {
      rows = rows.filter((person) => person.homeroom?.gradeId === gradeFilter);
    }

    if (sectionFilter && gradeFilter) {
      rows = rows.filter((person) => person.homeroom?.sectionId === sectionFilter);
    }

    return rows;
  }, [people, search, roleFilter, gradeFilter, sectionFilter, t]);

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setGradeFilter("");
    setSectionFilter("");
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rows, tpls, photos] = await Promise.all([
        listTeachers("teachers"),
        listRoleTemplates(),
        listTeacherPhotoRequests().catch(() => [] as TeacherPhotoRequest[]),
      ]);
      setPeople(rows);
      setTemplates(tpls);
      setPhotoRequests(photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teachersUi.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onReviewPhoto(
    req: TeacherPhotoRequest,
    action: "approve" | "reject",
  ) {
    let note: string | undefined;
    if (action === "reject") {
      const raw = window.prompt(t("teachersUi.rejectPrompt"));
      if (raw === null) return;
      note = raw.trim() || undefined;
    }
    setPhotoBusyId(req.userId);
    setError("");
    try {
      await reviewTeacherPhoto(req.userId, {
        action,
        note,
      });
      setToast(
        action === "approve"
          ? t("teachersUi.photoApproved", { name: req.name })
          : t("teachersUi.photoRejected", { name: req.name }),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teachersUi.photoReviewFailed"));
    } finally {
      setPhotoBusyId("");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rows, tpls] = await Promise.all([
          listTeachers("teachers"),
          listRoleTemplates(),
        ]);
        if (cancelled) return;
        setPeople(rows);
        setTemplates(tpls);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("teachersUi.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    listGrades()
      .then((g) => {
        if (!cancelled) setGrades(g);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [t]);

  const editTarget = useMemo(
    () =>
      editTargetState
        ? (people.find((p) => p.userId === editTargetState.userId) ?? editTargetState)
        : null,
    [people, editTargetState],
  );

  function personalPayload() {
    return {
      phone: phone.trim() || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      bloodType: bloodType.trim() || null,
      address: address.trim() || null,
      emergencyContactName: emergencyContactName.trim() || null,
      emergencyContactPhone: emergencyContactPhone.trim() || null,
    };
  }

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setPhone("");
    setGender("");
    setDateOfBirth("");
    setBloodType("");
    setAddress("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setRoleTemplateSlug("subject_teacher");
    setHasHomeroom(false);
    setHomeroomGradeId("");
    setHomeroomSectionId("");
    setEditTarget(null);
  }

  function openCreate() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEdit(person: TeacherRecord) {
    setEditTarget(person);
    setFirstName(person.firstName ?? "");
    setLastName(person.lastName ?? "");
    setEmail(person.email ?? "");
    setPassword("");
    setRoleTemplateSlug(person.roleTemplateSlug ?? "subject_teacher");
    setPhone(person.phone ?? "");
    setGender(person.gender ?? "");
    setDateOfBirth(person.dateOfBirth ?? "");
    setBloodType(person.bloodType ?? "");
    setAddress(person.address ?? "");
    setEmergencyContactName(person.emergencyContactName ?? "");
    setEmergencyContactPhone(person.emergencyContactPhone ?? "");
    const hr = person.homeroom;
    setHasHomeroom(!!hr);
    setHomeroomGradeId(hr?.gradeId ?? "");
    setHomeroomSectionId(hr?.sectionId ?? "");
    setDrawerOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (hasHomeroom && homeroomNeedsSection && !homeroomSectionId) {
      setError(t("teachersUi.selectHomeroomSection"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const homeroomPayload = {
        homeroomGradeId: hasHomeroom && homeroomGradeId ? homeroomGradeId : null,
        homeroomSectionId: hasHomeroom && homeroomSectionId ? homeroomSectionId : null,
      };
      const personal = personalPayload();
      if (editTarget) {
        await updateTeacher(editTarget.userId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          roleTemplateSlug,
          ...homeroomPayload,
          ...personal,
        });
      } else {
        await createTeacher({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: password || undefined,
          roleTemplateSlug,
          homeroomGradeId: homeroomPayload.homeroomGradeId ?? undefined,
          homeroomSectionId: homeroomPayload.homeroomSectionId ?? undefined,
          ...personal,
        });
      }
      setDrawerOpen(false);
      resetForm();
      setToast(
        editTarget
          ? t("teachersUi.updated", { name: displayName(editTarget) })
          : t("teachersUi.teacherAdded"),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teachersUi.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function requestRemove(teacher: TeacherRecord) {
    setRemoveTarget(teacher);
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const teacher = removeTarget;
    const name = displayName(teacher);
    setBusy(true);
    setError("");
    setToast("");
    try {
      await deleteTeacher(teacher.userId);
      setToast(t("teachersUi.removed", { name }));
      if (editTarget?.userId === teacher.userId) {
        setDrawerOpen(false);
        resetForm();
      }
      setRemoveTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teachersUi.couldNotRemove"));
    } finally {
      setBusy(false);
    }
  }

  function renderActions(teacher: TeacherRecord, compact?: boolean) {
    const name = displayName(teacher);
    const canViewAttendance = hasPermission(Permission.STAFF_ATTENDANCE_READ);
    const attendanceHref = `/admin/staff-attendance?userId=${encodeURIComponent(teacher.userId)}&name=${encodeURIComponent(name)}`;

    return (
      <div className={`tch-v2__actions${compact ? " tch-v2__actions--compact" : ""}`}>
        {canViewAttendance ? (
          <Link
            href={attendanceHref}
            className="tch-v2__action"
            title={t("teachersUi.attendanceHistory")}
          >
            {t("teachersUi.attendance")}
          </Link>
        ) : null}
        <button
          type="button"
          className="tch-v2__action"
          onClick={() => openEdit(teacher)}
          title={t("teachersUi.editHomeroom")}
        >
          {t("common.edit")}
        </button>
        {teacher.teacherId ? (
          <a
            href={`/print/teacher-id-card?userId=${teacher.userId}&duplex=1`}
            className="tch-v2__action"
            target="_blank"
            rel="noreferrer"
            title={t("teachersUi.printIdCard")}
          >
            ID
          </a>
        ) : null}
        <button
          type="button"
          className="tch-v2__action tch-v2__action--danger"
          disabled={busy}
          onClick={() => requestRemove(teacher)}
          title={t("teachersUi.removeTeacher")}
        >
          {t("common.remove")}
        </button>
      </div>
    );
  }

  const emptyDash = "—";

  return (
    <div className="tch-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />
      <AppConfirmDialog
        open={Boolean(removeTarget)}
        tone="danger"
        title={t("teachersUi.removeTeacher")}
        message={
          removeTarget
            ? t("teachersUi.removeConfirm", { name: displayName(removeTarget) })
            : ""
        }
        confirmLabel={t("teachersUi.removeTeacher")}
        cancelLabel={t("common.cancel")}
        busy={busy && Boolean(removeTarget)}
        onCancel={() => {
          if (!busy) setRemoveTarget(null);
        }}
        onConfirm={() => void confirmRemove()}
      />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("teachersUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{tp("Teachers")}</h2>
            <p className="tch-v2__hero-sub">
              {t("teachersUi.heroSubPrefix")}{" "}
              <Link href="/admin/subjects/assign" className="tch-v2__hero-link">
                {tn("Assign subjects")}
              </Link>
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{people.length}</strong>
              <span>{t("teachersUi.statTeachers")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{homeroomCount}</strong>
              <span>{t("teachersUi.statHomeroom")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{subjectTeacherCount}</strong>
              <span>{t("teachersUi.statSubject")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{filtered.length}</strong>
              <span>{t("teachersUi.statShowing")}</span>
            </div>
            {photoRequests.length > 0 ? (
              <div className="tch-v2__stat">
                <strong>{photoRequests.length}</strong>
                <span>{t("teachersUi.statPhotoPending")}</span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {photoRequests.length > 0 ? (
        <section className="tch-v2__photo-queue" aria-label={t("teachersUi.photoQueueAria")}>
          <div className="tch-v2__photo-queue-head">
            <h3>{t("teachersUi.photoQueueTitle")}</h3>
            <p>{t("teachersUi.photoQueueSub")}</p>
          </div>
          <ul className="tch-v2__photo-queue-list">
            {photoRequests.map((req) => (
              <li key={req.userId} className="tch-v2__photo-queue-item">
                <div className="tch-v2__photo-queue-previews">
                  <div className="tch-v2__photo-queue-shot">
                    {req.pendingPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={req.pendingPhotoUrl} alt="" />
                    ) : null}
                    <span>{t("teachersUi.labelNew")}</span>
                  </div>
                  <div className="tch-v2__photo-queue-shot tch-v2__photo-queue-shot--current">
                    {req.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={req.photoUrl} alt="" />
                    ) : (
                      <em>{t("teachersUi.none")}</em>
                    )}
                    <span>{t("teachersUi.labelCurrent")}</span>
                  </div>
                </div>
                <div className="tch-v2__photo-queue-meta">
                  <strong>{req.name}</strong>
                  <span>
                    {req.teacherId ?? emptyDash} · {req.email}
                  </span>
                  {req.photoSubmittedAt ? (
                    <span>
                      {t("teachersUi.submitted")}{" "}
                      {new Date(req.photoSubmittedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : null}
                </div>
                <div className="tch-v2__photo-queue-actions">
                  <button
                    type="button"
                    className="att-btn att-btn--primary"
                    disabled={photoBusyId === req.userId}
                    onClick={() => void onReviewPhoto(req, "approve")}
                  >
                    {t("teachersUi.approve")}
                  </button>
                  <button
                    type="button"
                    className="att-btn att-btn--ghost"
                    disabled={photoBusyId === req.userId}
                    onClick={() => void onReviewPhoto(req, "reject")}
                  >
                    {t("teachersUi.reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="tch-v2__toolbar">
        <label className="tch-v2__search">
          <DashIcon name="teachers" className="dash-icon--sm" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("teachersUi.searchPlaceholder")}
            aria-label={t("common.search")}
          />
        </label>
        <select
          className="tch-v2__filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("teachersUi.filterByRole")}
        >
          <option value="">{t("teachersUi.allRoles")}</option>
          {teacherRoles.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="tch-v2__filter"
          value={gradeFilter}
          onChange={(e) => {
            setGradeFilter(e.target.value);
            setSectionFilter("");
          }}
          aria-label={t("teachersUi.filterByGrade")}
        >
          <option value="">{t("teachersUi.allGrades")}</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {hasFilterSections ? (
          <select
            className="tch-v2__filter"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            aria-label={t("teachersUi.filterBySection")}
          >
            <option value="">{t("teachersUi.allSections")}</option>
            {filterGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className="tch-v2__toolbar-actions">
          {hasActiveFilters ? (
            <button type="button" className="tch-v2__btn tch-v2__btn--ghost" onClick={clearFilters}>
              {t("common.clearFilters")}
            </button>
          ) : null}
          <Link href="/admin/subjects/assign" className="tch-v2__btn tch-v2__btn--ghost">
            {tn("Assign subjects")}
          </Link>
          <Link href="/admin/teachers/cards" className="tch-v2__btn tch-v2__btn--ghost">
            {t("teachersUi.idCards")}
          </Link>
          <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
            + {t("teachersUi.addTeacher")}
          </button>
        </div>
        <p className="tch-v2__toolbar-meta">
          {t("teachersUi.ofShown", { shown: filtered.length, total: people.length })}
        </p>
      </div>

      {loading ? (
        <div className="tch-v2__loading">
          <span className="tch-v2__spinner" aria-hidden />
          <p>{t("teachersUi.loading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-v2__empty">
          <DashIcon name="teachers" className="dash-icon--lg" />
          <h3>
            {people.length === 0 ? t("teachersUi.noTeachersYet") : t("teachersUi.noMatches")}
          </h3>
          <p>
            {people.length === 0 ? t("teachersUi.noTeachersHint") : t("teachersUi.tryFilters")}
          </p>
          {people.length === 0 ? (
            <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
              {t("teachersUi.addTeacher")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="tch-v2__table-wrap tch-v2__desktop-only">
            <table className="tch-v2__table">
              <thead>
                <tr>
                  <th>{t("teachersUi.colTeacher")}</th>
                  <th>{t("teachersUi.colHomeroom")}</th>
                  <th>{t("teachersUi.colSubjects")}</th>
                  <th aria-label={t("common.actions")} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher) => (
                  <tr key={teacher.userId} className="tch-v2__row">
                    <td className="tch-v2__cell tch-v2__cell--teacher">
                      <div className="tch-v2__teacher">
                        <TeacherAvatar teacher={teacher} />
                        <div className="tch-v2__teacher-line">
                          <strong className="tch-v2__name">{displayName(teacher)}</strong>
                          <span className="tch-v2__badge tch-v2__badge--role">
                            {roleLabel(teacher, t)}
                          </span>
                          {teacher.teacherId ? (
                            <code className="tch-v2__id" title={teacher.email}>
                              {teacher.teacherId}
                            </code>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--homeroom">
                      {teacher.homeroom ? (
                        <span className="tch-v2__chip tch-v2__chip--homeroom">
                          {homeroomLine(teacher.homeroom)}
                        </span>
                      ) : (
                        <span className="tch-v2__dash">{emptyDash}</span>
                      )}
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--subjects">
                      <SubjectsCell teacher={teacher} emptyDash={emptyDash} />
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--actions">
                      {renderActions(teacher)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tch-v2__cards tch-v2__mobile-only">
            {filtered.map((teacher) => (
              <article key={teacher.userId} className="tch-v2__card">
                <header className="tch-v2__card-head">
                  <TeacherAvatar teacher={teacher} />
                  <div>
                    <strong className="tch-v2__name">{displayName(teacher)}</strong>
                    <span className="tch-v2__meta">{teacher.email}</span>
                    {teacher.teacherId ? (
                      <span className="tch-v2__meta">{teacher.teacherId}</span>
                    ) : null}
                    <span className="tch-v2__badge tch-v2__badge--role">
                      {roleLabel(teacher, t)}
                    </span>
                  </div>
                </header>
                <div className="tch-v2__card-block">
                  <span className="tch-v2__card-label">{t("teachersUi.colHomeroom")}</span>
                  {teacher.homeroom ? (
                    <span className="tch-v2__badge tch-v2__badge--homeroom">
                      {homeroomLine(teacher.homeroom)}
                    </span>
                  ) : (
                    <span className="tch-v2__muted">{t("teachersUi.notAssigned")}</span>
                  )}
                </div>
                <div className="tch-v2__card-block">
                  <span className="tch-v2__card-label">{t("teachersUi.colSubjects")}</span>
                  <SubjectsCell teacher={teacher} emptyDash={emptyDash} />
                </div>
                {renderActions(teacher, true)}
              </article>
            ))}
          </div>
        </>
      )}

      {drawerOpen ? (
        <div
          className="tch-drawer-backdrop"
          role="presentation"
          onClick={() => {
            setDrawerOpen(false);
            resetForm();
          }}
        >
          <aside
            className="tch-drawer-shell tch-drawer-shell--wide"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={editTarget ? t("teachersUi.drawerEdit") : t("teachersUi.drawerAdd")}
          >
            <header className="tch-drawer-shell__head">
              <div>
                <p className="tch-drawer-shell__eyebrow">{t("teachersUi.chip")}</p>
                <h2 className="tch-drawer-shell__title">
                  {editTarget ? t("teachersUi.profileTitle") : t("teachersUi.newTitle")}
                </h2>
                <p className="tch-drawer-shell__sub">
                  {editTarget ? t("teachersUi.profileSubEdit") : t("teachersUi.profileSubNew")}
                </p>
              </div>
              <button
                type="button"
                className="tch-drawer-shell__close"
                aria-label={t("common.close")}
                onClick={() => {
                  setDrawerOpen(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </header>

            <form
              id="tch-teacher-form"
              className="tch-drawer-shell__form"
              onSubmit={(e) => void onSubmit(e)}
            >
              <div className="tch-drawer-shell__body tch-drawer">
              <section className="tch-drawer-section">
                <h3 className="tch-drawer-section__title">{t("teachersUi.sectionAccount")}</h3>
                <label>
                  {t("teachersUi.firstName")}
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  {t("teachersUi.lastName")}
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </label>
                <label>
                  {t("teachersUi.schoolEmail")}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <label>
                  {editTarget
                    ? t("teachersUi.newPasswordOptional")
                    : t("teachersUi.tempPassword")}
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={editTarget ? undefined : 8}
                    placeholder={t("teachersUi.minEightChars")}
                    autoComplete="new-password"
                  />
                  {editTarget ? (
                    <em className="tch-drawer-hint">{t("teachersUi.leaveBlankPassword")}</em>
                  ) : null}
                </label>
                {editTarget?.teacherId ? (
                  <p className="tch-drawer-hint">
                    {t("teachersUi.teacherId")}: <strong>{editTarget.teacherId}</strong>
                  </p>
                ) : null}
              </section>

              {editTarget ? (
                <AdminStaffPhotoField
                  userId={editTarget.userId}
                  photoUrl={editTarget.photoUrl}
                  onUpdated={(next) => {
                    setPeople((rows) =>
                      rows.map((p) => (p.userId === next.userId ? { ...p, ...next } : p)),
                    );
                    setEditTarget((prev) =>
                      prev && prev.userId === next.userId ? { ...prev, ...next } : prev,
                    );
                  }}
                  onToast={setToast}
                  onError={setError}
                />
              ) : null}

              <section className="tch-drawer-section">
                <h3 className="tch-drawer-section__title">{t("teachersUi.sectionIdCard")}</h3>
                <p className="tch-meta">{t("teachersUi.idCardMeta")}</p>
                <label>
                  {t("teachersUi.phone")}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder={t("teachersUi.phonePlaceholder")}
                  />
                </label>
                <label>
                  {t("teachersUi.sex")}
                  <select
                    value={gender}
                    onChange={(e) =>
                      setGender(e.target.value as "" | "MALE" | "FEMALE" | "OTHER")
                    }
                  >
                    <option value="">{t("teachersUi.select")}</option>
                    <option value="MALE">{t("teachersUi.male")}</option>
                    <option value="FEMALE">{t("teachersUi.female")}</option>
                    <option value="OTHER">{t("teachersUi.other")}</option>
                  </select>
                </label>
                <label>
                  {t("teachersUi.dateOfBirth")}
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </label>
                <label>
                  {t("teachersUi.bloodType")}
                  <input
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    placeholder={t("teachersUi.bloodPlaceholder")}
                  />
                </label>
                <label>
                  {t("teachersUi.address")}
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                  />
                </label>
                <label>
                  {t("teachersUi.emergencyName")}
                  <input
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                  />
                </label>
                <label>
                  {t("teachersUi.emergencyPhone")}
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  />
                </label>
              </section>

              <section className="tch-drawer-section">
                <h3 className="tch-drawer-section__title">{t("teachersUi.sectionPortalRole")}</h3>
                <label>
                  {t("teachersUi.roleTemplate")}
                  <select
                    value={roleTemplateSlug}
                    onChange={(e) => setRoleTemplateSlug(e.target.value)}
                  >
                    {templates
                      .filter((tpl) =>
                        (TEACHER_ROLE_SLUGS as readonly string[]).includes(tpl.slug),
                      )
                      .map((tpl) => (
                        <option key={tpl.slug} value={tpl.slug}>
                          {tpl.name}
                        </option>
                      ))}
                  </select>
                </label>
              </section>

              <section className="tch-drawer-section">
                <div className="tch-drawer-section__head">
                  <h3 className="tch-drawer-section__title">{t("teachersUi.sectionHomeroom")}</h3>
                  <label className="tch-toggle">
                    <input
                      type="checkbox"
                      checked={hasHomeroom}
                      onChange={(e) => {
                        setHasHomeroom(e.target.checked);
                        if (!e.target.checked) {
                          setHomeroomGradeId("");
                          setHomeroomSectionId("");
                        }
                      }}
                    />
                    <span>{t("teachersUi.hasHomeroom")}</span>
                  </label>
                </div>
                {hasHomeroom ? (
                  <>
                    <label>
                      {t("teachersUi.grade")}
                      <select
                        value={homeroomGradeId}
                        onChange={(e) => {
                          setHomeroomGradeId(e.target.value);
                          const g = grades.find((x) => x.id === e.target.value);
                          setHomeroomSectionId(g?.sections[0]?.id ?? "");
                        }}
                        required
                      >
                        <option value="">{t("teachersUi.selectGrade")}</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {homeroomGrade && homeroomGrade.sections.length > 0 ? (
                      <label>
                        {t("teachersUi.section")}
                        <select
                          value={homeroomSectionId}
                          onChange={(e) => setHomeroomSectionId(e.target.value)}
                          required
                        >
                          <option value="">{t("teachersUi.selectSection")}</option>
                          {homeroomGrade.sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </>
                ) : (
                  <p className="tch-meta">{t("teachersUi.homeroomMeta")}</p>
                )}
              </section>

              {editTarget ? (
                <section className="tch-drawer-section tch-drawer-section--slots">
                  <div className="tch-drawer-section__head">
                    <h3 className="tch-drawer-section__title">
                      {t("teachersUi.sectionSubjectsTeaching")}
                    </h3>
                    <Link
                      href={assignSubjectsHref(editTarget, grades)}
                      className="tch-drawer-section__link"
                    >
                      {tn("Assign subjects")}
                    </Link>
                  </div>
                  {editTarget.teachingSlots.length === 0 ? (
                    <p className="tch-meta">{t("teachersUi.noSubjectsYet")}</p>
                  ) : (
                    <ul className="tch-drawer-slots">
                      {editTarget.teachingSlots.map((slot, i) => (
                        <li key={`${slot.subjectName}-${slot.gradeName}-${slot.sectionName ?? ""}-${i}`}>
                          <Link
                            href={assignSlotHref(editTarget, slot, grades)}
                            className="tch-drawer-slot"
                          >
                            <strong>{slot.subjectName}</strong>
                            <span>{teachingSlotClass(slot)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
              </div>

              <footer className="tch-drawer-shell__foot">
                <button
                  type="button"
                  className="att-btn att-btn--ghost"
                  onClick={() => {
                    setDrawerOpen(false);
                    resetForm();
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="att-btn att-btn--primary" disabled={busy}>
                  {busy
                    ? t("common.saving")
                    : editTarget
                      ? t("teachersUi.saveTeacher")
                      : t("teachersUi.createTeacher")}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
