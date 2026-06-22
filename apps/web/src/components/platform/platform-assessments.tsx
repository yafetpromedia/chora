"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { platformFetch } from "@/lib/platform-auth";
import {
  TemplateComponentsEditor,
  type TemplateComponentDraft,
} from "@/components/results/template-components-editor";
import type { PlatformSchoolRow } from "./platform-types";

type TemplateComponent = {
  id: string;
  name: string;
  weightPercent: number;
  maxScore: number;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  weightTotal: number;
  components: TemplateComponent[];
};

const DEFAULT_COMPONENTS: TemplateComponentDraft[] = [
  { name: "Worksheet", weightPercent: 15, maxScore: 15 },
  { name: "Activity", weightPercent: 15, maxScore: 15 },
  { name: "Quiz", weightPercent: 20, maxScore: 20 },
  { name: "Test", weightPercent: 20, maxScore: 20 },
  { name: "Assignment", weightPercent: 30, maxScore: 30 },
];

type CatalogRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  gradeMin: number | null;
  gradeMax: number | null;
  components: TemplateComponent[];
  _count: { packageLinks: number; schoolTemplates: number };
};

type AssessTab = "catalog" | "school";

export function PlatformAssessments({ schools }: { schools: PlatformSchoolRow[] }) {
  const [tab, setTab] = useState<AssessTab>("catalog");
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [schoolId, setSchoolId] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState("School default template");
  const [components, setComponents] = useState(DEFAULT_COMPONENTS);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!schoolId && schools[0]) {
      setSchoolId(schools[0].id);
    }
  }, [schoolId, schools]);

  useEffect(() => {
    setCatalogLoading(true);
    void platformFetch<CatalogRow[]>("/platform/assessment-templates/catalog")
      .then(setCatalog)
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  async function loadTemplates(targetSchoolId: string) {
    if (!targetSchoolId) return;
    setLoading(true);
    setError("");
    try {
      const rows = await platformFetch<TemplateRow[]>(
        `/platform/schools/${targetSchoolId}/assessment-templates`,
      );
      setTemplates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates(schoolId);
  }, [schoolId]);

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === schoolId) ?? null,
    [schoolId, schools],
  );

  function resetForm() {
    setEditingTemplateId("");
    setName("School default template");
    setComponents(DEFAULT_COMPONENTS);
  }

  async function onSaveTemplate(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const weightTotal = components.reduce((sum, c) => sum + c.weightPercent, 0);
    if (weightTotal !== 100) {
      setError(`Weights must total 100% (currently ${weightTotal}%)`);
      return;
    }

    setSaving(true);
    setError("");
    const body = {
      name: name.trim(),
      components: components.map((c, i) => ({ ...c, sortOrder: i })),
    };
    try {
      if (editingTemplateId) {
        await platformFetch(
          `/platform/schools/${schoolId}/assessment-templates/${editingTemplateId}`,
          { method: "PATCH", body: JSON.stringify(body) },
        );
      } else {
        await platformFetch(`/platform/schools/${schoolId}/assessment-templates`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await loadTemplates(schoolId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  function onEditTemplate(template: TemplateRow) {
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
    if (!schoolId) return;
    setError("");
    try {
      await platformFetch(
        `/platform/schools/${schoolId}/assessment-templates/${templateId}/delete`,
        { method: "POST", body: JSON.stringify({}) },
      );
      if (editingTemplateId === templateId) {
        resetForm();
      }
      await loadTemplates(schoolId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  async function copyCatalogToSchool(platformTemplateId: string) {
    if (!schoolId) return;
    setError("");
    try {
      await platformFetch(
        `/platform/schools/${schoolId}/copy-assessment-template/${platformTemplateId}`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await loadTemplates(schoolId);
      setTab("school");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed");
    }
  }

  return (
    <div className="plat-section">
      <header className="plat-section-hero">
        <div>
          <p className="plat-section-hero__eyebrow">Content & Curriculum Engine</p>
          <h2 className="plat-section-hero__title">Assessment templates</h2>
          <p className="plat-section-hero__sub">
            Platform catalog copied on school provision; override per school when needed.
          </p>
        </div>
      </header>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <div className="plat-filter-tabs plat-curriculum-tabs" role="tablist">
        <button
          type="button"
          className={`plat-filter-tab${tab === "catalog" ? " plat-filter-tab--active" : ""}`}
          onClick={() => setTab("catalog")}
        >
          Platform catalog
        </button>
        <button
          type="button"
          className={`plat-filter-tab${tab === "school" ? " plat-filter-tab--active" : ""}`}
          onClick={() => setTab("school")}
        >
          Per school
        </button>
      </div>

      {tab === "catalog" ? (
        <section className="plat-panel">
          {catalogLoading ? (
            <p className="plat-panel__hint">Loading catalog…</p>
          ) : (
            <div className="dash-list">
              {catalog.map((t) => (
                <article key={t.id} className="res-template-card">
                  <strong>{t.name}</strong>
                  <p className="tch-meta">
                    <code>{t.key}</code>
                    {t.gradeMin != null && t.gradeMax != null
                      ? ` · Grades ${t.gradeMin}–${t.gradeMax}`
                      : ""}
                  </p>
                  <div className="res-template-card__components">
                    {t.components.map((c) => (
                      <span key={c.id} className="res-template-pill">
                        {c.name} {c.weightPercent}%
                      </span>
                    ))}
                  </div>
                  <p className="tch-meta">
                    {t._count.packageLinks} package(s) · {t._count.schoolTemplates} school(s)
                  </p>
                  {schoolId ? (
                    <button
                      type="button"
                      className="dash-copy-btn"
                      onClick={() => void copyCatalogToSchool(t.id)}
                    >
                      Copy to selected school
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "school" ? (
      <>
      <section className="plat-panel">
        <label className="att-field att-field--wide">
          <span>School</span>
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
        {selectedSchool ? (
          <p className="plat-panel__hint">
            Managing templates for <strong>{selectedSchool.name}</strong>
          </p>
        ) : null}
      </section>

      <section className="plat-panel">
        <h3 className="plat-panel__title">Current templates</h3>
        {loading ? (
          <p className="plat-panel__hint">Loading templates…</p>
        ) : templates.length === 0 ? (
          <p className="plat-panel__hint">No templates found for this school.</p>
        ) : (
          <div className="dash-list">
            {templates.map((template) => (
              <article key={template.id} className="res-template-card">
                <strong>{template.name}</strong>
                <p className="tch-meta">Weight total: {template.weightTotal}%</p>
                <div className="res-template-card__components">
                  {template.components.map((component) => (
                    <span key={component.id} className="res-template-pill">
                      {component.name} {component.weightPercent}% (/{component.maxScore})
                    </span>
                  ))}
                </div>
                <div className="setup-actions-row" style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="dash-copy-btn"
                    onClick={() => onEditTemplate(template)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="dash-copy-btn"
                    onClick={() => void onDeleteTemplate(template.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="plat-panel">
        <h3 className="plat-panel__title">
          {editingTemplateId ? "Edit template" : "Create template for selected school"}
        </h3>
        <form onSubmit={(e) => void onSaveTemplate(e)}>
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
            <button type="submit" className="auth-page-submit" disabled={saving || !schoolId}>
              {saving ? "Saving…" : editingTemplateId ? "Save template" : "Create school template"}
            </button>
            {editingTemplateId ? (
              <button type="button" className="dash-copy-btn" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>
      </>
      ) : null}
    </div>
  );
}
