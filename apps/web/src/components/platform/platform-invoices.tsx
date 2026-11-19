"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanType } from "@/lib/api";
import {
  createPlatformInvoice,
  getPlatformInvoices,
  updatePlatformInvoice,
  type BillingCurrency,
  type InvoiceStatus,
  type PlatformInvoice,
} from "@/lib/platform-billing";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { PlatformPaymentProofs } from "./platform-payment-proofs";
import type { PlatformSchoolRow } from "./platform-types";

type Props = {
  schools: PlatformSchoolRow[];
};

const STATUS_FILTERS: { id: InvoiceStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "SENT", label: "Sent" },
  { id: "PAID", label: "Paid" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "VOID", label: "Void" },
];

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

function formatMoney(usd: number, etb: number, currency: BillingCurrency) {
  if (currency === "ETB") return `${etb.toLocaleString()} ETB`;
  return `$${usd.toLocaleString()}`;
}

function monthBounds(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function PlatformInvoices({ schools }: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const [form, setForm] = useState(() => {
    const bounds = monthBounds(0);
    return {
      schoolId: "",
      plan: "STARTER" as PlanType,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      dueAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      currency: "USD" as BillingCurrency,
      notes: "",
    };
  });

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setError("");
    const data = await getPlatformInvoices(
      statusFilter === "ALL" ? undefined : { status: statusFilter },
    );
    setInvoices(data);
  }, [statusFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void load()
        .catch((e) => fail(e, "Failed to load invoices"))
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, router]);

  const stats = useMemo(() => {
    const outstanding = invoices.filter(
      (i) => i.status === "SENT" || i.status === "OVERDUE",
    );
    return {
      total: invoices.length,
      draft: invoices.filter((i) => i.status === "DRAFT").length,
      sent: invoices.filter((i) => i.status === "SENT").length,
      paid: invoices.filter((i) => i.status === "PAID").length,
      overdue: invoices.filter((i) => i.status === "OVERDUE").length,
      outstandingUsd: outstanding.reduce((sum, i) => sum + i.amountUsd, 0),
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.schoolName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.joinCode.toLowerCase().includes(q),
    );
  }, [invoices, query]);

  async function createInvoice() {
    if (!form.schoolId) {
      setError("Select a school");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createPlatformInvoice({
        schoolId: form.schoolId,
        plan: form.plan,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        dueAt: form.dueAt,
        currency: form.currency,
        notes: form.notes.trim() || undefined,
      });
      setShowCreate(false);
      setMessage("Invoice created as draft.");
      await load();
    } catch (e) {
      fail(e, "Could not create invoice");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: InvoiceStatus) {
    setBusyId(id);
    setError("");
    try {
      await updatePlatformInvoice(id, { status });
      await load();
    } catch (e) {
      fail(e, "Update failed");
    } finally {
      setBusyId("");
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
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-billing-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={message} tone="success" onDismiss={() => setMessage("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="fees" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Accounts receivable</p>
            <h2 className="plat-subjects-v2__title">Invoices</h2>
            <p className="plat-subjects-v2__sub">
              Issue monthly invoices to schools and track payment status.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.total}</strong>
            <span>Total</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>${stats.outstandingUsd.toLocaleString()}</strong>
            <span>Outstanding</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.overdue}</strong>
            <span>Overdue</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="templates" className="dash-icon--sm" />
          <div>
            <strong>{stats.draft}</strong>
            <span>Draft</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="mail" className="dash-icon--sm" />
          <div>
            <strong>{stats.sent}</strong>
            <span>Sent</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="finance" className="dash-icon--sm" />
          <div>
            <strong>{stats.paid}</strong>
            <span>Paid</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="fees" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search invoice or school…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search invoices"
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
        <button
          type="button"
          className="plat-v2__btn plat-v2__btn--primary"
          onClick={() => setShowCreate((v) => !v)}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          {showCreate ? "Cancel" : "New invoice"}
        </button>
      </div>

      {showCreate ? (
        <section className="plat-billing-v2__panel plat-billing-v2__form">
          <h3 className="plat-billing-v2__panel-title">Create invoice</h3>
          <p className="plat-billing-v2__panel-hint">
            Amounts default from the plan catalog. Invoice starts as draft.
          </p>
          <div className="plat-invoice-form__grid">
            <label className="plat-field">
              <span>School</span>
              <select
                className="plat-select"
                value={form.schoolId}
                onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}
              >
                <option value="">Select school…</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subscription?.plan ?? "—"})
                  </option>
                ))}
              </select>
            </label>
            <label className="plat-field">
              <span>Plan</span>
              <select
                className="plat-select"
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as PlanType }))}
              >
                <option value="STARTER">Starter</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </label>
            <label className="plat-field">
              <span>Billing period start</span>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              />
            </label>
            <label className="plat-field">
              <span>Billing period end</span>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              />
            </label>
            <label className="plat-field">
              <span>Due date</span>
              <input
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
              />
            </label>
            <label className="plat-field">
              <span>Currency</span>
              <select
                className="plat-select"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value as BillingCurrency }))
                }
              >
                <option value="USD">USD</option>
                <option value="ETB">ETB</option>
              </select>
            </label>
          </div>
          <label className="plat-field">
            <span>Notes (optional)</span>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="PO number, bank reference…"
            />
          </label>
          <div className="plat-subjects-v2__actions">
            <button
              type="button"
              className="plat-btn plat-btn--ghost"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="plat-btn plat-btn--primary"
              disabled={saving}
              onClick={() => void createInvoice()}
            >
              {saving ? "Creating…" : "Create draft"}
            </button>
          </div>
        </section>
      ) : null}

      <PlatformPaymentProofs
        onReviewed={() => {
          void load().catch(() => undefined);
        }}
      />

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>School</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="plat-subjects-v2__empty">
                  No invoices yet. Create one for a paid school.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span className="plat-subjects-v2__name">{inv.invoiceNumber}</span>
                    {inv.plan ? (
                      <code className="plat-subjects-v2__code">{inv.plan}</code>
                    ) : null}
                  </td>
                  <td>
                    <span className="plat-subjects-v2__name">{inv.schoolName}</span>
                    <code className="plat-subjects-v2__code">{inv.joinCode}</code>
                  </td>
                  <td className="plat-billing-v2__muted">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </td>
                  <td>
                    <span className="plat-subjects-v2__count">
                      {formatMoney(inv.amountUsd, inv.amountEtb, inv.currency)}
                    </span>
                  </td>
                  <td className="plat-billing-v2__muted">{formatDate(inv.dueAt)}</td>
                  <td>
                    <span
                      className={`plat-invoice-status plat-invoice-status--${inv.status.toLowerCase()}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div className="plat-subjects-v2__actions">
                      {inv.status === "DRAFT" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs"
                          disabled={busyId === inv.id}
                          onClick={() => void setStatus(inv.id, "SENT")}
                        >
                          Mark sent
                        </button>
                      ) : null}
                      {inv.status === "SENT" || inv.status === "OVERDUE" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--primary plat-btn--xs"
                          disabled={busyId === inv.id}
                          onClick={() => void setStatus(inv.id, "PAID")}
                        >
                          Mark paid
                        </button>
                      ) : null}
                      {inv.status !== "VOID" && inv.status !== "PAID" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                          disabled={busyId === inv.id}
                          onClick={() => void setStatus(inv.id, "VOID")}
                        >
                          Void
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
