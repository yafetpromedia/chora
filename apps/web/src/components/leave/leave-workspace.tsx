"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
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

const STATUS_KEYS = ["pending", "approved", "rejected", "cancelled"] as const;

export function LeaveWorkspace() {
  const { t } = useLocale();
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

  function statusLabel(s: LeaveRequest["status"]) {
    return t(`leaveUi.status_${s}`);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [typeRows, requestRows] = await Promise.all([
        listLeaveTypes(),
        listLeaveRequests({ status: status || undefined }),
      ]);
      setTypes(typeRows);
      setRows(requestRows);
      if (!leaveTypeId && typeRows[0]) setLeaveTypeId(typeRows[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("leaveUi.loadFailed"));
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
      setToast(t("leaveUi.submitted"));
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("leaveUi.submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onReview(id: string, next: "approved" | "rejected") {
    const note =
      next === "rejected"
        ? window.prompt(t("leaveUi.rejectionPrompt")) ?? undefined
        : undefined;
    setBusy(true);
    try {
      await reviewLeaveRequest(id, { status: next, reviewNote: note });
      setToast(
        next === "approved" ? t("leaveUi.approved") : t("leaveUi.rejected"),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("leaveUi.reviewFailed"));
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
            <span className="tch-v2__chip">{t("leaveUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{t("leaveUi.title")}</h2>
            <p className="tch-v2__hero-sub">{t("leaveUi.heroSub")}</p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : rows.length}</strong>
              <span>{t("leaveUi.statRequests")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : pendingCount}</strong>
              <span>{t("leaveUi.statPending")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : approvedCount}</strong>
              <span>{t("leaveUi.statApproved")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{types.length}</strong>
              <span>{t("leaveUi.statTypes")}</span>
            </div>
          </div>
        </div>
      </header>

      {canRequest ? (
        <form className="sa-toolbar" onSubmit={(e) => void onCreate(e)}>
          <label className="sa-field">
            <span>{t("leaveUi.type")}</span>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
            >
              {types.map((typeRow) => (
                <option key={typeRow.id} value={typeRow.id}>
                  {typeRow.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>{t("leaveUi.start")}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="sa-field">
            <span>{t("leaveUi.end")}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label className="sa-field sa-field--grow">
            <span>{t("leaveUi.reason")}</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
            />
          </label>
          <button type="submit" className="sa-btn sa-btn--primary" disabled={busy}>
            {t("leaveUi.requestLeave")}
          </button>
        </form>
      ) : null}

      <div className="sa-toolbar">
        <label className="sa-field">
          <span>{t("leaveUi.status")}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("common.all")}</option>
            {STATUS_KEYS.map((k) => (
              <option key={k} value={k}>
                {statusLabel(k)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t("leaveUi.colEmployee")}</th>
              <th>{t("leaveUi.colType")}</th>
              <th>{t("leaveUi.colDates")}</th>
              <th>{t("leaveUi.colDays")}</th>
              <th>{t("leaveUi.colStatus")}</th>
              <th>{t("leaveUi.colReason")}</th>
              <th>{t("leaveUi.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="sa-empty">
                  {t("common.loading")}
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={7} className="sa-empty">
                  {t("leaveUi.noRequests")}
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
                      {statusLabel(r.status)}
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
                            {t("leaveUi.approve")}
                          </button>
                          <button
                            type="button"
                            className="sa-link"
                            disabled={busy}
                            onClick={() => void onReview(r.id, "rejected")}
                          >
                            {t("leaveUi.reject")}
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
                                setToast(t("leaveUi.cancelled"));
                                return load();
                              })
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : t("leaveUi.cancelFailed"),
                                ),
                              )
                          }
                        >
                          {t("leaveUi.cancel")}
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