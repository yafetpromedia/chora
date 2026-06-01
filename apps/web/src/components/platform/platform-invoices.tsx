"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlanType } from "@/lib/api";
import {
  createPlatformInvoice,
  getPlatformInvoices,
  updatePlatformInvoice,
  type BillingCurrency,
  type InvoiceStatus,
  type PlatformInvoice,
} from "@/lib/platform-billing";
import { DashIcon } from "@/components/dashboard/dash-icons";
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
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const bounds = monthBounds(0);
  const [form, setForm] = useState({
    schoolId: "",
    plan: "STARTER" as PlanType,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    dueAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    currency: "USD" as BillingCurrency,
    notes: "",
  });

  const load = useCallback(async () => {
    setError("");
    const data = await getPlatformInvoices(
      statusFilter === "ALL" ? undefined : { status: statusFilter },
    );
    setInvoices(data);
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [load]);

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
      setError(e instanceof Error ? e.message : "Could not create invoice");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: InvoiceStatus) {
    setError("");
    try {
      await updatePlatformInvoice(id, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (loading) {
    return <p className="plat-loading">Loading invoices…</p>;
  }

  return (
    <div className="plat-section plat-invoices">
      <header className="plat-section-hero plat-section-hero--billing">
        <div>
          <p className="plat-section-hero__eyebrow">Accounts receivable</p>
          <h2 className="plat-section-hero__title">Invoices</h2>
          <p className="plat-section-hero__sub">
            Issue monthly invoices to schools and track payment status.
          </p>
        </div>
        <button
          type="button"
          className="plat-btn plat-btn--primary"
          onClick={() => setShowCreate((v) => !v)}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          New invoice
        </button>
      </header>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {message ? <p className="plat-plans__ok">{message}</p> : null}

      {showCreate ? (
        <section className="plat-panel plat-invoice-form">
          <h3 className="plat-panel__title">Create invoice</h3>
          <p className="plat-panel__hint">
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
          <div className="plat-invoice-form__actions">
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

      <div className="plat-toolbar">
        <div className="plat-search">
          <DashIcon name="finance" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search invoice or school…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-filter-tabs" role="tablist">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={statusFilter === f.id}
            className={`plat-filter-tab${statusFilter === f.id ? " plat-filter-tab--active" : ""}`}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="plat-table-wrap">
        <table className="plat-table plat-table--invoices">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>School</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="plat-table-empty">
                  No invoices yet. Create one for a paid school.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <strong className="plat-table-name">{inv.invoiceNumber}</strong>
                    {inv.plan ? (
                      <span className="plat-table-sub">{inv.plan}</span>
                    ) : null}
                  </td>
                  <td>
                    <strong>{inv.schoolName}</strong>
                    <span className="plat-table-sub">{inv.joinCode}</span>
                  </td>
                  <td className="plat-table-muted">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </td>
                  <td>{formatMoney(inv.amountUsd, inv.amountEtb, inv.currency)}</td>
                  <td className="plat-table-muted">{formatDate(inv.dueAt)}</td>
                  <td>
                    <span className={`plat-invoice-status plat-invoice-status--${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div className="plat-invoice-actions">
                      {inv.status === "DRAFT" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs"
                          onClick={() => void setStatus(inv.id, "SENT")}
                        >
                          Mark sent
                        </button>
                      ) : null}
                      {inv.status === "SENT" || inv.status === "OVERDUE" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--primary plat-btn--xs"
                          onClick={() => void setStatus(inv.id, "PAID")}
                        >
                          Mark paid
                        </button>
                      ) : null}
                      {inv.status !== "VOID" && inv.status !== "PAID" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs"
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
