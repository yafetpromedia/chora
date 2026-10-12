"use client";

import { useEffect, useMemo, useState } from "react";
import { AppToast } from "@/components/ui/app-toast";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  cancelLeaveRequest,
  createLeaveRequest,
  listLeaveRequests,
  listLeaveTypes,
  reviewLeaveRequest,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/leave";

const STATUS_LABEL: Record<LeaveRequest["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function LeaveWorkspace() {
  const canApprove = hasPermission(Permission.LEAVE_APPROVE);
  const canRequest = hasPermission(Permission.LEAVE_REQUEST);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [t, r] = await Promise.all([
        listLeaveTypes(),
        listLeaveRequests({ status: status || undefined }),
      ]);
      setTypes(t);
      setRows(r);
      if (!leaveTypeId && t[0]) setLeaveTypeId(t[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leave");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load()
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canRequest) return;
    setBusy(true);
    try {
      await createLeaveRequest({
        leaveTypeId,
        startDate,
        endDate,
        reason,
      });
      setToast("Leave request submitted");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  async function onReview(id: string, next: "approved" | "rejected") {
    const note =
      next === "rejected"
        ? window.prompt("Rejection reason (optional)") ?? undefined
        : undefined;
    setBusy(true);
    try {
      await reviewLeaveRequest(id, { status: next, reviewNote: note });
      setToast(next === "approved" ? "Leave approved" : "Leave rejected");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows],
  );
  const approvedCount = useMemo(
    () => rows.filter((r) => r.status === "approved").length,
    [rows],
  );

  return (
    <div className="sa-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">People</span>
            <h2 className="tch-v2__hero-title">Leave</h2>
            <p className="tch-v2__hero-sub">
              Request and approve staff leave. Approved leave marks attendance
              as on leave automatically.
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : rows.length}</strong>
              <span>Requests</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : pendingCount}</strong>
              <span>Pending</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : approvedCount}</strong>
              <span>Approved</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{types.length}</strong>
              <span>Types</span>
            </div>
          </div>
        </div>
      </header>

      {canRequest ? (
        <form className="sa-toolbar" onSubmit={(e) => void onCreate(e)}>
          <label className="sa-field">
            <span>Type</span>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="sa-field">
            <span>End</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label className="sa-field sa-field--grow">
            <span>Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
            />
          </label>
          <button type="submit" className="sa-btn sa-btn--primary" disabled={busy}>
            Request leave
          </button>
        </form>
      ) : null}

      <div className="sa-toolbar">
        <label className="sa-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="sa-empty">
                  Loading…
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={7} className="sa-empty">
                  No leave requests.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.employeeName}</strong>
                    <div className="sa-emp">
                      <span>{r.roleName}</span>
                    </div>
                  </td>
                  <td>{r.leaveTypeName}</td>
                  <td>
                    {r.startDate} → {r.endDate}
                  </td>
                  <td>{r.days}</td>
                  <td>
                    <span className={`sa-badge sa-badge--${r.status}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td>{r.reason}</td>
                  <td>
                    <div className="sa-actions">
                      {canApprove && r.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="sa-link"
                            disabled={busy}
                            onClick={() => void onReview(r.id, "approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="sa-link"
                            disabled={busy}
                            onClick={() => void onReview(r.id, "rejected")}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {(r.status === "pending" ||
                        (r.status === "approved" && canApprove)) && (
                        <button
                          type="button"
                          className="sa-link"
                          disabled={busy}
                          onClick={() =>
                            void cancelLeaveRequest(r.id)
                              .then(() => {
                                setToast("Leave cancelled");
                                return load();
                              })
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Cancel failed",
                                ),
                              )
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
