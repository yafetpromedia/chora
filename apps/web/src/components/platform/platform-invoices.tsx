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
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { PlatformPaymentProofs } from "./platform-payment-proofs";
import type { PlatformSchoolRow } from "./platform-types";

type Props = {
  schools: PlatformSchoolRow[];
};

const STATUS_FILTER_IDS: (InvoiceStatus | "ALL")[] = [
  "ALL",
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "VOID",
];

function invoiceStatusLabel(status: InvoiceStatus, t: (key: string) => string) {
  const map: Record<InvoiceStatus, string> = {
    DRAFT: t("platformUi.invoiceStatusDraft"),
    SENT: t("platformUi.invoiceStatusSent"),
    PAID: t("platformUi.invoiceStatusPaid"),
    OVERDUE: t("platformUi.invoiceStatusOverdue"),
    VOID: t("platformUi.invoiceStatusVoid"),
  };
  return map[status] ?? status;
}

function invoiceFilterLabel(id: InvoiceStatus | "ALL", t: (key: string) => string) {
  if (id === "ALL") return t("platformUi.filterAll");
  return invoiceStatusLabel(id, t);
}

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale === "am" ? "am-ET" : undefined, {
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
  const { t, locale } = useLocale();
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
        .catch((e) => fail(e, t("platformUi.errLoadInvoices")))
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
      setError(t("platformUi.invoicesErrSelectSchool"));
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
      setMessage(t("platformUi.invoicesCreatedDraft"));
      await load();
    } catch (e) {
      fail(e, t("platformUi.invoicesErrCreate"));
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
      fail(e, t("platformUi.errUpdateFailed"));
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
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.invoicesEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.invoicesTitle")}</h2>
            <p className="plat-subjects-v2__sub">{t("platformUi.invoicesSub")}</p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.total}</strong>
            <span>{t("platformUi.invoicesStatTotal")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>${stats.outstandingUsd.toLocaleString()}</strong>
            <span>{t("platformUi.billingOutstanding")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.overdue}</strong>
            <span>{t("platformUi.invoiceStatusOverdue")}</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="templates" className="dash-icon--sm" />
          <div>
            <strong>{stats.draft}</strong>
            <span>{t("platformUi.invoiceStatusDraft")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="mail" className="dash-icon--sm" />
          <div>
            <strong>{stats.sent}</strong>
            <span>{t("platformUi.invoiceStatusSent")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="finance" className="dash-icon--sm" />
          <div>
            <strong>{stats.paid}</strong>
            <span>{t("platformUi.invoiceStatusPaid")}</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="fees" className="dash-icon--sm" />
          <input
            type="search"
            placeholder={t("platformUi.invoicesSearchPh")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("platformUi.invoicesSearchAria")}
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
              {invoiceFilterLabel(id, t)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="plat-v2__btn plat-v2__btn--primary"
          onClick={() => setShowCreate((v) => !v)}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          {showCreate ? t("common.cancel") : t("platformUi.invoicesNew")}
        </button>
      </div>

      {showCreate ? (
        <section className="plat-billing-v2__panel plat-billing-v2__form">
          <h3 className="plat-billing-v2__panel-title">{t("platformUi.invoicesCreateTitle")}</h3>
          <p className="plat-billing-v2__panel-hint">{t("platformUi.invoicesCreateHint")}</p>
          <div className="plat-invoice-form__grid">
            <label className="plat-field">
              <span>{t("platformUi.invoicesSchool")}</span>
              <select
                className="plat-select"
                value={form.schoolId}
                onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}
              >
                <option value="">{t("platformUi.invoicesSelectSchool")}</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subscription?.plan ?? "—"})
                  </option>
                ))}
              </select>
            </label>
            <label className="plat-field">
              <span>{t("platformUi.invoicesPlan")}</span>
              <select
                className="plat-select"
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as PlanType }))}
              >
                <option value="STARTER">{t("platformUi.planStarter")}</option>
                <option value="PROFESSIONAL">{t("platformUi.planProfessional")}</option>
                <option value="ENTERPRISE">{t("platformUi.planEnterprise")}</option>
              </select>
            </label>
            <label className="plat-field">
              <span>{t("platformUi.invoicesPeriodStart")}</span>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              />
            </label>
            <label className="plat-field">
              <span>{t("platformUi.invoicesPeriodEnd")}</span>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              />
            </label>
            <label className="plat-field">
              <span>{t("platformUi.invoicesDueDate")}</span>
              <input
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
              />
            </label>
            <label className="plat-field">
              <span>{t("platformUi.invoicesCurrency")}</span>
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
            <span>{t("platformUi.invoicesNotesOptional")}</span>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("platformUi.invoicesNotesPh")}
            />
          </label>
          <div className="plat-subjects-v2__actions">
            <button
              type="button"
              className="plat-btn plat-btn--ghost"
              onClick={() => setShowCreate(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="plat-btn plat-btn--primary"
              disabled={saving}
              onClick={() => void createInvoice()}
            >
              {saving ? t("platformUi.invoicesCreating") : t("platformUi.invoicesCreateDraft")}
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
              <th>{t("platformUi.invoicesColInvoice")}</th>
              <th>{t("platformUi.invoicesColSchool")}</th>
              <th>{t("platformUi.invoicesColPeriod")}</th>
              <th>{t("platformUi.invoicesColAmount")}</th>
              <th>{t("platformUi.invoicesColDue")}</th>
              <th>{t("platformUi.invoicesColStatus")}</th>
              <th aria-label={t("platformUi.invoicesColActionsAria")} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="plat-subjects-v2__empty">
                  {t("platformUi.invoicesEmpty")}
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
                    {formatDate(inv.periodStart, locale)} – {formatDate(inv.periodEnd, locale)}
                  </td>
                  <td>
                    <span className="plat-subjects-v2__count">
                      {formatMoney(inv.amountUsd, inv.amountEtb, inv.currency)}
                    </span>
                  </td>
                  <td className="plat-billing-v2__muted">{formatDate(inv.dueAt, locale)}</td>
                  <td>
                    <span
                      className={`plat-invoice-status plat-invoice-status--${inv.status.toLowerCase()}`}
                    >
                      {invoiceStatusLabel(inv.status, t)}
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
                          {t("platformUi.invoicesMarkSent")}
                        </button>
                      ) : null}
                      {inv.status === "SENT" || inv.status === "OVERDUE" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--primary plat-btn--xs"
                          disabled={busyId === inv.id}
                          onClick={() => void setStatus(inv.id, "PAID")}
                        >
                          {t("platformUi.invoicesMarkPaid")}
                        </button>
                      ) : null}
                      {inv.status !== "VOID" && inv.status !== "PAID" ? (
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                          disabled={busyId === inv.id}
                          onClick={() => void setStatus(inv.id, "VOID")}
                        >
                          {t("platformUi.invoiceStatusVoid")}
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
