"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import {
  listPlatformPaymentProofs,
  reviewPlatformPaymentProof,
  type PlatformPaymentProofReview,
  type PlatformPaymentProofStatus,
} from "@/lib/platform-billing";

function formatMoney(usd: number, etb: number) {
  if (etb > 0) return `${etb.toLocaleString()} ETB`;
  return `$${usd.toLocaleString()}`;
}

type Props = {
  onReviewed?: () => void;
};

export function PlatformPaymentProofs({ onReviewed }: Props) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const FILTERS: { id: PlatformPaymentProofStatus | "ALL"; label: string }[] = [
    { id: "PENDING", label: t("platformUi.proofPending") },
    { id: "ALL", label: t("common.all") },
    { id: "CONFIRMED", label: t("platformUi.proofConfirmed") },
    { id: "REJECTED", label: t("platformUi.proofRejected") },
  ];
  function methodLabel(method: string) {
    if (method === "TELEBIRR") return t("platformUi.proofTelebirr");
    if (method === "BANK_TRANSFER") return t("platformUi.proofBank");
    return method;
  }
  const [rows, setRows] = useState<PlatformPaymentProofReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<PlatformPaymentProofStatus | "ALL">(
    "PENDING",
  );
  const [busyId, setBusyId] = useState("");
  const [preview, setPreview] = useState<PlatformPaymentProofReview | null>(
    null,
  );
  const [note, setNote] = useState("");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setError("");
    const data = await listPlatformPaymentProofs(
      filter === "ALL" ? undefined : filter,
    );
    setRows(data);
  }, [filter]);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void load()
        .catch((e) => fail(e, t("platformUi.proofErrLoad")))
        .finally(() => setLoading(false));
    });
  }, [load, router]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "PENDING").length,
    [rows],
  );

  async function review(id: string, status: "CONFIRMED" | "REJECTED") {
    setBusyId(id);
    setError("");
    try {
      const res = await reviewPlatformPaymentProof(id, {
        status,
        reviewNote: note.trim() || undefined,
      });
      setMessage(res.message);
      setPreview(null);
      setNote("");
      await load();
      onReviewed?.();
    } catch (err) {
      fail(err, t("platformUi.proofErrReview"));
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="plat-billing-v2__panel" style={{ marginTop: "1.25rem" }}>
      <div className="plat-billing-v2__panel-head" style={{ marginBottom: "0.85rem" }}>
        <div>
          <h3 className="plat-billing-v2__panel-title">{t("platformUi.proofTitle")}</h3>
          <p className="plat-billing-v2__panel-hint">
            {t("platformUi.proofSub")}
          </p>
        </div>
        {filter === "PENDING" && pendingCount > 0 ? (
          <span className="plat-role-badge">{pendingCount} pending</span>
        ) : null}
      </div>

      <div
        className="plat-filter-tabs plat-subjects-v2__filters"
        role="tablist"
        style={{ marginBottom: "0.85rem" }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`plat-filter-tab${
              filter === f.id ? " plat-filter-tab--active" : ""
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="plat-billing-v2__muted">{t("platformUi.proofLoading")}</p>
      ) : rows.length === 0 ? (
        <p className="plat-billing-v2__muted">
          {t("platformUi.proofEmpty")}
        </p>
      ) : (
        <div className="plat-subjects-v2__table-wrap">
          <table className="plat-subjects-v2__table">
            <thead>
              <tr>
                <th>{t("platformUi.proofColSchool")}</th>
                <th>{t("platformUi.proofColInvoice")}</th>
                <th>{t("platformUi.proofColMethod")}</th>
                <th>{t("platformUi.proofColTxn")}</th>
                <th>{t("platformUi.proofColSubmitted")}</th>
                <th>{t("platformUi.proofColStatus")}</th>
                <th aria-label={t("common.actions")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="plat-subjects-v2__name">{row.schoolName}</span>
                    <code className="plat-subjects-v2__code">{row.joinCode}</code>
                  </td>
                  <td>
                    <span className="plat-subjects-v2__name">
                      {row.invoiceNumber}
                    </span>
                    <span className="plat-billing-v2__muted">
                      {formatMoney(row.amountUsd, row.amountEtb)}
                    </span>
                  </td>
                  <td>{methodLabel(row.method)}</td>
                  <td>
                    <code className="plat-subjects-v2__code">
                      {row.transactionId}
                    </code>
                  </td>
                  <td className="plat-billing-v2__muted">
                    {new Date(row.createdAt).toLocaleString(locale === "am" ? "am-ET" : undefined)}
                  </td>
                  <td>
                    <span
                      className={`plat-invoice-status plat-invoice-status--${
                        row.status === "CONFIRMED"
                          ? "paid"
                          : row.status === "REJECTED"
                            ? "void"
                            : "sent"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--xs"
                      onClick={() => {
                        setPreview(row);
                        setNote(row.reviewNote ?? "");
                      }}
                    >
                      <DashIcon name="fees" className="dash-icon--xs" />
                      {t("platformUi.proofView")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview ? (
        <div
          className="stu-drawer-backdrop"
          role="presentation"
          onClick={() => setPreview(null)}
        >
          <div
            className="plat-billing-v2__panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("platformUi.proofReceipt")}
            style={{
              maxWidth: "36rem",
              width: "min(36rem, calc(100vw - 2rem))",
              margin: "4rem auto",
              maxHeight: "85vh",
              overflow: "auto",
              position: "relative",
              zIndex: 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h3 className="plat-billing-v2__panel-title">
                  {preview.invoiceNumber}
                </h3>
                <p className="plat-billing-v2__panel-hint">
                  {preview.schoolName} · {methodLabel(preview.method)} ·{" "}
                  {preview.transactionId}
                </p>
              </div>
              <button
                type="button"
                className="plat-btn plat-btn--ghost plat-btn--xs"
                onClick={() => setPreview(null)}
              >
                {t("common.close")}
              </button>
            </div>

            <img
              src={preview.proofUrl}
              alt={`Payment receipt for ${preview.invoiceNumber}`}
              style={{
                width: "100%",
                marginTop: "0.85rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border, #d8e0e6)",
                background: "#0f1c24",
              }}
            />

            {preview.status === "PENDING" ? (
              <div style={{ marginTop: "0.85rem" }}>
                <label className="plat-field">
                  <span>{t("platformUi.proofReviewNote")}</span>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("platformUi.proofNotePh")}
                  />
                </label>
                <div
                  className="plat-subjects-v2__actions"
                  style={{ marginTop: "0.75rem" }}
                >
                  <button
                    type="button"
                    className="plat-btn plat-btn--ghost plat-btn--danger"
                    disabled={busyId === preview.id}
                    onClick={() => void review(preview.id, "REJECTED")}
                  >
                    {t("platformUi.proofReject")}
                  </button>
                  <button
                    type="button"
                    className="plat-btn plat-btn--primary"
                    disabled={busyId === preview.id}
                    onClick={() => void review(preview.id, "CONFIRMED")}
                  >
                    {busyId === preview.id ? t("platformUi.saving") : t("platformUi.proofConfirmPaid")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="plat-billing-v2__muted" style={{ marginTop: "0.75rem" }}>
                {preview.status}
                {preview.reviewNote ? ` · ${preview.reviewNote}` : ""}
                {preview.reviewedAt
                  ? ` · ${new Date(preview.reviewedAt).toLocaleString()}`
                  : ""}
              </p>
            )}
          </div>
        </div>
      ) : null}

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={message} tone="success" onDismiss={() => setMessage("")} />
    </section>
  );
}
