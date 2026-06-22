"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { platformFetch } from "@/lib/platform-auth";

type PackageRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  gradePreset: string | null;
  schoolType: string | null;
  isBlank: boolean;
  sortOrder: number;
  _count: {
    subjects: number;
    departments: number;
    libraryItems: number;
    templates: number;
  };
};

type PackageDetail = PackageRow & {
  subjects: { code: string; name: string; level: string | null }[];
  departments: { name: string }[];
  libraryItems: {
    title: string;
    categorySlug: string;
    resourceType: string;
    subject?: string | null;
  }[];
  templates: { key: string; name: string; channel: string; body: string }[];
};

type DetailTab = "overview" | "subjects" | "structure" | "library" | "templates";

const DEFAULT_KEY = "ETHIOPIAN_PRIVATE";

function formatPreset(value: string | null) {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSchoolType(value: string | null) {
  if (!value) return "—";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function packageAccent(key: string) {
  switch (key) {
    case "ETHIOPIAN_PRIVATE":
      return { icon: "🇪🇹", tone: "ethiopian" };
    case "CAMBRIDGE":
      return { icon: "🎓", tone: "cambridge" };
    case "AMERICAN":
      return { icon: "🇺🇸", tone: "american" };
    case "BLANK":
      return { icon: "📋", tone: "blank" };
    default:
      return { icon: "📦", tone: "default" };
  }
}

function resourceLabel(type: string) {
  return type.replace(/_/g, " ").toLowerCase();
}

export function PlatformCurriculum() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [query, setQuery] = useState("");
  const [subjectQ, setSubjectQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [catalogSyncing, setCatalogSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await platformFetch<PackageRow[]>("/platform/curriculum-packages");
      setPackages(rows);
      setSelectedKey((prev) => prev ?? rows[0]?.key ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedKey) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setTab("overview");
    setSubjectQ("");
    void platformFetch<PackageDetail>(`/platform/curriculum-packages/${selectedKey}`)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load package"),
      )
      .finally(() => setDetailLoading(false));
  }, [selectedKey]);

  const filteredPackages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q),
    );
  }, [packages, query]);

  const totals = useMemo(() => {
    return packages.reduce(
      (acc, p) => ({
        subjects: acc.subjects + p._count.subjects,
        library: acc.library + p._count.libraryItems,
        templates: acc.templates + p._count.templates,
      }),
      { subjects: 0, library: 0, templates: 0 },
    );
  }, [packages]);

  const filteredSubjects = useMemo(() => {
    if (!detail) return [];
    const q = subjectQ.trim().toLowerCase();
    if (!q) return detail.subjects;
    return detail.subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q),
    );
  }, [detail, subjectQ]);

  const templatesByChannel = useMemo(() => {
    if (!detail) return new Map<string, PackageDetail["templates"]>();
    const map = new Map<string, PackageDetail["templates"]>();
    for (const t of detail.templates) {
      const list = map.get(t.channel) ?? [];
      list.push(t);
      map.set(t.channel, list);
    }
    return map;
  }, [detail]);

  useEffect(() => {
    if (!detail) return;
    setEditLabel(detail.label);
    setEditDescription(detail.description ?? "");
  }, [detail]);

  async function savePackageMeta() {
    if (!detail) return;
    setError("");
    try {
      await platformFetch(`/platform/curriculum-packages/${detail.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: editLabel.trim(),
          description: editDescription.trim() || null,
        }),
      });
      setEditingMeta(false);
      await load();
      const refreshed = await platformFetch<PackageDetail>(
        `/platform/curriculum-packages/${detail.key}`,
      );
      setDetail(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function syncCatalog() {
    setCatalogSyncing(true);
    setError("");
    try {
      await platformFetch("/platform/catalog/sync", { method: "POST" });
      await load();
      if (selectedKey) {
        const refreshed = await platformFetch<PackageDetail>(
          `/platform/curriculum-packages/${selectedKey}`,
        );
        setDetail(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog sync failed");
    } finally {
      setCatalogSyncing(false);
    }
  }

  async function copyKey() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const tabs: { id: DetailTab; label: string; count?: number }[] = detail
    ? [
        { id: "overview", label: "Overview" },
        {
          id: "subjects",
          label: "Subjects",
          count: detail.subjects.length,
        },
        {
          id: "structure",
          label: "Structure",
          count: detail.departments.length,
        },
        {
          id: "library",
          label: "eLibrary",
          count: detail.libraryItems.length,
        },
        {
          id: "templates",
          label: "Templates",
          count: detail.templates.length,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="plat-curriculum plat-curriculum--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton-row">
          <div className="plat-curriculum__skeleton" />
          <div className="plat-curriculum__skeleton" />
          <div className="plat-curriculum__skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="plat-section plat-curriculum">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <header className="plat-section-hero plat-section-hero--curriculum">
        <div>
          <p className="plat-section-hero__eyebrow">Content distribution</p>
          <h2 className="plat-section-hero__title">Curriculum packages</h2>
          <p className="plat-section-hero__sub">
            Starter packs provision new schools with subjects, grades, eLibrary
            items, and templates — each tenant gets an editable copy.
          </p>
        </div>
        <div className="plat-curriculum-hero-stat">
          <span className="plat-curriculum-hero-stat__value">{packages.length}</span>
          <span className="plat-curriculum-hero-stat__label">Active packages</span>
        </div>
      </header>

      <div className="plat-curriculum-kpis">
        <div className="plat-curriculum-kpi">
          <span className="plat-curriculum-kpi__icon" aria-hidden>
            📚
          </span>
          <div>
            <strong>{totals.subjects}</strong>
            <span>Master subjects</span>
          </div>
        </div>
        <div className="plat-curriculum-kpi">
          <span className="plat-curriculum-kpi__icon" aria-hidden>
            🗂️
          </span>
          <div>
            <strong>{totals.library}</strong>
            <span>eLibrary starters</span>
          </div>
        </div>
        <div className="plat-curriculum-kpi">
          <span className="plat-curriculum-kpi__icon" aria-hidden>
            ✉️
          </span>
          <div>
            <strong>{totals.templates}</strong>
            <span>Templates</span>
          </div>
        </div>
      </div>

      <div className="plat-toolbar plat-curriculum-toolbar">
        <div className="plat-search">
          <DashIcon name="results" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search packages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search curriculum packages"
          />
        </div>
        <button
          type="button"
          className="plat-btn plat-btn--ghost"
          disabled={catalogSyncing}
          onClick={() => void syncCatalog()}
        >
          {catalogSyncing ? "Syncing…" : "Sync catalog"}
        </button>
        <button
          type="button"
          className="plat-btn plat-btn--ghost"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className="plat-curriculum-workspace">
        <aside className="plat-curriculum-sidebar" aria-label="Packages">
          {filteredPackages.length === 0 ? (
            <p className="plat-empty">No packages match your search.</p>
          ) : (
            filteredPackages.map((p) => {
              const accent = packageAccent(p.key);
              const active = selectedKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  className={`plat-curriculum-card plat-curriculum-card--${accent.tone}${
                    active ? " plat-curriculum-card--active" : ""
                  }`}
                  onClick={() => setSelectedKey(p.key)}
                >
                  <span className="plat-curriculum-card__icon" aria-hidden>
                    {accent.icon}
                  </span>
                  <span className="plat-curriculum-card__body">
                    <span className="plat-curriculum-card__title">{p.label}</span>
                    <span className="plat-curriculum-card__key">{p.key}</span>
                    {p.key === DEFAULT_KEY ? (
                      <span className="plat-curriculum-badge plat-curriculum-badge--default">
                        Default for signup
                      </span>
                    ) : null}
                    {p.isBlank ? (
                      <span className="plat-curriculum-badge plat-curriculum-badge--muted">
                        Manual setup
                      </span>
                    ) : (
                      <span className="plat-curriculum-card__metrics">
                        <span>{p._count.subjects} subjects</span>
                        <span>{p._count.libraryItems} library</span>
                      </span>
                    )}
                  </span>
                  <DashIcon name="chevron" className="plat-curriculum-card__chev" />
                </button>
              );
            })
          )}
        </aside>

        <main className="plat-curriculum-main">
          {!detail && !detailLoading ? (
            <div className="plat-curriculum-empty">
              <p>Select a package to manage its catalog.</p>
            </div>
          ) : null}

          {detailLoading ? (
            <div className="plat-curriculum-main__loading">
              <div className="plat-curriculum__skeleton plat-curriculum__skeleton--panel" />
            </div>
          ) : null}

          {detail && !detailLoading ? (
            <>
              <header className="plat-curriculum-main__head">
                <div className="plat-curriculum-main__title-row">
                  <span className="plat-curriculum-main__icon" aria-hidden>
                    {packageAccent(detail.key).icon}
                  </span>
                  <div>
                    <h3>{detail.label}</h3>
                    {detail.description ? <p>{detail.description}</p> : null}
                  </div>
                </div>
                <div className="plat-curriculum-main__actions">
                  {!detail.isBlank ? (
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--xs"
                      onClick={() => setEditingMeta((v) => !v)}
                    >
                      {editingMeta ? "Cancel edit" : "Edit package"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="plat-btn plat-btn--ghost plat-btn--xs"
                    onClick={() => void copyKey()}
                  >
                    {copied ? "Copied" : "Copy package key"}
                  </button>
                </div>
              </header>

              {editingMeta && !detail.isBlank ? (
                <div className="plat-curriculum-form plat-curriculum-form--meta">
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Package label"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    rows={2}
                  />
                  <button
                    type="button"
                    className="plat-btn plat-btn--primary plat-btn--xs"
                    onClick={() => void savePackageMeta()}
                  >
                    Save package
                  </button>
                </div>
              ) : null}

              {detail.isBlank ? (
                <div className="plat-curriculum-blank">
                  <strong>Blank provisioning</strong>
                  <p>
                    New schools get no subjects, grades, or library content until
                    the admin completes setup manually.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="plat-filter-tabs plat-curriculum-tabs"
                    role="tablist"
                  >
                    {tabs.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`plat-filter-tab${
                          tab === t.id ? " plat-filter-tab--active" : ""
                        }`}
                        onClick={() => setTab(t.id)}
                      >
                        {t.label}
                        {t.count != null && t.count > 0 ? (
                          <span className="plat-filter-count">{t.count}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>

                  <div className="plat-curriculum-panel">
                    {tab === "overview" ? (
                      <div className="plat-curriculum-overview">
                        <div className="plat-curriculum-overview__cards">
                          <div className="plat-curriculum-mini">
                            <span className="plat-curriculum-mini__label">
                              Grade structure
                            </span>
                            <strong>{formatPreset(detail.gradePreset)}</strong>
                          </div>
                          <div className="plat-curriculum-mini">
                            <span className="plat-curriculum-mini__label">
                              School type
                            </span>
                            <strong>{formatSchoolType(detail.schoolType)}</strong>
                          </div>
                          <div className="plat-curriculum-mini">
                            <span className="plat-curriculum-mini__label">
                              Package key
                            </span>
                            <strong className="plat-curriculum-mini__mono">
                              {detail.key}
                            </strong>
                          </div>
                        </div>
                        <ul className="plat-curriculum-checklist">
                          <li>
                            <span>Subjects copied to tenant</span>
                            <strong>{detail.subjects.length}</strong>
                          </li>
                          <li>
                            <span>Departments</span>
                            <strong>{detail.departments.length}</strong>
                          </li>
                          <li>
                            <span>eLibrary starters published</span>
                            <strong>{detail.libraryItems.length}</strong>
                          </li>
                          <li>
                            <span>Message & teacher templates</span>
                            <strong>{detail.templates.length}</strong>
                          </li>
                          <li>
                            <span>Academic year + semesters</span>
                            <strong>Auto</strong>
                          </li>
                          <li>
                            <span>Grading scale A–F</span>
                            <strong>Auto</strong>
                          </li>
                        </ul>
                      </div>
                    ) : null}

                    {tab === "subjects" ? (
                      <div className="plat-curriculum-tab-body">
                        <div className="plat-search plat-search--compact">
                          <input
                            type="search"
                            placeholder="Filter subjects…"
                            value={subjectQ}
                            onChange={(e) => setSubjectQ(e.target.value)}
                            aria-label="Filter subjects"
                          />
                        </div>
                        <div className="plat-curriculum-table-wrap">
                          <table className="plat-curriculum-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Subject</th>
                                <th>Level</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSubjects.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="plat-curriculum-table__empty">
                                    No subjects match.
                                  </td>
                                </tr>
                              ) : (
                                filteredSubjects.map((s) => (
                                  <tr key={s.code}>
                                    <td>
                                      <code>{s.code}</code>
                                    </td>
                                    <td>{s.name}</td>
                                    <td>
                                      {s.level ? (
                                        <span className="plat-curriculum-level">
                                          {s.level}
                                        </span>
                                      ) : (
                                        "All"
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {tab === "structure" ? (
                      <div className="plat-curriculum-tab-body">
                        <p className="plat-curriculum-tab-hint">
                          Departments are created for each provisioned school.
                        </p>
                        <div className="plat-curriculum-dept-grid">
                          {detail.departments.map((d) => (
                            <div key={d.name} className="plat-curriculum-dept">
                              <span className="plat-curriculum-dept__icon">🏛️</span>
                              <span>{d.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {tab === "library" ? (
                      <div className="plat-curriculum-tab-body">
                        <div className="plat-curriculum-table-wrap">
                          <table className="plat-curriculum-table">
                            <thead>
                              <tr>
                                <th>Resource</th>
                                <th>Category</th>
                                <th>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.libraryItems.map((r) => (
                                <tr key={r.title}>
                                  <td>{r.title}</td>
                                  <td>
                                    <span className="plat-curriculum-pill">
                                      {r.categorySlug}
                                    </span>
                                  </td>
                                  <td className="plat-curriculum-table__muted">
                                    {resourceLabel(r.resourceType)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {tab === "templates" ? (
                      <div className="plat-curriculum-tab-body plat-curriculum-templates">
                        {[...templatesByChannel.entries()].map(([channel, items]) => (
                          <section key={channel} className="plat-curriculum-template-group">
                            <h4>{channel}</h4>
                            <ul>
                              {items.map((t) => (
                                <li key={t.key}>
                                  <div className="plat-curriculum-template-card">
                                    <strong>{t.name}</strong>
                                    <code>{t.key}</code>
                                    <pre>{t.body}</pre>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
