"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EtbAmount } from "@/components/billing/etb-amount";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import type { AppLocale } from "@/lib/i18n";
import { listMyPayslips } from "@/lib/payroll";

function dateLocaleTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function formatPayMonth(value: string, dateLocale?: string) {
  const iso = String(value).slice(0, 10);
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso || "—";
  return parsed.toLocaleDateString(dateLocale, {
    month: "short",
    year: "numeric",
  });
}

function formatPayDate(value: string, dateLocale?: string) {
  const iso = String(value).slice(0, 10);
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso || "—";
  return parsed.toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MyPayslipsPanel({ role }: { role: "admin" | "teacher" }) {
  const { t, locale } = useLocale();
  const dateLocale = dateLocaleTag(locale);
  const base = role === "teacher" ? "/teacher" : "/admin";
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listMyPayslips>>>(
    [],
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listMyPayslips()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("myPayslipsUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [t]);

  const latest = rows[0];
  const totalNet = useMemo(
    () => rows.reduce((sum, row) => sum + (row.snapshot.netCents ?? 0), 0),
    [rows],
  );

  return (
    <div className="tch-day tch-payslips">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="tch-day__hero">
        <div className="tch-day__hero-main">
          <div className="tch-day__brand">
            <span className="tch-day__chip">{t("myPayslipsUi.chipCompensation")}</span>
            <span className="tch-day__icon" aria-hidden>
              <DashIcon name="finance" className="dash-icon--sm" />
            </span>
          </div>
          <h2 className="tch-day__title">{t("myPayslipsUi.title")}</h2>
          <p className="tch-day__sub">{t("myPayslipsUi.subtitle")}</p>
        </div>
        <div className="tch-day__stats" aria-label={t("myPayslipsUi.summaryAria")}>
          <div className="tch-day__stat">
            <strong>{loading ? "—" : rows.length}</strong>
            <span>{t("myPayslipsUi.statPayslips")}</span>
          </div>
          <div className="tch-day__stat">
            <strong>
              {loading ? "—" : latest ? formatPayMonth(latest.payDate, dateLocale) : "—"}
            </strong>
            <span>{t("myPayslipsUi.statLatest")}</span>
          </div>
          <div className="tch-day__stat">
            <strong>
              {loading || !latest ? (
                "—"
              ) : (
                <EtbAmount cents={latest.snapshot.netCents} symbolSize={12} />
              )}
            </strong>
            <span>{t("myPayslipsUi.statLatestNet")}</span>
          </div>
          <div className="tch-day__stat">
            <strong>
              {loading || !rows.length ? (
                "—"
              ) : (
                <EtbAmount cents={totalNet} symbolSize={12} />
              )}
            </strong>
            <span>{t("myPayslipsUi.statAllTime")}</span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="tch-day__loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{t("myPayslipsUi.loading")}</p>
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="tch-day__empty">
          <div className="tch-day__empty-icon" aria-hidden>
            <DashIcon name="finance" />
          </div>
          <h2>{t("myPayslipsUi.emptyTitle")}</h2>
          <p>{t("myPayslipsUi.emptyBody")}</p>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="tch-day__board">
          <div className="tch-day__board-head">
            <div>
              <h2>{t("myPayslipsUi.historyTitle")}</h2>
              <p>{t("myPayslipsUi.historySub")}</p>
            </div>
          </div>

          <ul className="tch-payslips__list">
            {rows.map((row, index) => (
              <li key={row.id}>
                <Link
                  href={`${base}/payroll/payslips/${row.id}`}
                  className={`tch-payslips__card${
                    index === 0 ? " tch-payslips__card--latest" : ""
                  }`}
                >
                  <div className="tch-payslips__main">
                    <div className="tch-payslips__row">
                      <h3>{row.periodLabel}</h3>
                      {index === 0 ? (
                        <span className="tch-day__pill tch-day__pill--live">
                          {t("myPayslipsUi.latestPill")}
                        </span>
                      ) : null}
                    </div>
                    <p>
                      {t("myPayslipsUi.payDateMeta", {
                        date: formatPayDate(row.payDate, dateLocale),
                      })}
                    </p>
                    <div className="tch-payslips__meta">
                      <span>
                        {t("myPayslipsUi.gross")}{" "}
                        <EtbAmount
                          cents={row.snapshot.grossCents}
                          symbolSize={11}
                        />
                      </span>
                      <span>
                        {t("myPayslipsUi.deductions")}{" "}
                        <EtbAmount
                          cents={row.snapshot.deductionCents}
                          symbolSize={11}
                        />
                      </span>
                    </div>
                  </div>
                  <div className="tch-payslips__net">
                    <span>{t("myPayslipsUi.netPay")}</span>
                    <strong>
                      <EtbAmount cents={row.snapshot.netCents} />
                    </strong>
                    <em aria-hidden>→</em>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}