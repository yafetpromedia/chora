"use client";

import { useCallback, useEffect, useState } from "react";
import { platformFetch } from "@/lib/platform-auth";

type StructureRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  gradePreset: string;
  _count: { packages: number };
};

export function PlatformStructures() {
  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await platformFetch<StructureRow[]>("/platform/academic-structures");
      setStructures(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="plat-loading">Loading academic structures…</p>;

  return (
    <div className="plat-section plat-curriculum">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      <header className="plat-section-hero plat-section-hero--curriculum">
        <div>
          <p className="plat-section-hero__eyebrow">Content & Curriculum Engine</p>
          <h2 className="plat-section-hero__title">Academic structures</h2>
          <p className="plat-section-hero__sub">
            Grade presets applied when a school selects a curriculum package.
          </p>
        </div>
      </header>
      <div className="plat-curriculum-dept-grid">
        {structures.map((s) => (
          <div key={s.id} className="plat-curriculum-dept">
            <span className="plat-curriculum-dept__icon">🏫</span>
            <div>
              <strong>{s.label}</strong>
              <p className="plat-curriculum-tab-hint">
                <code>{s.key}</code> · {s.gradePreset.replace(/_/g, " ")}
              </p>
              {s.description ? <p>{s.description}</p> : null}
              <p className="plat-curriculum-tab-hint">
                {s._count.packages} package(s) linked
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
