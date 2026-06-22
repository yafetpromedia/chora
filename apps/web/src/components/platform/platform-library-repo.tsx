"use client";

import { useCallback, useEffect, useState } from "react";
import { platformFetch } from "@/lib/platform-auth";

type ResourceRow = {
  id: string;
  title: string;
  resourceType: string;
  subject: string | null;
  gradeLabel: string | null;
  category: { slug: string; name: string; icon: string | null };
  _count: { schoolResources: number; packageLinks: number };
};

export function PlatformLibraryRepo() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await platformFetch<ResourceRow[]>("/platform/library/resources");
      setResources(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncContent() {
    setSyncing(true);
    try {
      await platformFetch("/platform/content/sync", { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <p className="plat-loading">Loading eLibrary repository…</p>;

  return (
    <div className="plat-section plat-curriculum">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      <header className="plat-section-hero plat-section-hero--curriculum">
        <div>
          <p className="plat-section-hero__eyebrow">Content & Curriculum Engine</p>
          <h2 className="plat-section-hero__title">eLibrary repository</h2>
          <p className="plat-section-hero__sub">
            Master resources inherited by schools when a curriculum package is provisioned.
          </p>
        </div>
        <div className="plat-curriculum-hero-stat">
          <span className="plat-curriculum-hero-stat__value">{resources.length}</span>
          <span className="plat-curriculum-hero-stat__label">Resources</span>
        </div>
      </header>
      <div className="plat-toolbar">
        <button
          type="button"
          className="plat-btn plat-btn--ghost"
          disabled={syncing}
          onClick={() => void syncContent()}
        >
          {syncing ? "Syncing…" : "Sync from packages"}
        </button>
      </div>
      <div className="plat-curriculum-table-wrap">
        <table className="plat-curriculum-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th>Grade</th>
              <th>Schools</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>
                  {r.category.icon} {r.category.name}
                </td>
                <td className="plat-curriculum-table__muted">{r.resourceType}</td>
                <td>{r.gradeLabel ?? "—"}</td>
                <td>{r._count.schoolResources}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
