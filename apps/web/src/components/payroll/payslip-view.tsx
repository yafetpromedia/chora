"use client";

import { useEffect, useState } from "react";
import { EtbAmount } from "@/components/billing/etb-amount";
import { AppToast } from "@/components/ui/app-toast";
import { getPayslip } from "@/lib/payroll";
import { hasPermission, Permission } from "@/lib/permissions";

export function PayslipView({ payslipId }: { payslipId: string }) {
  const canSeeEmployer = hasPermission(Permission.PAYSLIP_MANAGE);
  const [data, setData] = useState<Awaited<ReturnType<typeof getPayslip>> | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    void getPayslip(payslipId)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, [payslipId]);

  if (!data) {
    return (
      <div className="hr-page">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <p className="sa-empty">{error || "Loading payslip…"}</p>
      </div>
    );
  }

  const p = data.payload;

  return (
    <div className="hr-page hr-payslip-print">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <div className="hr-payslip-sheet">
        <header className="hr-payslip-sheet__brand">
          {p.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.schoolLogoUrl}
              alt=""
              className="hr-payslip-sheet__logo"
            />
          ) : null}
          <div>
            <h2 className="hr-payslip-sheet__school">
              {p.schoolName ?? "Payslip"}
            </h2>
            <p className="hr-payslip-sheet__contact">
              {[p.schoolAddress, p.schoolPhone, p.schoolEmail]
                .filter(Boolean)
                .join(" · ") || "Salary statement"}
            </p>
          </div>
          <button
            type="button"
            className="sa-btn sa-btn--ghost no-print"
            onClick={() => window.print()}
          >
            Print
          </button>
        </header>

        <h3 className="hr-payslip-sheet__title">Payslip</h3>
        <p className="hr-payslip-sheet__period">{p.period}</p>

        <dl className="hr-payslip-meta">
          <div>
            <dt>Employee</dt>
            <dd>{p.employeeName}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{p.employeeCode}</dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>{p.position ?? "—"}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{p.department ?? "—"}</dd>
          </div>
          <div>
            <dt>Pay date</dt>
            <dd>{p.payDate}</dd>
          </div>
        </dl>

        <h3>Earnings</h3>
        <ul className="hr-payslip-lines">
          {p.earnings.map((l) => (
            <li key={`${l.code}-${l.label}`}>
              <span>{l.label}</span>
              <EtbAmount cents={l.amountCents} />
            </li>
          ))}
        </ul>

        <h3>Deductions</h3>
        <ul className="hr-payslip-lines">
          {p.deductions.length ? (
            p.deductions.map((l) => (
              <li key={`${l.code}-${l.label}`}>
                <span>{l.label}</span>
                <EtbAmount cents={l.amountCents} />
              </li>
            ))
          ) : (
            <li>
              <span>None</span>
              <span>—</span>
            </li>
          )}
        </ul>

        <div className="hr-payslip-totals">
          <p>
            Gross <EtbAmount cents={p.grossCents} />
          </p>
          <p>
            Total deductions <EtbAmount cents={p.deductionCents} />
          </p>
          <p className="hr-payslip-totals__net">
            Net pay <EtbAmount cents={p.netCents} />
          </p>
          {canSeeEmployer && p.employerCostCents != null ? (
            <p>
              Employer cost <EtbAmount cents={p.employerCostCents} />
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
