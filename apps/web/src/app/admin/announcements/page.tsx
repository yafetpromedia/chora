"use client";

import { FormEvent, useEffect, useState } from "react";
import { Announcement, apiFetch, apiPost } from "@/lib/api";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setItems(await apiFetch<Announcement[]>("/announcements"));
  }

  useEffect(() => {
    void refresh()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPosting(true);
    setError("");
    try {
      await apiPost("/announcements", { title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Announcements"
      eyebrow="Communication"
    >
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <form onSubmit={(e) => void onSubmit(e)} className="dash-form-card">
        <h3 className="dash-form-card-title">New announcement</h3>
        <input
          className="auth-input auth-input--login auth-input--login-plain"
          placeholder="Title — e.g. School closed Friday"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="auth-input auth-input--login auth-input--login-plain dash-textarea"
          placeholder="Message for parents and staff…"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <button type="submit" className="auth-page-submit" disabled={posting}>
          {posting ? "Publishing…" : "Publish announcement"}
        </button>
      </form>

      <section className="dash-panel dash-panel--flat">
        <div className="dash-panel-head">
          <h3 className="dash-panel-title">Recent</h3>
          <span className="dash-panel-badge">{items.length}</span>
        </div>
        {loading ? (
          <p className="setup-hint">Loading…</p>
        ) : items.length === 0 ? (
          <div className="dash-empty">
            <p>No announcements yet. Post your first one above.</p>
          </div>
        ) : (
          <ul className="dash-list">
            {items.map((item) => (
              <li key={item.id} className="dash-list-item dash-list-item--stack">
                <div>
                  <p className="dash-list-title">{item.title}</p>
                  <p className="dash-list-meta">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                  <p className="dash-announce-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardPage>
  );
}
