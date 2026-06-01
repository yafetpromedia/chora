"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
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
import { listStudents } from "@/lib/school-setup";
import type { StudentRecord } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AdminFinancePage() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
  const [receiptMsg, setReceiptMsg] = useState("");
  const [pending, setPending] = useState<PendingPaymentReview[]>([]);
  const [pendingBusy, setPendingBusy] = useState<string | null>(null);

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

  async function onCreateSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!currentYear) return;
    setError("");
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
      setSchedules(await listFeeSchedules());
      setAnalytics(await getFinanceAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onAssign() {
    setError("");
    try {
      const res = await assignGradeFees({
        feeScheduleId: assignScheduleId,
        gradeId: assignGradeId,
        dueDate: assignDueDate,
      });
      setReceiptMsg(`Assigned fees to ${res.assigned} students.`);
      setAnalytics(await getFinanceAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    }
  }

  async function onRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payStudentId || !payFeeId) return;
    setError("");
    try {
      const amountCents = Math.round(parseFloat(payAmount) * 100);
      const receipt = await recordPayment({
        studentProfileId: payStudentId,
        amountCents,
        method: payMethod,
        reference: payRef || undefined,
        allocations: [{ studentFeeId: payFeeId, amountCents }],
      });
      setReceiptMsg(
        `Receipt ${(receipt as { receiptNumber: string }).receiptNumber} — balance ${formatEtb((receipt as { balanceRemainingCents: number }).balanceRemainingCents)}`,
      );
      setAnalytics(await getFinanceAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  }

  const selectedStudent = students.find((s) => s.id === payStudentId);

  async function onApprovePending(id: string) {
    setPendingBusy(id);
    setError("");
    try {
      const receipt = await approvePendingPayment(id);
      setReceiptMsg(
        `Approved — receipt ${(receipt as { receiptNumber: string }).receiptNumber}`,
      );
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
    try {
      await rejectPendingPayment(id, reason);
      setReceiptMsg("Payment rejected.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setPendingBusy(null);
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Finance"
      eyebrow="CampusOne"
    >
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
        {receiptMsg ? (
          <p className="auth-alert" style={{ background: "var(--brand-surface)" }}>
            {receiptMsg}
          </p>
        ) : null}

        {loading ? (
          <p className="setup-hint">Loading…</p>
        ) : analytics ? (
          <section className="att-admin-section" style={{ borderTop: "none", marginTop: 0 }}>
            <h2 className="setup-panel-label">School finance</h2>
            <div className="att-stats-grid">
              <div className="att-stat">
                <span className="att-stat-value">{formatEtb(analytics.collectedThisMonthCents)}</span>
                <span className="att-stat-label">Collected this month</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{formatEtb(analytics.outstandingCents)}</span>
                <span className="att-stat-label">Outstanding</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{formatEtb(analytics.expectedRevenueCents)}</span>
                <span className="att-stat-label">Expected revenue</span>
              </div>
              <div className="att-stat">
                <span className="att-stat-value">{analytics.unpaidStudents}</span>
                <span className="att-stat-label">Unpaid students</span>
              </div>
            </div>
            <p className="tch-meta">
              Forecast: {formatEtb(analytics.collectedCents)} collected of{" "}
              {formatEtb(analytics.expectedRevenueCents)} expected · {analytics.overdueFeesCount}{" "}
              overdue fees
            </p>
          </section>
        ) : null}

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Pending payment verification</h2>
          {pending.length === 0 ? (
            <p className="setup-hint">No payments awaiting verification.</p>
          ) : (
            <ul className="dash-list">
              {pending.map((p) => (
                <li key={p.id} className="dash-list-item dash-list-item--stack">
                  <div>
                    <p className="dash-list-title">
                      {p.student.name} · {formatEtb(p.amountCents)}
                    </p>
                    <p className="dash-list-meta">
                      {p.student.grade}
                      {p.student.section ? ` · ${p.student.section}` : ""} · Ref:{" "}
                      {p.reference ?? "—"} · #{p.receiptNumber}
                    </p>
                    {p.proofUrl ? (
                      <a
                        href={p.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="dash-link-btn"
                        style={{ display: "inline-block", marginTop: "0.35rem" }}
                      >
                        View screenshot
                      </a>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="att-btn att-btn--primary"
                      disabled={pendingBusy === p.id}
                      onClick={() => void onApprovePending(p.id)}
                    >
                      {pendingBusy === p.id ? "…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="att-btn att-btn--ghost"
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

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Create fee schedule</h2>
          <form onSubmit={(e) => void onCreateSchedule(e)} className="att-filters">
            <label className="att-field">
              <span>Fee type</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
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
            <label className="att-field">
              <span>Grade</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
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
            <label className="att-field">
              <span>Amount (ETB)</span>
              <input
                className="auth-input auth-input--login auth-input--login-plain"
                value={scheduleAmount}
                onChange={(e) => setScheduleAmount(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="auth-page-submit att-field--wide">
              Add schedule
            </button>
          </form>
        </section>

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Bill students by grade</h2>
          <div className="att-filters">
            <label className="att-field">
              <span>Schedule</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
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
            <label className="att-field">
              <span>Grade</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
                value={assignGradeId}
                onChange={(e) => setAssignGradeId(e.target.value)}
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="att-field">
              <span>Due date</span>
              <input
                type="date"
                className="auth-input auth-input--login auth-input--login-plain"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
              />
            </label>
          </div>
          <button type="button" className="auth-page-submit" onClick={() => void onAssign()}>
            Assign fees to class
          </button>
        </section>

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Record manual payment</h2>
          <form onSubmit={(e) => void onRecordPayment(e)} className="setup-form-col">
            <label className="att-field">
              <span>Student</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
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
            <label className="att-field">
              <span>Amount (ETB)</span>
              <input
                className="auth-input auth-input--login auth-input--login-plain"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </label>
            <label className="att-field">
              <span>Method</span>
              <select
                className="auth-input auth-input--login auth-input--login-plain"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <input
              className="auth-input auth-input--login auth-input--login-plain"
              placeholder="Reference (optional)"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
            <button type="submit" className="auth-page-submit" disabled={!payFeeId}>
              Record payment & receipt
            </button>
          </form>
        </section>

        <section className="att-admin-section">
          <h2 className="setup-panel-label">Tools</h2>
          <div className="setup-actions-row">
            <button
              type="button"
              className="dash-copy-btn"
              onClick={() =>
                void sendFeeReminders(3).then((r) =>
                  setReceiptMsg(`Sent ${r.remindersSent} fee reminders.`),
                )
              }
            >
              Send due reminders (3 days)
            </button>
            <button
              type="button"
              className="dash-copy-btn"
              onClick={() => {
                const to = new Date().toISOString().slice(0, 10);
                const from = new Date(new Date().getFullYear(), 0, 1)
                  .toISOString()
                  .slice(0, 10);
                void downloadFinanceExport(from, to);
              }}
            >
              Export CSV
            </button>
          </div>
        </section>

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
    return <p className="setup-hint">No outstanding fees for this student.</p>;
  }

  return (
    <label className="att-field">
      <span>Apply to fee</span>
      <select
        className="auth-input auth-input--login auth-input--login-plain"
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
