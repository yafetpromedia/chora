"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AcademicsHero } from "@/components/academics/academics-ui";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AppToast } from "@/components/ui/app-toast";
import {
  TemplateComponentsEditor,
  type TemplateComponentDraft,
} from "@/components/results/template-components-editor";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import {
  assignTemplateToClassSubject,
  assignTemplateToGrade,
  createAssessmentTemplate,
  deleteAssessmentTemplate,
  listAssessmentTemplates,
  listClassSubjects,
  listSubjects,
  updateAssessmentTemplate,
  type AssessmentTemplate,
  type ClassSubject,
  type Subject,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

const DEFAULT_COMPONENTS: TemplateComponentDraft[] = [
  { name: "Worksheet", weightPercent: 15, maxScore: 15 },
  { name: "Activity", weightPercent: 15, maxScore: 15 },
  { name: "Quiz", weightPercent: 20, maxScore: 20 },
  { name: "Test", weightPercent: 20, maxScore: 20 },
  { name: "Assignment", weightPercent: 30, maxScore: 30 },
];

type AssignTab = "grade" | "class";

function assignmentSummary(template: AssessmentTemplate) {
  if (template.gradeAssignments.length === 0) return "Not assigned yet";
  return template.gradeAssignments
    .map((a) => (a.subjectName ? `${a.gradeName} · ${a.subjectName}` : a.gradeName))
    .join(", ");
}

export default function AssessmentTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("Custom template");
  const [components, setComponents] = useState(DEFAULT_COMPONENTS);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignGradeId, setAssignGradeId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignClassSubjectId, setAssignClassSubjectId] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [assignTab, setAssignTab] = useState<AssignTab>("grade");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [tpls, g, sub, cs] = await Promise.all([
      listAssessmentTemplates(),
      listGrades(),
      listSubjects(),
      listClassSubjects(),
    ]);
    setTemplates(tpls);
    setGrades(g);
    setSubjects(sub);
    setClassSubjects(cs);
    if (tpls[0]) setAssignTemplateId((prev) => prev || tpls[0].id);
    if (g[0]) setAssignGradeId((prev) => prev || g[0].id);
    if (cs[0]) setAssignClassSubjectId((prev) => prev || cs[0].id);
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  const totalComponents = useMemo(
    () => templates.reduce((sum, t) => sum + t.components.length, 0),
    [templates],
  );

  const linkedGrades = useMemo(() => {
    const names = new Set<string>();
    for (const t of templates) {
      for (const a of t.gradeAssignments) names.add(a.gradeName);
    }
    return names.size;
  }, [templates]);

  const weightTotal = components.reduce((sum, c) => sum + c.weightPercent, 0);

  function resetForm() {
    setEditingTemplateId("");
    setName("Custom template");
    setComponents(DEFAULT_COMPONENTS);
  }

  async function onSaveTemplate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (weightTotal !== 100) {
      setError(`Weights must total 100% (currently ${weightTotal}%)`);
      return;
    }
    setBusy(true);
    const body = {
      name: name.trim(),
      components: components.map((c, i) => ({ ...c, sortOrder: i })),
    };
    try {
      if (editingTemplateId) {
        await updateAssessmentTemplate(editingTemplateId, body);
      } else {
        await createAssessmentTemplate(body);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAssignGrade() {
    if (!assignTemplateId || !assignGradeId) return;
    setError("");
    setBusy(true);
    try {
      await assignTemplateToGrade(assignTemplateId, {
        gradeId: assignGradeId,
        subjectId: assignSubjectId || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAssignClassSubject() {
    if (!assignTemplateId || !assignClassSubjectId) return;
    setError("");
    setBusy(true);
    try {
      await assignTemplateToClassSubject(assignClassSubjectId, {
        templateId: assignTemplateId,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Class assignment failed");
    } finally {
      setBusy(false);
    }
  }

  function onEditTemplate(template: AssessmentTemplate) {
    setEditingTemplateId(template.id);
    setName(template.name);
    setComponents(
      template.components.map((c) => ({
        name: c.name,
        weightPercent: c.weightPercent,
        maxScore: c.maxScore,
      })),
    );
  }

  async function onDeleteTemplate(templateId: string) {
    if (!window.confirm("Delete this template? Classes using it may lose grading structure.")) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      await deleteAssessmentTemplate(templateId);
      if (editingTemplateId === templateId) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage role="admin" title="Assessment templates">
      <div className="tpl-v2">
        <AcademicsHero
          title="Assessment templates"
          subtitle="Define worksheet, quiz, test, and exam weights — then assign templates to grades, subjects, or individual classes."
          stats={[
            { label: "Templates", value: loading ? "—" : templates.length },
            { label: "Components", value: loading ? "—" : totalComponents },
            {
              label: "Grades linked",
              value: loading ? "—" : linkedGrades,
              accent: !loading && linkedGrades > 0,
            },
          ]}
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />

        {loading ? (
          <div className="tpl-v2__loading">
            <span className="tpl-v2__loading-spinner" aria-hidden />
            <p>Loading templates…</p>
          </div>
        ) : (
          <div className="tpl-v2__layout">
            <div className="tpl-v2__main">
              <section className="tpl-v2__card">
                <header className="tpl-v2__card-head">
                  <div className="tpl-v2__card-head-main">
                    <span className="tpl-v2__card-icon" aria-hidden>
                      <DashIcon name="templates" className="dash-icon--sm" />
                    </span>
                    <div>
                      <h3 className="tpl-v2__card-title">Template library</h3>
                      <p className="tpl-v2__card-sub">
                        Reusable grading structures for primary, middle, and secondary levels.
                      </p>
                    </div>
                  </div>
                  <button type="button" className="tpl-v2__btn tpl-v2__btn--ghost" onClick={resetForm}>
                    + New template
                  </button>
                </header>

                {templates.length === 0 ? (
                  <div className="tpl-v2__empty">
                    <p>No templates yet. Create your first grading structure on the right.</p>
                  </div>
                ) : (
                  <ul className="tpl-v2__list">
                    {templates.map((t) => (
                      <li
                        key={t.id}
                        className={`tpl-v2__item${editingTemplateId === t.id ? " tpl-v2__item--active" : ""}`}
                      >
                        <div className="tpl-v2__item-main">
                          <div className="tpl-v2__item-top">
                            <strong className="tpl-v2__item-name">{t.name}</strong>
                            <div className="tpl-v2__item-actions">
                              <button
                                type="button"
                                className="tpl-v2__btn tpl-v2__btn--ghost tpl-v2__btn--sm"
                                onClick={() => onEditTemplate(t)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="tpl-v2__btn tpl-v2__btn--danger tpl-v2__btn--sm"
                                onClick={() => void onDeleteTemplate(t.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {t.description ? (
                            <p className="tpl-v2__item-desc">{t.description}</p>
                          ) : null}
                          <div className="tpl-v2__chips">
                            {t.components.map((c) => (
                              <span key={c.id} className="tpl-v2__chip">
                                <strong>{c.name}</strong>
                                <span>
                                  {c.weightPercent}% · /{c.maxScore}
                                </span>
                              </span>
                            ))}
                          </div>
                          <p className="tpl-v2__item-meta">
                            <span>Assigned</span> {assignmentSummary(t)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="tpl-v2__card">
                <header className="tpl-v2__card-head">
                  <div className="tpl-v2__card-head-main">
                    <span className="tpl-v2__card-icon tpl-v2__card-icon--assign" aria-hidden>
                      <DashIcon name="teachers" className="dash-icon--sm" />
                    </span>
                    <div>
                      <h3 className="tpl-v2__card-title">Assign template</h3>
                      <p className="tpl-v2__card-sub">
                        Link a template to a whole grade or a specific class-subject slot.
                      </p>
                    </div>
                  </div>
                </header>

                <div className="tpl-v2__subtabs">
                  <button
                    type="button"
                    className={`tpl-v2__subtab${assignTab === "grade" ? " tpl-v2__subtab--active" : ""}`}
                    onClick={() => setAssignTab("grade")}
                  >
                    By grade
                  </button>
                  <button
                    type="button"
                    className={`tpl-v2__subtab${assignTab === "class" ? " tpl-v2__subtab--active" : ""}`}
                    onClick={() => setAssignTab("class")}
                  >
                    By class
                  </button>
                </div>

                {assignTab === "grade" ? (
                  <div className="tpl-v2__assign">
                    <label className="tpl-v2__field">
                      <span>Template</span>
                      <select
                        value={assignTemplateId}
                        onChange={(e) => setAssignTemplateId(e.target.value)}
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="tpl-v2__field">
                      <span>Grade</span>
                      <select value={assignGradeId} onChange={(e) => setAssignGradeId(e.target.value)}>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="tpl-v2__field tpl-v2__field--wide">
                      <span>Subject (optional)</span>
                      <select value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value)}>
                        <option value="">All subjects</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="tpl-v2__btn tpl-v2__btn--primary"
                      disabled={busy || !assignTemplateId || !assignGradeId}
                      onClick={() => void onAssignGrade()}
                    >
                      Assign to grade
                    </button>
                  </div>
                ) : (
                  <div className="tpl-v2__assign">
                    <label className="tpl-v2__field tpl-v2__field--wide">
                      <span>Template</span>
                      <select
                        value={assignTemplateId}
                        onChange={(e) => setAssignTemplateId(e.target.value)}
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="tpl-v2__field tpl-v2__field--grow">
                      <span>Class · subject</span>
                      <select
                        value={assignClassSubjectId}
                        onChange={(e) => setAssignClassSubjectId(e.target.value)}
                      >
                        {classSubjects.map((cs) => (
                          <option key={cs.id} value={cs.id}>
                            {cs.grade.name}
                            {cs.section ? ` · ${cs.section.name}` : ""} — {cs.subject.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="tpl-v2__btn tpl-v2__btn--primary"
                      disabled={busy || !assignTemplateId || !assignClassSubjectId}
                      onClick={() => void onAssignClassSubject()}
                    >
                      Assign to class
                    </button>
                  </div>
                )}
              </section>
            </div>

            <aside className="tpl-v2__panel">
              <form className="tpl-v2__form" onSubmit={(e) => void onSaveTemplate(e)}>
                <header className="tpl-v2__panel-head">
                  <span className="tpl-v2__card-icon" aria-hidden>
                    <DashIcon name="plus" className="dash-icon--sm" />
                  </span>
                  <div>
                    <h3>{editingTemplateId ? "Edit template" : "New template"}</h3>
                    <p>
                      {editingTemplateId
                        ? "Update component names, weights, and max scores."
                        : "Build a grading structure with components that total 100%."}
                    </p>
                  </div>
                </header>

                <label className="tpl-v2__field tpl-v2__field--stack">
                  <span>Template name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Secondary (Grades 9–12)"
                    required
                  />
                </label>

                <div className="tpl-v2__weight">
                  <span>Weight total</span>
                  <strong className={weightTotal === 100 ? "tpl-v2__weight--ok" : "tpl-v2__weight--warn"}>
                    {weightTotal}%
                  </strong>
                  {weightTotal !== 100 ? <em>Must equal 100%</em> : null}
                </div>

                <TemplateComponentsEditor components={components} onChange={setComponents} />

                <footer className="tpl-v2__form-foot">
                  {editingTemplateId ? (
                    <button type="button" className="tpl-v2__btn tpl-v2__btn--ghost" onClick={resetForm}>
                      Cancel
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="tpl-v2__btn tpl-v2__btn--primary"
                    disabled={busy || weightTotal !== 100}
                  >
                    {busy ? "Saving…" : editingTemplateId ? "Save changes" : "Create template"}
                  </button>
                </footer>
              </form>
            </aside>
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
