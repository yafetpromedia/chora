"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { TEACHER_ROLE_SLUGS } from "@/lib/people";
import { ROLE_TEMPLATE_LABELS } from "@/lib/permissions";
import {
  createTeacher,
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

function homeroomLine(h: TeacherRecord["homeroom"]) {
  if (!h) return null;
  return `${h.gradeName}${h.sectionName ? ` · ${h.sectionName}` : ""}`;
}

function assignSubjectsHref(teacher: TeacherRecord) {
  const q = new URLSearchParams();
  if (teacher.homeroom?.gradeId) q.set("gradeId", teacher.homeroom.gradeId);
  if (teacher.homeroom?.sectionId) q.set("sectionId", teacher.homeroom.sectionId);
  q.set("teacherId", teacher.userId);
  return `/admin/subjects/assign?${q}`;
}

export function TeachersWorkspace() {
  const [people, setPeople] = useState<TeacherRecord[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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
  const homeroomNeedsSection =
    hasHomeroom && (homeroomGrade?.sections.length ?? 0) > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.homeroom?.gradeName ?? "").toLowerCase().includes(q) ||
        (t.teachingSlots ?? []).some((s) =>
          `${s.gradeName} ${s.subjectName}`.toLowerCase().includes(q),
        ),
    );
  }, [people, search]);

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
        homeroomSectionId:
          hasHomeroom && homeroomSectionId ? homeroomSectionId : null,
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="att-page tch-workspace">
      {error ? <p className="att-toast att-toast--error">{error}</p> : null}

      <div className="tch-workflow">
        <div className="tch-workflow__step tch-workflow__step--active">
          <span className="tch-workflow__num">1</span>
          <div>
            <strong>Teachers & homeroom</strong>
            <span>Add staff and assign one homeroom class per teacher.</span>
          </div>
        </div>
        <div className="tch-workflow__arrow" aria-hidden>
          →
        </div>
        <Link href="/admin/subjects/assign" className="tch-workflow__step">
          <span className="tch-workflow__num">2</span>
          <div>
            <strong>Subject classes</strong>
            <span>Pick grade & section, then assign Math, English, etc.</span>
          </div>
        </Link>
      </div>

      <div className="tch-toolbar tch-toolbar--modern">
        <button type="button" className="att-btn att-btn--primary" onClick={openCreate}>
          + Add teacher
        </button>
        <label className="tch-search">
          <span className="sr-only">Search teachers</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, class…"
          />
        </label>
        <Link href="/admin/subjects/assign" className="att-btn att-btn--ghost">
          Subject assignment
        </Link>
      </div>

      {loading ? (
        <p className="tch-meta">Loading teachers…</p>
      ) : filtered.length === 0 ? (
        <div className="tch-empty">
          <p>{people.length === 0 ? "No teachers yet." : "No teachers match your search."}</p>
          {people.length === 0 ? (
            <button type="button" className="att-btn att-btn--primary" onClick={openCreate}>
              Add your first teacher
            </button>
          ) : null}
        </div>
      ) : (
        <div className="tch-grid">
          {filtered.map((t) => {
            const slots = t.teachingSlots ?? [];
            const roleLabel =
              t.roleTemplateName ??
              (t.roleTemplateSlug
                ? ROLE_TEMPLATE_LABELS[t.roleTemplateSlug]
                : "Teacher");
            return (
              <article key={t.userId} className="tch-card">
                <div className="tch-card__top">
                  <div className="tch-card__avatar" aria-hidden>
                    {initials(t.name)}
                  </div>
                  <div className="tch-card__identity">
                    <h3 className="tch-card__name">{t.name}</h3>
                    <p className="tch-card__email">{t.email}</p>
                    <span className="tch-role-pill">{roleLabel}</span>
                  </div>
                </div>

                <div className="tch-card__block">
                  <span className="tch-card__label">Homeroom</span>
                  {t.homeroom ? (
                    <p className="tch-card__homeroom">
                      <span className="tch-badge tch-badge--homeroom">Advisory</span>
                      {homeroomLine(t.homeroom)}
                    </p>
                  ) : (
                    <p className="tch-meta">Not assigned</p>
                  )}
                </div>

                <div className="tch-card__block">
                  <span className="tch-card__label">Subject classes</span>
                  {slots.length > 0 ? (
                    <ul className="tch-slot-list">
                      {slots.map((slot, i) => (
                        <li key={`${slot.gradeName}-${slot.subjectName}-${i}`}>
                          <span className="tch-badge tch-badge--subject">
                            {slot.subjectName}
                          </span>
                          <span className="tch-slot-class">
                            {slot.gradeName}
                            {slot.sectionName ? ` · ${slot.sectionName}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="tch-meta">No subjects linked yet</p>
                  )}
                </div>

                <div className="tch-card__actions">
                  <button
                    type="button"
                    className="att-btn att-btn--ghost"
                    onClick={() => openEdit(t)}
                  >
                    Homeroom
                  </button>
                  <Link href={assignSubjectsHref(t)} className="att-btn att-btn--primary">
                    Assign subjects
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
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
                    ? "Update homeroom. Subject classes are set per grade on Subject assignment."
                    : "Create the account, then set homeroom and subject classes."}
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
                    <strong>
                      {editTarget.firstName} {editTarget.lastName}
                    </strong>
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
                      .filter((t) =>
                        (TEACHER_ROLE_SLUGS as readonly string[]).includes(t.slug),
                      )
                      .map((t) => (
                        <option key={t.slug} value={t.slug}>
                          {t.name}
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
                    Homeroom is the class this teacher leads daily (one grade & section).
                  </p>
                )}
              </section>

              {editTarget ? (
                <section className="tch-drawer-section tch-drawer-section--link">
                  <h3 className="tch-drawer-section__title">Subject teaching</h3>
                  <p className="tch-meta">
                    Assign Math, Science, etc. for each grade on the subject assignment
                    board.
                  </p>
                  <Link
                    href={assignSubjectsHref(editTarget)}
                    className="att-btn att-btn--primary"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Open subject assignment
                  </Link>
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
