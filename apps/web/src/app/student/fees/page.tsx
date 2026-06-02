"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { formatEtb, getStudentFinanceSummary, type StudentFinanceSummary } from "@/lib/finance";
import { getMyStudentIdCard } from "@/lib/student-cards";

export default function StudentFeesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<StudentFinanceSummary | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    if (localStorage.getItem(AUTH_ROLE_KEY) !== "student") {
      router.replace(`/${localStorage.getItem(AUTH_ROLE_KEY) ?? "login"}`);
      return;
    }

    void getMyStudentIdCard()
      .then((card) => getStudentFinanceSummary(card.studentProfileId))
      .then((data) => setSummary(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage role="student" title="Fees" eyebrow="Finance">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      {loading ? (
        <p className="setup-hint">Loading fee summary…</p>
      ) : summary ? (
        <>
          <div className="att-summary-block">
            <p className="att-summary-rate">{formatEtb(summary.outstandingCents)}</p>
            <p className="setup-hint" style={{ margin: 0 }}>
              Outstanding balance
            </p>
            <p className="tch-meta" style={{ marginTop: "0.35rem" }}>
              Paid: {formatEtb(summary.totalPaidCents)} · Total due: {formatEtb(summary.totalDueCents)}
            </p>
          </div>

          <section className="dash-panel dash-panel--flat" style={{ marginTop: "1rem" }}>
            <div className="dash-panel-head">
              <h2 className="dash-panel-title">Fee items</h2>
              <span className="dash-panel-badge">{summary.fees.length}</span>
            </div>
            {summary.fees.length === 0 ? (
              <p className="setup-hint">No fee records yet.</p>
            ) : (
              <ul className="dash-list">
                {summary.fees.map((item) => (
                  <li key={item.id} className="dash-list-item">
                    <div>
                      <p className="dash-list-title">{item.label}</p>
                      <p className="dash-list-meta">
                        Due {new Date(item.dueDate).toLocaleDateString()} · {item.status}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="dash-score">{formatEtb(item.balanceCents)}</p>
                      <p className="dash-list-meta" style={{ marginTop: "0.2rem" }}>
                        of {formatEtb(item.amountDueCents)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dash-panel dash-panel--flat" style={{ marginTop: "1rem" }}>
            <div className="dash-panel-head">
              <h2 className="dash-panel-title">Recent payments</h2>
              <span className="dash-panel-badge">{summary.payments.length}</span>
            </div>
            {summary.payments.length === 0 ? (
              <p className="setup-hint">No payments recorded yet.</p>
            ) : (
              <ul className="dash-list">
                {summary.payments.map((payment) => (
                  <li key={payment.id} className="dash-list-item">
                    <div>
                      <p className="dash-list-title">{formatEtb(payment.amountCents)}</p>
                      <p className="dash-list-meta">
                        {payment.receiptNumber} · {new Date(payment.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="dash-tag">{payment.method.replaceAll("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </DashboardPage>
  );
}
