"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
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
import {
  TemplateComponentsEditor,
  type TemplateComponentDraft,
} from "@/components/results/template-components-editor";

const DEFAULT_COMPONENTS: TemplateComponentDraft[] = [
  { name: "Worksheet", weightPercent: 15, maxScore: 15 },
  { name: "Activity", weightPercent: 15, maxScore: 15 },
  { name: "Quiz", weightPercent: 20, maxScore: 20 },
  { name: "Test", weightPercent: 20, maxScore: 20 },
  { name: "Assignment", weightPercent: 30, maxScore: 30 },
];

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  function resetForm() {
    setEditingTemplateId("");
    setName("Custom template");
    setComponents(DEFAULT_COMPONENTS);
  }

  async function onSaveTemplate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const total = components.reduce((s, c) => s + c.weightPercent, 0);
    if (total !== 100) {
      setError(`Weights must total 100% (currently ${total}%)`);
      return;
    }
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
    }
  }

  async function onAssignGrade() {
    if (!assignTemplateId || !assignGradeId) return;
    setError("");
    try {
      await assignTemplateToGrade(assignTemplateId, {
        gradeId: assignGradeId,
        subjectId: assignSubjectId || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    }
  }

  async function onAssignClassSubject() {
    if (!assignTemplateId || !assignClassSubjectId) return;
    setError("");
    try {
      await assignTemplateToClassSubject(assignClassSubjectId, {
        templateId: assignTemplateId,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Class assignment failed");
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
    setError("");
    try {
      await deleteAssessmentTemplate(templateId);
      if (editingTemplateId === templateId) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const totalComponents = templates.reduce((sum, t) => sum + t.components.length, 0);

  return (
    <DashboardPage role="admin" title="Assessment templates" eyebrow="Academics">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {loading ? (
        <p className="setup-hint">Loading…</p>
      ) : (
        <div className="res-templates-modern">
          <section className="res-templates-hero">
            <div>
              <p className="res-templates-hero__eyebrow">Assessment Design Studio</p>
              <h2 className="res-templates-hero__title">Build flexible grading structures</h2>
              <p className="res-templates-hero__sub">
                Configure worksheet, activity, quiz, test, and assignment components per grade,
                subject, or class.
              </p>
            </div>
            <div className="res-templates-kpis">
              <div className="res-templates-kpi">
                <span>Templates</span>
                <strong>{templates.length}</strong>
              </div>
              <div className="res-templates-kpi">
                <span>Components</span>
                <strong>{totalComponents}</strong>
              </div>
            </div>
          </section>

          <section className="att-admin-section res-templates-section" style={{ borderTop: "none" }}>
            <h2 className="setup-panel-label">Template library</h2>
            {templates.length === 0 ? (
              <p className="setup-hint">No templates yet.</p>
            ) : (
              <div className="res-template-grid">
                {templates.map((t) => (
                  <article key={t.id} className="res-template-card">
                    <strong>{t.name}</strong>
                    {t.description ? (
                      <p className="tch-meta" style={{ margin: "0.25rem 0" }}>
                        {t.description}
                      </p>
                    ) : null}
                    <div className="res-template-card__components">
                      {t.components.map((c) => (
                        <span key={c.id} className="res-template-pill">
                          {c.name} {c.weightPercent}% (/{c.maxScore})
                        </span>
                      ))}
                    </div>
                    <p className="tch-meta" style={{ marginTop: "0.6rem" }}>
                      Assigned:{" "}
                      {t.gradeAssignments.length === 0
                        ? "none"
                        : t.gradeAssignments
                            .map((a) =>
                              a.subjectName ? `${a.gradeName} · ${a.subjectName}` : a.gradeName,
                            )
                            .join(", ")}
                    </p>
                    <div className="setup-actions-row" style={{ marginTop: "0.75rem" }}>
                      <button
                        type="button"
                        className="res-btn res-btn--ghost"
                        onClick={() => onEditTemplate(t)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="res-btn res-btn--danger"
                        onClick={() => void onDeleteTemplate(t.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="att-admin-section res-templates-section">
            <h2 className="setup-panel-label">Assign template to grade or subject</h2>
            <div className="att-filters res-templates-formrow">
              <label className="att-field">
                <span>Template</span>
                <select value={assignTemplateId} onChange={(e) => setAssignTemplateId(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="att-field">
                <span>Grade</span>
                <select value={assignGradeId} onChange={(e) => setAssignGradeId(e.target.value)}>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="att-field">
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
                className="att-btn att-btn--primary res-btn-primary"
                onClick={() => void onAssignGrade()}
              >
                Assign
              </button>
            </div>
          </section>

          <section className="att-admin-section res-templates-section">
            <h2 className="setup-panel-label">Assign template directly to class-subject</h2>
            <div className="att-filters res-templates-formrow">
              <label className="att-field att-field--wide">
                <span>Class-subject</span>
                <select value={assignClassSubjectId} onChange={(e) => setAssignClassSubjectId(e.target.value)}>
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
                className="att-btn att-btn--primary res-btn-primary"
                onClick={() => void onAssignClassSubject()}
              >
                Assign to class
              </button>
            </div>
          </section>

          <section className="att-admin-section res-templates-section">
            <h2 className="setup-panel-label">
              {editingTemplateId ? "Edit template" : "Create template"}
            </h2>
            <form onSubmit={(e) => void onSaveTemplate(e)} className="res-templates-form">
              <label className="att-field att-field--wide">
                <span>Name</span>
                <input
                  className="auth-input auth-input--login auth-input--login-plain"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <TemplateComponentsEditor components={components} onChange={setComponents} />
              <div className="setup-actions-row">
                <button type="submit" className="auth-page-submit res-btn-primary">
                  {editingTemplateId ? "Save template" : "Create template"}
                </button>
                {editingTemplateId ? (
                  <button type="button" className="res-btn res-btn--ghost" onClick={resetForm}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardPage>
  );
}
