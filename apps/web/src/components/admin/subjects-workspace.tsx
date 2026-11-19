"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsBadge,
  AcademicsEmpty,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { AppToast } from "@/components/ui/app-toast";
import {
  createSubject,
  listClassSubjects,
  listSubjects,
  updateSubject,
  type Subject,
} from "@/lib/results";

function subjectInitials(name: string, code: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return code.slice(0, 2).toUpperCase();
}

type SubjectInsights = {
  classCount: number;
  gradeCount: number;
  teacherCount: number;
  needsTeacher: number;
  grades: string[];
};

function buildSubjectInsights(
  assignments: Awaited<ReturnType<typeof listClassSubjects>>,
): Record<string, SubjectInsights> {
  const map: Record<
    string,
    SubjectInsights & { teacherIds: Set<string> }
  > = {};

  for (const row of assignments) {
    const id = row.subject.id;
    const gradeLabel = row.section
      ? `${row.grade.name} · ${row.section.name}`
      : row.grade.name;

    if (!map[id]) {
      map[id] = {
        classCount: 0,
        gradeCount: 0,
        teacherCount: 0,
        needsTeacher: 0,
        grades: [],
        teacherIds: new Set(),
      };
    }

    const entry = map[id];
    entry.classCount += 1;
    if (!entry.grades.includes(gradeLabel)) {
      entry.grades.push(gradeLabel);
    }
    if (row.teacher?.id) {
      entry.teacherIds.add(row.teacher.id);
    } else {
      entry.needsTeacher += 1;
    }
  }

  const result: Record<string, SubjectInsights> = {};
  for (const [id, entry] of Object.entries(map)) {
    entry.gradeCount = entry.grades.length;
    entry.grades.sort((a, b) => a.localeCompare(b));
    entry.teacherCount = entry.teacherIds.size;
    const { teacherIds: _teacherIds, ...insights } = entry;
    result[id] = insights;
  }

  return result;
}

function formatGradePreview(grades: string[]) {
  if (grades.length === 0) return "";
  if (grades.length <= 2) return grades.join(", ");
  return `${grades.slice(0, 2).join(", ")} +${grades.length - 2} more`;
}

export function SubjectsWorkspace() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectInsights, setSubjectInsights] = useState<Record<string, SubjectInsights>>({});
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
      setSubjectInsights(buildSubjectInsights(assignments));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subjects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rows, assignments] = await Promise.all([listSubjects(), listClassSubjects()]);
        if (cancelled) return;
        setSubjects(rows);
        setSubjectInsights(buildSubjectInsights(assignments));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load subjects");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const assignedCount = useMemo(
    () => subjects.filter((s) => (subjectInsights[s.id]?.classCount ?? 0) > 0).length,
    [subjects, subjectInsights],
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
    },
    { label: "Showing", value: loading ? "—" : filtered.length },
  ];

  return (
    <div className="acad-page sub-v2">
      <AcademicsHero
        chip="Academics"
        compact
        backHref="/admin/academics"
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

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast
        message={success}
        tone="success"
        onDismiss={() => setSuccess("")}
      />

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
                const info = subjectInsights[s.id];
                const classes = info?.classCount ?? 0;
                const assigned = classes > 0;
                return (
                  <li key={s.id} className="sub-v2__card">
                    <div className="sub-v2__avatar" aria-hidden>
                      {subjectInitials(s.name, s.code)}
                    </div>
                    <div className="sub-v2__card-body">
                      <div className="sub-v2__card-top">
                        <h3 className="sub-v2__name">{s.name}</h3>
                        <code className="sub-v2__code">{s.code}</code>
                      </div>

                      {assigned ? (
                        <div className="sub-v2__details">
                          <div className="sub-v2__detail-pills">
                            <span className="sub-v2__detail-pill">
                              <strong>{classes}</strong> class{classes === 1 ? "" : "es"}
                            </span>
                            <span className="sub-v2__detail-pill">
                              <strong>{info?.gradeCount ?? 0}</strong> grade
                              {(info?.gradeCount ?? 0) === 1 ? "" : "s"}
                            </span>
                            <span className="sub-v2__detail-pill">
                              <strong>{info?.teacherCount ?? 0}</strong> teacher
                              {(info?.teacherCount ?? 0) === 1 ? "" : "s"}
                            </span>
                          </div>
                          {info?.grades.length ? (
                            <p className="sub-v2__detail-line">
                              <span>Used in</span> {formatGradePreview(info.grades)}
                            </p>
                          ) : null}
                          {(info?.needsTeacher ?? 0) > 0 ? (
                            <p className="sub-v2__detail-warn">
                              {info?.needsTeacher} class{(info?.needsTeacher ?? 0) === 1 ? "" : "es"}{" "}
                              need a teacher
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="sub-v2__meta">Not assigned to any class yet</p>
                      )}

                      <div className="sub-v2__tags">
                        {s.isSystem ? (
                          <span className="sub-v2__tag sub-v2__tag--system">Core catalog</span>
                        ) : (
                          <span className="sub-v2__tag">School custom</span>
                        )}
                        {s.isCustomized ? (
                          <span className="sub-v2__tag sub-v2__tag--edited">Renamed</span>
                        ) : null}
                        {assigned ? (
                          <span className="sub-v2__tag sub-v2__tag--active">In use</span>
                        ) : (
                          <span className="sub-v2__tag sub-v2__tag--idle">Unassigned</span>
                        )}
                      </div>
                    </div>
                    <div className="sub-v2__card-actions">
                      <Link
                        href="/admin/subjects/assign"
                        className="sub-v2__action sub-v2__action--primary"
                      >
                        {assigned ? "Manage" : "Assign"}
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
