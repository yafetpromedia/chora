"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { LIBRARY_RESOURCE_TYPES } from "@/lib/library";
import {
  handlePlatformAuthFailure,
  platformFetch,
  platformUpload,
} from "@/lib/platform-auth";

type CategoryOption = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

type SubjectOption = {
  id: string;
  code: string;
  name: string;
};

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  subject: string | null;
  gradeLabel: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  category: { id: string; slug: string; name: string; icon: string | null };
  _count: { schoolResources: number; packageLinks: number };
};

type EditorMode = "create" | "edit" | null;

const GRADE_OPTIONS = [
  "Nursery",
  "KG 1",
  "KG 2",
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  "All grades",
] as const;

function resourceLabel(type: string) {
  return (
    LIBRARY_RESOURCE_TYPES.find((t) => t.value === type)?.label ??
    type.replace(/_/g, " ").toLowerCase()
  );
}

function fileNameFromUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const path = url.split("?")[0] ?? url;
    const part = path.split("/").pop();
    return part && part.length > 0 ? decodeURIComponent(part) : null;
  } catch {
    return null;
  }
}

export function PlatformLibraryRepo() {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [pickedCategoryId, setFormCategoryId] = useState("");
  const formCategoryId = pickedCategoryId || categories[0]?.id || "";
  const [formType, setFormType] = useState("BOOK_PDF");
  const [formSubject, setFormSubject] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formExternalUrl, setFormExternalUrl] = useState("");
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, cats, subjectRows] = await Promise.all([
        platformFetch<ResourceRow[]>("/platform/library/resources"),
        platformFetch<CategoryOption[]>("/platform/library/categories"),
        platformFetch<SubjectOption[]>("/platform/subjects"),
      ]);
      setResources(rows);
      setCategories(cats);
      setSubjects(subjectRows);
    } catch (err) {
      fail(err, "Load failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const stats = useMemo(() => {
    return {
      total: resources.length,
      inPackages: resources.reduce((sum, r) => sum + r._count.packageLinks, 0),
      inSchools: resources.reduce((sum, r) => sum + r._count.schoolResources, 0),
      categories: new Set(resources.map((r) => r.category.slug)).size,
    };
  }, [resources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (categoryFilter !== "ALL" && r.category.slug !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.category.name.toLowerCase().includes(q) ||
        (r.subject ?? "").toLowerCase().includes(q) ||
        r.resourceType.toLowerCase().includes(q)
      );
    });
  }, [resources, query, categoryFilter]);

  const categoryFilters = useMemo(() => {
    const slugs = new Map<string, string>();
    for (const r of resources) {
      slugs.set(r.category.slug, r.category.name);
    }
    return Array.from(slugs.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [resources]);

  const subjectOptions = useMemo(() => {
    const names = new Set(subjects.map((s) => s.name));
    if (formSubject && !names.has(formSubject)) names.add(formSubject);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [subjects, formSubject]);

  const gradeOptions = useMemo(() => {
    const opts = [...GRADE_OPTIONS] as string[];
    if (formGrade && !opts.includes(formGrade)) opts.push(formGrade);
    return opts;
  }, [formGrade]);

  function resetEditor() {
    setEditorMode(null);
    setEditingId(null);
    setFormTitle("");
    setFormDescription("");
    setFormType("BOOK_PDF");
    setFormSubject("");
    setFormGrade("");
    setFormFile(null);
    setFormExternalUrl("");
    setCurrentFileUrl(null);
    if (categories[0]) setFormCategoryId(categories[0].id);
  }

  function openCreate() {
    setError("");
    setEditingId(null);
    setFormTitle("");
    setFormDescription("");
    setFormType("BOOK_PDF");
    setFormSubject("");
    setFormGrade("");
    setFormFile(null);
    setFormExternalUrl("");
    setCurrentFileUrl(null);
    setFormCategoryId(categories[0]?.id ?? "");
    setEditorMode("create");
  }

  function openEdit(row: ResourceRow) {
    setError("");
    setEditingId(row.id);
    setFormTitle(row.title);
    setFormDescription(row.description ?? "");
    setFormCategoryId(row.category.id);
    setFormType(row.resourceType);
    setFormSubject(row.subject ?? "");
    setFormGrade(row.gradeLabel ?? "");
    setFormFile(null);
    setFormExternalUrl(row.externalUrl ?? "");
    setCurrentFileUrl(row.fileUrl);
    setEditorMode("edit");
  }

  async function saveResource() {
    if (!formTitle.trim() || !formCategoryId) return;
    setBusy(true);
    setError("");
    try {
      let fileUrl: string | undefined;
      if (formFile) {
        const uploaded = await platformUpload<{ fileUrl: string }>(
          "/platform/library/upload",
          formFile,
        );
        fileUrl = uploaded.fileUrl;
      }

      const payload = {
        title: formTitle.trim(),
        categoryId: formCategoryId,
        resourceType: formType,
        description: formDescription.trim(),
        subject: formSubject.trim(),
        gradeLabel: formGrade.trim(),
        externalUrl: formExternalUrl.trim(),
      };

      if (editorMode === "create") {
        await platformFetch("/platform/library/resources", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            fileUrl,
          }),
        });
      } else if (editingId) {
        await platformFetch(`/platform/library/resources/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            ...(fileUrl !== undefined ? { fileUrl } : {}),
          }),
        });
      }

      resetEditor();
      await load();
    } catch (err) {
      fail(err, editorMode === "edit" ? "Save failed" : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteResource(id: string, title: string) {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/library/resources/${id}`, {
        method: "DELETE",
      });
      if (editingId === id) resetEditor();
      await load();
    } catch (err) {
      fail(err, "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const currentFileLabel = formFile?.name ?? fileNameFromUrl(currentFileUrl);
  const isEditing = editorMode === "edit";
  const withFile = resources.filter((r) => Boolean(r.fileUrl || r.externalUrl)).length;

  if (loading) {
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern">
      <AppToast
        message={!editorMode ? error : ""}
        tone="error"
        onDismiss={() => setError("")}
      />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="library" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Content & Curriculum Engine</p>
            <h2 className="plat-subjects-v2__title">eLibrary repository</h2>
            <p className="plat-subjects-v2__sub">
              Master learning resources inherited by schools when a curriculum
              package is provisioned.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.total}</strong>
            <span>Resources</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.inPackages}</strong>
            <span>In packages</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.inSchools}</strong>
            <span>In schools</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <div>
            <strong>{stats.categories}</strong>
            <span>Categories</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <div>
            <strong>{withFile}</strong>
            <span>With file / link</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <div>
            <strong>{stats.inSchools}</strong>
            <span>School copies</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <input
            type="search"
            placeholder="Search resources…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search resources"
          />
        </div>
        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={categoryFilter === "ALL"}
            className={`plat-filter-tab${
              categoryFilter === "ALL" ? " plat-filter-tab--active" : ""
            }`}
            onClick={() => setCategoryFilter("ALL")}
          >
            All categories
          </button>
          {categoryFilters.map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              role="tab"
              aria-selected={categoryFilter === slug}
              className={`plat-filter-tab${
                categoryFilter === slug ? " plat-filter-tab--active" : ""
              }`}
              onClick={() => setCategoryFilter(slug)}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="plat-btn plat-btn--primary"
          onClick={() => openCreate()}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          New resource
        </button>
      </div>

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Grade</th>
              <th>File</th>
              <th>Packages</th>
              <th>Schools</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="plat-subjects-v2__empty">
                  No resources match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="plat-subjects-v2__name">{r.title}</span>
                  </td>
                  <td>
                    <span className="plat-subjects-v2__pill">
                      {r.category.name}
                    </span>
                  </td>
                  <td>
                    <span className="plat-subjects-v2__pill plat-subjects-v2__pill--curriculum">
                      {resourceLabel(r.resourceType)}
                    </span>
                  </td>
                  <td>{r.subject ?? "—"}</td>
                  <td>{r.gradeLabel ?? "—"}</td>
                  <td className="plat-subjects-v2__muted">
                    {r.fileUrl
                      ? fileNameFromUrl(r.fileUrl) ?? "File"
                      : r.externalUrl
                        ? "Link"
                        : "—"}
                  </td>
                  <td>
                    <span className="plat-subjects-v2__count">
                      {r._count.packageLinks}
                    </span>
                  </td>
                  <td>
                    <span className="plat-subjects-v2__count">
                      {r._count.schoolResources}
                    </span>
                  </td>
                  <td>
                    <div className="plat-subjects-v2__actions">
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs"
                        disabled={busy}
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                        disabled={busy}
                        onClick={() => void deleteResource(r.id, r.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editorMode ? (
        <>
          <button
            type="button"
            className="stu-drawer-backdrop"
            aria-label="Close"
            onClick={() => resetEditor()}
          />
          <aside
            className="stu-drawer plat-lib-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plat-lib-editor-title"
          >
            <header className="stu-drawer__head">
              <div>
                <h2 id="plat-lib-editor-title" className="stu-drawer__title">
                  {isEditing ? "Edit resource" : "New resource"}
                </h2>
                <p className="stu-drawer__sub">
                  {isEditing
                    ? "Update details or replace the attached file."
                    : "Add a master file schools can inherit on provision."}
                </p>
              </div>
              <button
                type="button"
                className="stu-drawer__close"
                onClick={() => resetEditor()}
              >
                ×
              </button>
            </header>

            <div className="stu-drawer__body">
              <AppToast message={error} tone="error" onDismiss={() => setError("")} />

              <label className="plat-field">
                <span>Title</span>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Resource title"
                  autoFocus
                />
              </label>

              <label className="plat-field">
                <span>Description</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short summary for schools (optional)"
                  rows={3}
                />
              </label>

              <div className="plat-field-row">
                <label className="plat-field">
                  <span>Category</span>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="plat-field">
                  <span>Type</span>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                  >
                    {LIBRARY_RESOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="plat-field-row">
                <label className="plat-field">
                  <span>Subject</span>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  >
                    <option value="">Any subject</option>
                    {subjectOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="plat-field">
                  <span>Grade</span>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                  >
                    <option value="">Any grade</option>
                    {gradeOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="plat-field">
                <span>File</span>
                <div className="plat-lib-v2__file">
                  <div className="plat-lib-v2__file-copy">
                    <strong>
                      {isEditing ? "Replace main file" : "Attach main file"}
                    </strong>
                    <p>Optional if you use an external link.</p>
                    {currentFileLabel || formFile ? (
                      <em className="plat-lib-v2__file-picked">
                        {formFile
                          ? `New: ${formFile.name}`
                          : `Current: ${currentFileLabel}`}
                      </em>
                    ) : null}
                  </div>
                  <label className="plat-lib-v2__file-btn">
                    Choose file
                    <input
                      type="file"
                      accept=".pdf,.epub,.doc,.docx,.ppt,.pptx,.mp4,.mp3"
                      onChange={(e) =>
                        setFormFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                </div>
              </div>

              <label className="plat-field">
                <span>External link</span>
                <input
                  value={formExternalUrl}
                  onChange={(e) => setFormExternalUrl(e.target.value)}
                  placeholder="https://…"
                />
              </label>
            </div>

            <footer className="stu-drawer__foot stu-drawer__foot--split">
              {isEditing && editingId ? (
                <button
                  type="button"
                  className="plat-btn plat-btn--ghost plat-btn--danger"
                  disabled={busy}
                  onClick={() =>
                    void deleteResource(editingId, formTitle || "resource")
                  }
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="stu-drawer__foot-actions">
                <button
                  type="button"
                  className="plat-btn plat-btn--ghost"
                  disabled={busy}
                  onClick={() => resetEditor()}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="plat-btn plat-btn--primary"
                  disabled={busy || !formTitle.trim() || !formCategoryId}
                  onClick={() => void saveResource()}
                >
                  {busy
                    ? "Saving…"
                    : isEditing
                      ? "Save changes"
                      : "Save resource"}
                </button>
              </div>
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  );
}
