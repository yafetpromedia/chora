"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SchoolBillingNav } from "@/components/school-billing/school-billing-nav";
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

  return (
    <DashboardPage role="admin" title="Invoices">
      <SchoolBillingNav />

      <header className="sbill-hero">
        <p className="sbill-hero__eyebrow">Accounts payable</p>
        <h2 className="sbill-hero__title">Your invoices</h2>
        <p className="sbill-hero__sub">
          Invoices issued by CampusOne for your school subscription. Pay by the due date shown.
        </p>
      </header>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {loading ? <p className="sbill-muted">Loading invoices…</p> : null}

      <div className="sbill-nav" style={{ marginBottom: "1rem" }}>
        {(["ALL", "SENT", "OVERDUE", "PAID", "DRAFT"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`sbill-nav__link${filter === f ? " sbill-nav__link--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="sbill-table-wrap">
        <table className="sbill-table">
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
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="sbill-table-empty">
                  No invoices yet. CampusOne will issue one when you move to a paid plan.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <strong>{inv.invoiceNumber}</strong>
                    {inv.plan ? (
                      <div className="sbill-muted">{inv.plan}</div>
                    ) : null}
                  </td>
                  <td className="sbill-muted">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </td>
                  <td>{formatAmount(inv.amountUsd, inv.amountEtb, inv.currency)}</td>
                  <td className="sbill-muted">{formatDate(inv.dueAt)}</td>
                  <td>
                    <span className={`sbill-invoice-status sbill-invoice-status--${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                    {inv.paidAt ? (
                      <div className="sbill-muted">Paid {formatDate(inv.paidAt)}</div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="sbill-muted" style={{ marginTop: "1rem" }}>
        Questions about an invoice? Contact CampusOne support with your invoice number.
      </p>
    </DashboardPage>
  );
}
