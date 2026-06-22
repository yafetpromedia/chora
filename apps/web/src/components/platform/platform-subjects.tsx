"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { platformFetch } from "@/lib/platform-auth";

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

export function PlatformSubjects() {
  const [subjects, setSubjects] = useState<PlatformSubjectRow[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCurriculum, setFormCurriculum] = useState("GENERAL");
  const [formLevel, setFormLevel] = useState("ALL");

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
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [loadSubjects]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading) void loadSubjects();
  }, [showArchived, loadSubjects, loading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.curriculum ?? "").toLowerCase().includes(q),
    );
  }, [subjects, query]);

  async function syncFromPackages() {
    setSyncing(true);
    setError("");
    try {
      await platformFetch("/platform/subjects/sync", { method: "POST" });
      await loadSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function createSubject() {
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
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function archiveSubject(id: string) {
    if (!confirm("Archive this platform subject?")) return;
    setError("");
    try {
      await platformFetch(`/platform/subjects/${id}/archive`, { method: "POST" });
      await loadSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed");
    }
  }

  if (loading) {
    return <p className="plat-loading">Loading subject repository…</p>;
  }

  return (
    <div className="plat-section plat-curriculum">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <header className="plat-section-hero plat-section-hero--curriculum">
        <div>
          <p className="plat-section-hero__eyebrow">Content & Curriculum Engine</p>
          <h2 className="plat-section-hero__title">Subject repository</h2>
          <p className="plat-section-hero__sub">
            Master subjects copied to schools on provision. Schools can customize
            copies; customized rows are not overwritten.
          </p>
        </div>
        <div className="plat-curriculum-hero-stat">
          <span className="plat-curriculum-hero-stat__value">{subjects.length}</span>
          <span className="plat-curriculum-hero-stat__label">Active subjects</span>
        </div>
      </header>

      <div className="plat-toolbar plat-curriculum-toolbar">
            <div className="plat-search">
              <DashIcon name="results" className="dash-icon--sm" />
              <input
                type="search"
                placeholder="Search subjects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="plat-curriculum-check">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
            <button
              type="button"
              className="plat-btn plat-btn--ghost"
              disabled={syncing}
              onClick={() => void syncFromPackages()}
            >
              {syncing ? "Syncing…" : "Sync from packages"}
            </button>
            <button
              type="button"
              className="plat-btn plat-btn--primary"
              onClick={() => setFormOpen((v) => !v)}
            >
              {formOpen ? "Cancel" : "New subject"}
            </button>
          </div>

          {formOpen ? (
            <div className="plat-curriculum-form">
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
                <option value="GENERAL">General</option>
                <option value="ETHIOPIAN_PRIVATE">Ethiopian</option>
                <option value="CAMBRIDGE">Cambridge</option>
                <option value="AMERICAN">American</option>
              </select>
              <select value={formLevel} onChange={(e) => setFormLevel(e.target.value)}>
                <option value="ALL">All levels</option>
                <option value="PRIMARY">Primary</option>
                <option value="SECONDARY">Secondary</option>
              </select>
              <button
                type="button"
                className="plat-btn plat-btn--primary"
                onClick={() => void createSubject()}
              >
                Save subject
              </button>
            </div>
          ) : null}

          <div className="plat-curriculum-table-wrap">
            <table className="plat-curriculum-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject</th>
                  <th>Curriculum</th>
                  <th>Level</th>
                  <th>Packages</th>
                  <th>Schools</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="plat-curriculum-table__empty">
                      No subjects found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className={s.isArchived ? "plat-row-muted" : ""}>
                      <td>
                        <code>{s.code}</code>
                      </td>
                      <td>
                        {s.icon ? <span aria-hidden>{s.icon} </span> : null}
                        {s.name}
                      </td>
                      <td>{s.curriculum ?? "—"}</td>
                      <td>{s.level ?? "All"}</td>
                      <td>{s._count.packageLinks}</td>
                      <td>{s._count.schoolSubjects}</td>
                      <td>
                        {!s.isArchived ? (
                          <button
                            type="button"
                            className="plat-btn plat-btn--ghost plat-btn--xs"
                            onClick={() => void archiveSubject(s.id)}
                          >
                            Archive
                          </button>
                        ) : (
                          <span className="plat-curriculum-badge plat-curriculum-badge--muted">
                            Archived
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
    </div>
  );
}
