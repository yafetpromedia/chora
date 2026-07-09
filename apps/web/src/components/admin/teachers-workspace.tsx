"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashIcon } from "@/components/dashboard/dash-icons";
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

function assignSubjectsHref(teacher: TeacherRecord) {
  const q = new URLSearchParams();
  if (teacher.homeroom?.gradeId) q.set("gradeId", teacher.homeroom.gradeId);
  if (teacher.homeroom?.sectionId) q.set("sectionId", teacher.homeroom.sectionId);
  q.set("teacherId", teacher.userId);
  return `/admin/subjects/assign?${q}`;
}

function roleLabel(t: TeacherRecord) {
  return (
    t.roleTemplateName ??
    (t.roleTemplateSlug ? ROLE_TEMPLATE_LABELS[t.roleTemplateSlug] : "Teacher")
  );
}

function SubjectSlots({ slots }: { slots: TeacherRecord["teachingSlots"] }) {
  if (!slots?.length) return <span className="tch-v2__muted">No subjects yet</span>;
  return (
    <ul className="tch-v2__slots">
      {slots.map((slot, i) => (
        <li key={`${slot.gradeName}-${slot.subjectName}-${i}`}>
          <span className="tch-v2__badge tch-v2__badge--subject">{slot.subjectName}</span>
          <span className="tch-v2__muted">
            {slot.gradeName}
            {slot.sectionName ? ` · ${slot.sectionName}` : ""}
          </span>
        </li>
      ))}
    </ul>
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
  const subjectsCount = people.filter((t) => (t.teachingSlots?.length ?? 0) > 0).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (t) =>
        displayName(t).toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.teacherId ?? "").toLowerCase().includes(q) ||
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
        <button type="button" className="tch-v2__action" onClick={() => openEdit(t)}>
          Homeroom
        </button>
        <Link href={assignSubjectsHref(t)} className="tch-v2__action tch-v2__action--primary">
          Subjects
        </Link>
        {t.teacherId ? (
          <a
            href={`/print/teacher-id-card?userId=${t.userId}&duplex=1`}
            className="tch-v2__action"
            target="_blank"
            rel="noreferrer"
          >
            ID card
          </a>
        ) : null}
        <button
          type="button"
          className="tch-v2__action tch-v2__action--danger"
          disabled={busy}
          onClick={() => void onRemove(t)}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="tch-v2">
      {error ? (
        <div className="tch-v2__alert tch-v2__alert--err" role="alert">
          {error}
        </div>
      ) : null}
      {toast ? (
        <div className="tch-v2__alert tch-v2__alert--ok" role="status">
          {toast}
        </div>
      ) : null}

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Faculty</span>
            <h2 className="tch-v2__hero-title">Teachers &amp; homeroom</h2>
            <p className="tch-v2__hero-sub">
              Add staff, assign homeroom classes, then link subject teaching per grade.
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
              <strong>{subjectsCount}</strong>
              <span>Teaching</span>
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
            placeholder="Search name, email, class, subject…"
          />
        </label>
        <div className="tch-v2__toolbar-actions">
          <Link href="/admin/subjects/assign" className="tch-v2__btn tch-v2__btn--ghost">
            Subject assignment
          </Link>
          <Link href="/admin/teachers/cards" className="tch-v2__btn tch-v2__btn--ghost">
            ID cards
          </Link>
          <button type="button" className="tch-v2__btn tch-v2__btn--primary" onClick={openCreate}>
            + Add teacher
          </button>
        </div>
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
              ? "Add your first teacher, then assign homeroom and subjects."
              : "Try a different search term."}
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
                  <th>Subject classes</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.userId}>
                    <td>
                      <div className="tch-v2__teacher">
                        <span className="tch-v2__avatar" aria-hidden>
                          {initials(displayName(t))}
                        </span>
                        <div>
                          <strong className="tch-v2__name">{displayName(t)}</strong>
                          <span className="tch-v2__meta">
                            {t.teacherId ? `${t.teacherId} · ` : ""}
                            {t.email}
                          </span>
                          <span className="tch-v2__badge tch-v2__badge--role">{roleLabel(t)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {t.homeroom ? (
                        <span className="tch-v2__badge tch-v2__badge--homeroom">
                          {homeroomLine(t.homeroom)}
                        </span>
                      ) : (
                        <span className="tch-v2__muted">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <SubjectSlots slots={t.teachingSlots} />
                    </td>
                    <td>{renderActions(t)}</td>
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
                  <span className="tch-v2__card-label">Subject classes</span>
                  <SubjectSlots slots={t.teachingSlots} />
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
                <section className="tch-drawer-section tch-drawer-section--link">
                  <h3 className="tch-drawer-section__title">Subject teaching</h3>
                  <p className="tch-meta">
                    Assign Math, Science, etc. for each grade on the subject assignment board.
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
