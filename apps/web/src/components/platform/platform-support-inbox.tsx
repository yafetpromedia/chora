"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import {
  SUPPORT_STATUSES,
  listPlatformSupportTickets,
  supportCategoryLabel,
  updatePlatformSupportTicket,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support-tickets";
import { AppToast } from "@/components/ui/app-toast";

const STATUS_FILTER_IDS: (SupportTicketStatus | "ALL")[] = [
  "ALL",
  ...SUPPORT_STATUSES.map((row) => row.id),
];

function supportStatusText(status: SupportTicketStatus, translate: (key: string) => string) {
  const map: Record<SupportTicketStatus, string> = {
    OPEN: translate("platformUi.supportStatusOpen"),
    IN_PROGRESS: translate("platformUi.supportStatusInProgress"),
    WAITING_ON_SCHOOL: translate("platformUi.supportStatusWaitingOnSchool"),
    RESOLVED: translate("platformUi.supportStatusResolved"),
    CLOSED: translate("platformUi.supportStatusClosed"),
  };
  return map[status] ?? status;
}

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale === "am" ? "am-ET" : undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PlatformSupportInbox() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "ALL">(
    "ALL",
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<SupportTicketStatus>("OPEN");
  const [saving, setSaving] = useState(false);

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setError("");
    const data = await listPlatformSupportTickets(
      statusFilter === "ALL" ? undefined : { status: statusFilter },
    );
    setTickets(data);
  }, [statusFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void load()
        .catch((e) => fail(e, t("platformUi.errLoadTickets")))
        .finally(() => setLoading(false));
    });
  }, [load, router]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "OPEN").length,
      active: tickets.filter(
        (ticket) =>
          ticket.status === "IN_PROGRESS" || ticket.status === "WAITING_ON_SCHOOL",
      ).length,
      resolved: tickets.filter(
        (ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED",
      ).length,
    };
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) => {
      const hay = [
        ticket.subject,
        ticket.body,
        ticket.school.name,
        ticket.school.joinCode,
        ticket.reporter.name,
        ticket.reporter.email,
        ticket.category,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tickets, query]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  const [syncedSelected, setSyncedSelected] = useState<typeof selected>(null);
  if (selected !== syncedSelected) {
    setSyncedSelected(selected);
    if (selected) {
      setNoteDraft(selected.platformNote ?? "");
      setStatusDraft(selected.status);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updatePlatformSupportTicket(selected.id, {
        status: statusDraft,
        platformNote: noteDraft,
      });
      setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      setMessage(t("platformUi.supportTicketUpdated"));
    } catch (err) {
      fail(err, t("platformUi.supportErrUpdate"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-support-v2">
      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="support" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.supportEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.supportTitle")}</h2>
            <p className="plat-subjects-v2__sub">{t("platformUi.supportSub")}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{loading ? "—" : stats.total}</strong>
            <span>{t("platformUi.supportStatLoaded")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{loading ? "—" : stats.open}</strong>
            <span>{t("platformUi.supportStatusOpen")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{loading ? "—" : stats.active}</strong>
            <span>{t("platformUi.supportStatInProgress")}</span>
          </div>
        </div>
      </header>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={message} tone="success" onDismiss={() => setMessage("")} />

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="students" className="dash-icon--sm" />
          <input
            type="search"
            placeholder={t("platformUi.supportSearchPh")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("platformUi.supportSearchAria")}
          />
        </div>
        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          {STATUS_FILTER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={statusFilter === id}
              className={`plat-filter-tab${
                statusFilter === id ? " plat-filter-tab--active" : ""
              }`}
              onClick={() => setStatusFilter(id)}
            >
              {id === "ALL" ? t("platformUi.filterAll") : supportStatusText(id, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="plat-support-v2__layout">
        <section className="plat-support-v2__list-panel">
          {loading ? (
            <p className="plat-curriculum-table__empty">{t("platformUi.supportLoadingTickets")}</p>
          ) : filtered.length === 0 ? (
            <p className="plat-curriculum-table__empty">{t("platformUi.supportNoMatch")}</p>
          ) : (
            <ul className="plat-support-v2__list">
              {filtered.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    type="button"
                    className={`plat-support-v2__row${
                      selectedId === ticket.id ? " plat-support-v2__row--active" : ""
                    }`}
                    onClick={() => setSelectedId(ticket.id)}
                  >
                    <div className="plat-support-v2__row-top">
                      <strong>{ticket.subject}</strong>
                      <span
                        className={`plat-support-v2__pill plat-support-v2__pill--${ticket.status.toLowerCase()}`}
                      >
                        {supportStatusText(ticket.status, t)}
                      </span>
                    </div>
                    <p className="plat-support-v2__row-meta">
                      {ticket.school.name} · {supportCategoryLabel(ticket.category)} ·{" "}
                      {formatDate(ticket.createdAt, locale)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="plat-support-v2__detail-panel">
          {!selected ? (
            <p className="plat-curriculum-table__empty">{t("platformUi.supportSelectTicket")}</p>
          ) : (
            <>
              <header className="plat-support-v2__detail-head">
                <h3>{selected.subject}</h3>
                <p>
                  {selected.school.name} ({selected.school.joinCode}) ·{" "}
                  {supportCategoryLabel(selected.category)}
                </p>
                <p className="plat-support-v2__reporter">
                  {t("platformUi.supportReportedBy", {
                    name: selected.reporter.name,
                    email: selected.reporter.email,
                  })}
                </p>
              </header>

              <div className="plat-support-v2__body">
                <strong>{t("platformUi.supportIssueDetails")}</strong>
                <p>{selected.body}</p>
              </div>

              <div className="plat-support-v2__form">
                <label>
                  <span>{t("platformUi.supportStatus")}</span>
                  <select
                    value={statusDraft}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as SupportTicketStatus)
                    }
                  >
                    {SUPPORT_STATUSES.map((statusRow) => (
                      <option key={statusRow.id} value={statusRow.id}>
                        {supportStatusText(statusRow.id, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("platformUi.supportNoteToSchool")}</span>
                  <textarea
                    rows={5}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder={t("platformUi.supportNotePh")}
                  />
                </label>
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--primary"
                  disabled={saving}
                  onClick={() => void saveSelected()}
                >
                  {saving ? t("common.saving") : t("platformUi.supportUpdateTicket")}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
