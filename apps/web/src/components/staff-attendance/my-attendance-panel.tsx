"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AppToast } from "@/components/ui/app-toast";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  createLeaveRequest,
  listLeaveRequests,
  listLeaveTypes,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/leave";
import {
  STAFF_ATTENDANCE_STATUS_LABELS,
  formatLateLabel,
  formatWorkedHours,
  getMyStaffAttendanceSummary,
  getMyStaffQr,
  issueMyStaffQr,
  type StaffAttendanceRecord,
  type StaffAttendanceStatus,
} from "@/lib/staff-attendance";

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function MyAttendancePanel() {
  const canLeave = hasPermission(Permission.LEAVE_REQUEST);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [rate, setRate] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lateMinutes, setLateMinutes] = useState(0);
  const [workedMinutes, setWorkedMinutes] = useState(0);
  const [recent, setRecent] = useState<StaffAttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrDataUrlState, setQrDataUrl] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  function fetchData() {
    return Promise.all([
      getMyStaffAttendanceSummary(from, to),
      listLeaveRequests({ mine: true }).catch(() => []),
      canLeave ? listLeaveTypes() : Promise.resolve([]),
      getMyStaffQr().catch(() => null),
    ]);
  }

  function applyData([summary, myLeaves, leaveTypes, qr]: Awaited<
    ReturnType<typeof fetchData>
  >) {
    setRate(summary.rate);
    setCounts(summary.counts);
    setLateMinutes(summary.lateMinutes);
    setWorkedMinutes(summary.workedMinutes);
    setRecent(summary.recent);
    setLeaves(myLeaves);
    setTypes(leaveTypes);
    if (leaveTypes[0]) {
      setLeaveTypeId((current) => current || leaveTypes[0].id);
    }
    setQrPayload(qr?.active ? qr.payload : null);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      applyData(await fetchData());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const rangeKey = `${from}|${to}`;
  const [prevRangeKey, setPrevRangeKey] = useState(rangeKey);
  if (rangeKey !== prevRangeKey) {
    setPrevRangeKey(rangeKey);
    setLoading(true);
    setError("");
  }

  useEffect(() => {
    void fetchData()
      .then(applyData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const qrDataUrl = qrPayload ? qrDataUrlState : "";

  useEffect(() => {
    if (!qrPayload) return;
    let cancelled = false;
    void QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a3d42", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  return (
    <div className="sa-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">My attendance</span>
            <h2 className="tch-v2__hero-title">My Attendance</h2>
            <p className="tch-v2__hero-sub">
              Your personal attendance, worked hours, and leave requests.
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>
                {loading || rate == null ? "—" : `${rate}%`}
              </strong>
              <span>Rate</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{counts.present ?? 0}</strong>
              <span>Present</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{counts.late ?? 0}</strong>
              <span>Late</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{counts.absent ?? 0}</strong>
              <span>Absent</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-toolbar">
        <label className="sa-field">
          <span>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="sa-field">
          <span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="sa-stats">
        <div className="sa-stat sa-stat--present">
          <span className="sa-stat__label">Rate</span>
          <strong className="sa-stat__value">
            {loading ? "—" : rate != null ? `${rate}%` : "—"}
          </strong>
        </div>
        <div className="sa-stat sa-stat--present">
          <span className="sa-stat__label">Present</span>
          <strong className="sa-stat__value">{counts.present ?? 0}</strong>
        </div>
        <div className="sa-stat sa-stat--late">
          <span className="sa-stat__label">Late</span>
          <strong className="sa-stat__value">{counts.late ?? 0}</strong>
        </div>
        <div className="sa-stat sa-stat--absent">
          <span className="sa-stat__label">Absent</span>
          <strong className="sa-stat__value">{counts.absent ?? 0}</strong>
        </div>
        <div className="sa-stat sa-stat--leave">
          <span className="sa-stat__label">Leave</span>
          <strong className="sa-stat__value">{counts.on_leave ?? 0}</strong>
        </div>
        <div className="sa-stat sa-stat--half">
          <span className="sa-stat__label">Worked</span>
          <strong className="sa-stat__value">
            {formatWorkedHours(workedMinutes)}
          </strong>
        </div>
      </div>
      <p className="sa-hours-note">Total late {lateMinutes} min in this range.</p>

      <div className="sa-scan__feed sa-my-qr">
        <header className="sa-scan__feed-head">
          <h3>My check-in QR</h3>
        </header>
        {qrPayload ? (
          <div className="sa-my-qr__body">
            <div className="sa-my-qr__frame">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Staff check-in QR code"
                  className="sa-my-qr__img"
                  width={220}
                  height={220}
                />
              ) : (
                <div className="sa-my-qr__placeholder" aria-hidden>
                  Generating…
                </div>
              )}
            </div>
            <div className="sa-my-qr__meta">
              <p className="sa-my-qr__hint">
                Show this QR at the gate scanner for check-in / check-out.
              </p>
              <p className="sa-hours-note">
                Manual code: <code>{qrPayload}</code>
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="sa-btn sa-btn--primary"
            onClick={() =>
              void issueMyStaffQr()
                .then((q) => {
                  setQrPayload(q.payload);
                  setToast("QR issued");
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : "QR failed"),
                )
            }
          >
            Generate my QR
          </button>
        )}
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>In</th>
              <th>Out</th>
              <th>Late</th>
              <th>Worked</th>
            </tr>
          </thead>
          <tbody>
            {!recent.length ? (
              <tr>
                <td colSpan={6} className="sa-empty">
                  No records in this range.
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>
                    <span className={`sa-badge sa-badge--${r.status}`}>
                      {
                        STAFF_ATTENDANCE_STATUS_LABELS[
                          r.status as StaffAttendanceStatus
                        ]
                      }
                    </span>
                  </td>
                  <td>{r.checkInLabel || "—"}</td>
                  <td>{r.checkOutLabel || "—"}</td>
                  <td>{formatLateLabel(r.lateMinutes)}</td>
                  <td>{formatWorkedHours(r.workedMinutes)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canLeave ? (
        <>
          <form
            className="sa-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              void createLeaveRequest({
                leaveTypeId,
                startDate,
                endDate,
                reason,
              })
                .then(() => {
                  setToast("Leave requested");
                  setReason("");
                  return load();
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : "Leave failed"),
                );
            }}
          >
            <label className="sa-field">
              <span>Leave type</span>
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
            <button type="submit" className="sa-btn sa-btn--primary">
              Request leave
            </button>
          </form>

          <div className="sa-table-wrap">
            <table className="sa-table sa-table--compact">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td>{l.leaveTypeName}</td>
                    <td>
                      {l.startDate} → {l.endDate}
                    </td>
                    <td>{l.days}</td>
                    <td>{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
