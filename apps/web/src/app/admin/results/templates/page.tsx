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
import { useLocale } from "@/components/i18n/locale-provider";

const DEFAULT_COMPONENTS: TemplateComponentDraft[] = [
  { name: "Worksheet", weightPercent: 15, maxScore: 15 },
  { name: "Activity", weightPercent: 15, maxScore: 15 },
  { name: "Quiz", weightPercent: 20, maxScore: 20 },
  { name: "Test", weightPercent: 20, maxScore: 20 },
  { name: "Assignment", weightPercent: 30, maxScore: 30 },
];

type AssignTab = "grade" | "class";

export default function AssessmentTemplatesPage() {
  const router = useRouter();
  const { t, tp } = useLocale();

  function assignmentSummary(template: AssessmentTemplate) {
    if (template.gradeAssignments.length === 0) return t("adminTemplatesUi.notAssignedYet");
    return template.gradeAssignments
      .map((a) => (a.subjectName ? `${a.gradeName} · ${a.subjectName}` : a.gradeName))
      .join(", ");
  }
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [components, setComponents] = useState(DEFAULT_COMPONENTS);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignGradeId, setAssignGradeId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignClassSubjectId, setAssignClassSubjectId] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [assignTab, setAssignTab] = useState<AssignTab>("grade");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialize the translated default when the locale changes.
    setName((prev) => prev || t("adminTemplatesUi.defaultName"));
  }, [t]);

  function fetchAll() {
    return Promise.all([
      listAssessmentTemplates(),
      listGrades(),
      listSubjects(),
      listClassSubjects(),
    ]);
  }

  async function load() {
    applyLoaded(await fetchAll());
  }

  function applyLoaded([tpls, g, sub, cs]: Awaited<ReturnType<typeof fetchAll>>) {
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
    let cancelled = false;
    void fetchAll()
      .then((data) => {
        if (!cancelled) applyLoaded(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t("adminTemplatesUi.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const totalComponents = useMemo(
    () => templates.reduce((sum, tpl) => sum + tpl.components.length, 0),
    [templates],
  );

  const linkedGrades = useMemo(() => {
    const names = new Set<string>();
    for (const tpl of templates) {
      for (const a of tpl.gradeAssignments) names.add(a.gradeName);
    }
    return names.size;
  }, [templates]);

  const weightTotal = components.reduce((sum, c) => sum + c.weightPercent, 0);

  function resetForm() {
    setEditingTemplateId("");
    setName(t("adminTemplatesUi.defaultName"));
    setComponents(DEFAULT_COMPONENTS);
  }

  async function onSaveTemplate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (weightTotal !== 100) {
      setError(t("adminTemplatesUi.weightsMust100", { total: weightTotal }));
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
      setError(err instanceof Error ? err.message : t("adminTemplatesUi.saveFailed"));
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
      setError(err instanceof Error ? err.message : t("adminTemplatesUi.assignFailed"));
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
      setError(err instanceof Error ? err.message : t("adminTemplatesUi.classAssignFailed"));
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
    if (!window.confirm(t("adminTemplatesUi.deleteConfirm"))) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      await deleteAssessmentTemplate(templateId);
      if (editingTemplateId === templateId) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminTemplatesUi.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage role="admin" title={tp("Assessment templates")}>
      <div className="tpl-v2">
        <AcademicsHero
          title={t("adminTemplatesUi.heroTitle")}
          subtitle={t("adminTemplatesUi.heroSub")}
          stats={[
            { label: t("adminTemplatesUi.statTemplates"), value: loading ? "—" : templates.length },
            {
              label: t("adminTemplatesUi.statComponents"),
              value: loading ? "—" : totalComponents,
            },
            {
              label: t("adminTemplatesUi.statGradesLinked"),
              value: loading ? "—" : linkedGrades,
              accent: !loading && linkedGrades > 0,
            },
          ]}
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />

        {loading ? (
          <div className="tpl-v2__loading">
            <span className="tpl-v2__loading-spinner" aria-hidden />
            <p>{t("adminTemplatesUi.loading")}</p>
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
                      <h3 className="tpl-v2__card-title">{t("adminTemplatesUi.libraryTitle")}</h3>
                      <p className="tpl-v2__card-sub">{t("adminTemplatesUi.librarySub")}</p>
                    </div>
                  </div>
                  <button type="button" className="tpl-v2__btn tpl-v2__btn--ghost" onClick={resetForm}>
                    {t("adminTemplatesUi.newTemplate")}
                  </button>
                </header>

                {templates.length === 0 ? (
                  <div className="tpl-v2__empty">
                    <p>{t("adminTemplatesUi.emptyList")}</p>
                  </div>
                ) : (
                  <ul className="tpl-v2__list">
                    {templates.map((tpl) => (
                      <li
                        key={tpl.id}
                        className={`tpl-v2__item${editingTemplateId === tpl.id ? " tpl-v2__item--active" : ""}`}
                      >
                        <div className="tpl-v2__item-main">
                          <div className="tpl-v2__item-top">
                            <strong className="tpl-v2__item-name">{tpl.name}</strong>
                            <div className="tpl-v2__item-actions">
                              <button
                                type="button"
                                className="tpl-v2__btn tpl-v2__btn--ghost tpl-v2__btn--sm"
                                onClick={() => onEditTemplate(tpl)}
                              >
                                {t("common.edit")}
                              </button>
                              <button
                                type="button"
                                className="tpl-v2__btn tpl-v2__btn--danger tpl-v2__btn--sm"
                                onClick={() => void onDeleteTemplate(tpl.id)}
                              >
                                {t("common.delete")}
                              </button>
                            </div>
                          </div>
                          {tpl.description ? (
                            <p className="tpl-v2__item-desc">{tpl.description}</p>
                          ) : null}
                          <div className="tpl-v2__chips">
                            {tpl.components.map((c) => (
                              <span key={c.id} className="tpl-v2__chip">
                                <strong>{c.name}</strong>
                                <span>
                                  {c.weightPercent}% · /{c.maxScore}
                                </span>
                              </span>
                            ))}
                          </div>
                          <p className="tpl-v2__item-meta">
                            <span>{t("adminTemplatesUi.assigned")}</span> {assignmentSummary(tpl)}
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
                      <h3 className="tpl-v2__card-title">{t("adminTemplatesUi.assignTitle")}</h3>
                      <p className="tpl-v2__card-sub">{t("adminTemplatesUi.assignSub")}</p>
                    </div>
                  </div>
                </header>

                <div className="tpl-v2__subtabs">
                  <button
                    type="button"
                    className={`tpl-v2__subtab${assignTab === "grade" ? " tpl-v2__subtab--active" : ""}`}
                    onClick={() => setAssignTab("grade")}
                  >
                    {t("adminTemplatesUi.tabByGrade")}
                  </button>
                  <button
                    type="button"
                    className={`tpl-v2__subtab${assignTab === "class" ? " tpl-v2__subtab--active" : ""}`}
                    onClick={() => setAssignTab("class")}
                  >
                    {t("adminTemplatesUi.tabByClass")}
                  </button>
                </div>

                {assignTab === "grade" ? (
                  <div className="tpl-v2__assign">
                    <label className="tpl-v2__field">
                      <span>{t("adminTemplatesUi.fieldTemplate")}</span>
                      <select
                        value={assignTemplateId}
                        onChange={(e) => setAssignTemplateId(e.target.value)}
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="tpl-v2__field">
                      <span>{t("adminTemplatesUi.fieldGrade")}</span>
                      <select value={assignGradeId} onChange={(e) => setAssignGradeId(e.target.value)}>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="tpl-v2__field tpl-v2__field--wide">
                      <span>{t("adminTemplatesUi.fieldSubjectOptional")}</span>
                      <select value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value)}>
                        <option value="">{t("adminTemplatesUi.allSubjects")}</option>
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
                      {t("adminTemplatesUi.assignToGrade")}
                    </button>
                  </div>
                ) : (
                  <div className="tpl-v2__assign">
                    <label className="tpl-v2__field tpl-v2__field--wide">
                      <span>{t("adminTemplatesUi.fieldTemplate")}</span>
                      <select
                        value={assignTemplateId}
                        onChange={(e) => setAssignTemplateId(e.target.value)}
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="tpl-v2__field tpl-v2__field--grow">
                      <span>{t("adminTemplatesUi.fieldClassSubject")}</span>
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
                      {t("adminTemplatesUi.assignToClass")}
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
                    <h3>
                      {editingTemplateId
                        ? t("adminTemplatesUi.editTemplate")
                        : t("adminTemplatesUi.newTemplateForm")}
                    </h3>
                    <p>
                      {editingTemplateId
                        ? t("adminTemplatesUi.formEditSub")
                        : t("adminTemplatesUi.formNewSub")}
                    </p>
                  </div>
                </header>

                <label className="tpl-v2__field tpl-v2__field--stack">
                  <span>{t("adminTemplatesUi.fieldTemplateName")}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("adminTemplatesUi.namePlaceholder")}
                    required
                  />
                </label>

                <div className="tpl-v2__weight">
                  <span>{t("adminTemplatesUi.weightTotal")}</span>
                  <strong className={weightTotal === 100 ? "tpl-v2__weight--ok" : "tpl-v2__weight--warn"}>
                    {weightTotal}%
                  </strong>
                  {weightTotal !== 100 ? <em>{t("adminTemplatesUi.mustEqual100")}</em> : null}
                </div>

                <TemplateComponentsEditor components={components} onChange={setComponents} />

                <footer className="tpl-v2__form-foot">
                  {editingTemplateId ? (
                    <button type="button" className="tpl-v2__btn tpl-v2__btn--ghost" onClick={resetForm}>
                      {t("common.cancel")}
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="tpl-v2__btn tpl-v2__btn--primary"
                    disabled={busy || weightTotal !== 100}
                  >
                    {busy
                      ? t("common.saving")
                      : editingTemplateId
                        ? t("adminTemplatesUi.saveChanges")
                        : t("adminTemplatesUi.createTemplate")}
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
