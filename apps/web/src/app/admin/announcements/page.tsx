"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { Announcement, apiFetch, apiPost } from "@/lib/api";
import { draftAnnouncement, getAiStatus } from "@/lib/ai";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

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
  const { t, tp } = useLocale();
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
    let cancelled = false;
    void Promise.all([
      apiFetch<Announcement[]>("/announcements").then((data) => {
        if (!cancelled) setItems(data);
      }),
      getAiStatus()
        .then((s) => {
          if (!cancelled) setAiConfigured(s.configured);
        })
        .catch(() => {
          if (!cancelled) setAiConfigured(false);
        }),
    ])
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t("announcementsUi.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      setSuccess(t("announcementsUi.publishedSuccess"));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("announcementsUi.postFailed"));
    } finally {
      setPosting(false);
    }
  }

  async function onAiDraft() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError(t("announcementsUi.aiPromptRequired"));
      return;
    }
    if (prompt.length > 4000) {
      setError(t("announcementsUi.aiPromptTooLong"));
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
      setSuccess(t("announcementsUi.aiDraftReady"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("announcementsUi.aiDraftFailed"));
    } finally {
      setDrafting(false);
    }
  }

  return (
    <DashboardPage role="admin" title={tp("Announcements")}>
      <div className="ann-v2">
        <AcademicsHero
          title={t("announcementsUi.title")}
          subtitle={
            stats.total > 0
              ? t("announcementsUi.subtitleWithCount", {
                  count: stats.total,
                  plural: stats.total === 1 ? "" : "s",
                })
              : t("announcementsUi.subtitleEmpty")
          }
          stats={[
            { label: t("announcementsUi.statPublished"), value: loading ? "—" : stats.total },
            { label: t("announcementsUi.statThisWeek"), value: loading ? "—" : stats.thisWeek },
            {
              label: t("announcementsUi.statLatest"),
              value: loading || !stats.latest ? "—" : formatDate(stats.latest),
            },
            {
              label: t("announcementsUi.statAiDrafts"),
              value: loading
                ? "—"
                : aiConfigured
                  ? t("announcementsUi.statReady")
                  : t("announcementsUi.statOff"),
            },
          ]}
          badges={
            <>
              <AcademicsBadge variant="live">{t("announcementsUi.badgeLive")}</AcademicsBadge>
              {aiConfigured ? (
                <span className="ann-v2__hero-badge ann-v2__hero-badge--ai">
                  {t("announcementsUi.badgeAiOn")}
                </span>
              ) : null}
            </>
          }
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

        <div className="ann-v2__toolbar">
          <div className="ann-v2__audience" aria-label={t("announcementsUi.audienceAria")}>
            <span className="ann-v2__audience-pill">{t("announcementsUi.audienceParents")}</span>
            <span className="ann-v2__audience-pill">{t("announcementsUi.audienceTeachers")}</span>
            <span className="ann-v2__audience-pill">{t("announcementsUi.audienceStudents")}</span>
          </div>
          <p className="ann-v2__toolbar-note">{t("announcementsUi.toolbarNote")}</p>
        </div>

        <div className="ann-v2__grid">
          <article className="ann-v2__card">
            <div className="ann-v2__card-head">
              <span className="ann-v2__card-icon" aria-hidden>
                <DashIcon name="announcements" className="dash-icon--sm" />
              </span>
              <div>
                <h3 className="ann-v2__card-title">{t("announcementsUi.composeTitle")}</h3>
                <p className="ann-v2__card-sub">{t("announcementsUi.composeSub")}</p>
              </div>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="ann-v2__form">
              {aiConfigured ? (
                <div className="ann-v2__ai-box">
                  <div className="ann-v2__ai-head">
                    <span className="ann-v2__ai-label">{t("announcementsUi.aiDraftLabel")}</span>
                    <span className="ann-v2__ai-badge">{t("announcementsUi.aiPowered")}</span>
                  </div>
                  <textarea
                    className="ann-v2__textarea"
                    placeholder={t("announcementsUi.aiPlaceholder")}
                    rows={3}
                    maxLength={4000}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <div className="ann-v2__actions">
                    <span className="ann-v2__ai-count" aria-live="polite">
                      {t("announcementsUi.aiChars", {
                        count: aiPrompt.trim().length,
                      })}
                    </span>
                    <button
                      type="button"
                      className="ann-v2__btn ann-v2__btn--ghost"
                      disabled={drafting || aiPrompt.trim().length < 3}
                      onClick={() => void onAiDraft()}
                    >
                      {drafting ? t("announcementsUi.drafting") : t("announcementsUi.generateDraft")}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="ann-v2__field">
                <label className="ann-v2__label" htmlFor="ann-title">
                  {t("announcementsUi.fieldTitle")}
                </label>
                <input
                  id="ann-title"
                  className="ann-v2__input"
                  placeholder={t("announcementsUi.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="ann-v2__field">
                <label className="ann-v2__label" htmlFor="ann-body">
                  {t("announcementsUi.fieldMessage")}
                </label>
                <textarea
                  id="ann-body"
                  className="ann-v2__textarea"
                  placeholder={t("announcementsUi.messagePlaceholder")}
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>

              <div className="ann-v2__actions">
                <button type="submit" className="ann-v2__btn ann-v2__btn--primary" disabled={posting}>
                  {posting ? t("announcementsUi.publishing") : t("announcementsUi.publish")}
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
                <h3 className="ann-v2__card-title">{t("announcementsUi.feedTitle")}</h3>
                <p className="ann-v2__card-sub">{t("announcementsUi.feedSub")}</p>
              </div>
              <span className="ann-v2__card-count">{items.length}</span>
            </div>

            {loading ? (
              <div className="ann-v2__loading" aria-busy="true">
                <span className="ann-v2__loading-spinner" aria-hidden />
                <p>{t("announcementsUi.loadingFeed")}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="ann-v2__empty">
                <p className="ann-v2__empty-title">{t("announcementsUi.emptyTitle")}</p>
                <p className="ann-v2__empty-sub">{t("announcementsUi.emptySub")}</p>
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
