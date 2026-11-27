"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  handlePlatformAuthFailure,
  platformFetch,
} from "@/lib/platform-auth";

type TemplateRow = {
  id: string;
  key: string;
  name: string;
  channel: string;
  body: string;
  isArchived: boolean;
  _count: { packageLinks: number; schoolTemplates: number };
};

function templatePreview(body: string, max = 120) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}…`;
}

export function PlatformMessages() {
  const { t } = useLocale();
  const router = useRouter();
  const TEMPLATE_CHANNELS: {
    value: string;
    label: string;
    icon: DashIconName;
  }[] = [
    { value: "SMS", label: t("platformUi.channelParentSms"), icon: "message" },
    { value: "EMAIL", label: t("platformUi.channelEmail"), icon: "mail" },
    { value: "TEACHER", label: t("platformUi.channelTeacher"), icon: "teachers" },
  ];
  function templateChannelMeta(channel: string) {
    return (
      TEMPLATE_CHANNELS.find((c) => c.value === channel) ?? {
        value: channel,
        label: channel,
        icon: "templates" as DashIconName,
      }
    );
  }
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [formChannel, setFormChannel] = useState("SMS");
  const [formBody, setFormBody] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editChannel, setEditChannel] = useState("SMS");
  const [editBody, setEditBody] = useState("");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const loadTemplates = useCallback(async () => {
    const rows = await platformFetch<TemplateRow[]>(
      `/platform/message-templates?includeArchived=${showArchived}`,
    );
    setTemplates(rows);
  }, [showArchived]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadTemplates();
    } catch (err) {
      fail(err, t("platformUi.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [loadTemplates, router]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!loading) queueMicrotask(() => void loadTemplates());
  }, [showArchived, loadTemplates, loading]);

  const stats = useMemo(() => {
    const active = templates.filter((row) => !row.isArchived);
    const byChannel = (ch: string) => active.filter((row) => row.channel === ch).length;
    return {
      active: active.length,
      archived: templates.filter((row) => row.isArchived).length,
      inPackages: active.reduce((sum, row) => sum + row._count.packageLinks, 0),
      inSchools: active.reduce((sum, row) => sum + row._count.schoolTemplates, 0),
      sms: byChannel("SMS"),
      email: byChannel("EMAIL"),
      teacher: byChannel("TEACHER"),
    };
  }, [templates]);

  const channelCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of templates.filter((x) => !x.isArchived)) {
      map.set(row.channel, (map.get(row.channel) ?? 0) + 1);
    }
    return map;
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((row) => {
      if (channelFilter !== "ALL" && row.channel !== channelFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.key.toLowerCase().includes(q) ||
        row.body.toLowerCase().includes(q)
      );
    });
  }, [templates, query, channelFilter]);

  async function createTemplate() {
    if (!formKey.trim() || !formName.trim() || !formBody.trim()) return;
    setBusy(true);
    setError("");
    try {
      await platformFetch("/platform/message-templates", {
        method: "POST",
        body: JSON.stringify({
          key: formKey.trim(),
          name: formName.trim(),
          channel: formChannel,
          body: formBody.trim(),
        }),
      });
      setFormOpen(false);
      setFormKey("");
      setFormName("");
      setFormChannel("SMS");
      setFormBody("");
      await loadTemplates();
    } catch (err) {
      fail(err, t("platformUi.createFailed"));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: TemplateRow) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditChannel(row.channel);
    setEditBody(row.body);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId || !editName.trim() || !editBody.trim()) return;
    setBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/message-templates/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          channel: editChannel,
          body: editBody.trim(),
        }),
      });
      cancelEdit();
      await loadTemplates();
    } catch (err) {
      fail(err, t("platformUi.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function archiveTemplate(id: string) {
    if (!confirm(t("platformUi.msgArchiveConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/message-templates/${id}/archive`, {
        method: "POST",
      });
      if (editingId === id) cancelEdit();
      await loadTemplates();
    } catch (err) {
      fail(err, t("platformUi.archiveFailed"));
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
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-templates-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="templates" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.contentEngineEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.msgTitle")}</h2>
            <p className="plat-subjects-v2__sub">
              {t("platformUi.msgSub")}
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.active}</strong>
            <span>{t("platformUi.msgStatTemplates")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.inPackages}</strong>
            <span>{t("platformUi.msgStatInPackages")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.inSchools}</strong>
            <span>{t("platformUi.msgStatInSchools")}</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="message" className="dash-icon--sm" />
          <div>
            <strong>{stats.sms}</strong>
            <span>{t("platformUi.channelParentSms")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="mail" className="dash-icon--sm" />
          <div>
            <strong>{stats.email}</strong>
            <span>{t("platformUi.channelEmail")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="teachers" className="dash-icon--sm" />
          <div>
            <strong>{stats.teacher}</strong>
            <span>{t("platformUi.channelTeacher")}</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="templates" className="dash-icon--sm" />
          <input
            type="search"
            placeholder={t("platformUi.msgSearchPh")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("platformUi.msgSearchAria")}
          />
        </div>
        <div className="plat-filter-tabs plat-templates-v2__channels" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={channelFilter === "ALL"}
            className={`plat-filter-tab${
              channelFilter === "ALL" ? " plat-filter-tab--active" : ""
            }`}
            onClick={() => setChannelFilter("ALL")}
          >
            {t("common.all")}
            <span className="plat-filter-count">{stats.active}</span>
          </button>
          {TEMPLATE_CHANNELS.map((c) => (
            <button
              key={c.value}
              type="button"
              role="tab"
              aria-selected={channelFilter === c.value}
              className={`plat-filter-tab${
                channelFilter === c.value ? " plat-filter-tab--active" : ""
              }`}
              onClick={() => setChannelFilter(c.value)}
            >
              <DashIcon
                name={c.icon}
                className="dash-icon--xs plat-templates-v2__tab-icon"
              />
              {c.label}
              {(channelCounts.get(c.value) ?? 0) > 0 ? (
                <span className="plat-filter-count">{channelCounts.get(c.value)}</span>
              ) : null}
            </button>
          ))}
        </div>
        <label className="plat-subjects-v2__check">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          {t("platformUi.showArchived")}
        </label>
        <button
          type="button"
          className="plat-v2__btn plat-v2__btn--primary"
          onClick={() => setFormOpen((v) => !v)}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          {formOpen ? t("common.cancel") : t("platformUi.newTemplate")}
        </button>
      </div>

      {formOpen ? (
        <div className="plat-curriculum-form plat-templates-v2__create">
          <input
            placeholder={t("platformUi.msgKeyPh")}
            value={formKey}
            onChange={(e) =>
              setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
            }
          />
          <input
            placeholder={t("platformUi.msgDisplayName")}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <select value={formChannel} onChange={(e) => setFormChannel(e.target.value)}>
            {TEMPLATE_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <textarea
            placeholder={t("platformUi.msgBodyPh")}
            rows={6}
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
          />
          <button
            type="button"
            className="plat-btn plat-btn--primary"
            disabled={busy || !formKey.trim() || !formName.trim() || !formBody.trim()}
            onClick={() => void createTemplate()}
          >
            {busy ? t("platformUi.saving") : t("platformUi.saveTemplate")}
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="plat-curriculum-table__empty plat-templates-v2__empty">
          {t("platformUi.msgNoMatch")}
        </p>
      ) : (
        <div className="plat-templates-v2__grid">
          {filtered.map((tpl) => {
            const meta = templateChannelMeta(tpl.channel);
            const editing = editingId === tpl.id;
            return (
              <article
                key={tpl.id}
                className={`plat-templates-v2__card${
                  editing ? " plat-templates-v2__card--editing" : ""
                }${tpl.isArchived ? " plat-subjects-v2__row--archived" : ""}`}
              >
                <header className="plat-templates-v2__card-head">
                  <span
                    className={`plat-templates-v2__badge plat-templates-v2__badge--${tpl.channel.toLowerCase()}`}
                  >
                    <DashIcon
                      name={meta.icon}
                      className="dash-icon--xs plat-templates-v2__badge-icon"
                    />
                    {meta.label}
                  </span>
                  <div className="plat-templates-v2__card-actions">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          className="plat-btn plat-btn--primary plat-btn--xs"
                          disabled={busy}
                          onClick={() => void saveEdit()}
                        >
                          {t("common.save")}
                        </button>
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs"
                          disabled={busy}
                          onClick={cancelEdit}
                        >
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : !tpl.isArchived ? (
                      <>
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs"
                          disabled={busy}
                          onClick={() => startEdit(tpl)}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                          disabled={busy}
                          onClick={() => void archiveTemplate(tpl.id)}
                        >
                          {t("platformUi.msgArchive")}
                        </button>
                      </>
                    ) : (
                      <span className="plat-subjects-v2__archived-badge">{t("platformUi.archived")}</span>
                    )}
                  </div>
                </header>

                {editing ? (
                  <div className="plat-templates-v2__edit">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t("platformUi.name")}
                    />
                    <select
                      value={editChannel}
                      onChange={(e) => setEditChannel(e.target.value)}
                    >
                      {TEMPLATE_CHANNELS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={8}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="plat-templates-v2__title">{tpl.name}</h3>
                    <code className="plat-templates-v2__key">{tpl.key}</code>
                    <p className="plat-templates-v2__preview">
                      {tpl._count.packageLinks} package(s) · {tpl._count.schoolTemplates} school
                      copy(ies)
                    </p>
                    <details className="plat-templates-v2__body">
                      <summary>{templatePreview(tpl.body)}</summary>
                      <pre>{tpl.body}</pre>
                    </details>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
