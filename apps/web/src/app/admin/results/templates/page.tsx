"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import {
  assignTemplateToGrade,
  createAssessmentTemplate,
  listAssessmentTemplates,
  listSubjects,
  type AssessmentTemplate,
  type Subject,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

const DEFAULT_COMPONENTS = [
  { name: "Assignment", weightPercent: 15, maxScore: 15 },
  { name: "Quiz", weightPercent: 15, maxScore: 15 },
  { name: "Mid Exam", weightPercent: 25, maxScore: 25 },
  { name: "Final Exam", weightPercent: 45, maxScore: 45 },
];

export default function AssessmentTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("Custom template");
  const [components, setComponents] = useState(DEFAULT_COMPONENTS);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignGradeId, setAssignGradeId] = useState("");

  async function load() {
    const [tpls, g, sub] = await Promise.all([
      listAssessmentTemplates(),
      listGrades(),
      listSubjects(),
    ]);
    setTemplates(tpls);
    setGrades(g);
    setSubjects(sub);
    if (tpls[0]) setAssignTemplateId(tpls[0].id);
    if (g[0]) setAssignGradeId(g[0].id);
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const total = components.reduce((s, c) => s + c.weightPercent, 0);
    if (total !== 100) {
      setError(`Weights must total 100% (currently ${total}%)`);
      return;
    }
    try {
      await createAssessmentTemplate({
        name: name.trim(),
        components: components.map((c, i) => ({ ...c, sortOrder: i })),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function onAssignGrade() {
    if (!assignTemplateId || !assignGradeId) return;
    setError("");
    try {
      await assignTemplateToGrade(assignTemplateId, { gradeId: assignGradeId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Assessment templates"
      subtitle="Define weighted components per grade or subject. Teachers see columns automatically."
      eyebrow="Academics"
    >
      <p className="setup-hint">
        <Link href="/admin/results">← Back to results</Link>
      </p>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      {loading ? (
        <p className="setup-hint">Loading…</p>
      ) : (
        <>
          <section className="att-admin-section" style={{ borderTop: "none" }}>
            <h2 className="setup-panel-label">Templates</h2>
            {templates.length === 0 ? (
              <p className="setup-hint">No templates yet.</p>
            ) : (
              templates.map((t) => (
                <article key={t.id} className="res-template-card">
                  <strong>{t.name}</strong>
                  {t.description ? (
                    <p className="setup-hint" style={{ margin: "0.25rem 0" }}>
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
                  <p className="setup-hint" style={{ marginTop: "0.5rem" }}>
                    Assigned:{" "}
                    {t.gradeAssignments.length === 0
                      ? "none"
                      : t.gradeAssignments
                          .map((a) =>
                            a.subjectName
                              ? `${a.gradeName} · ${a.subjectName}`
                              : a.gradeName,
                          )
                          .join(", ")}
                  </p>
                </article>
              ))
            )}
          </section>

          <section className="att-admin-section">
            <h2 className="setup-panel-label">Assign template to grade</h2>
            <div className="att-filters">
              <label className="att-field">
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
              <button type="button" className="att-btn att-btn--primary" onClick={() => void onAssignGrade()}>
                Assign
              </button>
            </div>
          </section>

          <section className="att-admin-section">
            <h2 className="setup-panel-label">Create template</h2>
            <form onSubmit={(e) => void onCreate(e)}>
              <label className="att-field att-field--wide">
                <span>Name</span>
                <input
                  className="auth-input auth-input--login auth-input--login-plain"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              {components.map((c, i) => (
                <div key={i} className="att-filters">
                  <label className="att-field">
                    <span>Component</span>
                    <input
                      className="auth-input auth-input--login auth-input--login-plain"
                      value={c.name}
                      onChange={(e) => {
                        const next = [...components];
                        next[i] = { ...next[i], name: e.target.value };
                        setComponents(next);
                      }}
                    />
                  </label>
                  <label className="att-field">
                    <span>Weight %</span>
                    <input
                      type="number"
                      className="auth-input auth-input--login auth-input--login-plain"
                      value={c.weightPercent}
                      onChange={(e) => {
                        const next = [...components];
                        next[i] = { ...next[i], weightPercent: Number(e.target.value) };
                        setComponents(next);
                      }}
                    />
                  </label>
                  <label className="att-field">
                    <span>Max score</span>
                    <input
                      type="number"
                      className="auth-input auth-input--login auth-input--login-plain"
                      value={c.maxScore}
                      onChange={(e) => {
                        const next = [...components];
                        next[i] = { ...next[i], maxScore: Number(e.target.value) };
                        setComponents(next);
                      }}
                    />
                  </label>
                </div>
              ))}
              <button type="submit" className="auth-page-submit">
                Create template
              </button>
            </form>
          </section>
        </>
      )}
    </DashboardPage>
  );
}
