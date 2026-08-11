"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import {
  formatEtb,
  getParentFeesDue,
  getParentFinanceOverview,
  initializeChapaPayment,
  submitParentPayment,
  verifyChapaPayment,
  type ParentFeesDue,
  type ParentFinanceOverview,
} from "@/lib/finance";
import {
  pickChildId,
  writeStoredChildId,
  type ParentChildOption,
} from "@/lib/parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

export default function ParentFeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<ParentFinanceOverview | null>(null);
  const [children, setChildren] = useState<ParentChildOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [due, setDue] = useState<ParentFeesDue | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [chapaPaying, setChapaPaying] = useState(false);
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
        const kids = o.children.map((c) => ({
          profileId: c.profileId,
          name: c.name,
          grade: c.grade,
          section: null as string | null,
        }));
        setChildren(kids);
        const id = pickChildId(kids);
        setSelectedId(id);
        if (id) writeStoredChildId(id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedId) return;
    writeStoredChildId(selectedId);
    void getParentFeesDue(selectedId)
      .then((d) => {
        setDue(d);
        setPayAmount(d.totalDueCents > 0 ? String(d.totalDueCents / 100) : "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [selectedId]);

  useEffect(() => {
    const chapaReturn = searchParams.get("chapa_return");
    const txRef = searchParams.get("tx_ref")?.trim();
    if (chapaReturn !== "1" || !txRef) return;

    setPaying(true);
    setError("");
    void verifyChapaPayment(txRef)
      .then((res) => {
        setMessage(`${res.message}\n\nReceipt #: ${res.receiptNumber}`);
        if (selectedId) {
          return getParentFeesDue(selectedId).then(setDue);
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not confirm Chapa payment yet. Try again in a moment.",
        ),
      )
      .finally(() => {
        setPaying(false);
        router.replace("/parent/fees");
      });
  }, [searchParams, router, selectedId]);

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

  async function onPayWithChapa() {
    if (!due || !selectedId) return;
    const amountCents = Math.round(parseFloat(payAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      setError("Enter a valid amount");
      return;
    }
    setChapaPaying(true);
    setError("");
    setMessage("");
    try {
      const res = await initializeChapaPayment(selectedId, amountCents);
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chapa checkout failed");
      setChapaPaying(false);
    }
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

  const selectedChild = overview?.children.find((c) => c.profileId === selectedId);

  return (
    <DashboardPage
      role="parent"
      title="Fees & payments"
      subtitle="Pay school fees for your linked children"
    >
      <div className="par-fees">
        {error ? <p className="stu-fees__alert stu-fees__alert--error">{error}</p> : null}
        {message ? (
          <p className="stu-fees__alert" style={{ whiteSpace: "pre-line" }}>
            {message}
          </p>
        ) : null}

        {loading ? (
          <div className="stu-fees__loading">
            <span className="stu-fees__spinner" aria-hidden />
            <p>Loading fees…</p>
          </div>
        ) : overview ? (
          <>
            <header className="stu-fees__hero">
              <div className="stu-fees__hero-glow" aria-hidden />
              <div className="stu-fees__hero-inner">
                <div className="stu-fees__hero-main">
                  <div className="stu-fees__hero-brand">
                    <span className="stu-fees__chip">Family finance</span>
                  </div>
                  <h2 className="stu-fees__hero-title">
                    {selectedChild?.name ?? "Your children"}
                  </h2>
                  <p className="stu-fees__hero-sub">
                    Total due across {overview.children.length} child
                    {overview.children.length === 1 ? "" : "ren"}:{" "}
                    {formatEtb(overview.totalDueCents)}
                  </p>
                </div>
                <div className="stu-fees__balance">
                  <span className="stu-fees__balance-label">This child outstanding</span>
                  <strong className="stu-fees__balance-value">
                    {formatEtb(due?.totalDueCents ?? selectedChild?.outstandingCents ?? 0)}
                  </strong>
                </div>
              </div>
            </header>

            <ParentChildBar
              children={children}
              selectedId={selectedId}
              onChange={setSelectedId}
              label="Paying for"
            />

            {due ? (
              <section className="stu-fees__card">
                <div className="stu-fees__card-head">
                  <div>
                    <h3 className="stu-fees__card-title">Fees due</h3>
                    <p className="stu-fees__card-sub">
                      {due.student.name}
                      {due.student.grade
                        ? ` · ${due.student.grade}${due.student.section ? `-${due.student.section}` : ""}`
                        : ""}
                    </p>
                  </div>
                  <span className="stu-fees__count">{due.items.length}</span>
                </div>
                {due.items.length === 0 ? (
                  <div className="stu-fees__empty">
                    <h4>All clear</h4>
                    <p>No outstanding fees. Thank you!</p>
                  </div>
                ) : (
                  <ul className="stu-fees__list">
                    {due.items.map((item) => (
                      <li key={item.id} className="stu-fees__row">
                        <div className="stu-fees__row-accent" aria-hidden />
                        <div className="stu-fees__row-main">
                          <div className="stu-fees__row-top">
                            <div>
                              <p className="stu-fees__row-title">{item.label}</p>
                              <p className="stu-fees__row-meta">
                                Due {new Date(item.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="stu-fees__row-amounts">
                            <div>
                              <span className="stu-fees__amount-label">Amount</span>
                              <strong>{formatEtb(item.amountCents)}</strong>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {due.pendingSubmissions.length > 0 ? (
                  <div style={{ marginTop: "1rem" }}>
                    <h4 className="stu-fees__card-title" style={{ marginBottom: "0.5rem" }}>
                      Awaiting verification
                    </h4>
                    <ul className="stu-fees__list">
                      {due.pendingSubmissions.map((p) => (
                        <li key={p.id} className="stu-fees__row">
                          <div className="stu-fees__row-accent" aria-hidden />
                          <div className="stu-fees__row-main">
                            <div className="stu-fees__row-top">
                              <div>
                                <p className="stu-fees__row-title">{formatEtb(p.amountCents)}</p>
                                <p className="stu-fees__row-meta">
                                  Ref: {p.reference ?? "—"} · #{p.receiptNumber}
                                </p>
                              </div>
                              <span className="stu-fees__badge stu-fees__badge--pending">
                                Pending
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {due.items.length > 0 ? (
                  <>
                    {!showPayForm ? (
                      <div className="par-fees__pay">
                        {due.paymentInstructions.methods.includes("CHAPA") ? (
                          <>
                            <label className="att-field" style={{ flex: "1 1 100%", margin: 0 }}>
                              <span>Amount to pay (ETB)</span>
                              <input
                                className="auth-input auth-input--login auth-input--login-plain"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                              />
                            </label>
                            <button
                              type="button"
                              className="auth-page-submit"
                              disabled={chapaPaying || paying}
                              onClick={() => void onPayWithChapa()}
                            >
                              {chapaPaying ? "Opening Chapa…" : "Pay with Chapa"}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className={
                            due.paymentInstructions.methods.includes("CHAPA")
                              ? "att-btn att-btn--ghost"
                              : "auth-page-submit"
                          }
                          onClick={() => setShowPayForm(true)}
                        >
                          Pay by bank transfer
                        </button>
                      </div>
                    ) : (
                      <div className="par-fees__bank">
                        <h3 className="stu-fees__card-title">Bank transfer</h3>
                        {due.paymentInstructions.bank ? (
                          <div className="att-summary-block" style={{ margin: "0.75rem 0" }}>
                            <p className="stu-fees__row-title">
                              {due.paymentInstructions.bank.bankName}
                            </p>
                            <p className="stu-fees__row-meta">
                              {due.paymentInstructions.bank.accountHolder}
                            </p>
                            <p className="att-summary-rate" style={{ fontSize: "1.1rem" }}>
                              {due.paymentInstructions.bank.accountNumber}
                            </p>
                          </div>
                        ) : (
                          <p className="stu-fees__alert stu-fees__alert--error">
                            School has not configured a bank account yet. Contact the office.
                          </p>
                        )}
                        <p className="stu-fees__row-meta">{due.paymentInstructions.note}</p>

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
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={proofPreview}
                            alt="Payment proof"
                            style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8 }}
                          />
                        ) : null}
                        <div className="par-fees__pay">
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
      </div>
    </DashboardPage>
  );
}
