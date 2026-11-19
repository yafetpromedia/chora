"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import {
  SUPPORT_STATUSES,
  listPlatformSupportTickets,
  supportCategoryLabel,
  supportStatusLabel,
  updatePlatformSupportTicket,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support-tickets";
import { AppToast } from "@/components/ui/app-toast";

const STATUS_FILTERS: { id: SupportTicketStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  ...SUPPORT_STATUSES,
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
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
        .catch((e) => fail(e, "Failed to load support tickets"))
        .finally(() => setLoading(false));
    });
  }, [load, router]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "OPEN").length,
      active: tickets.filter(
        (t) => t.status === "IN_PROGRESS" || t.status === "WAITING_ON_SCHOOL",
      ).length,
      resolved: tickets.filter(
        (t) => t.status === "RESOLVED" || t.status === "CLOSED",
      ).length,
    };
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
      const hay = [
        t.subject,
        t.body,
        t.school.name,
        t.school.joinCode,
        t.reporter.name,
        t.reporter.email,
        t.category,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tickets, query]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

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
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setMessage("Ticket updated.");
    } catch (err) {
      fail(err, "Failed to update ticket");
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
            <p className="plat-subjects-v2__eyebrow">Tenant support</p>
            <h2 className="plat-subjects-v2__title">School issue inbox</h2>
            <p className="plat-subjects-v2__sub">
              Reports from school admins across all tenants. Update status and
              leave a control-center note — the reporter gets an in-app
              notification when you resolve or reply.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{loading ? "—" : stats.total}</strong>
            <span>Loaded</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{loading ? "—" : stats.open}</strong>
            <span>Open</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{loading ? "—" : stats.active}</strong>
            <span>In progress</span>
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
            placeholder="Search school, subject, reporter…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search support tickets"
          />
        </div>
        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.id}
              className={`plat-filter-tab${
                statusFilter === f.id ? " plat-filter-tab--active" : ""
              }`}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="plat-support-v2__layout">
        <section className="plat-support-v2__list-panel">
          {loading ? (
            <p className="plat-curriculum-table__empty">Loading tickets…</p>
          ) : filtered.length === 0 ? (
            <p className="plat-curriculum-table__empty">
              No support tickets match this filter.
            </p>
          ) : (
            <ul className="plat-support-v2__list">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`plat-support-v2__row${
                      selectedId === t.id ? " plat-support-v2__row--active" : ""
                    }`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <div className="plat-support-v2__row-top">
                      <strong>{t.subject}</strong>
                      <span
                        className={`plat-support-v2__pill plat-support-v2__pill--${t.status.toLowerCase()}`}
                      >
                        {supportStatusLabel(t.status)}
                      </span>
                    </div>
                    <p className="plat-support-v2__row-meta">
                      {t.school.name} · {supportCategoryLabel(t.category)} ·{" "}
                      {formatDate(t.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="plat-support-v2__detail-panel">
          {!selected ? (
            <p className="plat-curriculum-table__empty">
              Select a ticket to review and respond.
            </p>
          ) : (
            <>
              <header className="plat-support-v2__detail-head">
                <h3>{selected.subject}</h3>
                <p>
                  {selected.school.name} ({selected.school.joinCode}) ·{" "}
                  {supportCategoryLabel(selected.category)}
                </p>
                <p className="plat-support-v2__reporter">
                  Reported by {selected.reporter.name} · {selected.reporter.email}
                </p>
              </header>

              <div className="plat-support-v2__body">
                <strong>Issue details</strong>
                <p>{selected.body}</p>
              </div>

              <div className="plat-support-v2__form">
                <label>
                  <span>Status</span>
                  <select
                    value={statusDraft}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as SupportTicketStatus)
                    }
                  >
                    {SUPPORT_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Note to school</span>
                  <textarea
                    rows={5}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Visible to the school admin on their Support page…"
                  />
                </label>
                <button
                  type="button"
                  className="plat-v2__btn plat-v2__btn--primary"
                  disabled={saving}
                  onClick={() => void saveSelected()}
                >
                  {saving ? "Saving…" : "Update ticket"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
