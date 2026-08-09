"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import {
  handlePlatformAuthFailure,
  platformFetch,
} from "@/lib/platform-auth";
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
  const router = useRouter();
  const [tab, setTab] = useState<AssessTab>("catalog");
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogQ, setCatalogQ] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [schoolId, setSchoolId] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState("School default template");
  const [components, setComponents] = useState(DEFAULT_COMPONENTS);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingId, setCopyingId] = useState("");
  const [error, setError] = useState("");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  useEffect(() => {
    if (!schoolId && schools[0]) {
      setSchoolId(schools[0].id);
    }
  }, [schoolId, schools]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const rows = await platformFetch<CatalogRow[]>(
        "/platform/assessment-templates/catalog",
      );
      setCatalog(rows);
    } catch (err) {
      fail(err, "Failed to load catalog");
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

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
      fail(err, "Failed to load templates");
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

  const catalogStats = useMemo(() => {
    return {
      total: catalog.length,
      packages: catalog.reduce((sum, t) => sum + t._count.packageLinks, 0),
      schools: catalog.reduce((sum, t) => sum + t._count.schoolTemplates, 0),
      components: catalog.reduce((sum, t) => sum + t.components.length, 0),
    };
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = catalogQ.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [catalog, catalogQ]);

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
      fail(err, "Failed to save template");
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
    if (!confirm("Delete this school template?")) return;
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
      fail(err, "Failed to delete template");
    }
  }

  async function copyCatalogToSchool(platformTemplateId: string) {
    if (!schoolId) return;
    setCopyingId(platformTemplateId);
    setError("");
    try {
      await platformFetch(
        `/platform/schools/${schoolId}/copy-assessment-template/${platformTemplateId}`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await loadTemplates(schoolId);
      setTab("school");
    } catch (err) {
      fail(err, "Copy failed");
    } finally {
      setCopyingId("");
    }
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-assessments-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="results" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Content & Curriculum Engine</p>
            <h2 className="plat-subjects-v2__title">Assessment templates</h2>
            <p className="plat-subjects-v2__sub">
              Platform catalog copied on school provision; override per school when needed.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{catalogStats.total}</strong>
            <span>Catalog</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{catalogStats.packages}</strong>
            <span>In packages</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{templates.length}</strong>
            <span>School copies</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="results" className="dash-icon--sm" />
          <div>
            <strong>{catalogStats.total}</strong>
            <span>Platform templates</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="chart" className="dash-icon--sm" />
          <div>
            <strong>{catalogStats.components}</strong>
            <span>Components</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="students" className="dash-icon--sm" />
          <div>
            <strong>{catalogStats.schools}</strong>
            <span>School deployments</span>
          </div>
        </article>
      </div>

      <div className="plat-filter-tabs plat-assessments-v2__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "catalog"}
          className={`plat-filter-tab${tab === "catalog" ? " plat-filter-tab--active" : ""}`}
          onClick={() => setTab("catalog")}
        >
          <DashIcon name="templates" className="dash-icon--xs plat-templates-v2__tab-icon" />
          Platform catalog
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "school"}
          className={`plat-filter-tab${tab === "school" ? " plat-filter-tab--active" : ""}`}
          onClick={() => setTab("school")}
        >
          <DashIcon name="building" className="dash-icon--xs plat-templates-v2__tab-icon" />
          Per school
        </button>
      </div>

      {tab === "catalog" ? (
        <section className="plat-assessments-v2__panel">
          <div className="plat-subjects-v2__toolbar plat-assessments-v2__toolbar">
            <div className="plat-tenants-v2__search plat-subjects-v2__search">
              <DashIcon name="results" className="dash-icon--sm" />
              <input
                type="search"
                placeholder="Search catalog…"
                value={catalogQ}
                onChange={(e) => setCatalogQ(e.target.value)}
                aria-label="Search assessment catalog"
              />
            </div>
            {selectedSchool ? (
              <p className="plat-assessments-v2__school-hint">
                Copy to <strong>{selectedSchool.name}</strong>
              </p>
            ) : null}
          </div>

          {catalogLoading ? (
            <div className="plat-curriculum__skeleton" />
          ) : filteredCatalog.length === 0 ? (
            <p className="plat-assessments-v2__empty">No catalog templates match.</p>
          ) : (
            <div className="plat-assessments-v2__grid">
              {filteredCatalog.map((t) => (
                <article key={t.id} className="plat-assessments-v2__card">
                  <header className="plat-assessments-v2__card-head">
                    <span className="plat-assessments-v2__icon" aria-hidden>
                      <DashIcon name="results" className="dash-icon--md" />
                    </span>
                    <div>
                      <strong className="plat-assessments-v2__name">{t.name}</strong>
                      <p className="plat-assessments-v2__meta">
                        <code>{t.key}</code>
                        {t.gradeMin != null && t.gradeMax != null
                          ? ` · Grades ${t.gradeMin}–${t.gradeMax}`
                          : ""}
                      </p>
                    </div>
                  </header>
                  <div className="plat-assessments-v2__pills">
                    {t.components.map((c) => (
                      <span key={c.id} className="plat-assessments-v2__pill">
                        {c.name} {c.weightPercent}%
                      </span>
                    ))}
                  </div>
                  <p className="plat-assessments-v2__meta">
                    {t._count.packageLinks} package(s) · {t._count.schoolTemplates} school(s)
                  </p>
                  {schoolId ? (
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--sm"
                      disabled={copyingId === t.id}
                      onClick={() => void copyCatalogToSchool(t.id)}
                    >
                      {copyingId === t.id ? "Copying…" : "Copy to selected school"}
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
          <section className="plat-assessments-v2__panel">
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
              <p className="plat-assessments-v2__school-hint">
                Managing templates for <strong>{selectedSchool.name}</strong>
              </p>
            ) : null}
          </section>

          <section className="plat-assessments-v2__panel">
            <h3 className="plat-assessments-v2__section-title">Current templates</h3>
            {loading ? (
              <div className="plat-curriculum__skeleton" />
            ) : templates.length === 0 ? (
              <p className="plat-assessments-v2__empty">No templates found for this school.</p>
            ) : (
              <div className="plat-assessments-v2__grid">
                {templates.map((template) => (
                  <article key={template.id} className="plat-assessments-v2__card">
                    <header className="plat-assessments-v2__card-head">
                      <span className="plat-assessments-v2__icon" aria-hidden>
                        <DashIcon name="chart" className="dash-icon--md" />
                      </span>
                      <div>
                        <strong className="plat-assessments-v2__name">{template.name}</strong>
                        <p className="plat-assessments-v2__meta">
                          Weight total: {template.weightTotal}%
                        </p>
                      </div>
                    </header>
                    <div className="plat-assessments-v2__pills">
                      {template.components.map((component) => (
                        <span key={component.id} className="plat-assessments-v2__pill">
                          {component.name} {component.weightPercent}% (/{component.maxScore})
                        </span>
                      ))}
                    </div>
                    <div className="plat-subjects-v2__actions">
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs"
                        onClick={() => onEditTemplate(template)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
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

          <section className="plat-assessments-v2__panel plat-assessments-v2__form-panel">
            <h3 className="plat-assessments-v2__section-title">
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

              <div className="plat-subjects-v2__actions" style={{ marginTop: "0.75rem" }}>
                <button
                  type="submit"
                  className="plat-v2__btn plat-v2__btn--primary"
                  disabled={saving || !schoolId}
                >
                  {saving
                    ? "Saving…"
                    : editingTemplateId
                      ? "Save template"
                      : "Create school template"}
                </button>
                {editingTemplateId ? (
                  <button type="button" className="plat-btn plat-btn--ghost" onClick={resetForm}>
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
