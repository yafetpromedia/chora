"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { EtbAmount } from "@/components/billing/etb-amount";
import type { AppLocale } from "@/lib/i18n";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppToast } from "@/components/ui/app-toast";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  addPayrollAdjustment,
  approvePayrollRun,
  calculatePayrollRun,
  closePayrollRun,
  createPayrollPeriod,
  createPayrollRun,
  downloadPayrollExport,
  getPayrollDashboard,
  getPayrollRun,
  listPayrollPeriods,
  recordPayrollPayment,
} from "@/lib/payroll";

type ConfirmKind = "calculate" | "approve" | "close" | "force-close" | null;

function currentMonthDefaults(
  locale: AppLocale,
  monthLabel: (monthYear: string) => string,
) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  const pay = new Date(Date.UTC(y, m + 1, 5));
  const monthYear = start.toLocaleString(locale === "am" ? "am-ET" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    label: monthLabel(monthYear),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    payDate: pay.toISOString().slice(0, 10),
  };
}

const LIFECYCLE_STEPS = [
  "Draft",
  "Calculate",
  "Approve",
  "Pay",
  "Close",
] as const;

const ADJ_TYPES = [
  "BONUS",
  "ALLOWANCE",
  "PENALTY",
  "ADVANCE_DEDUCTION",
  "REIMBURSEMENT",
  "CORRECTION",
  "OTHER",
] as const;

export function PayrollWorkspace() {
  const { t, tn, locale } = useLocale();
  const canCalc = hasPermission(Permission.PAYROLL_CALCULATE);
  const canApprove = hasPermission(Permission.PAYROLL_APPROVE);
  const canPay = hasPermission(Permission.PAYROLL_PAY);
  const canClose = hasPermission(Permission.PAYROLL_CLOSE);
  const canExport = hasPermission(Permission.PAYROLL_EXPORT);
  const canAdjust = hasPermission(Permission.PAYROLL_ADJUST);

  const defaults = useMemo(
    () =>
      currentMonthDefaults(locale, (monthYear) =>
        t("payrollUi.defaultPeriodLabel", { monthYear }),
      ),
    [locale, t],
  );
  const [dashboard, setDashboard] = useState<Awaited<
    ReturnType<typeof getPayrollDashboard>
  > | null>(null);
  const [periods, setPeriods] = useState<Awaited<ReturnType<typeof listPayrollPeriods>>>([]);
  const [run, setRun] = useState<Awaited<ReturnType<typeof getPayrollRun>> | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [label, setLabel] = useState(defaults.label);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [payDate, setPayDate] = useState(defaults.payDate);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [busy, setBusy] = useState(false);
  const [forceReason, setForceReason] = useState("");
  const [paySnapId, setPaySnapId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");
  const [adjUserId, setAdjUserId] = useState("");
  const [adjType, setAdjType] = useState("BONUS");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");

  async function load() {
    setError("");
    try {
      const [d, p] = await Promise.all([
        getPayrollDashboard(),
        listPayrollPeriods(),
      ]);
      setDashboard(d);
      setPeriods(p);
      const runId = d.current?.runId ?? p[0]?.runs[0]?.id;
      if (runId) setRun(await getPayrollRun(runId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("payrollUi.loadFailed"));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function onCreatePeriod(e: FormEvent) {
    e.preventDefault();
    if (!canCalc) return;
    try {
      const period = await createPayrollPeriod({
        label,
        startDate,
        endDate,
        payDate,
      });
      const created = await createPayrollRun((period as { id: string }).id);
      setToast(t("payrollUi.periodRunCreated"));
      setRun(await getPayrollRun(created.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("payrollUi.createFailed"));
    }
  }

  async function runConfirmedAction() {
    if (!run || !confirm) return;
    setBusy(true);
    try {
      if (confirm === "calculate") {
        await calculatePayrollRun(run.id);
        setToast(t("payrollUi.calculated"));
      } else if (confirm === "approve") {
        await approvePayrollRun(run.id);
        setToast(t("payrollUi.approvedLocked"));
      } else if (confirm === "close") {
        await closePayrollRun(run.id);
        setToast(t("payrollUi.closed"));
      } else if (confirm === "force-close") {
        await closePayrollRun(run.id, {
          force: true,
          reason: forceReason.trim(),
        });
        setToast(t("payrollUi.forceClosed"));
      }
      setRun(await getPayrollRun(run.id));
      await load();
      setConfirm(null);
      setForceReason("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("payrollUi.actionFailed");
      if (confirm === "close" && /unpaid/i.test(msg)) {
        setConfirm("force-close");
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!run || !paySnapId || !canPay) return;
    setBusy(true);
    try {
      await recordPayrollPayment(paySnapId, {
        method: payMethod,
        reference: payRef.trim() || undefined,
        notes: t("payrollUi.paymentRecordedToast"),
      });
      setToast(t("payrollUi.paymentRecordedToast"));
      setPaySnapId(null);
      setPayRef("");
      setRun(await getPayrollRun(run.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("payrollUi.paymentFailed"));
    } finally {
      setBusy(false);
    }
  }

  const confirmCopy = useMemo(
    (): Record<
      Exclude<ConfirmKind, null>,
      { title: string; message: string; tone: "default" | "warning" | "danger" }
    > => ({
      calculate: {
        title: t("payrollUi.confirmCalculateTitle"),
        message: t("payrollUi.confirmCalculateMessage"),
        tone: "default",
      },
      approve: {
        title: t("payrollUi.confirmApproveTitle"),
        message: t("payrollUi.confirmApproveMessage"),
        tone: "warning",
      },
      close: {
        title: t("payrollUi.confirmCloseTitle"),
        message: t("payrollUi.confirmCloseMessage"),
        tone: "danger",
      },
      "force-close": {
        title: t("payrollUi.confirmForceCloseTitle"),
        message: t("payrollUi.confirmForceCloseMessage"),
        tone: "danger",
      },
    }),
    [t],
  );

  function runStatusLabel(status: string) {
    const key = `payrollUi.runStatus_${status.toUpperCase()}`;
    const translated = t(key);
    return translated === key ? status : translated;
  }

  function paymentStatusLabel(status: string) {
    const key = `payrollUi.payment_${status.toUpperCase()}`;
    const translated = t(key);
    return translated === key ? status : translated;
  }

  function lifecycleStepLabel(step: (typeof LIFECYCLE_STEPS)[number]) {
    const map = {
      Draft: "payrollUi.stepDraft",
      Calculate: "payrollUi.stepCalculate",
      Approve: "payrollUi.stepApprove",
      Pay: "payrollUi.stepPay",
      Close: "payrollUi.stepClose",
    } as const;
    return t(map[step]);
  }

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <AppConfirmDialog
        open={confirm != null && confirm !== "force-close"}
        title={confirm && confirm !== "force-close" ? confirmCopy[confirm].title : ""}
        message={
          confirm && confirm !== "force-close" ? confirmCopy[confirm].message : ""
        }
        tone={
          confirm && confirm !== "force-close" ? confirmCopy[confirm].tone : "default"
        }
        busy={busy}
        confirmLabel={t("payrollUi.continue")}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirmedAction()}
      />

      {confirm === "force-close" ? (
        <div className="hr-modal" role="dialog" aria-modal="true">
          <form
            className="hr-modal__panel"
            onSubmit={(e) => {
              e.preventDefault();
              void runConfirmedAction();
            }}
          >
            <h3>{confirmCopy["force-close"].title}</h3>
            <p>{confirmCopy["force-close"].message}</p>
            <label className="sa-field sa-field--full">
              <span>{t("payrollUi.reasonRequired")}</span>
              <textarea
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
                required
                rows={3}
              />
            </label>
            <div className="hr-modal__actions">
              <button
                type="button"
                className="sa-btn sa-btn--ghost"
                onClick={() => {
                  setConfirm(null);
                  setForceReason("");
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="sa-btn sa-btn--primary"
                disabled={busy || !forceReason.trim()}
              >
                {t("payrollUi.forceClose")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {paySnapId ? (
        <div className="hr-modal" role="dialog" aria-modal="true">
          <form className="hr-modal__panel" onSubmit={(e) => void submitPayment(e)}>
            <h3>{t("payrollUi.recordPaymentTitle")}</h3>
            <p className="sa-hours-note">{t("payrollUi.recordPaymentNote")}</p>
            <label className="sa-field">
              <span>{t("payrollUi.method")}</span>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="BANK_TRANSFER">
                  {t("payrollUi.method_BANK_TRANSFER")}
                </option>
                <option value="CASH">{t("payrollUi.method_CASH")}</option>
                <option value="OTHER">{t("payrollUi.method_OTHER")}</option>
              </select>
            </label>
            <label className="sa-field sa-field--full">
              <span>{t("payrollUi.referenceOptional")}</span>
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder={t("payrollUi.referencePlaceholder")}
              />
            </label>
            <div className="hr-modal__actions">
              <button
                type="button"
                className="sa-btn sa-btn--ghost"
                onClick={() => setPaySnapId(null)}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" className="sa-btn sa-btn--primary" disabled={busy}>
                {t("payrollUi.recordPayment")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("payrollUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{t("payrollUi.title")}</h2>
            <p className="tch-v2__hero-sub">
              {t("payrollUi.heroSubPrefix")}{" "}
              <Link href="/admin/hr/employees" className="tch-v2__hero-link">
                {tn("Employees")}
              </Link>
              {hasPermission(Permission.PAYROLL_SETTINGS) ? (
                <>
                  {" · "}
                  <Link
                    href="/admin/payroll/settings"
                    className="tch-v2__hero-link"
                  >
                    {tn("Settings")}
                  </Link>
                </>
              ) : null}
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{dashboard?.totals.employees ?? 0}</strong>
              <span>{t("payrollUi.statEmployees")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{periods.length}</strong>
              <span>{t("payrollUi.statPeriods")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>
                {run?.status ? runStatusLabel(run.status) : "—"}
              </strong>
              <span>{t("payrollUi.statRunStatus")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {dashboard ? (
                  <EtbAmount cents={dashboard.totals.netCents ?? 0} />
                ) : (
                  "—"
                )}
              </strong>
              <span>{t("payrollUi.statNet")}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="hr-banner">
        <p>
          <strong>{t("payrollUi.bannerStrong")}</strong> {t("payrollUi.bannerBody")}
        </p>
      </div>

      <ul className="hr-steps" aria-label={t("payrollUi.lifecycleAria")}>
        {LIFECYCLE_STEPS.map((step) => {
          const status = (run?.status ?? "").toUpperCase();
          const on =
            (step === "Draft" && (!run || status === "DRAFT")) ||
            (step === "Calculate" &&
              ["CALCULATING", "CALCULATED", "UNDER_REVIEW"].includes(status)) ||
            (step === "Approve" && status === "APPROVED") ||
            (step === "Pay" && status === "PAID") ||
            (step === "Close" && status === "CLOSED");
          return (
            <li key={step} className={`hr-step${on ? " hr-step--on" : ""}`}>
              {lifecycleStepLabel(step)}
            </li>
          );
        })}
      </ul>

      <div className="sa-stats">
        {(
          [
            [t("payrollUi.statEmployees"), dashboard?.totals.employees ?? 0, "present", true],
            [t("payrollUi.statGross"), dashboard?.totals.grossCents ?? 0, "present", false],
            [t("payrollUi.statDeductions"), dashboard?.totals.deductionCents ?? 0, "absent", false],
            [t("payrollUi.statNet"), dashboard?.totals.netCents ?? 0, "present", false],
            [t("payrollUi.statPaid"), dashboard?.totals.paidCents ?? 0, "leave", false],
            [t("payrollUi.statUnpaid"), dashboard?.totals.unpaidCents ?? 0, "late", false],
          ] as const
        ).map(([labelText, value, tone, isCount]) => (
          <div key={labelText} className={`sa-stat sa-stat--${tone}`}>
            <span className="sa-stat__label">{labelText}</span>
            <strong className="sa-stat__value">
              {isCount ? value : <EtbAmount cents={Number(value)} />}
            </strong>
          </div>
        ))}
      </div>

      {canCalc ? (
        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">{t("payrollUi.newPeriodTitle")}</h3>
              <p className="hr-panel__hint">{t("payrollUi.newPeriodHint")}</p>
            </div>
          </div>
          <form className="hr-form" onSubmit={(e) => void onCreatePeriod(e)}>
            <label className="sa-field sa-field--full">
              <span>{t("payrollUi.label")}</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className="sa-field">
              <span>{t("payrollUi.start")}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="sa-field">
              <span>{t("payrollUi.end")}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="sa-field">
              <span>{t("payrollUi.payDate")}</span>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </label>
            <div className="hr-form__actions">
              <button type="submit" className="sa-btn sa-btn--primary">
                {t("payrollUi.createPeriodRun")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="hr-panel">
        <div className="hr-panel__head">
          <div>
            <h3 className="hr-panel__title">{t("payrollUi.openRunTitle")}</h3>
            <p className="hr-panel__hint">{t("payrollUi.openRunHint")}</p>
          </div>
          {run ? (
            <span
              className={`hr-status hr-status--${run.status.toLowerCase()}`}
            >
              {runStatusLabel(run.status)}
            </span>
          ) : null}
        </div>
        <div className="hr-toolbar">
          <label className="sa-field">
            <span>{t("payrollUi.payrollRun")}</span>
            <select
              value={run?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                void getPayrollRun(id).then(setRun);
              }}
            >
              <option value="">{t("payrollUi.selectRun")}</option>
              {periods.flatMap((p) =>
                p.runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {p.label} · {runStatusLabel(r.status)}
                  </option>
                )),
              )}
            </select>
          </label>
          {run && canCalc ? (
            <button
              type="button"
              className="sa-btn sa-btn--primary"
              onClick={() => setConfirm("calculate")}
            >
              {t("payrollUi.calculate")}
            </button>
          ) : null}
          {run && canApprove ? (
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() => setConfirm("approve")}
            >
              {t("payrollUi.approve")}
            </button>
          ) : null}
          {run && canClose ? (
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() => setConfirm("close")}
            >
              {t("payrollUi.close")}
            </button>
          ) : null}
          {run && canExport ? (
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() =>
                void downloadPayrollExport(run.id)
                  .then(() => setToast(t("payrollUi.exported")))
                  .catch((err) =>
                    setError(
                      err instanceof Error ? err.message : t("payrollUi.exportFailed"),
                    ),
                  )
              }
            >
              {t("payrollUi.exportCsv")}
            </button>
          ) : null}
        </div>
      </section>

      {run && canAdjust && ["DRAFT", "CALCULATED", "UNDER_REVIEW"].includes(run.status) ? (
        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">{t("payrollUi.adjustmentTitle")}</h3>
              <p className="hr-panel__hint">{t("payrollUi.adjustmentHint")}</p>
            </div>
          </div>
          <form
            className="hr-form"
            onSubmit={(e) => {
              e.preventDefault();
              void addPayrollAdjustment(run.id, {
                userId: adjUserId,
                type: adjType,
                amountCents: Math.round(Number(adjAmount) * 100),
                reason: adjReason,
              })
                .then(async () => {
                  setToast(t("payrollUi.adjustmentSaved"));
                  setAdjReason("");
                  setAdjAmount("");
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : t("payrollUi.adjustFailed")),
                );
            }}
          >
            <label className="sa-field">
              <span>{t("payrollUi.employee")}</span>
              <select
                value={adjUserId}
                onChange={(e) => setAdjUserId(e.target.value)}
                required
              >
                <option value="">{t("payrollUi.selectEmployee")}</option>
                {run.snapshots.map((s) => (
                  <option key={s.id} value={s.userId}>
                    {s.employeeName} ({s.employeeCode})
                  </option>
                ))}
              </select>
            </label>
            <label className="sa-field">
              <span>{t("payrollUi.type")}</span>
              <select value={adjType} onChange={(e) => setAdjType(e.target.value)}>
                {ADJ_TYPES.map((typeCode) => (
                  <option key={typeCode} value={typeCode}>
                    {t(`payrollUi.adj_${typeCode}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sa-field">
              <span>{t("payrollUi.amountEtb")}</span>
              <input
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                required
                inputMode="decimal"
              />
            </label>
            <label className="sa-field sa-field--full">
              <span>{t("payrollUi.reason")}</span>
              <input
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                required
              />
            </label>
            <div className="hr-form__actions">
              <button type="submit" className="sa-btn sa-btn--primary">
                {t("payrollUi.addAdjustment")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {run ? (
        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">{run.period.label}</h3>
              <p className="hr-panel__hint">{t("payrollUi.periodReviewHint")}</p>
            </div>
          </div>
          {run.snapshots.length ? (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>{t("payrollUi.employee")}</th>
                    <th>{t("payrollUi.colDept")}</th>
                    <th>{t("payrollUi.colGross")}</th>
                    <th>{t("payrollUi.colDeductions")}</th>
                    <th>{t("payrollUi.colNet")}</th>
                    <th>{t("payrollUi.colPayment")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {run.snapshots.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.employeeName}</strong>
                        <div className="sa-emp">
                          <span>{s.employeeCode}</span>
                        </div>
                      </td>
                      <td>{s.departmentName ?? "—"}</td>
                      <td>
                        <EtbAmount cents={s.grossCents} />
                      </td>
                      <td>
                        <EtbAmount cents={s.deductionCents} />
                      </td>
                      <td>
                        <EtbAmount cents={s.netCents} />
                      </td>
                      <td>
                        <span
                          className={`hr-status hr-status--${(s.payment?.status ?? "UNPAID").toLowerCase()}`}
                        >
                          {paymentStatusLabel(s.payment?.status ?? "UNPAID")}
                        </span>
                      </td>
                      <td className="sa-actions">
                        {s.payslip ? (
                          <Link
                            className="sa-link"
                            href={`/admin/payroll/payslips/${s.payslip.id}`}
                          >
                            {t("payrollUi.payslip")}
                          </Link>
                        ) : null}
                        {canPay && s.payment?.status !== "PAID" ? (
                          <button
                            type="button"
                            className="sa-link"
                            onClick={() => setPaySnapId(s.id)}
                          >
                            {t("payrollUi.recordPayment")}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hr-empty">
              <p className="hr-empty__title">{t("payrollUi.noSnapshotsTitle")}</p>
              <p className="hr-empty__sub">{t("payrollUi.noSnapshotsSub")}</p>
            </div>
          )}
        </section>
      ) : (
        <div className="hr-empty">
          <p className="hr-empty__title">{t("payrollUi.emptyTitle")}</p>
          <p className="hr-empty__sub">{t("payrollUi.emptySub")}</p>
        </div>
      )}
    </div>
  );
}
