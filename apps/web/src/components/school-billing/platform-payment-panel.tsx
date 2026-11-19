"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PlatformPayoutInstructions, SubscriptionStatus } from "@/lib/api";
import {
  requestRenewalInvoice,
  submitPlatformPaymentProof,
  type PlatformPayMethod,
  type PlatformPaymentProof,
  type SchoolOpenInvoice,
} from "@/lib/school-billing";
import { BRAND_NAME } from "@/lib/brand";
import { EtbAmount } from "@/components/billing/etb-amount";
import { formatEtbWhole } from "@/lib/currency";

const MAX_PROOF_BYTES = 4_000_000;

function readProofAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read screenshot"));
    reader.readAsDataURL(file);
  });
}

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

function proofStatusLabel(status: PlatformPaymentProof["status"]) {
  if (status === "PENDING") return "Under review";
  if (status === "CONFIRMED") return "Confirmed";
  return "Rejected";
}

type Props = {
  payout?: PlatformPayoutInstructions | null;
  subscription?: SubscriptionStatus;
  planPrice?: { usdMonthly: number; etbMonthly: number } | null;
  openInvoices: SchoolOpenInvoice[];
  paymentProofs?: PlatformPaymentProof[];
  selectedInvoiceId?: string;
  onSubmitted?: () => void;
};

export function PlatformPaymentPanel({
  payout,
  subscription,
  planPrice,
  openInvoices,
  paymentProofs = [],
  selectedInvoiceId,
  onSubmitted,
}: Props) {
  const methods = useMemo(() => {
    const list: PlatformPayMethod[] = [];
    if (payout?.telebirr) list.push("TELEBIRR");
    if (payout?.bank) list.push("BANK_TRANSFER");
    return list;
  }, [payout]);

  const [invoiceIdState, setInvoiceId] = useState("");
  const [payMethodState, setPayMethod] = useState<PlatformPayMethod>("TELEBIRR");
  const invoiceId = selectedInvoiceId || invoiceIdState || openInvoices[0]?.id || "";
  const payMethod =
    methods.length && !methods.includes(payMethodState) ? methods[0] : payMethodState;
  const [transactionId, setTransactionId] = useState("");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestingInvoice, setRequestingInvoice] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasOpenInvoice = openInvoices.length > 0;
  const canRequestInvoice =
    subscription &&
    subscription.isActive &&
    subscription.plan !== "TRIAL" &&
    subscription.plan !== "ENTERPRISE" &&
    !hasOpenInvoice;

  const selectedInvoice = openInvoices.find((inv) => inv.id === invoiceId);
  const pendingForInvoice = paymentProofs.find(
    (p) => p.invoiceId === invoiceId && p.status === "PENDING",
  );

  async function onProofFile(file: File | null) {
    if (!file) {
      setProofPreview(null);
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError("Screenshot must be under 4 MB");
      return;
    }
    try {
      setProofPreview(await readProofAsDataUrl(file));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read screenshot");
    }
  }

  async function onRequestInvoice() {
    setRequestingInvoice(true);
    setError("");
    setMessage("");
    try {
      const res = await requestRenewalInvoice();
      setMessage(res.message);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invoice");
    } finally {
      setRequestingInvoice(false);
    }
  }

  async function onSubmit() {
    if (!invoiceId) {
      setError("Create or select an invoice first");
      return;
    }
    if (!transactionId.trim()) {
      setError(
        payMethod === "TELEBIRR"
          ? "Enter the Telebirr transaction number"
          : "Enter the bank transaction ID",
      );
      return;
    }
    if (!proofPreview) {
      setError("Upload your payment receipt screenshot");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await submitPlatformPaymentProof(invoiceId, {
        method: payMethod,
        transactionId: transactionId.trim(),
        proofUrl: proofPreview,
      });
      setMessage(res.message);
      setTransactionId("");
      setProofPreview(null);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit payment");
    } finally {
      setSubmitting(false);
    }
  }

  if (!payout?.bank && !payout?.telebirr && !payout?.instructions) {
    return (
      <article className="sb-v2__pay-panel">
        <div className="sb-v2__pay-panel__head">
          <span className="sb-v2__pay-badge">
            <span className="sb-v2__pay-badge__dot" aria-hidden />
            Payment
          </span>
          <h3 className="sb-v2__card-title">Pay {BRAND_NAME}</h3>
          <p className="sb-v2__card-sub">
            Payment details are not published yet. Contact support
            {payout?.supportEmail ? ` at ${payout.supportEmail}` : ""}
            {payout?.supportPhone ? ` or ${payout.supportPhone}` : ""}.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="sb-v2__pay-panel">
      <div className="sb-v2__pay-panel__head">
        <span className="sb-v2__pay-badge">
          <span className="sb-v2__pay-badge__dot" aria-hidden />
          Offline payment
        </span>
        <h3 className="sb-v2__card-title">Pay {BRAND_NAME}</h3>
        <p className="sb-v2__card-sub">
          Choose Telebirr or bank transfer, pay the invoice amount, then submit your transaction ID
          and receipt. We verify within 1–2 business days.
        </p>
      </div>

      <div className="sb-v2__pay-panel__body">
        {!hasOpenInvoice ? (
          <div className="sb-v2__pay-empty">
            <p className="sb-v2__pay-empty__title">No open invoice</p>
            <p className="sb-v2__pay-empty__sub">
              {subscription?.plan === "TRIAL" ? (
                <>
                  You are on a trial.{" "}
                  <Link href="/admin/billing/plans">Upgrade to a paid plan</Link> to get an invoice.
                </>
              ) : subscription?.isActive && subscription.currentPeriodEnd ? (
                <>
                  Your {subscription.planLabel} plan is active until{" "}
                  {formatDate(subscription.currentPeriodEnd)}.
                  {planPrice ? (
                    <>
                      {" "}
                      Renewal is <EtbAmount amount={planPrice.etbMonthly} maximumFractionDigits={0} />
                      /mo.
                    </>
                  ) : null}
                </>
              ) : (
                <>When {BRAND_NAME} issues a bill, you can pay it here.</>
              )}
            </p>
            {canRequestInvoice ? (
              <button
                type="button"
                className="sb-v2__btn sb-v2__btn--primary"
                disabled={requestingInvoice}
                onClick={() => void onRequestInvoice()}
              >
                {requestingInvoice ? "Creating invoice…" : "Get renewal invoice"}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="sb-v2__pay-panel__grid">
          <section className="sb-v2__pay-panel__section">
            <h4 className="sb-v2__pay-panel__label">1 · Invoice</h4>
            {!hasOpenInvoice ? (
              <p className="sb-v2__pay-panel__note">
                Generate an invoice above, or check{" "}
                <Link href="/admin/billing/invoices">Invoices</Link> for past bills.
              </p>
            ) : openInvoices.length === 1 ? (
              <div className="sb-v2__pay-invoice">
                <strong>{openInvoices[0].invoiceNumber}</strong>
                <span>
                  <EtbAmount amount={openInvoices[0].amountEtb} maximumFractionDigits={0} /> · due{" "}
                  {formatDate(openInvoices[0].dueAt)}
                </span>
              </div>
            ) : (
              <label className="sb-v2__pay-field">
                <span className="sb-v2__pay-field__hint">Select invoice</span>
                <select
                  className="sb-v2__pay-select"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                >
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {formatEtbWhole(inv.amountEtb)} (due{" "}
                      {formatDate(inv.dueAt)})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <section className="sb-v2__pay-panel__section">
            <h4 className="sb-v2__pay-panel__label">2 · Payment method</h4>
            {methods.length > 0 ? (
              <div className="sb-v2__pay-methods" role="group" aria-label="Payment method">
                {methods.includes("TELEBIRR") ? (
                  <button
                    type="button"
                    className={`sb-v2__pay-method${payMethod === "TELEBIRR" ? " sb-v2__pay-method--active" : ""}`}
                    onClick={() => setPayMethod("TELEBIRR")}
                  >
                    Telebirr
                  </button>
                ) : null}
                {methods.includes("BANK_TRANSFER") ? (
                  <button
                    type="button"
                    className={`sb-v2__pay-method${payMethod === "BANK_TRANSFER" ? " sb-v2__pay-method--active" : ""}`}
                    onClick={() => setPayMethod("BANK_TRANSFER")}
                  >
                    CBE / bank
                  </button>
                ) : null}
              </div>
            ) : null}

            {payMethod === "TELEBIRR" && payout?.telebirr ? (
              <div className="sb-v2__pay-account sb-v2__pay-account--telebirr">
                <p className="sb-v2__pay-account__label">Send Telebirr to</p>
                <p className="sb-v2__pay-account__name">{payout.telebirr.accountName}</p>
                <p className="sb-v2__pay-account__number">{payout.telebirr.number}</p>
              </div>
            ) : null}

            {payMethod === "BANK_TRANSFER" && payout?.bank ? (
              <div className="sb-v2__pay-account sb-v2__pay-account--bank">
                <p className="sb-v2__pay-account__name">{payout.bank.bankName}</p>
                <p className="sb-v2__pay-account__label">{payout.bank.accountHolder}</p>
                <p className="sb-v2__pay-account__number">{payout.bank.accountNumber}</p>
              </div>
            ) : null}

            {selectedInvoice ? (
              <p className="sb-v2__pay-panel__amount">
                Amount due: <strong><EtbAmount amount={selectedInvoice.amountEtb} maximumFractionDigits={0} /></strong>
                <span> (${selectedInvoice.amountUsd.toLocaleString()} USD)</span>
              </p>
            ) : planPrice && canRequestInvoice ? (
              <p className="sb-v2__pay-panel__amount">
                Renewal amount: <strong><EtbAmount amount={planPrice.etbMonthly} maximumFractionDigits={0} /></strong>
                <span> (${planPrice.usdMonthly.toLocaleString()} USD/mo)</span>
              </p>
            ) : null}
          </section>

          <section className="sb-v2__pay-panel__section sb-v2__pay-panel__section--form">
            <h4 className="sb-v2__pay-panel__label">3 · Submit proof</h4>

            {!hasOpenInvoice ? (
              <p className="sb-v2__pay-panel__note">
                After you pay, create an invoice first — then enter your transaction ID and upload
                the receipt screenshot here.
              </p>
            ) : pendingForInvoice ? (
              <div className="sb-v2__pay-alert sb-v2__pay-alert--pending">
                Payment for {pendingForInvoice.invoiceNumber} is under review. Submitted{" "}
                {formatDate(pendingForInvoice.createdAt)}.
              </div>
            ) : (
              <>
                <label className="sb-v2__pay-field">
                  <span>
                    {payMethod === "TELEBIRR" ? "Transaction number" : "Transaction ID"}
                  </span>
                  <input
                    className="sb-v2__pay-input"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={
                      payMethod === "TELEBIRR" ? "e.g. DHR97D11WZ" : "e.g. FT26239YHGVN"
                    }
                    disabled={!hasOpenInvoice}
                  />
                </label>

                <label className="sb-v2__pay-field">
                  <span>Receipt screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sb-v2__pay-file"
                    disabled={!hasOpenInvoice}
                    onChange={(e) => void onProofFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                {proofPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="sb-v2__pay-proof"
                    src={proofPreview}
                    alt="Payment receipt preview"
                  />
                ) : null}

                <button
                  type="button"
                  className="sb-v2__btn sb-v2__btn--primary sb-v2__pay-submit"
                  disabled={
                    submitting || !hasOpenInvoice || !proofPreview || !transactionId.trim()
                  }
                  onClick={() => void onSubmit()}
                >
                  {submitting ? "Submitting…" : "Submit for verification"}
                </button>
              </>
            )}
          </section>
        </div>

        {payout?.instructions ? (
          <p className="sb-v2__footnote">{payout.instructions}</p>
        ) : null}
      </div>

      {message ? <p className="sb-v2__pay-alert sb-v2__pay-alert--ok">{message}</p> : null}
      {error ? <p className="sb-v2__pay-alert sb-v2__pay-alert--error">{error}</p> : null}

      {paymentProofs.length > 0 ? (
        <div className="sb-v2__pay-history">
          <h4 className="sb-v2__pay-panel__label">Recent submissions</h4>
          <ul className="sb-v2__pay-history__list">
            {paymentProofs.slice(0, 4).map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.invoiceNumber}</strong>
                  <span className="sb-v2__muted">
                    {p.method === "TELEBIRR" ? "Telebirr" : "Bank"} · {p.transactionId}
                  </span>
                </div>
                <span
                  className={`sb-v2__pay-history__status sb-v2__pay-history__status--${p.status.toLowerCase()}`}
                >
                  {proofStatusLabel(p.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
