"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import {
  handlePlatformAuthFailure,
  platformFetch,
} from "@/lib/platform-auth";

type StructureRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  gradePreset: string;
  isArchived: boolean;
  _count: { packages: number };
};

type EditorMode = "create" | "edit" | null;

const GRADE_PRESETS = [
  {
    value: "KG_12",
    label: "Nursery – Grade 12",
    hint: "Nursery, KG 1, KG 2, then Grade 1–12",
  },
  {
    value: "GRADES_1_8",
    label: "Grades 1–8",
    hint: "Primary school (8 grades)",
  },
  {
    value: "GRADES_9_12",
    label: "Grades 9–12",
    hint: "Secondary / preparatory (4 grades)",
  },
] as const;

function formatPreset(value: string) {
  return (
    GRADE_PRESETS.find((p) => p.value === value)?.label ??
    value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function slugKey(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

export function PlatformStructures() {
  const router = useRouter();
  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPreset, setFormPreset] = useState<string>("KG_12");
  const [keyTouched, setKeyTouched] = useState(false);

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const loadStructures = useCallback(async () => {
    const rows = await platformFetch<StructureRow[]>(
      `/platform/academic-structures?includeArchived=${showArchived}`,
    );
    setStructures(rows);
  }, [showArchived]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadStructures();
    } catch (err) {
      fail(err, "Load failed");
    } finally {
      setLoading(false);
    }
  }, [loadStructures, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading) void loadStructures();
  }, [showArchived, loadStructures, loading]);

  const stats = useMemo(() => {
    const active = structures.filter((s) => !s.isArchived);
    return {
      active: active.length,
      archived: structures.filter((s) => s.isArchived).length,
      linked: active.reduce((sum, s) => sum + s._count.packages, 0),
      presets: new Set(active.map((s) => s.gradePreset)).size,
    };
  }, [structures]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return structures;
    return structures.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        s.gradePreset.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }, [structures, query]);

  const isEditing = editorMode === "edit";

  function resetEditor() {
    setEditorMode(null);
    setEditingId(null);
    setFormKey("");
    setFormLabel("");
    setFormDescription("");
    setFormPreset("KG_12");
    setKeyTouched(false);
  }

  function openCreate() {
    setError("");
    setEditingId(null);
    setFormKey("");
    setFormLabel("");
    setFormDescription("");
    setFormPreset("KG_12");
    setKeyTouched(false);
    setEditorMode("create");
  }

  function openEdit(row: StructureRow) {
    setError("");
    setEditingId(row.id);
    setFormKey(row.key);
    setFormLabel(row.label);
    setFormDescription(row.description ?? "");
    setFormPreset(row.gradePreset);
    setKeyTouched(true);
    setEditorMode("edit");
  }

  async function saveStructure() {
    if (!formLabel.trim() || !formPreset) return;
    if (!isEditing && !formKey.trim()) return;

    setBusy(true);
    setError("");
    try {
      if (editorMode === "create") {
        await platformFetch("/platform/academic-structures", {
          method: "POST",
          body: JSON.stringify({
            key: formKey.trim().toUpperCase(),
            label: formLabel.trim(),
            description: formDescription.trim(),
            gradePreset: formPreset,
          }),
        });
      } else if (editingId) {
        await platformFetch(`/platform/academic-structures/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            label: formLabel.trim(),
            description: formDescription.trim(),
            gradePreset: formPreset,
          }),
        });
      }
      resetEditor();
      await loadStructures();
    } catch (err) {
      fail(err, isEditing ? "Save failed" : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function archiveStructure(row: StructureRow) {
    const next = !row.isArchived;
    if (
      !confirm(
        next
          ? `Archive “${row.label}”? Packages keep their link; it won’t show as active.`
          : `Restore “${row.label}”?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/academic-structures/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isArchived: next }),
      });
      if (editingId === row.id) resetEditor();
      await loadStructures();
    } catch (err) {
      fail(err, next ? "Archive failed" : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStructure(row: StructureRow) {
    if (
      !confirm(
        `Delete “${row.label}”? This only works if no packages use it.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/academic-structures/${row.id}`, {
        method: "DELETE",
      });
      if (editingId === row.id) resetEditor();
      await loadStructures();
    } catch (err) {
      fail(err, "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-structure-v2">
      <AppToast
        message={!editorMode ? error : ""}
        tone="error"
        onDismiss={() => setError("")}
      />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="building" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Content & Curriculum Engine</p>
            <h2 className="plat-subjects-v2__title">Academic structures</h2>
            <p className="plat-subjects-v2__sub">
              Grade presets packages can use when onboarding schools.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.active}</strong>
            <span>Active</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.linked}</strong>
            <span>Package links</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.archived}</strong>
            <span>Archived</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <div>
            <strong>{stats.active}</strong>
            <span>Active presets</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <div>
            <strong>{stats.linked}</strong>
            <span>Linked packages</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <div>
            <strong>{stats.presets}</strong>
            <span>Grade bands</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <input
            type="search"
            placeholder="Search structures…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search structures"
          />
        </div>
        <label className="plat-subjects-v2__check">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        <button
          type="button"
          className="plat-btn plat-btn--primary"
          onClick={() => openCreate()}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          New structure
        </button>
      </div>

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>Structure</th>
              <th>Key</th>
              <th>Grade preset</th>
              <th>Packages</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="plat-subjects-v2__empty">
                  No structures match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className={
                    s.isArchived ? "plat-subjects-v2__row--archived" : undefined
                  }
                >
                  <td>
                    <span className="plat-subjects-v2__name">{s.label}</span>
                    {s.description ? (
                      <span className="plat-subjects-v2__muted">
                        {" "}
                        · {s.description}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span className="plat-subjects-v2__code">{s.key}</span>
                  </td>
                  <td>
                    <span className="plat-subjects-v2__pill plat-subjects-v2__pill--curriculum">
                      {formatPreset(s.gradePreset)}
                    </span>
                  </td>
                  <td>
                    <span className="plat-subjects-v2__count">
                      {s._count.packages}
                    </span>
                  </td>
                  <td>
                    {s.isArchived ? (
                      <span className="plat-subjects-v2__archived-badge">
                        Archived
                      </span>
                    ) : (
                      <span className="plat-subjects-v2__pill">Active</span>
                    )}
                  </td>
                  <td>
                    <div className="plat-subjects-v2__actions">
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs"
                        disabled={busy}
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs"
                        disabled={busy}
                        onClick={() => void archiveStructure(s)}
                      >
                        {s.isArchived ? "Restore" : "Archive"}
                      </button>
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                        disabled={busy || s._count.packages > 0}
                        title={
                          s._count.packages > 0
                            ? "Unlink from packages first"
                            : "Delete permanently"
                        }
                        onClick={() => void deleteStructure(s)}
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
            aria-labelledby="plat-structure-editor-title"
          >
            <header className="stu-drawer__head">
              <div>
                <h2
                  id="plat-structure-editor-title"
                  className="stu-drawer__title"
                >
                  {isEditing ? "Edit structure" : "New structure"}
                </h2>
                <p className="stu-drawer__sub">
                  {isEditing
                    ? "Update the label, description, or grade band."
                    : "Define a grade preset packages can link to."}
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
                <span>Label</span>
                <input
                  value={formLabel}
                  onChange={(e) => {
                    const next = e.target.value;
                    setFormLabel(next);
                    if (!isEditing && !keyTouched) {
                      setFormKey(slugKey(next));
                    }
                  }}
                  placeholder="e.g. Primary (Grades 1–8)"
                  autoFocus
                />
              </label>

              <label className="plat-field">
                <span>Key</span>
                <input
                  value={formKey}
                  onChange={(e) => {
                    setKeyTouched(true);
                    setFormKey(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                    );
                  }}
                  placeholder="PRIMARY_1_8"
                  disabled={isEditing}
                />
              </label>

              <label className="plat-field">
                <span>Grade preset</span>
                <select
                  value={formPreset}
                  onChange={(e) => setFormPreset(e.target.value)}
                >
                  {GRADE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <em className="plat-subjects-v2__muted">
                  {GRADE_PRESETS.find((p) => p.value === formPreset)?.hint}
                </em>
              </label>

              <label className="plat-field">
                <span>Description</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short note for operators (optional)"
                  rows={3}
                />
              </label>
            </div>

            <footer className="stu-drawer__foot stu-drawer__foot--split">
              {isEditing && editingId ? (
                <button
                  type="button"
                  className="plat-btn plat-btn--ghost plat-btn--danger"
                  disabled={busy}
                  onClick={() => {
                    const row = structures.find((s) => s.id === editingId);
                    if (row) void deleteStructure(row);
                  }}
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
                  disabled={
                    busy ||
                    !formLabel.trim() ||
                    !formPreset ||
                    (!isEditing && !formKey.trim())
                  }
                  onClick={() => void saveStructure()}
                >
                  {busy
                    ? "Saving…"
                    : isEditing
                      ? "Save changes"
                      : "Save structure"}
                </button>
              </div>
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  );
}
