"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EtbAmount } from "@/components/billing/etb-amount";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { AUTH_ROLE_KEY } from "@/lib/auth";
import type { AppLocale } from "@/lib/i18n";
import { getPayslip } from "@/lib/payroll";
import { hasPermission, Permission } from "@/lib/permissions";

function localeTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : "en-US";
}

function formatPayDate(value: string, locale: AppLocale) {
  const iso = String(value).slice(0, 10);
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso || "—";
  return parsed.toLocaleDateString(localeTag(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PayslipView({ payslipId }: { payslipId: string }) {
  const { t, locale } = useLocale();
  const canSeeEmployer = hasPermission(Permission.PAYSLIP_MANAGE);
  const [data, setData] = useState<Awaited<ReturnType<typeof getPayslip>> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [backHref, setBackHref] = useState("/teacher/payroll/me");

  useEffect(() => {
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resolve the return path from browser authentication storage.
    setBackHref(role === "admin" ? "/admin/payroll/me" : "/teacher/payroll/me");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset loading before fetching a different payslip.
    setLoading(true);
    void getPayslip(payslipId)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("payslipViewUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [payslipId]);

  if (loading && !data) {
    return (
      <div className="tch-day tch-slip">
        <div className="tch-day__loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{t("payslipViewUi.loading")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="tch-day tch-slip">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <div className="tch-day__empty">
          <div className="tch-day__empty-icon" aria-hidden>
            <DashIcon name="finance" />
          </div>
          <h2>{t("payslipViewUi.openFailed")}</h2>
          <p>{error || t("payslipViewUi.notFound")}</p>
          <Link href={backHref} className="tch-day__empty-btn">
            {t("payslipViewUi.backPayslips")}
          </Link>
        </div>
      </div>
    );
  }

  const p = data.payload;

  return (
    <div className="tch-day tch-slip hr-payslip-print">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <div className="tch-slip__toolbar no-print">
        <Link href={backHref} className="tch-day__link">
          {t("payslipViewUi.backLink")}
        </Link>
        <button
          type="button"
          className="tch-class__btn tch-class__btn--primary"
          onClick={() => window.print()}
        >
          {t("payslipViewUi.printSlip")}
        </button>
      </div>

      <header className="tch-day__hero tch-slip__hero">
        <div className="tch-day__hero-main">
          <div className="tch-day__brand">
            <span className="tch-day__chip">{t("payslipViewUi.chip")}</span>
            <span className="tch-day__icon" aria-hidden>
              <DashIcon name="finance" className="dash-icon--sm" />
            </span>
          </div>
          <h1 className="tch-day__title">{p.period}</h1>
          <p className="tch-day__sub">
            {p.employeeName}
            {p.position ? ` · ${p.position}` : ""}
            {t("payslipViewUi.paidOn")}
            {formatPayDate(p.payDate, locale)}
          </p>
        </div>
        <div className="tch-day__stats" aria-label={t("payslipViewUi.payTotalsAria")}>
          <div className="tch-day__stat">
            <strong>
              <EtbAmount cents={p.grossCents} symbolSize={12} />
            </strong>
            <span>{t("payslipViewUi.gross")}</span>
          </div>
          <div className="tch-day__stat tch-day__stat--warn">
            <strong>
              <EtbAmount cents={p.deductionCents} symbolSize={12} />
            </strong>
            <span>{t("payslipViewUi.deductions")}</span>
          </div>
          <div className="tch-day__stat">
            <strong>
              <EtbAmount cents={p.netCents} symbolSize={12} />
            </strong>
            <span>{t("payslipViewUi.netPay")}</span>
          </div>
        </div>
      </header>

      <article className="tch-slip__sheet hr-payslip-sheet">
        <header className="tch-slip__brand">
          {p.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.schoolLogoUrl}
              alt=""
              className="tch-slip__logo"
            />
          ) : (
            <div className="tch-slip__logo tch-slip__logo--empty" aria-hidden>
              {(p.schoolName ?? "S").trim().slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="tch-slip__brand-text">
            <h2>{p.schoolName ?? t("payslipViewUi.payslip")}</h2>
            <p>
              {[p.schoolAddress, p.schoolPhone, p.schoolEmail]
                .filter(Boolean)
                .join(" · ") || t("payslipViewUi.salaryStatement")}
            </p>
          </div>
        </header>

        <div className="tch-slip__title-row">
          <div>
            <p className="tch-slip__eyebrow">{t("payslipViewUi.salaryStatement")}</p>
            <h3>{t("payslipViewUi.payslip")}</h3>
            <p className="tch-slip__period">{p.period}</p>
          </div>
          <div className="tch-slip__net-badge">
            <span>{t("payslipViewUi.netPay")}</span>
            <strong>
              <EtbAmount cents={p.netCents} />
            </strong>
          </div>
        </div>

        <dl className="tch-slip__meta">
          <div>
            <dt>{t("payslipViewUi.employee")}</dt>
            <dd>{p.employeeName}</dd>
          </div>
          <div>
            <dt>{t("payslipViewUi.id")}</dt>
            <dd>{p.employeeCode}</dd>
          </div>
          <div>
            <dt>{t("payslipViewUi.position")}</dt>
            <dd>{p.position ?? "—"}</dd>
          </div>
          <div>
            <dt>{t("payslipViewUi.department")}</dt>
            <dd>{p.department ?? "—"}</dd>
          </div>
          <div>
            <dt>{t("payslipViewUi.payDate")}</dt>
            <dd>{formatPayDate(p.payDate, locale)}</dd>
          </div>
        </dl>

        <section className="tch-slip__section">
          <h4>{t("payslipViewUi.earnings")}</h4>
          <ul className="tch-slip__lines">
            {p.earnings.map((line) => (
              <li key={`${line.code}-${line.label}`}>
                <span>{line.label}</span>
                <EtbAmount cents={line.amountCents} />
              </li>
            ))}
          </ul>
        </section>

        <section className="tch-slip__section">
          <h4>{t("payslipViewUi.deductionsTitle")}</h4>
          <ul className="tch-slip__lines">
            {p.deductions.length ? (
              p.deductions.map((line) => (
                <li key={`${line.code}-${line.label}`}>
                  <span>{line.label}</span>
                  <EtbAmount cents={line.amountCents} />
                </li>
              ))
            ) : (
              <li>
                <span>{t("payslipViewUi.none")}</span>
                <span>—</span>
              </li>
            )}
          </ul>
        </section>

        <div className="tch-slip__totals">
          <p>
            <span>{t("payslipViewUi.gross")}</span>
            <EtbAmount cents={p.grossCents} />
          </p>
          <p>
            <span>{t("payslipViewUi.totalDeductions")}</span>
            <EtbAmount cents={p.deductionCents} />
          </p>
          <p className="tch-slip__totals-net">
            <span>{t("payslipViewUi.netPay")}</span>
            <EtbAmount cents={p.netCents} />
          </p>
          {canSeeEmployer && p.employerCostCents != null ? (
            <p>
              <span>{t("payslipViewUi.employerCost")}</span>
              <EtbAmount cents={p.employerCostCents} />
            </p>
          ) : null}
        </div>
      </article>
    </div>
  );
}