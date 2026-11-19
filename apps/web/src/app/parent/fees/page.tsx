"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { EtbAmount } from "@/components/billing/etb-amount";
import {
  getParentFeesDue,
  getParentFinanceOverview,
  initializeChapaPayment,
  submitParentPayment,
  verifyChapaPayment,
  type ParentFeesDue,
  type ParentFinanceOverview,
  type ParentPayMethod,
} from "@/lib/finance";
import {
  pickChildId,
  writeStoredChildId,
  type ParentChildOption,
} from "@/lib/parent-child";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";

function defaultMethod(methods: ParentPayMethod[]): ParentPayMethod {
  if (methods.includes("TELEBIRR")) return "TELEBIRR";
  if (methods.includes("BANK_TRANSFER")) return "BANK_TRANSFER";
  if (methods.includes("CHAPA")) return "CHAPA";
  return "BANK_TRANSFER";
}

function methodLabel(method?: string) {
  if (method === "TELEBIRR") return "Telebirr";
  if (method === "BANK_TRANSFER") return "CBE / bank";
  if (method === "CHAPA") return "Chapa";
  return method ?? "Payment";
}

const MAX_PROOF_BYTES = 4_000_000;

function readProofAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read screenshot"));
    reader.readAsDataURL(file);
  });
}

export default function ParentFeesPage() {
  return (
    <Suspense
      fallback={
        <DashboardPage role="parent" title="Fees">
          <div className="par-fees">
            <p className="stu-fees__row-meta">Loading fees…</p>
          </div>
        </DashboardPage>
      }
    >
      <ParentFeesPageContent />
    </Suspense>
  );
}

function ParentFeesPageContent() {
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
  const [payMethod, setPayMethod] = useState<ParentPayMethod>("TELEBIRR");
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
        setPayMethod(defaultMethod(d.paymentInstructions.methods));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [selectedId]);

  useEffect(() => {
    const chapaReturn = searchParams.get("chapa_return");
    const txRef = searchParams.get("tx_ref")?.trim();
    if (chapaReturn !== "1" || !txRef) return;

    void (async () => {
      setPaying(true);
      setError("");
      try {
        const res = await verifyChapaPayment(txRef);
        setMessage(`${res.message}\n\nReceipt #: ${res.receiptNumber}`);
        if (selectedId) {
          setDue(await getParentFeesDue(selectedId));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not confirm Chapa payment yet. Try again in a moment.",
        );
      } finally {
        setPaying(false);
        router.replace("/parent/fees");
      }
    })();
  }, [searchParams, router, selectedId]);

  const steps = useMemo(() => {
    const fromApi = due?.paymentInstructions.steps;
    if (fromApi?.length) return fromApi;
    return [
      "Choose Telebirr or CBE / bank transfer.",
      "Send the fee, then open the Successful / Thank you receipt.",
      "Copy the Transaction Number (Telebirr) or Transaction ID (CBE).",
      "Upload a screenshot of that receipt and submit.",
      "Finance matches the screenshot, then issues the school receipt.",
    ];
  }, [due]);

  const selectedMethodReady =
    payMethod === "TELEBIRR"
      ? !!due?.paymentInstructions.telebirr
      : payMethod === "BANK_TRANSFER"
        ? !!due?.paymentInstructions.bank
        : payMethod === "CHAPA";

  async function onProofFile(file: File | null) {
    if (!file) {
      setProofPreview(null);
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError("Screenshot must be under 4 MB");
      return;
    }
    try {
      setProofPreview(await readProofAsDataUrl(file));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read screenshot");
    }
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
    if (payMethod !== "TELEBIRR" && payMethod !== "BANK_TRANSFER") {
      setError("Choose Telebirr or bank transfer");
      return;
    }
    if (!reference.trim()) {
      setError(
        payMethod === "TELEBIRR"
          ? "Enter the Telebirr Transaction Number from the success screen"
          : "Enter the CBE Transaction ID from the success screen",
      );
      return;
    }
    if (!proofPreview) {
      setError("Upload the Successful / Thank you receipt screenshot");
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
        method: payMethod,
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
  const offlineMethods = (due?.paymentInstructions.methods ?? []).filter(
    (m) => m === "TELEBIRR" || m === "BANK_TRANSFER",
  );
  const chapaAvailable = due?.paymentInstructions.methods.includes("CHAPA") ?? false;

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
                    <EtbAmount cents={overview.totalDueCents} symbolSize={18} />
                  </p>
                </div>
                <div className="stu-fees__balance">
                  <span className="stu-fees__balance-label">This child outstanding</span>
                  <strong className="stu-fees__balance-value">
                    <EtbAmount
                      cents={due?.totalDueCents ?? selectedChild?.outstandingCents ?? 0}
                      symbolSize={18}
                    />
                  </strong>
                </div>
              </div>
            </header>

            <ParentChildBar
              options={children}
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
                              <strong><EtbAmount cents={item.amountCents} /></strong>
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
                                <p className="stu-fees__row-title"><EtbAmount cents={p.amountCents} /></p>
                                <p className="stu-fees__row-meta">
                                  {methodLabel(p.method)} · Ref: {p.reference ?? "—"} · #
                                  {p.receiptNumber}
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
                        <button
                          type="button"
                          className="auth-page-submit"
                          onClick={() => setShowPayForm(true)}
                        >
                          Pay fees
                        </button>
                        {chapaAvailable ? (
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
                              className="att-btn att-btn--ghost"
                              disabled={chapaPaying || paying}
                              onClick={() => void onPayWithChapa()}
                            >
                              {chapaPaying ? "Opening Chapa…" : "Pay with Chapa"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="par-fees__bank">
                        <h3 className="stu-fees__card-title">Pay in 5 steps</h3>
                        <ol className="par-fees__steps">
                          {steps.map((step, i) => (
                            <li key={step}>
                              <span className="par-fees__step-num">{i + 1}</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                        <p className="stu-fees__row-meta">{due.paymentInstructions.note}</p>

                        {offlineMethods.length > 0 ? (
                          <div className="par-fees__methods" role="group" aria-label="Payment method">
                            {offlineMethods.includes("TELEBIRR") ? (
                              <button
                                type="button"
                                className={`par-fees__method${payMethod === "TELEBIRR" ? " par-fees__method--active" : ""}`}
                                onClick={() => setPayMethod("TELEBIRR")}
                              >
                                Telebirr
                              </button>
                            ) : null}
                            {offlineMethods.includes("BANK_TRANSFER") ? (
                              <button
                                type="button"
                                className={`par-fees__method${payMethod === "BANK_TRANSFER" ? " par-fees__method--active" : ""}`}
                                onClick={() => setPayMethod("BANK_TRANSFER")}
                              >
                                CBE / bank
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <p className="stu-fees__alert stu-fees__alert--error">
                            The school has not published a Telebirr number or bank account yet.
                            Pay at the office or ask finance to add payment details in Settings.
                          </p>
                        )}

                        {payMethod === "TELEBIRR" && due.paymentInstructions.telebirr ? (
                          <div className="att-summary-block" style={{ margin: "0.75rem 0" }}>
                            <p className="stu-fees__row-meta">Send Telebirr to</p>
                            <p className="stu-fees__row-title">
                              {due.paymentInstructions.telebirr.accountName}
                            </p>
                            <p className="att-summary-rate" style={{ fontSize: "1.1rem" }}>
                              {due.paymentInstructions.telebirr.number}
                            </p>
                          </div>
                        ) : null}

                        {payMethod === "BANK_TRANSFER" && due.paymentInstructions.bank ? (
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
                        ) : null}

                        <aside
                          className={`par-fees__sample par-fees__sample--${payMethod === "TELEBIRR" ? "telebirr" : "cbe"}`}
                          aria-label="Example receipt"
                        >
                          {payMethod === "TELEBIRR" ? (
                            <>
                              <p className="par-fees__sample-status">Successful</p>
                              <p className="par-fees__sample-amount">
                                −<EtbAmount amount={Number(payAmount) || 0} maximumFractionDigits={2} />
                              </p>
                              <dl>
                                <div>
                                  <dt>Transaction Type</dt>
                                  <dd>Transfer Money</dd>
                                </div>
                                <div>
                                  <dt>Transaction To</dt>
                                  <dd>{due.paymentInstructions.telebirr?.accountName ?? "School"}</dd>
                                </div>
                                <div>
                                  <dt>Transaction Number</dt>
                                  <dd>DHR97D11WZ</dd>
                                </div>
                              </dl>
                              <p className="par-fees__sample-hint">
                                Copy the Transaction Number from your Telebirr success screen, then upload that screenshot.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="par-fees__sample-status">Thank you · Success</p>
                              <p className="par-fees__sample-amount">
                                <EtbAmount amount={Number(payAmount) || 0} maximumFractionDigits={2} />
                              </p>
                              <dl>
                                <div>
                                  <dt>Paid to</dt>
                                  <dd>{due.paymentInstructions.bank?.accountHolder ?? "School"}</dd>
                                </div>
                                <div>
                                  <dt>Transaction ID</dt>
                                  <dd>FT26239YHGVN</dd>
                                </div>
                              </dl>
                              <p className="par-fees__sample-hint">
                                Copy the Transaction ID from your CBE success screen, then upload that screenshot.
                              </p>
                            </>
                          )}
                        </aside>

                        <label className="att-field" style={{ marginTop: "0.75rem" }}>
                          <span>Amount on the receipt (ETB)</span>
                          <input
                            className="auth-input auth-input--login auth-input--login-plain"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                          />
                        </label>
                        <label className="att-field">
                          <span>
                            {payMethod === "TELEBIRR"
                              ? "Transaction Number"
                              : "Transaction ID"}
                          </span>
                          <input
                            className="auth-input auth-input--login auth-input--login-plain"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder={
                              payMethod === "TELEBIRR" ? "e.g. DHR97D11WZ" : "e.g. FT26239YHGVN"
                            }
                          />
                        </label>
                        <label className="att-field">
                          <span>Receipt screenshot (required)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void onProofFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                        {proofPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="par-fees__proof"
                            src={proofPreview}
                            alt="Payment receipt screenshot"
                          />
                        ) : null}
                        <div className="par-fees__pay">
                          <button
                            type="button"
                            className="auth-page-submit"
                            disabled={paying || !selectedMethodReady || !proofPreview}
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
