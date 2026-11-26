"use client";

import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { type StudentFinanceSummary } from "@/lib/finance";
import { EtbAmount } from "@/components/billing/etb-amount";

function FinanceIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

const FEE_STATUS_KEYS: Record<string, string> = {
  PAID: "feesUi.statusPaid",
  PARTIAL: "feesUi.statusPartial",
  UNPAID: "feesUi.statusUnpaid",
  OVERDUE: "feesUi.statusOverdue",
  WAIVED: "feesUi.statusWaived",
  VOID: "feesUi.statusVoid",
};

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

type Props = {
  summary: StudentFinanceSummary;
};

export function StudentFeesPanel({ summary }: Props) {
  const { t } = useLocale();

  function feeStatusLabel(status: string) {
    const key = FEE_STATUS_KEYS[status.toUpperCase()];
    if (key) return t(key);
    return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
  }

  function paymentMethodLabel(method: string) {
    return method
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const paidPct =
    summary.totalDueCents > 0
      ? Math.min(100, Math.round((summary.totalPaidCents / summary.totalDueCents) * 100))
      : summary.totalPaidCents > 0
        ? 100
        : 0;

  const allClear = summary.outstandingCents === 0 && summary.fees.length > 0;

  return (
    <div className="stu-fees">
      <header className="stu-fees__hero">
        <div className="stu-fees__hero-glow" aria-hidden />
        <div className="stu-fees__hero-inner">
          <div className="stu-fees__hero-main">
            <div className="stu-fees__hero-brand">
              <span className="stu-fees__chip">{t("feesUi.finance")}</span>
              <span className="stu-fees__hero-icon" aria-hidden>
                <FinanceIcon />
              </span>
            </div>
            <h2 className="stu-fees__hero-title">{summary.student.name}</h2>
            <p className="stu-fees__hero-sub">
              {summary.student.grade}
              {summary.student.section ? ` · ${summary.student.section}` : ""}
            </p>
          </div>
          <div className="stu-fees__balance">
            <span className="stu-fees__balance-label">{t("feesUi.outstanding")}</span>
            <strong className="stu-fees__balance-value">
              <EtbAmount cents={summary.outstandingCents} symbolSize={20} />
            </strong>
            {allClear ? (
              <span className="stu-fees__balance-tag stu-fees__balance-tag--clear">
                {t("feesUi.allClear")}
              </span>
            ) : null}
          </div>
        </div>
        <div className="stu-fees__hero-stats">
          <div className="stu-fees__stat">
            <strong>
              <EtbAmount cents={summary.totalDueCents} />
            </strong>
            <span>{t("feesUi.totalDue")}</span>
          </div>
          <div className="stu-fees__stat">
            <strong>
              <EtbAmount cents={summary.totalPaidCents} />
            </strong>
            <span>{t("feesUi.paid")}</span>
          </div>
          <div className="stu-fees__stat stu-fees__stat--accent">
            <strong>{summary.fees.length}</strong>
            <span>{t("feesUi.feeItems")}</span>
          </div>
          <div className="stu-fees__stat">
            <strong>{summary.payments.length}</strong>
            <span>{t("feesUi.payments")}</span>
          </div>
        </div>
        {summary.totalDueCents > 0 ? (
          <div className="stu-fees__progress">
            <div className="stu-fees__progress-head">
              <span>{t("feesUi.paymentProgress")}</span>
              <strong>{t("feesUi.paidPct", { pct: paidPct })}</strong>
            </div>
            <div className="stu-fees__progress-bar">
              <span style={{ width: `${paidPct}%` }} />
            </div>
          </div>
        ) : null}
      </header>

      <div className="stu-fees__tips">
        <article className="stu-fees__tip">
          <span className="stu-fees__tip-icon" aria-hidden>
            <DashIcon name="fees" className="dash-icon--sm" />
          </span>
          <div>
            <strong>{t("feesUi.tipViewFeesTitle")}</strong>
            <p>{t("feesUi.tipViewFeesBody")}</p>
          </div>
        </article>
        <article className="stu-fees__tip">
          <span className="stu-fees__tip-icon" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
              aria-hidden
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div>
            <strong>{t("feesUi.tipPaymentsTitle")}</strong>
            <p>{t("feesUi.tipPaymentsBody")}</p>
          </div>
        </article>
        <article className="stu-fees__tip">
          <span className="stu-fees__tip-icon" aria-hidden>
            <DashIcon name="announcements" className="dash-icon--sm" />
          </span>
          <div>
            <strong>{t("feesUi.tipQuestionsTitle")}</strong>
            <p>{t("feesUi.tipQuestionsBody")}</p>
          </div>
        </article>
      </div>

      <div className="stu-fees__grid">
        <section className="stu-fees__card">
          <div className="stu-fees__card-head">
            <div>
              <h3 className="stu-fees__card-title">{t("feesUi.feeItemsTitle")}</h3>
              <p className="stu-fees__card-sub">{t("feesUi.feeItemsSub")}</p>
            </div>
            <span className="stu-fees__count">{summary.fees.length}</span>
          </div>

          {summary.fees.length === 0 ? (
            <div className="stu-fees__empty">
              <span className="stu-fees__empty-icon" aria-hidden>
                <FinanceIcon />
              </span>
              <h4>{t("feesUi.noFeeRecords")}</h4>
              <p>{t("feesUi.noFeeRecordsHint")}</p>
            </div>
          ) : (
            <ul className="stu-fees__list">
              {summary.fees.map((item) => (
                <li key={item.id} className="stu-fees__row">
                  <div className="stu-fees__row-accent" aria-hidden />
                  <div className="stu-fees__row-main">
                    <div className="stu-fees__row-top">
                      <div>
                        <p className="stu-fees__row-title">{item.label}</p>
                        <p className="stu-fees__row-meta">
                          {t("feesUi.dueMeta", {
                            date: formatDate(item.dueDate),
                            feeType: item.feeType,
                          })}
                        </p>
                      </div>
                      <span className={`stu-fees__badge stu-fees__badge--${item.status.toLowerCase()}`}>
                        {feeStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="stu-fees__row-amounts">
                      <div>
                        <span className="stu-fees__amount-label">{t("feesUi.balance")}</span>
                        <strong>
                          <EtbAmount cents={item.balanceCents} />
                        </strong>
                      </div>
                      <div>
                        <span className="stu-fees__amount-label">{t("feesUi.total")}</span>
                        <strong>
                          <EtbAmount cents={item.amountDueCents} />
                        </strong>
                      </div>
                      <div>
                        <span className="stu-fees__amount-label">{t("feesUi.paid")}</span>
                        <strong>
                          <EtbAmount cents={item.paidAmountCents} />
                        </strong>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="stu-fees__card">
          <div className="stu-fees__card-head">
            <div>
              <h3 className="stu-fees__card-title">{t("feesUi.recentPayments")}</h3>
              <p className="stu-fees__card-sub">{t("feesUi.recentPaymentsSub")}</p>
            </div>
            <span className="stu-fees__count">{summary.payments.length}</span>
          </div>

          {summary.payments.length === 0 ? (
            <div className="stu-fees__empty">
              <span className="stu-fees__empty-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <h4>{t("feesUi.noPayments")}</h4>
              <p>{t("feesUi.noPaymentsHint")}</p>
            </div>
          ) : (
            <ul className="stu-fees__list stu-fees__list--payments">
              {summary.payments.map((payment) => (
                <li key={payment.id} className="stu-fees__pay-row">
                  <div className="stu-fees__pay-icon" aria-hidden>
                    <FinanceIcon />
                  </div>
                  <div className="stu-fees__pay-main">
                    <p className="stu-fees__pay-amount">
                      <EtbAmount cents={payment.amountCents} symbolSize={16} />
                    </p>
                    <p className="stu-fees__pay-meta">
                      {payment.receiptNumber} · {formatDate(payment.paidAt)}
                    </p>
                  </div>
                  <span className="stu-fees__pay-method">{paymentMethodLabel(payment.method)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}