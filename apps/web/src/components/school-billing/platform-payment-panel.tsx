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
import { useLocale } from "@/components/i18n/locale-provider";

const MAX_PROOF_BYTES = 4_000_000;

function readProofAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read_failed"));
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

function proofStatusLabel(
  status: PlatformPaymentProof["status"],
  t: (key: string) => string,
) {
  if (status === "PENDING") return t("billingUi.proofUnderReviewLabel");
  if (status === "CONFIRMED") return t("billingUi.proofConfirmed");
  return t("billingUi.proofRejected");
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
  const { t, tn } = useLocale();
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
      setError(t("billingUi.screenshotTooBig"));
      return;
    }
    try {
      setProofPreview(await readProofAsDataUrl(file));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "read_failed"
          ? err.message
          : t("billingUi.readScreenshotFailed"),
      );
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
      setError(err instanceof Error ? err.message : t("billingUi.createInvoiceFailed"));
    } finally {
      setRequestingInvoice(false);
    }
  }

  async function onSubmit() {
    if (!invoiceId) {
      setError(t("billingUi.selectInvoiceFirst"));
      return;
    }
    if (!transactionId.trim()) {
      setError(
        payMethod === "TELEBIRR"
          ? t("billingUi.telebirrTxnRequired")
          : t("billingUi.bankTxnRequired"),
      );
      return;
    }
    if (!proofPreview) {
      setError(t("billingUi.uploadReceipt"));
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
      setError(err instanceof Error ? err.message : t("billingUi.submitPaymentFailed"));
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
            {t("billingUi.paymentBadge")}
          </span>
          <h3 className="sb-v2__card-title">{t("billingUi.payBrand", { brand: BRAND_NAME })}</h3>
          <p className="sb-v2__card-sub">
            {t("billingUi.paySubUnavailable", {
              email: payout?.supportEmail ? t("billingUi.supportAt", { email: payout.supportEmail }) : "",
              phone: payout?.supportPhone ? t("billingUi.supportOr", { phone: payout.supportPhone }) : "",
            })}
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
          {t("billingUi.offlinePayment")}
        </span>
        <h3 className="sb-v2__card-title">{t("billingUi.payBrand", { brand: BRAND_NAME })}</h3>
        <p className="sb-v2__card-sub">{t("billingUi.paySubOffline")}</p>
      </div>

      <div className="sb-v2__pay-panel__body">
        {!hasOpenInvoice ? (
          <div className="sb-v2__pay-empty">
            <p className="sb-v2__pay-empty__title">{t("billingUi.noOpenInvoice")}</p>
            <p className="sb-v2__pay-empty__sub">
              {subscription?.plan === "TRIAL" ? (
                <>
                  {t("billingUi.trialUpgrade")}{" "}
                  <Link href="/admin/billing/plans">{t("billingUi.upgradeLink")}</Link>
                  {t("billingUi.upgradeToInvoice")}
                </>
              ) : subscription?.isActive && subscription.currentPeriodEnd ? (
                <>
                  {t("billingUi.planActiveUntil", {
                    plan: subscription.planLabel,
                    date: formatDate(subscription.currentPeriodEnd),
                  })}
                  {planPrice ? (
                    <>
                      {" "}
                      {t("billingUi.renewalMoLabel")}{" "}
                      <EtbAmount amount={planPrice.etbMonthly} maximumFractionDigits={0} />
                      {t("billingUi.usdMo")}
                    </>
                  ) : null}
                </>
              ) : (
                <>{t("billingUi.whenBillIssued", { brand: BRAND_NAME })}</>
              )}
            </p>
            {canRequestInvoice ? (
              <button
                type="button"
                className="sb-v2__btn sb-v2__btn--primary"
                disabled={requestingInvoice}
                onClick={() => void onRequestInvoice()}
              >
                {requestingInvoice ? t("billingUi.creatingInvoice") : t("billingUi.getRenewalInvoice")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="sb-v2__pay-panel__grid">
          <section className="sb-v2__pay-panel__section">
            <h4 className="sb-v2__pay-panel__label">{t("billingUi.stepInvoice")}</h4>
            {!hasOpenInvoice ? (
              <p className="sb-v2__pay-panel__note">
                {t("billingUi.invoiceNoteNoOpenPrefix")}
                <Link href="/admin/billing/invoices">{tn("Invoices")}</Link>
                {t("billingUi.invoiceNoteNoOpenSuffix")}
              </p>
            ) : openInvoices.length === 1 ? (
              <div className="sb-v2__pay-invoice">
                <strong>{openInvoices[0].invoiceNumber}</strong>
                <span>
                  <EtbAmount amount={openInvoices[0].amountEtb} maximumFractionDigits={0} /> ·{" "}
                  {t("billingUi.dueOn", { date: formatDate(openInvoices[0].dueAt) })}
                </span>
              </div>
            ) : (
              <label className="sb-v2__pay-field">
                <span className="sb-v2__pay-field__hint">{t("billingUi.selectInvoice")}</span>
                <select
                  className="sb-v2__pay-select"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                >
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {formatEtbWhole(inv.amountEtb)} ({t("billingUi.dueOn", {
                        date: formatDate(inv.dueAt),
                      })})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <section className="sb-v2__pay-panel__section">
            <h4 className="sb-v2__pay-panel__label">{t("billingUi.stepPaymentMethod")}</h4>
            {methods.length > 0 ? (
              <div className="sb-v2__pay-methods" role="group" aria-label={t("billingUi.paymentMethodAria")}>
                {methods.includes("TELEBIRR") ? (
                  <button
                    type="button"
                    className={`sb-v2__pay-method${payMethod === "TELEBIRR" ? " sb-v2__pay-method--active" : ""}`}
                    onClick={() => setPayMethod("TELEBIRR")}
                  >
                    {t("billingUi.telebirr")}
                  </button>
                ) : null}
                {methods.includes("BANK_TRANSFER") ? (
                  <button
                    type="button"
                    className={`sb-v2__pay-method${payMethod === "BANK_TRANSFER" ? " sb-v2__pay-method--active" : ""}`}
                    onClick={() => setPayMethod("BANK_TRANSFER")}
                  >
                    {t("billingUi.bankCbe")}
                  </button>
                ) : null}
              </div>
            ) : null}

            {payMethod === "TELEBIRR" && payout?.telebirr ? (
              <div className="sb-v2__pay-account sb-v2__pay-account--telebirr">
                <p className="sb-v2__pay-account__label">{t("billingUi.sendTelebirrTo")}</p>
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
                {t("billingUi.amountDue")}{" "}
                <strong>
                  <EtbAmount amount={selectedInvoice.amountEtb} maximumFractionDigits={0} />
                </strong>
                <span> (${selectedInvoice.amountUsd.toLocaleString()} USD)</span>
              </p>
            ) : planPrice && canRequestInvoice ? (
              <p className="sb-v2__pay-panel__amount">
                {t("billingUi.renewalAmount")}{" "}
                <strong>
                  <EtbAmount amount={planPrice.etbMonthly} maximumFractionDigits={0} />
                </strong>
                <span>
                  {" "}
                  (${planPrice.usdMonthly.toLocaleString()} USD{t("billingUi.usdMo")})
                </span>
              </p>
            ) : null}
          </section>

          <section className="sb-v2__pay-panel__section sb-v2__pay-panel__section--form">
            <h4 className="sb-v2__pay-panel__label">{t("billingUi.stepSubmitProof")}</h4>

            {!hasOpenInvoice ? (
              <p className="sb-v2__pay-panel__note">{t("billingUi.proofNoteNoInvoice")}</p>
            ) : pendingForInvoice ? (
              <div className="sb-v2__pay-alert sb-v2__pay-alert--pending">
                {t("billingUi.proofUnderReview", {
                  invoice: pendingForInvoice.invoiceNumber,
                  date: formatDate(pendingForInvoice.createdAt),
                })}
              </div>
            ) : (
              <>
                <label className="sb-v2__pay-field">
                  <span>
                    {payMethod === "TELEBIRR"
                      ? t("billingUi.transactionNumber")
                      : t("billingUi.transactionId")}
                  </span>
                  <input
                    className="sb-v2__pay-input"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={
                      payMethod === "TELEBIRR" ? t("billingUi.telebirrPh") : t("billingUi.bankPh")
                    }
                    disabled={!hasOpenInvoice}
                  />
                </label>

                <label className="sb-v2__pay-field">
                  <span>{t("billingUi.receiptScreenshot")}</span>
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
                    alt={t("billingUi.receiptPreviewAlt")}
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
                  {submitting ? t("billingUi.submitting") : t("billingUi.submitVerification")}
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
          <h4 className="sb-v2__pay-panel__label">{t("billingUi.recentSubmissions")}</h4>
          <ul className="sb-v2__pay-history__list">
            {paymentProofs.slice(0, 4).map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.invoiceNumber}</strong>
                  <span className="sb-v2__muted">
                    {p.method === "TELEBIRR" ? t("billingUi.methodTelebirr") : t("billingUi.methodBank")} ·{" "}
                    {p.transactionId}
                  </span>
                </div>
                <span
                  className={`sb-v2__pay-history__status sb-v2__pay-history__status--${p.status.toLowerCase()}`}
                >
                  {proofStatusLabel(p.status, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
