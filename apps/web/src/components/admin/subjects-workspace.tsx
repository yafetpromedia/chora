"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsBadge,
  AcademicsEmpty,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppToast } from "@/components/ui/app-toast";
import {
  createSubject,
  deleteSubject,
  listClassSubjects,
  listSubjects,
  updateSubject,
  type Subject,
} from "@/lib/results";
import { suggestSubjectCode } from "@/lib/subject-label";

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

function formatGradePreview(
  grades: string[],
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (grades.length === 0) return "";
  if (grades.length <= 2) return grades.join(", ");
  return `${grades.slice(0, 2).join(", ")} ${t("subjectsUi.moreGrades", {
    count: grades.length - 2,
  })}`;
}

export function SubjectsWorkspace() {
  const { t, locale } = useLocale();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectInsights, setSubjectInsights] = useState<Record<string, SubjectInsights>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rows, assignments] = await Promise.all([listSubjects(), listClassSubjects()]);
      setSubjects(rows);
      setSubjectInsights(buildSubjectInsights(assignments));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subjectsUi.loadFailed"));
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
          setError(err instanceof Error ? err.message : t("subjectsUi.loadFailed"));
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
    setCodeTouched(false);
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
    setCodeTouched(true);
    setPanelOpen(true);
  }

  function onNameChange(value: string) {
    setName(value);
    if (!editTarget && !codeTouched) {
      setCode(suggestSubjectCode(value));
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const nextName = name.trim();
      const nextCode = code.trim().toUpperCase();
      if (editTarget) {
        await updateSubject(editTarget.id, { name: nextName, code: nextCode });
        setSuccess(t("subjectsUi.updated", { name: nextName }));
      } else {
        await createSubject({ name: nextName, code: nextCode });
        setSuccess(t("subjectsUi.added", { name: nextName }));
      }
      setPanelOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subjectsUi.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      await deleteSubject(deleteTarget.id);
      setSuccess(t("subjectsUi.deleted", { name: deleteTarget.name }));
      if (editTarget?.id === deleteTarget.id) {
        setPanelOpen(false);
        resetForm();
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subjectsUi.deleteFailed"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const heroStats = [
    { label: t("subjectsUi.statInCatalog"), value: loading ? "—" : subjects.length },
    { label: t("subjectsUi.statInClasses"), value: loading ? "—" : assignedCount },
    {
      label: t("subjectsUi.statUnassigned"),
      value: loading ? "—" : Math.max(subjects.length - assignedCount, 0),
    },
    { label: t("subjectsUi.statShowing"), value: loading ? "—" : filtered.length },
  ];

  return (
    <div className="acad-page sub-v2">
      <AcademicsHero
        chip={t("subjectsUi.chip")}
        compact
        backHref="/admin/academics"
        title={t("subjectsUi.title")}
        subtitle={t("subjectsUi.subtitle")}
        stats={heroStats}
        badges={
          <>
            <AcademicsBadge variant="live">
              {loading
                ? t("common.loading")
                : t("subjectsUi.badgeSubjects", { count: subjects.length })}
            </AcademicsBadge>
            {!loading && assignedCount > 0 ? (
              <AcademicsBadge variant="default">
                {t("subjectsUi.badgeLinked", { count: assignedCount })}
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
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("subjectsUi.deleteTitle", {
          name: deleteTarget?.name ?? t("subjectsUi.panelNew"),
        })}
        message={
          deleteTarget
            ? t("subjectsUi.deleteMessage", {
                name: deleteTarget.name,
                code: deleteTarget.code,
              })
            : ""
        }
        confirmLabel={t("subjectsUi.confirmDelete")}
        tone="danger"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
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
                placeholder={t("subjectsUi.searchPlaceholder")}
              />
            </label>
            <button type="button" className="sub-v2__btn sub-v2__btn--primary" onClick={openCreate}>
              {t("subjectsUi.addSubject")}
            </button>
          </div>

          {loading ? (
            <div className="sub-v2__loading">
              <span className="sub-v2__loading-spinner" aria-hidden />
              <p>{t("subjectsUi.loadingCatalog")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <AcademicsEmpty
              message={
                subjects.length === 0
                  ? t("subjectsUi.emptyNoSubjects")
                  : t("subjectsUi.emptyNoSearch")
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
                              <strong>{classes}</strong>{" "}
                              {classes === 1
                                ? t("subjectsUi.classOne")
                                : t("subjectsUi.classMany")}
                            </span>
                            <span className="sub-v2__detail-pill">
                              <strong>{info?.gradeCount ?? 0}</strong>{" "}
                              {(info?.gradeCount ?? 0) === 1
                                ? t("subjectsUi.gradeOne")
                                : t("subjectsUi.gradeMany")}
                            </span>
                            <span className="sub-v2__detail-pill">
                              <strong>{info?.teacherCount ?? 0}</strong>{" "}
                              {(info?.teacherCount ?? 0) === 1
                                ? t("subjectsUi.teacherOne")
                                : t("subjectsUi.teacherMany")}
                            </span>
                          </div>
                          {info?.grades.length ? (
                            <p className="sub-v2__detail-line">
                              <span>{t("subjectsUi.usedIn")}</span>{" "}
                              {formatGradePreview(info.grades, t)}
                            </p>
                          ) : null}
                          {(info?.needsTeacher ?? 0) > 0 ? (
                            <p className="sub-v2__detail-warn">
                              {t("subjectsUi.needsTeacher", {
                                count: info?.needsTeacher ?? 0,
                                plural:
                                  locale === "en" &&
                                  (info?.needsTeacher ?? 0) !== 1
                                    ? "es"
                                    : "",
                              })}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="sub-v2__meta">{t("subjectsUi.notAssigned")}</p>
                      )}

                      <div className="sub-v2__tags">
                        {s.isSystem ? (
                          <span className="sub-v2__tag sub-v2__tag--system">
                            {t("subjectsUi.tagCore")}
                          </span>
                        ) : (
                          <span className="sub-v2__tag">{t("subjectsUi.tagCustom")}</span>
                        )}
                        {s.isCustomized ? (
                          <span className="sub-v2__tag sub-v2__tag--edited">
                            {t("subjectsUi.tagRenamed")}
                          </span>
                        ) : null}
                        {assigned ? (
                          <span className="sub-v2__tag sub-v2__tag--active">
                            {t("subjectsUi.tagInUse")}
                          </span>
                        ) : (
                          <span className="sub-v2__tag sub-v2__tag--idle">
                            {t("subjectsUi.tagUnassigned")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="sub-v2__card-actions">
                      <Link
                        href="/admin/subjects/assign"
                        className="sub-v2__action sub-v2__action--primary"
                      >
                        {assigned ? t("subjectsUi.manage") : t("subjectsUi.assign")}
                      </Link>
                      <button
                        type="button"
                        className="sub-v2__action"
                        onClick={() => openEdit(s)}
                      >
                        {t("subjectsUi.edit")}
                      </button>
                      <button
                        type="button"
                        className="sub-v2__action sub-v2__action--danger"
                        onClick={() => setDeleteTarget(s)}
                        disabled={assigned}
                        title={
                          assigned
                            ? t("subjectsUi.removeFromClassesFirst")
                            : t("subjectsUi.deleteName", { name: s.name })
                        }
                      >
                        {t("common.delete")}
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
                <h3>
                  {editTarget ? t("subjectsUi.panelEdit") : t("subjectsUi.panelNew")}
                </h3>
                <p>
                  {editTarget
                    ? t("subjectsUi.panelEditSub")
                    : t("subjectsUi.panelNewSub")}
                </p>
              </div>
            </header>

            <div className="sub-v2__form-fields">
              <label>
                {t("subjectsUi.fieldName")}
                <input
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder={t("subjectsUi.namePlaceholder")}
                  required
                />
              </label>
              <label>
                {t("subjectsUi.fieldCode")}
                <input
                  value={code}
                  onChange={(e) => {
                    setCodeTouched(true);
                    setCode(e.target.value.toUpperCase());
                  }}
                  placeholder={t("subjectsUi.codePlaceholder")}
                  required
                  maxLength={12}
                />
              </label>
              <p className="sub-v2__form-note">
                {t("subjectsUi.formNote")}
              </p>
            </div>

            <footer className="sub-v2__form-foot">
              {editTarget ? (
                <button
                  type="button"
                  className="acad-btn acad-btn--danger acad-btn--block"
                  disabled={busy || deleting}
                  onClick={() => setDeleteTarget(editTarget)}
                >
                  {t("subjectsUi.confirmDelete")}
                </button>
              ) : null}
              <button
                type="button"
                className="acad-btn acad-btn--ghost acad-btn--block"
                onClick={() => {
                  setPanelOpen(false);
                  resetForm();
                }}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" className="acad-btn acad-btn--primary acad-btn--block" disabled={busy}>
                {busy
                  ? t("common.saving")
                  : editTarget
                    ? t("subjectsUi.saveChanges")
                    : t("subjectsUi.addSubject")}
              </button>
            </footer>
          </form>
        </aside>
      </div>
    </div>
  );
}
