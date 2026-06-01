"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  formatEtb,
  getParentFeesDue,
  getParentFinanceOverview,
  submitParentPayment,
  type ParentFeesDue,
  type ParentFinanceOverview,
} from "@/lib/finance";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentFeesPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<ParentFinanceOverview | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [due, setDue] = useState<ParentFeesDue | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [reference, setReference] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_ROLE_KEY) !== "parent") {
      router.replace("/login");
      return;
    }
    void getParentFinanceOverview()
      .then((o) => {
        setOverview(o);
        if (o.children[0]) setSelectedId(o.children[0].profileId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedId) return;
    void getParentFeesDue(selectedId)
      .then((d) => {
        setDue(d);
        setPayAmount(d.totalDueCents > 0 ? String(d.totalDueCents / 100) : "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [selectedId]);

  function onProofFile(file: File | null) {
    if (!file) {
      setProofPreview(null);
      return;
    }
    if (file.size > 400_000) {
      setError("Screenshot must be under 400 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmitPayment() {
    if (!due || !selectedId) return;
    const amountCents = Math.round(parseFloat(payAmount) * 100);
    if (!reference.trim()) {
      setError("Enter the bank reference / transaction number");
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      setError("Enter a valid amount");
      return;
    }
    setPaying(true);
    setError("");
    setMessage("");
    try {
      const res = await submitParentPayment(selectedId, {
        amountCents,
        reference: reference.trim(),
        proofUrl: proofPreview ?? undefined,
      });
      setMessage(`${res.message}\n\nTracking #: ${res.receiptNumber}`);
      setShowPayForm(false);
      setReference("");
      setProofPreview(null);
      const refreshed = await getParentFeesDue(selectedId);
      setDue(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <DashboardPage
      role="parent"
      title="Fees & payments"
      eyebrow="CampusOne"
    >
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      {message ? (
        <p
          className="auth-alert"
          style={{ background: "var(--brand-surface)", whiteSpace: "pre-line" }}
        >
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="setup-hint">Loading…</p>
      ) : overview ? (
        <>
          <div className="att-summary-block">
            <p className="att-summary-rate">{formatEtb(overview.totalDueCents)}</p>
            <p className="setup-hint" style={{ margin: 0 }}>
              Total due across {overview.children.length} child
              {overview.children.length === 1 ? "" : "ren"}
            </p>
          </div>

          {overview.children.length > 1 ? (
            <label className="att-field" style={{ marginTop: "1rem" }}>
              <span>Child</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {overview.children.map((c) => (
                  <option key={c.profileId} value={c.profileId}>
                    {c.name} — {formatEtb(c.outstandingCents)} due
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {due ? (
            <section style={{ marginTop: "1.25rem" }}>
              <h2 className="setup-panel-label">Fees due</h2>
              {due.items.length === 0 ? (
                <p className="setup-hint">No outstanding fees. Thank you!</p>
              ) : (
                <ul className="dash-list">
                  {due.items.map((item) => (
                    <li key={item.id} className="dash-list-item">
                      <div>
                        <p className="dash-list-title">{item.label}</p>
                        <p className="dash-list-meta">
                          Due {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="dash-score">{formatEtb(item.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}

              {due.pendingSubmissions.length > 0 ? (
                <div style={{ marginTop: "1rem" }}>
                  <h3 className="setup-panel-label">Awaiting verification</h3>
                  <ul className="dash-list">
                    {due.pendingSubmissions.map((p) => (
                      <li key={p.id} className="dash-list-item">
                        <div>
                          <p className="dash-list-title">{formatEtb(p.amountCents)}</p>
                          <p className="dash-list-meta">
                            Ref: {p.reference ?? "—"} · #{p.receiptNumber}
                          </p>
                        </div>
                        <span className="dash-tag">Pending</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {due.items.length > 0 ? (
                <>
                  {!showPayForm ? (
                    <button
                      type="button"
                      className="auth-page-submit"
                      style={{ marginTop: "1rem" }}
                      onClick={() => setShowPayForm(true)}
                    >
                      Pay fee (bank transfer)
                    </button>
                  ) : (
                    <div className="dash-panel dash-panel--flat" style={{ marginTop: "1rem" }}>
                      <h3 className="setup-panel-label">Bank transfer</h3>
                      {due.paymentInstructions.bank ? (
                        <div className="att-summary-block" style={{ marginBottom: "1rem" }}>
                          <p className="dash-list-title">
                            {due.paymentInstructions.bank.bankName}
                          </p>
                          <p className="setup-hint" style={{ margin: "0.25rem 0" }}>
                            {due.paymentInstructions.bank.accountHolder}
                          </p>
                          <p className="att-summary-rate" style={{ fontSize: "1.1rem" }}>
                            {due.paymentInstructions.bank.accountNumber}
                          </p>
                        </div>
                      ) : (
                        <p className="auth-alert auth-alert--error">
                          School has not configured a bank account yet. Contact the office.
                        </p>
                      )}
                      <p className="setup-hint">{due.paymentInstructions.note}</p>

                      <label className="att-field" style={{ marginTop: "0.75rem" }}>
                        <span>Amount (ETB)</span>
                        <input
                          className="auth-input auth-input--login auth-input--login-plain"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                      </label>
                      <label className="att-field">
                        <span>Reference / transaction number</span>
                        <input
                          className="auth-input auth-input--login auth-input--login-plain"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="CBE ref, Telebirr ref at branch, etc."
                        />
                      </label>
                      <label className="att-field">
                        <span>Payment screenshot (optional)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onProofFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {proofPreview ? (
                        <img
                          src={proofPreview}
                          alt="Payment proof"
                          style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8 }}
                        />
                      ) : null}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <button
                          type="button"
                          className="auth-page-submit"
                          disabled={paying || !due.paymentInstructions.bank}
                          onClick={() => void onSubmitPayment()}
                        >
                          {paying ? "Submitting…" : "Submit for verification"}
                        </button>
                        <button
                          type="button"
                          className="att-btn att-btn--ghost"
                          onClick={() => setShowPayForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </DashboardPage>
  );
}
