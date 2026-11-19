"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import {
  handlePlatformAuthFailure,
  platformFetch,
} from "@/lib/platform-auth";

type PlatformSubjectRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  curriculum: string | null;
  level: string | null;
  gradeMin: number | null;
  gradeMax: number | null;
  isArchived: boolean;
  _count: { packageLinks: number; schoolSubjects: number };
};

const LEVEL_FILTERS = ["ALL", "PRIMARY", "SECONDARY"] as const;
const CURRICULUM_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "ETHIOPIAN_PRIVATE", label: "Ethiopian" },
  { value: "CAMBRIDGE", label: "Cambridge" },
  { value: "AMERICAN", label: "American" },
] as const;

function formatCurriculum(value: string | null) {
  if (!value) return "General";
  return CURRICULUM_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

function formatLevel(value: string | null) {
  if (!value || value === "ALL") return "All levels";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function PlatformSubjects() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<PlatformSubjectRow[]>([]);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<(typeof LEVEL_FILTERS)[number]>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCurriculum, setFormCurriculum] = useState("GENERAL");
  const [formLevel, setFormLevel] = useState("ALL");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCurriculum, setEditCurriculum] = useState("GENERAL");
  const [editLevel, setEditLevel] = useState("ALL");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const loadSubjects = useCallback(async () => {
    const rows = await platformFetch<PlatformSubjectRow[]>(
      `/platform/subjects?includeArchived=${showArchived}`,
    );
    setSubjects(rows);
  }, [showArchived]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadSubjects();
    } catch (err) {
      fail(err, "Load failed");
    } finally {
      setLoading(false);
    }
  }, [loadSubjects, router]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!loading) queueMicrotask(() => void loadSubjects());
  }, [showArchived, loadSubjects, loading]);

  const stats = useMemo(() => {
    const active = subjects.filter((s) => !s.isArchived);
    return {
      active: active.length,
      archived: subjects.filter((s) => s.isArchived).length,
      inPackages: active.reduce((sum, s) => sum + s._count.packageLinks, 0),
      inSchools: active.reduce((sum, s) => sum + s._count.schoolSubjects, 0),
      primary: active.filter((s) => s.level === "PRIMARY").length,
      secondary: active.filter((s) => s.level === "SECONDARY").length,
    };
  }, [subjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      if (levelFilter !== "ALL" && s.level !== levelFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.curriculum ?? "").toLowerCase().includes(q)
      );
    });
  }, [subjects, query, levelFilter]);

  async function createSubject() {
    setBusy(true);
    setError("");
    try {
      await platformFetch("/platform/subjects", {
        method: "POST",
        body: JSON.stringify({
          code: formCode.trim(),
          name: formName.trim(),
          curriculum: formCurriculum,
          level: formLevel,
        }),
      });
      setFormOpen(false);
      setFormCode("");
      setFormName("");
      await loadSubjects();
    } catch (err) {
      fail(err, "Create failed");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(subject: PlatformSubjectRow) {
    setEditingId(subject.id);
    setEditName(subject.name);
    setEditCurriculum(subject.curriculum ?? "GENERAL");
    setEditLevel(subject.level ?? "ALL");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCurriculum("GENERAL");
    setEditLevel("ALL");
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/subjects/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          curriculum: editCurriculum,
          level: editLevel,
        }),
      });
      cancelEdit();
      await loadSubjects();
    } catch (err) {
      fail(err, "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSubject(id: string) {
    if (!confirm("Archive this platform subject?")) return;
    setBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/subjects/${id}/archive`, { method: "POST" });
      if (editingId === id) cancelEdit();
      await loadSubjects();
    } catch (err) {
      fail(err, "Archive failed");
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
    <div className="plat-subjects-v2 dash-admin dash-admin--modern">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="subjects" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Content & Curriculum Engine</p>
            <h2 className="plat-subjects-v2__title">Subject repository</h2>
            <p className="plat-subjects-v2__sub">
              Master subjects copied to schools on provision. Schools can customize
              copies — customized rows are not overwritten.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.active}</strong>
            <span>Active</span>
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
          <DashIcon name="subjects" className="dash-icon--sm" />
          <div>
            <strong>{stats.primary}</strong>
            <span>Primary</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="teachers" className="dash-icon--sm" />
          <div>
            <strong>{stats.secondary}</strong>
            <span>Secondary</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="library" className="dash-icon--sm" />
          <div>
            <strong>{stats.archived}</strong>
            <span>Archived</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="subjects" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search subjects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search subjects"
          />
        </div>
        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          {LEVEL_FILTERS.map((level) => (
            <button
              key={level}
              type="button"
              role="tab"
              aria-selected={levelFilter === level}
              className={`plat-filter-tab${
                levelFilter === level ? " plat-filter-tab--active" : ""
              }`}
              onClick={() => setLevelFilter(level)}
            >
              {level === "ALL" ? "All levels" : formatLevel(level)}
            </button>
          ))}
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
          onClick={() => setFormOpen((v) => !v)}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          {formOpen ? "Cancel" : "New subject"}
        </button>
      </div>

      {formOpen ? (
        <div className="plat-curriculum-form plat-subjects-v2__form">
          <input
            placeholder="Code (e.g. BIO)"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
          />
          <input
            placeholder="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <select
            value={formCurriculum}
            onChange={(e) => setFormCurriculum(e.target.value)}
          >
            {CURRICULUM_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select value={formLevel} onChange={(e) => setFormLevel(e.target.value)}>
            <option value="ALL">All levels</option>
            <option value="PRIMARY">Primary</option>
            <option value="SECONDARY">Secondary</option>
          </select>
          <button
            type="button"
            className="plat-btn plat-btn--primary"
            disabled={busy || !formCode.trim() || !formName.trim()}
            onClick={() => void createSubject()}
          >
            {busy ? "Saving…" : "Save subject"}
          </button>
        </div>
      ) : null}

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Subject</th>
              <th>Curriculum</th>
              <th>Level</th>
              <th>Packages</th>
              <th>Schools</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="plat-subjects-v2__empty">
                  No subjects match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const editing = editingId === s.id;
                return (
                  <tr
                    key={s.id}
                    className={`${s.isArchived ? "plat-subjects-v2__row--archived" : ""}${
                      editing ? " plat-subjects-v2__row--editing" : ""
                    }`}
                  >
                    <td>
                      <code className="plat-subjects-v2__code">{s.code}</code>
                    </td>
                    <td>
                      {editing ? (
                        <input
                          className="plat-subjects-v2__inline-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <span className="plat-subjects-v2__name">{s.name}</span>
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <select
                          className="plat-subjects-v2__inline-select"
                          value={editCurriculum}
                          onChange={(e) => setEditCurriculum(e.target.value)}
                        >
                          {CURRICULUM_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="plat-subjects-v2__pill plat-subjects-v2__pill--curriculum">
                          {formatCurriculum(s.curriculum)}
                        </span>
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <select
                          className="plat-subjects-v2__inline-select"
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value)}
                        >
                          <option value="ALL">All levels</option>
                          <option value="PRIMARY">Primary</option>
                          <option value="SECONDARY">Secondary</option>
                        </select>
                      ) : (
                        <span
                          className={`plat-subjects-v2__pill plat-subjects-v2__pill--level plat-subjects-v2__pill--${(s.level ?? "all").toLowerCase()}`}
                        >
                          {formatLevel(s.level)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="plat-subjects-v2__count">{s._count.packageLinks}</span>
                    </td>
                    <td>
                      <span className="plat-subjects-v2__count">{s._count.schoolSubjects}</span>
                    </td>
                    <td>
                      <div className="plat-subjects-v2__actions">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              className="plat-btn plat-btn--primary plat-btn--xs"
                              disabled={busy}
                              onClick={() => void saveEdit()}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="plat-btn plat-btn--ghost plat-btn--xs"
                              disabled={busy}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : !s.isArchived ? (
                          <>
                            <button
                              type="button"
                              className="plat-btn plat-btn--ghost plat-btn--xs"
                              disabled={busy}
                              onClick={() => startEdit(s)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                              disabled={busy}
                              onClick={() => void archiveSubject(s.id)}
                            >
                              Archive
                            </button>
                          </>
                        ) : (
                          <span className="plat-subjects-v2__archived-badge">Archived</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
