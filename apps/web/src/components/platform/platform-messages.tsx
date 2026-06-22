"use client";

import { useCallback, useEffect, useState } from "react";
import { platformFetch } from "@/lib/platform-auth";

type TemplateRow = {
  id: string;
  key: string;
  name: string;
  channel: string;
  body: string;
  _count: { packageLinks: number; schoolTemplates: number };
};

export function PlatformMessages() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await platformFetch<TemplateRow[]>("/platform/message-templates");
      setTemplates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="plat-loading">Loading communication templates…</p>;

  return (
    <div className="plat-section plat-curriculum">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      <header className="plat-section-hero plat-section-hero--curriculum">
        <div>
          <p className="plat-section-hero__eyebrow">Content & Curriculum Engine</p>
          <h2 className="plat-section-hero__title">Communication templates</h2>
          <p className="plat-section-hero__sub">
            SMS, email, and teacher templates copied to every provisioned school.
          </p>
        </div>
        <div className="plat-curriculum-hero-stat">
          <span className="plat-curriculum-hero-stat__value">{templates.length}</span>
          <span className="plat-curriculum-hero-stat__label">Templates</span>
        </div>
      </header>
      <div className="plat-curriculum-templates">
        {templates.map((t) => (
          <section key={t.id} className="plat-curriculum-template-group">
            <h4>
              {t.name}{" "}
              <span className="plat-curriculum-pill">{t.channel}</span>
            </h4>
            <code>{t.key}</code>
            <p className="plat-curriculum-tab-hint">
              Used in {t._count.packageLinks} package(s) · {t._count.schoolTemplates}{" "}
              school copy(ies)
            </p>
            <pre>{t.body}</pre>
          </section>
        ))}
      </div>
    </div>
  );
}
