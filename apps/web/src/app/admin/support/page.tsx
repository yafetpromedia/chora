"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AppToast } from "@/components/ui/app-toast";
import {
  SUPPORT_CATEGORIES,
  createSchoolSupportTicket,
  listSchoolSupportTickets,
  supportCategoryLabel,
  supportStatusLabel,
  type SupportTicket,
  type SupportTicketCategory,
} from "@/lib/support-tickets";

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

function statusTone(status: SupportTicket["status"]): "default" | "live" | "muted" {
  if (status === "OPEN") return "live";
  if (status === "IN_PROGRESS" || status === "WAITING_ON_SCHOOL") return "default";
  return "muted";
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("TECHNICAL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refresh() {
    const data = await listSchoolSupportTickets();
    setTickets(data);
  }

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load tickets"),
      )
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const open = tickets.filter(
      (t) =>
        t.status === "OPEN" ||
        t.status === "IN_PROGRESS" ||
        t.status === "WAITING_ON_SCHOOL",
    ).length;
    const resolved = tickets.filter(
      (t) => t.status === "RESOLVED" || t.status === "CLOSED",
    ).length;
    return {
      total: tickets.length,
      open,
      resolved,
      latest: tickets[0]?.createdAt ?? null,
    };
  }, [tickets]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const created = await createSchoolSupportTicket({
        subject: subject.trim(),
        body: body.trim(),
        category,
      });
      setSubject("");
      setBody("");
      setCategory("TECHNICAL");
      setSuccess("Issue sent to CampusOne control center.");
      setSelectedId(created.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage role="admin" title="Support">
      <div className="sup-v2">
        <AcademicsHero
          title="Report an issue"
          subtitle="Send billing, technical, or account problems to the CampusOne tenant control center. Track replies and status here."
          stats={[
            { label: "Reports", value: loading ? "—" : stats.total },
            { label: "Open", value: loading ? "—" : stats.open },
            { label: "Resolved", value: loading ? "—" : stats.resolved },
            {
              label: "Latest",
              value: loading || !stats.latest ? "—" : formatDate(stats.latest),
            },
          ]}
          badges={
            <>
              <AcademicsBadge variant="live">Control center</AcademicsBadge>
              <AcademicsBadge variant="muted">School admin</AcademicsBadge>
            </>
          }
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast
          message={success}
          tone="success"
          onDismiss={() => setSuccess("")}
        />

        <div className="sup-v2__grid">
          <section className="sup-v2__card">
            <header className="sup-v2__card-head">
              <span className="sup-v2__card-icon" aria-hidden>
                <DashIcon name="support" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="sup-v2__card-title">New report</h2>
                <p className="sup-v2__card-sub">
                  Describe the problem clearly so platform support can act fast.
                </p>
              </div>
            </header>

            <form className="sup-v2__form" onSubmit={onSubmit}>
              <label className="sup-v2__field">
                <span className="sup-v2__label">Category</span>
                <select
                  className="sup-v2__input"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as SupportTicketCategory)
                  }
                >
                  {SUPPORT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sup-v2__field">
                <span className="sup-v2__label">Subject</span>
                <input
                  className="sup-v2__input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary of the issue"
                  required
                  minLength={3}
                  maxLength={160}
                />
              </label>

              <label className="sup-v2__field">
                <span className="sup-v2__label">Details</span>
                <textarea
                  className="sup-v2__textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What happened, who is affected, and any steps to reproduce…"
                  required
                  minLength={10}
                  rows={7}
                />
              </label>

              <div className="sup-v2__actions">
                <button
                  type="submit"
                  className="sup-v2__btn sup-v2__btn--primary"
                  disabled={busy}
                >
                  {busy ? "Sending…" : "Send to control center"}
                </button>
              </div>
            </form>
          </section>

          <section className="sup-v2__card">
            <header className="sup-v2__card-head">
              <span className="sup-v2__card-icon sup-v2__card-icon--feed" aria-hidden>
                <DashIcon name="announcements" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="sup-v2__card-title">Your reports</h2>
                <p className="sup-v2__card-sub">
                  Status updates and notes from CampusOne support.
                </p>
              </div>
              <span className="sup-v2__card-count">
                {loading ? "…" : tickets.length}
              </span>
            </header>

            {loading ? (
              <p className="sup-v2__empty">Loading reports…</p>
            ) : tickets.length === 0 ? (
              <p className="sup-v2__empty">
                No reports yet. Submit an issue when something needs platform help.
              </p>
            ) : (
              <ul className="sup-v2__list">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`sup-v2__item${
                        selectedId === t.id ? " sup-v2__item--active" : ""
                      }`}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <div className="sup-v2__item-top">
                        <strong>{t.subject}</strong>
                        <AcademicsBadge variant={statusTone(t.status)}>
                          {supportStatusLabel(t.status)}
                        </AcademicsBadge>
                      </div>
                      <p className="sup-v2__item-meta">
                        {supportCategoryLabel(t.category)} · {formatDate(t.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selected ? (
              <article className="sup-v2__detail">
                <h3>{selected.subject}</h3>
                <p className="sup-v2__detail-meta">
                  {supportCategoryLabel(selected.category)} ·{" "}
                  {supportStatusLabel(selected.status)} ·{" "}
                  {formatDate(selected.createdAt)}
                </p>
                <p className="sup-v2__detail-body">{selected.body}</p>
                {selected.platformNote ? (
                  <div className="sup-v2__note">
                    <strong>Control center note</strong>
                    <p>{selected.platformNote}</p>
                  </div>
                ) : (
                  <p className="sup-v2__detail-hint">
                    No reply from the control center yet.
                  </p>
                )}
              </article>
            ) : null}
          </section>
        </div>
      </div>
    </DashboardPage>
  );
}
