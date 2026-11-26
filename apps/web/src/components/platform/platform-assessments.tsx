"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";
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

function defaultComponents(translate: (key: string) => string): TemplateComponentDraft[] {
  return [
    { name: translate("platformUi.assessCompWorksheet"), weightPercent: 15, maxScore: 15 },
    { name: translate("platformUi.assessCompActivity"), weightPercent: 15, maxScore: 15 },
    { name: translate("platformUi.assessCompQuiz"), weightPercent: 20, maxScore: 20 },
    { name: translate("platformUi.assessCompTest"), weightPercent: 20, maxScore: 20 },
    { name: translate("platformUi.assessCompAssignment"), weightPercent: 30, maxScore: 30 },
  ];
}

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
  const { t, locale } = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<AssessTab>("catalog");
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogQ, setCatalogQ] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [pickedSchoolId, setSchoolId] = useState("");
  const schoolId = pickedSchoolId || schools[0]?.id || "";
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState(() => t("platformUi.assessSchoolDefault"));
  const [components, setComponents] = useState(() => defaultComponents(t));
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

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const rows = await platformFetch<CatalogRow[]>(
        "/platform/assessment-templates/catalog",
      );
      setCatalog(rows);
    } catch (err) {
      fail(err, t("platformUi.assessErrCatalog"));
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => void loadCatalog());
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
      fail(err, t("platformUi.assessErrTemplates"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadTemplates(schoolId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setComponents(defaultComponents(t));
  }

  async function onSaveTemplate(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    const weightTotal = components.reduce((sum, c) => sum + c.weightPercent, 0);
    if (weightTotal !== 100) {
      setError(t("platformUi.assessWeightsMustTotal", { total: weightTotal }));
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
      fail(err, t("platformUi.assessErrSave"));
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
    if (!confirm(t("platformUi.assessDeleteConfirm"))) return;
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
      fail(err, t("platformUi.assessErrDelete"));
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
      fail(err, t("platformUi.copyFailed"));
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
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.contentEngineEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.assessTitle")}</h2>
            <p className="plat-subjects-v2__sub">
              {t("platformUi.assessSub")}
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{catalogStats.total}</strong>
            <span>{t("platformUi.assessStatCatalog")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{catalogStats.packages}</strong>
            <span>{t("platformUi.assessStatInPackages")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{templates.length}</strong>
            <span>{t("platformUi.assessStatSchoolCopies")}</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="results" className="dash-icon--sm" />
          <div>
            <strong>{catalogStats.total}</strong>
            <span>{t("platformUi.assessStatPlatformTemplates")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="chart" className="dash-icon--sm" />
          <div>
            <strong>{catalogStats.components}</strong>
            <span>{t("platformUi.assessStatComponents")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="students" className="dash-icon--sm" />
          <div>
            <strong>{catalogStats.schools}</strong>
            <span>{t("platformUi.assessStatSchoolDeployments")}</span>
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
          {t("platformUi.assessTabCatalog")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "school"}
          className={`plat-filter-tab${tab === "school" ? " plat-filter-tab--active" : ""}`}
          onClick={() => setTab("school")}
        >
          <DashIcon name="building" className="dash-icon--xs plat-templates-v2__tab-icon" />
          {t("platformUi.assessTabSchool")}
        </button>
      </div>

      {tab === "catalog" ? (
        <section className="plat-assessments-v2__panel">
          <div className="plat-subjects-v2__toolbar plat-assessments-v2__toolbar">
            <div className="plat-tenants-v2__search plat-subjects-v2__search">
              <DashIcon name="results" className="dash-icon--sm" />
              <input
                type="search"
                placeholder={t("platformUi.assessSearchPh")}
                value={catalogQ}
                onChange={(e) => setCatalogQ(e.target.value)}
                aria-label={t("platformUi.assessSearchAria")}
              />
            </div>
            {selectedSchool ? (
              <p className="plat-assessments-v2__school-hint">
                {t("platformUi.assessCopyTo")} <strong>{selectedSchool.name}</strong>
              </p>
            ) : null}
          </div>

          {catalogLoading ? (
            <div className="plat-curriculum__skeleton" />
          ) : filteredCatalog.length === 0 ? (
            <p className="plat-assessments-v2__empty">{t("platformUi.assessNoCatalogMatch")}</p>
          ) : (
            <div className="plat-assessments-v2__grid">
              {filteredCatalog.map((row) => (
                <article key={row.id} className="plat-assessments-v2__card">
                  <header className="plat-assessments-v2__card-head">
                    <span className="plat-assessments-v2__icon" aria-hidden>
                      <DashIcon name="results" className="dash-icon--md" />
                    </span>
                    <div>
                      <strong className="plat-assessments-v2__name">{row.name}</strong>
                      <p className="plat-assessments-v2__meta">
                        <code>{row.key}</code>
                        {row.gradeMin != null && row.gradeMax != null
                          ? ` · Grades ${row.gradeMin}–${row.gradeMax}`
                          : ""}
                      </p>
                    </div>
                  </header>
                  <div className="plat-assessments-v2__pills">
                    {row.components.map((c) => (
                      <span key={c.id} className="plat-assessments-v2__pill">
                        {c.name} {c.weightPercent}%
                      </span>
                    ))}
                  </div>
                  <p className="plat-assessments-v2__meta">
                    {row._count.packageLinks} package(s) · {row._count.schoolTemplates} school(s)
                  </p>
                  {schoolId ? (
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--sm"
                      disabled={copyingId === row.id}
                      onClick={() => void copyCatalogToSchool(row.id)}
                    >
                      {copyingId === row.id
                        ? t("platformUi.assessCopying")
                        : t("platformUi.assessCopyToSelected")}
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
              <span>{t("platformUi.school")}</span>
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
                {t("platformUi.assessManagingFor")} <strong>{selectedSchool.name}</strong>
              </p>
            ) : null}
          </section>

          <section className="plat-assessments-v2__panel">
            <h3 className="plat-assessments-v2__section-title">{t("platformUi.assessCurrentTemplates")}</h3>
            {loading ? (
              <div className="plat-curriculum__skeleton" />
            ) : templates.length === 0 ? (
              <p className="plat-assessments-v2__empty">{t("platformUi.assessNoSchoolTemplates")}</p>
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
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                        onClick={() => void onDeleteTemplate(template.id)}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="plat-assessments-v2__panel plat-assessments-v2__form-panel">
            <h3 className="plat-assessments-v2__section-title">
              {editingTemplateId
                ? t("platformUi.assessEditTemplate")
                : t("platformUi.assessCreateForSelected")}
            </h3>
            <form onSubmit={(e) => void onSaveTemplate(e)}>
              <label className="att-field att-field--wide">
                <span>{t("platformUi.name")}</span>
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
                    ? t("platformUi.saving")
                    : editingTemplateId
                      ? t("platformUi.saveTemplate")
                      : t("platformUi.assessCreateSchoolTemplate")}
                </button>
                {editingTemplateId ? (
                  <button type="button" className="plat-btn plat-btn--ghost" onClick={resetForm}>
                    {t("platformUi.cancelEdit")}
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
