"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SchoolBillingShell } from "@/components/school-billing/school-billing-shell";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  getSchoolInvoices,
  type SchoolBillingCurrency,
  type SchoolInvoice,
  type SchoolInvoiceStatus,
} from "@/lib/school-billing";

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

function formatAmount(usd: number, etb: number, currency: SchoolBillingCurrency) {
  return currency === "ETB" ? `${etb.toLocaleString()} ETB` : `$${usd.toLocaleString()}`;
}

type Filter = SchoolInvoiceStatus | "ALL";

export default function SchoolInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SchoolInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }
    void getSchoolInvoices()
      .then(setInvoices)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load invoices"))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return invoices;
    return invoices.filter((i) => i.status === filter);
  }, [invoices, filter]);

  const stats = useMemo(() => {
    const open = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length;
    const overdue = invoices.filter((i) => i.status === "OVERDUE").length;
    const outstandingUsd = invoices
      .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
      .reduce((sum, i) => sum + i.amountUsd, 0);
    return { open, overdue, outstandingUsd, total: invoices.length };
  }, [invoices]);

  return (
    <DashboardPage role="admin" title="Invoices">
      <SchoolBillingShell
        title="Subscription invoices"
        subtitle="Invoices issued by CampusOne for your school plan. Pay by the due date shown on each invoice."
        stats={[
          { label: "Total", value: stats.total },
          { label: "Open", value: stats.open, accent: stats.open > 0 },
          {
            label: "Outstanding",
            value: `$${stats.outstandingUsd.toLocaleString()}`,
            accent: stats.outstandingUsd > 0,
          },
          { label: "Overdue", value: stats.overdue, accent: stats.overdue > 0 },
        ]}
        error={error}
        onDismissError={() => setError("")}
        loading={loading}
        loadingLabel="Loading invoices…"
      >
        <div className="sb-v2__card">
          <div className="sb-v2__filters" role="tablist" aria-label="Invoice status">
            {(["ALL", "SENT", "OVERDUE", "PAID", "DRAFT"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`sb-v2__filter${filter === f ? " sb-v2__filter--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="sb-v2__table-wrap" style={{ marginTop: "0.85rem" }}>
            <table className="sb-v2__table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="sb-v2__table-empty">
                      No invoices yet. CampusOne will issue one when you move to a paid plan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <span className="sb-v2__invoice-num">{inv.invoiceNumber}</span>
                        {inv.plan ? (
                          <span className="sb-v2__muted">{inv.plan}</span>
                        ) : null}
                      </td>
                      <td className="sb-v2__muted">
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </td>
                      <td>{formatAmount(inv.amountUsd, inv.amountEtb, inv.currency)}</td>
                      <td className="sb-v2__muted">{formatDate(inv.dueAt)}</td>
                      <td>
                        <span
                          className={`sb-v2__invoice-status sb-v2__invoice-status--${inv.status.toLowerCase()}`}
                        >
                          {inv.status}
                        </span>
                        {inv.paidAt ? (
                          <div className="sb-v2__muted">Paid {formatDate(inv.paidAt)}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="sb-v2__muted" style={{ marginTop: "0.85rem" }}>
            Questions about an invoice? Contact CampusOne support with your invoice number.
          </p>
        </div>
      </SchoolBillingShell>
    </DashboardPage>
  );
}
