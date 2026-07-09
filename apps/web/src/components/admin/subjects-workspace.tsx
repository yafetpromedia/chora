"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsAlert,
  AcademicsBadge,
  AcademicsBreadcrumb,
  AcademicsEmpty,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import {
  createSubject,
  listClassSubjects,
  listSubjects,
  updateSubject,
  type Subject,
} from "@/lib/results";

function subjectHue(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h + code.charCodeAt(i) * 31) % 360;
  return h;
}

function subjectInitials(name: string, code: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return code.slice(0, 2).toUpperCase();
}

export function SubjectsWorkspace() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rows, assignments] = await Promise.all([listSubjects(), listClassSubjects()]);
      setSubjects(rows);
      const counts: Record<string, number> = {};
      for (const row of assignments) {
        const id = row.subject.id;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      setAssignmentCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subjects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const assignedCount = useMemo(
    () => subjects.filter((s) => (assignmentCounts[s.id] ?? 0) > 0).length,
    [subjects, assignmentCounts],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q),
    );
  }, [subjects, search]);

  function resetForm() {
    setName("");
    setCode("");
    setEditTarget(null);
  }

  function openCreate() {
    resetForm();
    setPanelOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditTarget(subject);
    setName(subject.name);
    setCode(subject.code);
    setPanelOpen(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (editTarget) {
        await updateSubject(editTarget.id, { name: name.trim() });
        setSuccess(`${name.trim()} updated.`);
      } else {
        await createSubject({ name: name.trim(), code: code.trim().toUpperCase() });
        setSuccess(`${name.trim()} added to the catalog.`);
      }
      setPanelOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const heroStats = [
    { label: "In catalog", value: loading ? "—" : subjects.length },
    { label: "In classes", value: loading ? "—" : assignedCount },
    {
      label: "Unassigned",
      value: loading ? "—" : Math.max(subjects.length - assignedCount, 0),
      accent: !loading && subjects.length - assignedCount > 0,
    },
    { label: "Showing", value: loading ? "—" : filtered.length },
  ];

  return (
    <div className="acad-page sub-v2">
      <AcademicsBreadcrumb
        items={[
          { label: "Academics", href: "/admin/academics" },
          { label: "Subjects" },
        ]}
      />

      <AcademicsHero
        chip="Curriculum"
        title="Subject catalog"
        subtitle="Define what your school teaches — then assign subjects to grades, sections, and teachers for the active year."
        stats={heroStats}
        badges={
          <>
            <AcademicsBadge variant="live">
              {loading ? "Loading…" : `${subjects.length} subjects`}
            </AcademicsBadge>
            {!loading && assignedCount > 0 ? (
              <AcademicsBadge variant="default">
                {assignedCount} linked to classes
              </AcademicsBadge>
            ) : null}
          </>
        }
      />

      {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}
      {success ? <AcademicsAlert tone="success">{success}</AcademicsAlert> : null}

      <div className="sub-v2__links">
        <Link href="/admin/subjects/assign" className="sub-v2__link-card">
          <span className="sub-v2__link-icon sub-v2__link-icon--assign" aria-hidden>
            <DashIcon name="teachers" className="dash-icon--sm" />
          </span>
          <span className="sub-v2__link-body">
            <strong>Assign to classes</strong>
            <span>Link grade, section, subject, and teacher for this year.</span>
          </span>
          <span className="sub-v2__link-cta">Open assignment →</span>
        </Link>
        <Link href="/admin/timetable" className="sub-v2__link-card">
          <span className="sub-v2__link-icon sub-v2__link-icon--time" aria-hidden>
            <DashIcon name="calendar" className="dash-icon--sm" />
          </span>
          <span className="sub-v2__link-body">
            <strong>Timetable</strong>
            <span>Schedule periods once subjects are assigned to classes.</span>
          </span>
          <span className="sub-v2__link-cta">Open timetable →</span>
        </Link>
      </div>

      <div className="sub-v2__layout">
        <section className="sub-v2__main">
          <div className="sub-v2__toolbar">
            <label className="sub-v2__search">
              <DashIcon name="library" className="dash-icon--sm" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or code…"
              />
            </label>
            <button type="button" className="sub-v2__btn sub-v2__btn--primary" onClick={openCreate}>
              + Add subject
            </button>
          </div>

          {loading ? (
            <div className="sub-v2__loading">
              <span className="sub-v2__loading-spinner" aria-hidden />
              <p>Loading catalog…</p>
            </div>
          ) : filtered.length === 0 ? (
            <AcademicsEmpty
              message={
                subjects.length === 0
                  ? "No subjects yet. Add Mathematics, English, Biology, and other core subjects to get started."
                  : "No subjects match your search."
              }
            />
          ) : (
            <ul className="sub-v2__grid">
              {filtered.map((s) => {
                const hue = subjectHue(s.code);
                const classes = assignmentCounts[s.id] ?? 0;
                return (
                  <li key={s.id} className="sub-v2__card">
                    <div
                      className="sub-v2__avatar"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hue} 62% 42%), hsl(${(hue + 28) % 360} 58% 36%))`,
                      }}
                      aria-hidden
                    >
                      {subjectInitials(s.name, s.code)}
                    </div>
                    <div className="sub-v2__card-body">
                      <div className="sub-v2__card-top">
                        <h3 className="sub-v2__name">{s.name}</h3>
                        <code className="sub-v2__code">{s.code}</code>
                      </div>
                      <p className="sub-v2__meta">
                        {classes > 0
                          ? `${classes} class${classes === 1 ? "" : "es"} this year`
                          : "Not assigned to any class yet"}
                      </p>
                      <div className="sub-v2__tags">
                        {s.isSystem ? (
                          <span className="sub-v2__tag sub-v2__tag--system">Core</span>
                        ) : (
                          <span className="sub-v2__tag">Custom</span>
                        )}
                        {s.isCustomized ? (
                          <span className="sub-v2__tag sub-v2__tag--edited">Renamed</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="sub-v2__card-actions">
                      <Link
                        href="/admin/subjects/assign"
                        className="sub-v2__action sub-v2__action--primary"
                      >
                        Assign
                      </Link>
                      <button
                        type="button"
                        className="sub-v2__action"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className={`sub-v2__panel${panelOpen ? " sub-v2__panel--open" : ""}`}>
          <form className="sub-v2__form" onSubmit={(e) => void onSave(e)}>
            <header className="sub-v2__form-head">
              <div className="sub-v2__form-icon" aria-hidden>
                <DashIcon name="library" className="dash-icon--sm" />
              </div>
              <div>
                <h3>{editTarget ? "Edit subject" : "New subject"}</h3>
                <p>
                  {editTarget
                    ? "Update the display name. Codes stay fixed once created."
                    : "Add a subject to your school catalog before assigning it to classes."}
                </p>
              </div>
            </header>

            <div className="sub-v2__form-fields">
              <label>
                Subject name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mathematics"
                  required
                />
              </label>
              <label>
                Code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MATH"
                  required={!editTarget}
                  disabled={!!editTarget}
                  maxLength={12}
                />
              </label>
              {editTarget ? (
                <p className="sub-v2__form-note">
                  Subject codes are permanent identifiers used in results and timetables.
                </p>
              ) : null}
            </div>

            <footer className="sub-v2__form-foot">
              <button
                type="button"
                className="acad-btn acad-btn--ghost acad-btn--block"
                onClick={() => {
                  setPanelOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button type="submit" className="acad-btn acad-btn--primary acad-btn--block" disabled={busy}>
                {busy ? "Saving…" : editTarget ? "Save changes" : "Add subject"}
              </button>
            </footer>
          </form>
        </aside>
      </div>
    </div>
  );
}
