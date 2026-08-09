"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { TEACHER_ROLE_SLUGS } from "@/lib/people";
import { ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import {
  createTeacher,
  deleteTeacher,
  listRoleTemplates,
  listTeachers,
  updateTeacher,
  type RoleTemplate,
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

function SubjectsCell({ teacher }: { teacher: TeacherRecord }) {
  const subjects = subjectNames(teacher);
  if (subjects.length === 0) {
    return <span className="tch-v2__dash">—</span>;
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

function roleLabel(t: TeacherRecord) {
  return (
    t.roleTemplateName ??
    (t.roleTemplateSlug ? ROLE_TEMPLATE_LABELS[t.roleTemplateSlug] : "Teacher")
  );
}

export function TeachersWorkspace() {
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
  const [editTarget, setEditTarget] = useState<TeacherRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
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
        (t) =>
          displayName(t).toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.teacherId ?? "").toLowerCase().includes(q) ||
          (t.homeroom?.gradeName ?? "").toLowerCase().includes(q) ||
          (t.homeroom?.sectionName ?? "").toLowerCase().includes(q) ||
          roleLabel(t).toLowerCase().includes(q) ||
          subjectNames(t).some((s) => s.toLowerCase().includes(q)),
      );
    }

    if (roleFilter) {
      rows = rows.filter((t) => t.roleTemplateSlug === roleFilter);
    }

    if (gradeFilter) {
      rows = rows.filter((t) => t.homeroom?.gradeId === gradeFilter);
    }

    if (sectionFilter && gradeFilter) {
      rows = rows.filter((t) => t.homeroom?.sectionId === sectionFilter);
    }

    return rows;
  }, [people, search, roleFilter, gradeFilter, sectionFilter]);

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
      const [rows, tpls] = await Promise.all([
        listTeachers("teachers"),
        listRoleTemplates(),
      ]);
      setPeople(rows);
      setTemplates(tpls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load teachers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([load(), listGrades().then(setGrades)]).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editTarget) return;
    const fresh = people.find((p) => p.userId === editTarget.userId);
    if (fresh) setEditTarget(fresh);
  }, [people, editTarget?.userId]);

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
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
    setRoleTemplateSlug(person.roleTemplateSlug ?? "subject_teacher");
    const hr = person.homeroom;
    setHasHomeroom(!!hr);
    setHomeroomGradeId(hr?.gradeId ?? "");
    setHomeroomSectionId(hr?.sectionId ?? "");
    setDrawerOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (hasHomeroom && homeroomNeedsSection && !homeroomSectionId) {
      setError("Select a section for this homeroom class.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const homeroomPayload = {
        homeroomGradeId: hasHomeroom && homeroomGradeId ? homeroomGradeId : null,
        homeroomSectionId: hasHomeroom && homeroomSectionId ? homeroomSectionId : null,
      };
      if (editTarget) {
        await updateTeacher(editTarget.userId, {
          roleTemplateSlug,
          ...homeroomPayload,
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
        });
      }
      setDrawerOpen(false);
      resetForm();
      setToast(editTarget ? `${displayName(editTarget)} updated.` : "Teacher added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(t: TeacherRecord) {
    const name = displayName(t);
    if (
      !window.confirm(
        `Remove ${name} from the school? Their login will be deleted. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setToast("");
    try {
      await deleteTeacher(t.userId);
      setToast(`${name} removed.`);
      if (editTarget?.userId === t.userId) {
        setDrawerOpen(false);
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove teacher");
    } finally {
      setBusy(false);
    }
  }

  function renderActions(t: TeacherRecord, compact?: boolean) {
    return (
      <div className={`tch-v2__actions${compact ? " tch-v2__actions--compact" : ""}`}>
        <button type="button" className="tch-v2__action" onClick={() => openEdit(t)} title="Edit homeroom">
          Edit
        </button>
        {t.teacherId ? (
          <a
            href={`/print/teacher-id-card?userId=${t.userId}&duplex=1`}
            className="tch-v2__action"
            target="_blank"
            rel="noreferrer"
            title="Print ID card"
          >
            ID
          </a>
        ) : null}
        <button
          type="button"
          className="tch-v2__action tch-v2__action--danger"
          disabled={busy}
          onClick={() => void onRemove(t)}
          title="Remove teacher"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="tch-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Faculty</span>
            <h2 className="tch-v2__hero-title">Teachers</h2>
            <p className="tch-v2__hero-sub">
              Homeroom and taught subjects are listed below. Manage class
              assignments on{" "}
              <Link href="/admin/subjects/assign" className="tch-v2__hero-link">
                Assign subjects
              </Link>
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{people.length}</strong>
              <span>Teachers</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{homeroomCount}</strong>
              <span>Homeroom</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{subjectTeacherCount}</strong>
              <span>Subject</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{filtered.length}</strong>
              <span>Showing</span>
            </div>
          </div>
        </div>
      </header>

      <div className="tch-v2__toolbar">
        <label className="tch-v2__search">
          <DashIcon name="teachers" className="dash-icon--sm" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, ID, subject, homeroom…"
          />
        </label>
        <select
          className="tch-v2__filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
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
          aria-label="Filter by grade"
        >
          <option value="">All grades</option>
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
            aria-label="Filter by section"
          >
            <option value="">All sections</option>
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
              Clear filters
            </button>
          ) : null}
          <Link href="/admin/subjects/assign" className="tch-v2__btn tch-v2__btn--ghost">
            Assign subjects
          </Link>
          <Link href="/admin/teachers/cards" className="tch-v2__btn tch-v2__btn--ghost">
            ID cards
          </Link>
          <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
            + Add teacher
          </button>
        </div>
        <p className="tch-v2__toolbar-meta">
          {filtered.length} of {people.length} shown
        </p>
      </div>

      {loading ? (
        <div className="tch-v2__loading">
          <span className="tch-v2__spinner" aria-hidden />
          <p>Loading teachers…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-v2__empty">
          <DashIcon name="teachers" className="dash-icon--lg" />
          <h3>{people.length === 0 ? "No teachers yet" : "No matches"}</h3>
          <p>
            {people.length === 0
              ? "Add your first teacher, then set homeroom."
              : "Try different search or filter settings."}
          </p>
          {people.length === 0 ? (
            <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
              Add teacher
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="tch-v2__table-wrap tch-v2__desktop-only">
            <table className="tch-v2__table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Homeroom</th>
                  <th>Subjects</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.userId} className="tch-v2__row">
                    <td className="tch-v2__cell tch-v2__cell--teacher">
                      <div className="tch-v2__teacher">
                        <span className="tch-v2__avatar" aria-hidden>
                          {initials(displayName(t))}
                        </span>
                        <div className="tch-v2__teacher-line">
                          <strong className="tch-v2__name">{displayName(t)}</strong>
                          <span className="tch-v2__badge tch-v2__badge--role">{roleLabel(t)}</span>
                          {t.teacherId ? (
                            <code className="tch-v2__id" title={t.email}>
                              {t.teacherId}
                            </code>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--homeroom">
                      {t.homeroom ? (
                        <span className="tch-v2__chip tch-v2__chip--homeroom">
                          {homeroomLine(t.homeroom)}
                        </span>
                      ) : (
                        <span className="tch-v2__dash">—</span>
                      )}
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--subjects">
                      <SubjectsCell teacher={t} />
                    </td>
                    <td className="tch-v2__cell tch-v2__cell--actions">{renderActions(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tch-v2__cards tch-v2__mobile-only">
            {filtered.map((t) => (
              <article key={t.userId} className="tch-v2__card">
                <header className="tch-v2__card-head">
                  <span className="tch-v2__avatar" aria-hidden>
                    {initials(displayName(t))}
                  </span>
                  <div>
                    <strong className="tch-v2__name">{displayName(t)}</strong>
                    <span className="tch-v2__meta">{t.email}</span>
                    {t.teacherId ? (
                      <span className="tch-v2__meta">{t.teacherId}</span>
                    ) : null}
                    <span className="tch-v2__badge tch-v2__badge--role">{roleLabel(t)}</span>
                  </div>
                </header>
                <div className="tch-v2__card-block">
                  <span className="tch-v2__card-label">Homeroom</span>
                  {t.homeroom ? (
                    <span className="tch-v2__badge tch-v2__badge--homeroom">
                      {homeroomLine(t.homeroom)}
                    </span>
                  ) : (
                    <span className="tch-v2__muted">Not assigned</span>
                  )}
                </div>
                <div className="tch-v2__card-block">
                  <span className="tch-v2__card-label">Subjects</span>
                  <SubjectsCell teacher={t} />
                </div>
                {renderActions(t, true)}
              </article>
            ))}
          </div>
        </>
      )}

      {drawerOpen ? (
        <div
          className="stu-drawer-backdrop"
          role="presentation"
          onClick={() => {
            setDrawerOpen(false);
            resetForm();
          }}
        >
          <aside
            className="stu-drawer stu-drawer--wide tch-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={editTarget ? "Edit teacher" : "Add teacher"}
          >
            <header className="stu-drawer__head">
              <div>
                <h2 className="stu-drawer__title">
                  {editTarget ? "Teacher profile" : "New teacher"}
                </h2>
                <p className="stu-drawer__sub">
                  {editTarget
                    ? "Update role and homeroom. Subject classes are listed below."
                    : "Create the account, then set homeroom."}
                </p>
              </div>
              <button
                type="button"
                className="stu-drawer__close"
                aria-label="Close"
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
              className="stu-drawer__body tch-drawer"
              onSubmit={(e) => void onSubmit(e)}
            >
              {!editTarget ? (
                <section className="tch-drawer-section">
                  <h3 className="tch-drawer-section__title">Account</h3>
                  <label>
                    First name
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                    />
                  </label>
                  <label>
                    School email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      placeholder="Min. 8 characters"
                    />
                  </label>
                </section>
              ) : (
                <section className="tch-drawer-section tch-drawer-section--readonly">
                  <h3 className="tch-drawer-section__title">Account</h3>
                  <p className="tch-drawer-readonly">
                    <strong>{displayName(editTarget)}</strong>
                    <span>{editTarget.email}</span>
                  </p>
                </section>
              )}

              <section className="tch-drawer-section">
                <h3 className="tch-drawer-section__title">Portal role</h3>
                <label>
                  Role template
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
                  <h3 className="tch-drawer-section__title">Homeroom class</h3>
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
                    <span>Has homeroom</span>
                  </label>
                </div>
                {hasHomeroom ? (
                  <>
                    <label>
                      Grade
                      <select
                        value={homeroomGradeId}
                        onChange={(e) => {
                          setHomeroomGradeId(e.target.value);
                          const g = grades.find((x) => x.id === e.target.value);
                          setHomeroomSectionId(g?.sections[0]?.id ?? "");
                        }}
                        required
                      >
                        <option value="">Select grade</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {homeroomGrade && homeroomGrade.sections.length > 0 ? (
                      <label>
                        Section
                        <select
                          value={homeroomSectionId}
                          onChange={(e) => setHomeroomSectionId(e.target.value)}
                          required
                        >
                          <option value="">Select section</option>
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
                  <p className="tch-meta">
                    Homeroom is the class this teacher leads daily (one grade &amp; section).
                  </p>
                )}
              </section>

              {editTarget ? (
                <section className="tch-drawer-section tch-drawer-section--slots">
                  <div className="tch-drawer-section__head">
                    <h3 className="tch-drawer-section__title">Subjects teaching</h3>
                    <Link
                      href={assignSubjectsHref(editTarget, grades)}
                      className="tch-drawer-section__link"
                    >
                      Assign subjects
                    </Link>
                  </div>
                  {editTarget.teachingSlots.length === 0 ? (
                    <p className="tch-meta">No subjects assigned yet.</p>
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

              <footer className="tch-drawer__foot">
                <button
                  type="button"
                  className="att-btn att-btn--ghost"
                  onClick={() => {
                    setDrawerOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="att-btn att-btn--primary" disabled={busy}>
                  {busy ? "Saving…" : editTarget ? "Save homeroom" : "Create teacher"}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
