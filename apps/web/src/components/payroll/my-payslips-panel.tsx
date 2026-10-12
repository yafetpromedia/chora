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

  const latestNet = rows[0]?.snapshot.netCents ?? 0;

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Compensation</span>
            <h2 className="tch-v2__hero-title">My Payslips</h2>
            <p className="tch-v2__hero-sub">
              View and open your personal payslip history.
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{rows.length}</strong>
              <span>Payslips</span>
            </div>
            <div className="tch-v2__stat">
              <strong>
                {rows[0] ? String(rows[0].payDate).slice(0, 7) : "—"}
              </strong>
              <span>Latest</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {rows.length ? <EtbAmount cents={latestNet} /> : "—"}
              </strong>
              <span>Net</span>
            </div>
          </div>
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
