"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { EtbAmount } from "@/components/billing/etb-amount";
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

function currentMonthDefaults() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  const pay = new Date(Date.UTC(y, m + 1, 5));
  const label = start.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    label: `${label} Payroll`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    payDate: pay.toISOString().slice(0, 10),
  };
}

export function PayrollWorkspace() {
  const canCalc = hasPermission(Permission.PAYROLL_CALCULATE);
  const canApprove = hasPermission(Permission.PAYROLL_APPROVE);
  const canPay = hasPermission(Permission.PAYROLL_PAY);
  const canClose = hasPermission(Permission.PAYROLL_CLOSE);
  const canExport = hasPermission(Permission.PAYROLL_EXPORT);
  const canAdjust = hasPermission(Permission.PAYROLL_ADJUST);

  const defaults = currentMonthDefaults();
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
      setError(err instanceof Error ? err.message : "Failed to load payroll");
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
      setToast("Payroll period & run created");
      setRun(await getPayrollRun(created.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function runConfirmedAction() {
    if (!run || !confirm) return;
    setBusy(true);
    try {
      if (confirm === "calculate") {
        await calculatePayrollRun(run.id);
        setToast("Payroll calculated");
      } else if (confirm === "approve") {
        await approvePayrollRun(run.id);
        setToast("Payroll approved — editing locked");
      } else if (confirm === "close") {
        await closePayrollRun(run.id);
        setToast("Payroll closed");
      } else if (confirm === "force-close") {
        await closePayrollRun(run.id, {
          force: true,
          reason: forceReason.trim(),
        });
        setToast("Payroll force-closed");
      }
      setRun(await getPayrollRun(run.id));
      await load();
      setConfirm(null);
      setForceReason("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
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
        notes: "Payment recorded in Chora (not a verified bank transfer)",
      });
      setToast(
        "Payment recorded in Chora — this does not confirm an external bank transfer",
      );
      setPaySnapId(null);
      setPayRef("");
      setRun(await getPayrollRun(run.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  const confirmCopy: Record<
    Exclude<ConfirmKind, null>,
    { title: string; message: string; tone: "default" | "warning" | "danger" }
  > = {
    calculate: {
      title: "Calculate payroll?",
      message:
        "This will generate or replace employee snapshots, lines, and payslips for the open run. Recalculation is allowed until the run is approved.",
      tone: "default",
    },
    approve: {
      title: "Approve payroll?",
      message:
        "Approval locks this run from normal recalculation and adjustments. Payments can then be recorded.",
      tone: "warning",
    },
    close: {
      title: "Close payroll?",
      message:
        "Closing locks the run permanently. All required employee payments should already be recorded as paid.",
      tone: "danger",
    },
    "force-close": {
      title: "Force-close with unpaid employees?",
      message:
        "Some payments are still unpaid. Force-close requires a reason and is audited. Prefer recording payments first.",
      tone: "danger",
    },
  };

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
        confirmLabel="Continue"
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
              <span>Reason (required)</span>
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
                Cancel
              </button>
              <button
                type="submit"
                className="sa-btn sa-btn--primary"
                disabled={busy || !forceReason.trim()}
              >
                Force close
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {paySnapId ? (
        <div className="hr-modal" role="dialog" aria-modal="true">
          <form className="hr-modal__panel" onSubmit={(e) => void submitPayment(e)}>
            <h3>Record payment in Chora</h3>
            <p className="sa-hours-note">
              This records payment status in Chora. It does not confirm that money
              was transferred by a bank or payment provider.
            </p>
            <label className="sa-field">
              <span>Method</span>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="sa-field sa-field--full">
              <span>Reference (optional)</span>
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Cheque / transfer ref"
              />
            </label>
            <div className="hr-modal__actions">
              <button
                type="button"
                className="sa-btn sa-btn--ghost"
                onClick={() => setPaySnapId(null)}
              >
                Cancel
              </button>
              <button type="submit" className="sa-btn sa-btn--primary" disabled={busy}>
                Record payment
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Compensation &amp; payroll</span>
            <h2 className="tch-v2__hero-title">Payroll runs</h2>
            <p className="tch-v2__hero-sub">
              Create a period, calculate snapshots, approve, record payments,
              then close. Open{" "}
              <Link href="/admin/hr/employees" className="tch-v2__hero-link">
                Employees
              </Link>
              {hasPermission(Permission.PAYROLL_SETTINGS) ? (
                <>
                  {" · "}
                  <Link
                    href="/admin/payroll/settings"
                    className="tch-v2__hero-link"
                  >
                    Settings
                  </Link>
                </>
              ) : null}
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{dashboard?.totals.employees ?? 0}</strong>
              <span>Employees</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{periods.length}</strong>
              <span>Periods</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{run?.status ?? "—"}</strong>
              <span>Run status</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {dashboard ? (
                  <EtbAmount cents={dashboard.totals.netCents ?? 0} />
                ) : (
                  "—"
                )}
              </strong>
              <span>Net</span>
            </div>
          </div>
        </div>
      </header>

      <div className="hr-banner">
        <p>
          <strong>Payment recorded in Chora</strong> updates status here — it does
          not confirm a bank transfer unless a payment integration is connected.
        </p>
      </div>

      <ul className="hr-steps" aria-label="Payroll lifecycle">
        {(
          [
            "Draft",
            "Calculate",
            "Approve",
            "Pay",
            "Close",
          ] as const
        ).map((step) => {
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
              {step}
            </li>
          );
        })}
      </ul>

      <div className="sa-stats">
        {(
          [
            ["Employees", dashboard?.totals.employees ?? 0, "present"],
            ["Gross", dashboard?.totals.grossCents ?? 0, "present"],
            ["Deductions", dashboard?.totals.deductionCents ?? 0, "absent"],
            ["Net", dashboard?.totals.netCents ?? 0, "present"],
            ["Paid", dashboard?.totals.paidCents ?? 0, "leave"],
            ["Unpaid", dashboard?.totals.unpaidCents ?? 0, "late"],
          ] as const
        ).map(([labelText, value, tone]) => (
          <div key={labelText} className={`sa-stat sa-stat--${tone}`}>
            <span className="sa-stat__label">{labelText}</span>
            <strong className="sa-stat__value">
              {labelText === "Employees" ? (
                value
              ) : (
                <EtbAmount cents={Number(value)} />
              )}
            </strong>
          </div>
        ))}
      </div>

      {canCalc ? (
        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">New payroll period</h3>
              <p className="hr-panel__hint">
                Defines the attendance window and pay date for the next run.
              </p>
            </div>
          </div>
          <form className="hr-form" onSubmit={(e) => void onCreatePeriod(e)}>
            <label className="sa-field sa-field--full">
              <span>Label</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className="sa-field">
              <span>Start</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="sa-field">
              <span>End</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="sa-field">
              <span>Pay date</span>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </label>
            <div className="hr-form__actions">
              <button type="submit" className="sa-btn sa-btn--primary">
                Create period + run
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="hr-panel">
        <div className="hr-panel__head">
          <div>
            <h3 className="hr-panel__title">Open run</h3>
            <p className="hr-panel__hint">
              Select a run, then calculate, approve, pay, or export.
            </p>
          </div>
          {run ? (
            <span
              className={`hr-status hr-status--${run.status.toLowerCase()}`}
            >
              {run.status}
            </span>
          ) : null}
        </div>
        <div className="hr-toolbar">
          <label className="sa-field">
            <span>Payroll run</span>
            <select
              value={run?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                void getPayrollRun(id).then(setRun);
              }}
            >
              <option value="">Select a run…</option>
              {periods.flatMap((p) =>
                p.runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {p.label} · {r.status}
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
              Calculate
            </button>
          ) : null}
          {run && canApprove ? (
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() => setConfirm("approve")}
            >
              Approve
            </button>
          ) : null}
          {run && canClose ? (
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() => setConfirm("close")}
            >
              Close
            </button>
          ) : null}
          {run && canExport ? (
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() =>
                void downloadPayrollExport(run.id)
                  .then(() => setToast("Exported"))
                  .catch((err) =>
                    setError(
                      err instanceof Error ? err.message : "Export failed",
                    ),
                  )
              }
            >
              Export CSV
            </button>
          ) : null}
        </div>
      </section>

      {run && canAdjust && ["DRAFT", "CALCULATED", "UNDER_REVIEW"].includes(run.status) ? (
        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">Manual adjustment</h3>
              <p className="hr-panel__hint">
                Reason required. Recalculate the run to apply the line on payslips.
              </p>
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
                  setToast("Adjustment saved — recalculate to apply");
                  setAdjReason("");
                  setAdjAmount("");
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : "Adjust failed"),
                );
            }}
          >
            <label className="sa-field">
              <span>Employee</span>
              <select
                value={adjUserId}
                onChange={(e) => setAdjUserId(e.target.value)}
                required
              >
                <option value="">Select employee…</option>
                {run.snapshots.map((s) => (
                  <option key={s.id} value={s.userId}>
                    {s.employeeName} ({s.employeeCode})
                  </option>
                ))}
              </select>
            </label>
            <label className="sa-field">
              <span>Type</span>
              <select value={adjType} onChange={(e) => setAdjType(e.target.value)}>
                <option value="BONUS">Bonus</option>
                <option value="ALLOWANCE">Allowance</option>
                <option value="PENALTY">Penalty</option>
                <option value="ADVANCE_DEDUCTION">Advance deduction</option>
                <option value="REIMBURSEMENT">Reimbursement</option>
                <option value="CORRECTION">Correction</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="sa-field">
              <span>Amount (ETB)</span>
              <input
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                required
                inputMode="decimal"
              />
            </label>
            <label className="sa-field sa-field--full">
              <span>Reason</span>
              <input
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                required
              />
            </label>
            <div className="hr-form__actions">
              <button type="submit" className="sa-btn sa-btn--primary">
                Add adjustment
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
              <p className="hr-panel__hint">
                Statutory tax inactive · review amounts before approving
              </p>
            </div>
          </div>
          {run.snapshots.length ? (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Dept</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net</th>
                    <th>Payment</th>
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
                          {s.payment?.status ?? "UNPAID"}
                        </span>
                      </td>
                      <td className="sa-actions">
                        {s.payslip ? (
                          <Link
                            className="sa-link"
                            href={`/admin/payroll/payslips/${s.payslip.id}`}
                          >
                            Payslip
                          </Link>
                        ) : null}
                        {canPay && s.payment?.status !== "PAID" ? (
                          <button
                            type="button"
                            className="sa-link"
                            onClick={() => setPaySnapId(s.id)}
                          >
                            Record payment
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
              <p className="hr-empty__title">No employee snapshots yet</p>
              <p className="hr-empty__sub">
                Assign compensation packages on employee profiles, then run
                Calculate to build this period’s payroll.
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="hr-empty">
          <p className="hr-empty__title">Create a payroll period to begin</p>
          <p className="hr-empty__sub">
            Start with a labeled period and pay date. You’ll calculate, review,
            approve, and record payments from this workspace.
          </p>
        </div>
      )}
    </div>
  );
}
