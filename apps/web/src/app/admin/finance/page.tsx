"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AcademicsHero, AcademicsBadge } from "@/components/academics/academics-ui";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listGrades, listStudents } from "@/lib/school-setup";
import type { GradeWithSections, StudentRecord } from "@/lib/api";
import {
  assignGradeFees,
  createFeeSchedule,
  downloadFinanceExport,
  formatEtb,
  getFinanceAnalytics,
  listAcademicYears,
  listFeeSchedules,
  listFeeTypes,
  recordPayment,
  seedFinanceDefaults,
  approvePendingPayment,
  listPendingPayments,
  rejectPendingPayment,
  sendFeeReminders,
  type AcademicYear,
  type PendingPaymentReview,
  type FeeSchedule,
  type FeeType,
  type FinanceAnalytics,
} from "@/lib/finance";
import { AppToast } from "@/components/ui/app-toast";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

function isSafeProofUrl(url: string) {
  return (
    url.startsWith("data:image/") ||
    url.startsWith("https://")
  );
}

type Tab = "pending" | "billing" | "payments" | "tools";

export default function AdminFinancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pending");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingBusy, setPendingBusy] = useState<string | null>(null);

  const [scheduleFeeTypeId, setScheduleFeeTypeId] = useState("");
  const [scheduleGradeId, setScheduleGradeId] = useState("");
  const [scheduleAmount, setScheduleAmount] = useState("3000");
  const [assignScheduleId, setAssignScheduleId] = useState("");
  const [assignGradeId, setAssignGradeId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  const [payStudentId, setPayStudentId] = useState("");
  const [payFeeId, setPayFeeId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [pending, setPending] = useState<PendingPaymentReview[]>([]);

  const currentYear = years.find((y) => y.isCurrent) ?? years[0];

  async function refresh() {
    const [y, ft, sch, g, st, an, pend] = await Promise.all([
      listAcademicYears(),
      listFeeTypes(),
      listFeeSchedules(),
      listGrades(),
      listStudents(),
      getFinanceAnalytics(),
      listPendingPayments().catch(() => [] as PendingPaymentReview[]),
    ]);
    setYears(y);
    setFeeTypes(ft);
    setSchedules(sch);
    setGrades(g);
    setStudents(st);
    setAnalytics(an);
    setPending(pend);
    if (!scheduleFeeTypeId && ft[0]) setScheduleFeeTypeId(ft[0].id);
    if (!assignScheduleId && sch[0]) setAssignScheduleId(sch[0].id);
    if (!assignGradeId && g[0]) setAssignGradeId(g[0].id);
    if (!payStudentId && st[0]) setPayStudentId(st[0].id);
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void seedFinanceDefaults()
      .then(() => refresh())
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  const collectionRate = useMemo(() => {
    if (!analytics || analytics.expectedRevenueCents <= 0) return null;
    return Math.round((analytics.collectedCents / analytics.expectedRevenueCents) * 100);
  }, [analytics]);

  const selectedStudent = students.find((s) => s.id === payStudentId);

  async function onCreateSchedule(e: FormEvent) {
    e.preventDefault();
    if (!currentYear) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const amountCents = Math.round(parseFloat(scheduleAmount) * 100);
      await createFeeSchedule({
        feeTypeId: scheduleFeeTypeId,
        academicYearId: currentYear.id,
        gradeId: scheduleGradeId || undefined,
        amountCents,
        frequency: "MONTHLY",
        installmentCount: 1,
      });
      setSuccess("Fee schedule created.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAssign() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await assignGradeFees({
        feeScheduleId: assignScheduleId,
        gradeId: assignGradeId,
        dueDate: assignDueDate,
      });
      setSuccess(`Assigned fees to ${res.assigned} students.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!payStudentId || !payFeeId) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const amountCents = Math.round(parseFloat(payAmount) * 100);
      const receipt = await recordPayment({
        studentProfileId: payStudentId,
        amountCents,
        method: payMethod,
        reference: payRef || undefined,
        allocations: [{ studentFeeId: payFeeId, amountCents }],
      });
      setSuccess(
        `Receipt ${(receipt as { receiptNumber: string }).receiptNumber} — balance ${formatEtb((receipt as { balanceRemainingCents: number }).balanceRemainingCents)}`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function onApprovePending(id: string) {
    setPendingBusy(id);
    setError("");
    setSuccess("");
    try {
      const receipt = await approvePendingPayment(id);
      setSuccess(`Approved — receipt ${(receipt as { receiptNumber: string }).receiptNumber}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setPendingBusy(null);
    }
  }

  async function onRejectPending(id: string) {
    const reason = window.prompt("Reason for rejection (optional):") ?? undefined;
    setPendingBusy(id);
    setError("");
    setSuccess("");
    try {
      await rejectPendingPayment(id, reason);
      setSuccess("Payment rejected.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setPendingBusy(null);
    }
  }

  return (
    <DashboardPage role="admin" title="Finance">
      <div className="fin-v2">
        <AcademicsHero
          title="School finance"
          subtitle={
            analytics
              ? `${formatEtb(analytics.collectedCents)} collected of ${formatEtb(analytics.expectedRevenueCents)} expected · ${analytics.overdueFeesCount} overdue fees`
              : "Track collections, bill students, verify payments, and export records."
          }
          stats={[
            {
              label: "This month",
              value: loading || !analytics ? "—" : formatEtb(analytics.collectedThisMonthCents),
            },
            {
              label: "Outstanding",
              value: loading || !analytics ? "—" : formatEtb(analytics.outstandingCents),
              accent: !loading && !!analytics && analytics.outstandingCents > 0,
            },
            {
              label: "Unpaid",
              value: loading || !analytics ? "—" : analytics.unpaidStudents,
            },
            {
              label: "Collection",
              value:
                loading || collectionRate == null ? "—" : `${collectionRate}%`,
            },
          ]}
          badges={
            <>
              {currentYear ? (
                <AcademicsBadge variant="live">{currentYear.name}</AcademicsBadge>
              ) : null}
              {!loading && pending.length > 0 ? (
                <span className="fin-v2__hero-badge fin-v2__hero-badge--warn">
                  {pending.length} pending verification
                </span>
              ) : null}
            </>
          }
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

        <div className="fin-v2__toolbar">
          <nav className="fin-v2__tabs" aria-label="Finance">
            <button
              type="button"
              className={`fin-v2__tab${tab === "pending" ? " fin-v2__tab--active" : ""}`}
              onClick={() => setTab("pending")}
            >
              <DashIcon name="alert" className="dash-icon--sm" />
              Pending
              {pending.length > 0 ? (
                <span className="fin-v2__tab-badge">{pending.length}</span>
              ) : null}
            </button>
            <button
              type="button"
              className={`fin-v2__tab${tab === "billing" ? " fin-v2__tab--active" : ""}`}
              onClick={() => setTab("billing")}
            >
              <DashIcon name="fees" className="dash-icon--sm" />
              Billing
            </button>
            <button
              type="button"
              className={`fin-v2__tab${tab === "payments" ? " fin-v2__tab--active" : ""}`}
              onClick={() => setTab("payments")}
            >
              <DashIcon name="finance" className="dash-icon--sm" />
              Record payment
            </button>
            <button
              type="button"
              className={`fin-v2__tab${tab === "tools" ? " fin-v2__tab--active" : ""}`}
              onClick={() => setTab("tools")}
            >
              <DashIcon name="settings" className="dash-icon--sm" />
              Tools
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="fin-v2__loading">
            <span className="fin-v2__loading-spinner" aria-hidden />
            <p>Loading finance data…</p>
          </div>
        ) : (
          <>
            {tab === "pending" ? (
              <section className="fin-v2__card">
                <header className="fin-v2__card-head">
                  <span className="fin-v2__card-icon fin-v2__card-icon--warn" aria-hidden>
                    <DashIcon name="alert" className="dash-icon--sm" />
                  </span>
                  <div>
                    <h3 className="fin-v2__card-title">Payment verification</h3>
                    <p className="fin-v2__card-sub">
                      Approve or reject Telebirr and bank transfers submitted by parents.
                    </p>
                  </div>
                </header>
                {pending.length === 0 ? (
                  <div className="fin-v2__empty">
                    <p>No payments awaiting verification.</p>
                  </div>
                ) : (
                  <ul className="fin-v2__pending-list">
                    {pending.map((p) => (
                      <li key={p.id} className="fin-v2__pending-item">
                        <div className="fin-v2__pending-main">
                          <strong>{p.student.name}</strong>
                          <span className="fin-v2__pending-amount">{formatEtb(p.amountCents)}</span>
                          <p>
                            {p.student.grade}
                            {p.student.section ? ` · ${p.student.section}` : ""} ·{" "}
                            {p.method === "TELEBIRR"
                              ? "Telebirr"
                              : p.method === "BANK_TRANSFER"
                                ? "CBE / bank"
                                : p.method}{" "}
                            · Tx: {p.reference ?? "—"} · #{p.receiptNumber}
                          </p>
                          {p.proofUrl && isSafeProofUrl(p.proofUrl) ? (
                            <a
                              href={p.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="fin-v2__receipt-link"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.proofUrl}
                                alt={`${p.student.name} payment receipt`}
                                className="fin-v2__receipt-thumb"
                              />
                              Open full receipt
                            </a>
                          ) : (
                            <p>No receipt screenshot attached.</p>
                          )}
                        </div>
                        <div className="fin-v2__pending-actions">
                          <button
                            type="button"
                            className="fin-v2__btn fin-v2__btn--primary fin-v2__btn--sm"
                            disabled={pendingBusy === p.id}
                            onClick={() => void onApprovePending(p.id)}
                          >
                            {pendingBusy === p.id ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="fin-v2__btn fin-v2__btn--ghost fin-v2__btn--sm"
                            disabled={pendingBusy === p.id}
                            onClick={() => void onRejectPending(p.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {tab === "billing" ? (
              <div className="fin-v2__grid">
                <section className="fin-v2__card">
                  <header className="fin-v2__card-head">
                    <span className="fin-v2__card-icon" aria-hidden>
                      <DashIcon name="fees" className="dash-icon--sm" />
                    </span>
                    <div>
                      <h3 className="fin-v2__card-title">Create fee schedule</h3>
                      <p className="fin-v2__card-sub">
                        Define tuition, transport, or other recurring charges for a grade.
                      </p>
                    </div>
                  </header>
                  <form className="fin-v2__form" onSubmit={(e) => void onCreateSchedule(e)}>
                    <label className="fin-v2__field">
                      <span>Fee type</span>
                      <select
                        value={scheduleFeeTypeId}
                        onChange={(e) => setScheduleFeeTypeId(e.target.value)}
                      >
                        {feeTypes.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fin-v2__field">
                      <span>Grade</span>
                      <select
                        value={scheduleGradeId}
                        onChange={(e) => setScheduleGradeId(e.target.value)}
                      >
                        <option value="">All grades</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fin-v2__field">
                      <span>Amount (ETB)</span>
                      <input
                        value={scheduleAmount}
                        onChange={(e) => setScheduleAmount(e.target.value)}
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      className="fin-v2__btn fin-v2__btn--primary"
                      disabled={busy}
                    >
                      {busy ? "Saving…" : "Add schedule"}
                    </button>
                  </form>
                </section>

                <section className="fin-v2__card">
                  <header className="fin-v2__card-head">
                    <span className="fin-v2__card-icon fin-v2__card-icon--assign" aria-hidden>
                      <DashIcon name="students" className="dash-icon--sm" />
                    </span>
                    <div>
                      <h3 className="fin-v2__card-title">Bill students by grade</h3>
                      <p className="fin-v2__card-sub">
                        Assign a schedule to every student in a grade with a due date.
                      </p>
                    </div>
                  </header>
                  <div className="fin-v2__form">
                    <label className="fin-v2__field">
                      <span>Schedule</span>
                      <select
                        value={assignScheduleId}
                        onChange={(e) => setAssignScheduleId(e.target.value)}
                      >
                        {schedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.feeType.name} — {s.grade?.name ?? "All"} — {formatEtb(s.amountCents)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fin-v2__field">
                      <span>Grade</span>
                      <select value={assignGradeId} onChange={(e) => setAssignGradeId(e.target.value)}>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fin-v2__field">
                      <span>Due date</span>
                      <input
                        type="date"
                        value={assignDueDate}
                        onChange={(e) => setAssignDueDate(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="fin-v2__btn fin-v2__btn--primary"
                      disabled={busy}
                      onClick={() => void onAssign()}
                    >
                      {busy ? "Working…" : "Assign fees to class"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}

            {tab === "payments" ? (
              <section className="fin-v2__card">
                <header className="fin-v2__card-head">
                  <span className="fin-v2__card-icon fin-v2__card-icon--pay" aria-hidden>
                    <DashIcon name="finance" className="dash-icon--sm" />
                  </span>
                  <div>
                    <h3 className="fin-v2__card-title">Record manual payment</h3>
                    <p className="fin-v2__card-sub">
                      Log cash or in-office payments and generate a receipt instantly.
                    </p>
                  </div>
                </header>
                <form className="fin-v2__form fin-v2__form--wide" onSubmit={(e) => void onRecordPayment(e)}>
                  <label className="fin-v2__field">
                    <span>Student</span>
                    <select
                      value={payStudentId}
                      onChange={(e) => {
                        setPayStudentId(e.target.value);
                        setPayFeeId("");
                      }}
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.user.firstName} {s.user.lastName} — {s.grade.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedStudent ? (
                    <StudentFeePicker
                      profileId={selectedStudent.id}
                      onSelect={(feeId, balance) => {
                        setPayFeeId(feeId);
                        setPayAmount(String(balance / 100));
                      }}
                    />
                  ) : null}
                  <label className="fin-v2__field">
                    <span>Amount (ETB)</span>
                    <input
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                    />
                  </label>
                  <label className="fin-v2__field">
                    <span>Method</span>
                    <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      <option value="CASH">Cash at office</option>
                      <option value="TELEBIRR">Telebirr</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="fin-v2__field">
                    <span>Reference (optional)</span>
                    <input
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="Transaction ref or note"
                    />
                  </label>
                  <button
                    type="submit"
                    className="fin-v2__btn fin-v2__btn--primary"
                    disabled={!payFeeId || busy}
                  >
                    {busy ? "Recording…" : "Record payment & receipt"}
                  </button>
                </form>
              </section>
            ) : null}

            {tab === "tools" ? (
              <section className="fin-v2__card">
                <header className="fin-v2__card-head">
                  <span className="fin-v2__card-icon" aria-hidden>
                    <DashIcon name="settings" className="dash-icon--sm" />
                  </span>
                  <div>
                    <h3 className="fin-v2__card-title">Finance tools</h3>
                    <p className="fin-v2__card-sub">Remind families and export records for accounting.</p>
                  </div>
                </header>
                <div className="fin-v2__actions">
                  <button
                    type="button"
                    className="fin-v2__action"
                    onClick={() =>
                      void sendFeeReminders(3).then((r) =>
                        setSuccess(`Sent ${r.remindersSent} fee reminders.`),
                      )
                    }
                  >
                    <span className="fin-v2__action-icon" aria-hidden>
                      <DashIcon name="announcements" className="dash-icon--sm" />
                    </span>
                    <span className="fin-v2__action-body">
                      <strong>Send due reminders</strong>
                      <span>Notify parents 3 days before fees are due.</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="fin-v2__action"
                    onClick={() => {
                      const to = new Date().toISOString().slice(0, 10);
                      const from = new Date(new Date().getFullYear(), 0, 1)
                        .toISOString()
                        .slice(0, 10);
                      void downloadFinanceExport(from, to);
                    }}
                  >
                    <span className="fin-v2__action-icon fin-v2__action-icon--export" aria-hidden>
                      <DashIcon name="chart" className="dash-icon--sm" />
                    </span>
                    <span className="fin-v2__action-body">
                      <strong>Export CSV</strong>
                      <span>Download year-to-date payment records.</span>
                    </span>
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </DashboardPage>
  );
}

function StudentFeePicker({
  profileId,
  onSelect,
}: {
  profileId: string;
  onSelect: (feeId: string, balanceCents: number) => void;
}) {
  const [fees, setFees] = useState<Array<{ id: string; label: string; balanceCents: number }>>(
    [],
  );

  useEffect(() => {
    void import("@/lib/finance").then(({ getStudentFinanceSummary }) =>
      getStudentFinanceSummary(profileId).then((s) =>
        setFees(
          s.fees
            .filter((f) => f.balanceCents > 0)
            .map((f) => ({ id: f.id, label: f.label, balanceCents: f.balanceCents })),
        ),
      ),
    );
  }, [profileId]);

  if (fees.length === 0) {
    return <p className="fin-v2__hint">No outstanding fees for this student.</p>;
  }

  return (
    <label className="fin-v2__field">
      <span>Apply to fee</span>
      <select
        onChange={(e) => {
          const fee = fees.find((f) => f.id === e.target.value);
          if (fee) onSelect(fee.id, fee.balanceCents);
        }}
      >
        {fees.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label} — {(f.balanceCents / 100).toFixed(0)} ETB
          </option>
        ))}
      </select>
    </label>
  );
}
