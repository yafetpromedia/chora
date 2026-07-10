"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AcademicsAlert,
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { Announcement, apiFetch, apiPost } from "@/lib/api";
import { draftAnnouncement, getAiStatus } from "@/lib/ai";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function isThisWeek(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return date >= weekAgo;
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiConfigured, setAiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refresh() {
    setItems(await apiFetch<Announcement[]>("/announcements"));
  }

  useEffect(() => {
    void Promise.all([
      refresh(),
      getAiStatus()
        .then((s) => setAiConfigured(s.configured))
        .catch(() => setAiConfigured(false)),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const thisWeek = items.filter((item) => isThisWeek(item.createdAt)).length;
    const latest = items[0]?.createdAt ?? null;
    return {
      total: items.length,
      thisWeek,
      latest,
    };
  }, [items]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPosting(true);
    setError("");
    setSuccess("");
    try {
      await apiPost("/announcements", { title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      setAiPrompt("");
      setSuccess("Announcement published to your school.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }

  async function onAiDraft() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError("Describe the announcement you want the AI to draft.");
      return;
    }
    setDrafting(true);
    setError("");
    setSuccess("");
    try {
      const res = await draftAnnouncement({
        prompt,
        audience: "parents, teachers, and students",
      });
      setTitle(res.title);
      setBody(res.body);
      setSuccess("AI draft ready — review and publish when you're happy.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <DashboardPage role="admin" title="Announcements">
      <div className="ann-v2">
        <AcademicsHero
          title="School announcements"
          subtitle={
            stats.total > 0
              ? `${stats.total} published update${stats.total === 1 ? "" : "s"} · visible to parents, teachers, and students on their dashboards`
              : "Publish updates for parents, teachers, and students across your school workspace."
          }
          stats={[
            { label: "Published", value: loading ? "—" : stats.total },
            { label: "This week", value: loading ? "—" : stats.thisWeek },
            {
              label: "Latest post",
              value: loading || !stats.latest ? "—" : formatDate(stats.latest),
            },
            {
              label: "AI drafts",
              value: loading ? "—" : aiConfigured ? "Ready" : "Off",
            },
          ]}
          badges={
            <>
              <AcademicsBadge variant="live">Live to school</AcademicsBadge>
              {aiConfigured ? (
                <span className="ann-v2__hero-badge ann-v2__hero-badge--ai">AI assistant on</span>
              ) : null}
            </>
          }
        />

        {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}
        {success ? (
          <p className="ann-v2__alert ann-v2__alert--ok" role="status">
            {success}
          </p>
        ) : null}

        <div className="ann-v2__toolbar">
          <div className="ann-v2__audience" aria-label="Audience">
            <span className="ann-v2__audience-pill">Parents</span>
            <span className="ann-v2__audience-pill">Teachers</span>
            <span className="ann-v2__audience-pill">Students</span>
          </div>
          <p className="ann-v2__toolbar-note">
            Posts appear on role dashboards after you publish.
          </p>
        </div>

        <div className="ann-v2__grid">
          <article className="ann-v2__card">
            <div className="ann-v2__card-head">
              <span className="ann-v2__card-icon" aria-hidden>
                <DashIcon name="announcements" className="dash-icon--sm" />
              </span>
              <div>
                <h3 className="ann-v2__card-title">Compose announcement</h3>
                <p className="ann-v2__card-sub">
                  Write a clear title and message. Use AI to draft from a short brief.
                </p>
              </div>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="ann-v2__form">
              {aiConfigured ? (
                <div className="ann-v2__ai-box">
                  <div className="ann-v2__ai-head">
                    <span className="ann-v2__ai-label">Draft with AI</span>
                    <span className="ann-v2__ai-badge">Powered by AI</span>
                  </div>
                  <textarea
                    className="ann-v2__textarea"
                    placeholder="e.g. School closed Friday for staff training; buses run as usual Monday…"
                    rows={2}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <div className="ann-v2__actions">
                    <button
                      type="button"
                      className="ann-v2__btn ann-v2__btn--ghost"
                      disabled={drafting}
                      onClick={() => void onAiDraft()}
                    >
                      {drafting ? "Drafting…" : "Generate draft"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="ann-v2__field">
                <label className="ann-v2__label" htmlFor="ann-title">
                  Title
                </label>
                <input
                  id="ann-title"
                  className="ann-v2__input"
                  placeholder="e.g. School closed Friday"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="ann-v2__field">
                <label className="ann-v2__label" htmlFor="ann-body">
                  Message
                </label>
                <textarea
                  id="ann-body"
                  className="ann-v2__textarea"
                  placeholder="Message for parents and staff…"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>

              <div className="ann-v2__actions">
                <button type="submit" className="ann-v2__btn ann-v2__btn--primary" disabled={posting}>
                  {posting ? "Publishing…" : "Publish announcement"}
                </button>
              </div>
            </form>
          </article>

          <article className="ann-v2__card">
            <div className="ann-v2__card-head">
              <span className="ann-v2__card-icon ann-v2__card-icon--feed" aria-hidden>
                <DashIcon name="calendar" className="dash-icon--sm" />
              </span>
              <div>
                <h3 className="ann-v2__card-title">Published feed</h3>
                <p className="ann-v2__card-sub">
                  Recent announcements your school has sent out.
                </p>
              </div>
              <span className="ann-v2__card-count">{items.length}</span>
            </div>

            {loading ? (
              <div className="ann-v2__loading" aria-busy="true">
                <span className="ann-v2__loading-spinner" aria-hidden />
                <p>Loading announcements…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="ann-v2__empty">
                <p className="ann-v2__empty-title">No announcements yet</p>
                <p className="ann-v2__empty-sub">
                  Your first post will show up here and on parent, teacher, and student dashboards.
                </p>
              </div>
            ) : (
              <div className="ann-v2__feed">
                {items.map((item) => (
                  <article key={item.id} className="ann-v2__item">
                    <div className="ann-v2__item-head">
                      <h4 className="ann-v2__item-title">{item.title}</h4>
                      <time className="ann-v2__item-date" dateTime={item.createdAt}>
                        {formatDate(item.createdAt)}
                      </time>
                    </div>
                    <p className="ann-v2__item-body">{item.body}</p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </DashboardPage>
  );
}
