"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EtbAmount } from "@/components/billing/etb-amount";
import { AppToast } from "@/components/ui/app-toast";
import { listMyPayslips } from "@/lib/payroll";

export function MyPayslipsPanel({ role }: { role: "admin" | "teacher" }) {
  const base = role === "teacher" ? "/teacher" : "/admin";
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listMyPayslips>>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void listMyPayslips()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, []);

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <header className="hr-hero">
        <div>
          <h2 className="hr-hero__title">My Payslips</h2>
          <p className="hr-hero__sub">
            View and open your personal payslip history.
          </p>
        </div>
      </header>

      <div className="hr-payslip-list">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`${base}/payroll/payslips/${r.id}`}
            className="hr-payslip-card"
          >
            <div>
              <strong>{r.periodLabel}</strong>
              <p>{String(r.payDate).slice(0, 10)}</p>
            </div>
            <div className="hr-payslip-card__net">
              <span>Net</span>
              <EtbAmount cents={r.snapshot.netCents} />
            </div>
          </Link>
        ))}
        {!rows.length ? (
          <p className="sa-empty">No payslips yet.</p>
        ) : null}
      </div>
    </div>
  );
}
