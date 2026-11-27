"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
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

const ATT_STATUS_KEYS: Record<StaffAttendanceStatus, string> = {
  present: "myAttendanceUi.attPresent",
  late: "myAttendanceUi.attLate",
  absent: "myAttendanceUi.attAbsent",
  half_day: "myAttendanceUi.attHalfDay",
  on_leave: "myAttendanceUi.attOnLeave",
  excused: "myAttendanceUi.attExcused",
};

export function MyAttendancePanel() {
  const { t } = useLocale();
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
      setError(err instanceof Error ? err.message : t("myAttendanceUi.loadFailed"));
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
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("myAttendanceUi.loadFailed")),
      )
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
    <div className="sa-page tch-day tch-my-att">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-day__hero">
        <div className="tch-day__hero-main">
          <div className="tch-day__brand">
            <span className="tch-day__chip">{t("myAttendanceUi.chipStaff")}</span>
            <span className="tch-day__icon" aria-hidden>
              <DashIcon name="attendance" className="dash-icon--sm" />
            </span>
          </div>
          <h2 className="tch-day__title">{t("myAttendanceUi.title")}</h2>
          <p className="tch-day__sub">{t("myAttendanceUi.subtitle")}</p>
        </div>
        <div className="tch-day__stats" aria-label={t("myAttendanceUi.summaryAria")}>
          <div className="tch-day__stat">
            <strong>{loading || rate == null ? "—" : `${rate}%`}</strong>
            <span>{t("myAttendanceUi.statRate")}</span>
          </div>
          <div className="tch-day__stat">
            <strong>{counts.present ?? 0}</strong>
            <span>{t("myAttendanceUi.statPresent")}</span>
          </div>
          <div className="tch-day__stat">
            <strong>{counts.late ?? 0}</strong>
            <span>{t("myAttendanceUi.statLate")}</span>
          </div>
          <div className="tch-day__stat tch-day__stat--warn">
            <strong>{counts.absent ?? 0}</strong>
            <span>{t("myAttendanceUi.statAbsent")}</span>
          </div>
        </div>
      </header>

      <div className="tch-my-att__toolbar">
        <label className="sa-field">
          <span>{t("myAttendanceUi.from")}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="sa-field">
          <span>{t("myAttendanceUi.to")}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="tch-my-att__kpis">
        <div className="tch-my-att__kpi">
          <span>{t("myAttendanceUi.leaveDays")}</span>
          <strong>{counts.on_leave ?? 0}</strong>
        </div>
        <div className="tch-my-att__kpi">
          <span>{t("myAttendanceUi.worked")}</span>
          <strong>{formatWorkedHours(workedMinutes)}</strong>
        </div>
        <div className="tch-my-att__kpi">
          <span>{t("myAttendanceUi.lateTotal")}</span>
          <strong>{t("myAttendanceUi.lateMin", { count: lateMinutes })}</strong>
        </div>
      </div>

      <section className="tch-my-att__qr">
        <div className="tch-my-att__qr-copy">
          <h3>{t("myAttendanceUi.checkInQr")}</h3>
          <p>{t("myAttendanceUi.qrHint")}</p>
          {!qrPayload ? (
            <button
              type="button"
              className="tch-day__empty-btn"
              onClick={() =>
                void issueMyStaffQr()
                  .then((q) => {
                    setQrPayload(q.payload);
                    setToast(t("myAttendanceUi.qrIssued"));
                  })
                  .catch((err) =>
                    setError(err instanceof Error ? err.message : t("myAttendanceUi.qrFailed")),
                  )
              }
            >
              {t("myAttendanceUi.generateQr")}
            </button>
          ) : (
            <p className="tch-my-att__code">
              {t("myAttendanceUi.manualCode")} <code>{qrPayload}</code>
            </p>
          )}
        </div>
        {qrPayload ? (
          <div className="tch-my-att__qr-frame">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={t("myAttendanceUi.qrAlt")}
                width={200}
                height={200}
              />
            ) : (
              <div className="tch-my-att__qr-placeholder" aria-hidden>
                {t("myAttendanceUi.generatingQr")}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t("myAttendanceUi.colDate")}</th>
              <th>{t("myAttendanceUi.colStatus")}</th>
              <th>{t("myAttendanceUi.colIn")}</th>
              <th>{t("myAttendanceUi.colOut")}</th>
              <th>{t("myAttendanceUi.colLate")}</th>
              <th>{t("myAttendanceUi.colWorked")}</th>
            </tr>
          </thead>
          <tbody>
            {!recent.length ? (
              <tr>
                <td colSpan={6} className="sa-empty">
                  {t("myAttendanceUi.noRecords")}
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>
                    <span className={`sa-badge sa-badge--${r.status}`}>
                      {t(
                        ATT_STATUS_KEYS[r.status as StaffAttendanceStatus],
                      )}
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
                  setToast(t("myAttendanceUi.leaveRequested"));
                  setReason("");
                  return load();
                })
                .catch((err) =>
                  setError(
                    err instanceof Error ? err.message : t("myAttendanceUi.leaveFailed"),
                  ),
                );
            }}
          >
            <label className="sa-field">
              <span>{t("myAttendanceUi.leaveType")}</span>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                required
              >
                {types.map((leave) => (
                  <option key={leave.id} value={leave.id}>
                    {leave.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="sa-field">
              <span>{t("myAttendanceUi.start")}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="sa-field">
              <span>{t("myAttendanceUi.end")}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <label className="sa-field sa-field--grow">
              <span>{t("myAttendanceUi.reason")}</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
              />
            </label>
            <button type="submit" className="sa-btn sa-btn--primary">
              {t("myAttendanceUi.requestLeave")}
            </button>
          </form>

          <div className="sa-table-wrap">
            <table className="sa-table sa-table--compact">
              <thead>
                <tr>
                  <th>{t("myAttendanceUi.colType")}</th>
                  <th>{t("myAttendanceUi.colDates")}</th>
                  <th>{t("myAttendanceUi.colDays")}</th>
                  <th>{t("myAttendanceUi.colStatus")}</th>
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
