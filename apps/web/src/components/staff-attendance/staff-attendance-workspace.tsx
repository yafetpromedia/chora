"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { StaffAttendanceScanner } from "@/components/staff-attendance/staff-attendance-scanner";
import { AppToast } from "@/components/ui/app-toast";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  STAFF_ATTENDANCE_STATUS_LABELS,
  STAFF_DEPARTMENT_LABELS,
  bulkMarkUnmarkedStaff,
  correctStaffAttendance,
  downloadStaffAttendanceCsv,
  formatLateLabel,
  formatWorkedHours,
  getStaffAttendanceDay,
  getStaffAttendanceHistory,
  getStaffQr,
  issueStaffQr,
  rotateStaffQr,
  setStaffQrActive,
  staffCheckIn,
  staffCheckOut,
  updateStaffAttendanceSettings,
  upsertManualStaffAttendance,
  type StaffAttendanceDayResponse,
  type StaffAttendanceDayRow,
  type StaffAttendanceRecord,
  type StaffAttendanceStatus,
  type StaffDepartment,
  type StaffQrCredential,
} from "@/lib/staff-attendance";

type ModalMode =
  | null
  | { type: "manual"; row: StaffAttendanceDayRow }
  | { type: "correct"; row: StaffAttendanceDayRow }
  | { type: "history"; row: StaffAttendanceDayRow }
  | { type: "settings" };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function StaffAttendanceWorkspace() {
  const searchParams = useSearchParams();
  const canManage = hasPermission(Permission.STAFF_ATTENDANCE_MANAGE);
  const canExport = hasPermission(Permission.STAFF_ATTENDANCE_ANALYTICS);
  const canQr = hasPermission(Permission.STAFF_ATTENDANCE_QR_MANAGE);

  const [tab, setTab] = useState<"roll" | "scan">("roll");
  const [date, setDate] = useState(todayIso);
  const [department, setDepartment] = useState<StaffDepartment | "">("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<StaffAttendanceDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [history, setHistory] = useState<StaffAttendanceRecord[]>([]);
  const [historyName, setHistoryName] = useState("");
  const [formStatus, setFormStatus] =
    useState<StaffAttendanceStatus>("present");
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formCheckIn, setFormCheckIn] = useState("");
  const [formCheckOut, setFormCheckOut] = useState("");
  const [settingsCheckIn, setSettingsCheckIn] = useState("08:00");
  const [settingsCheckOut, setSettingsCheckOut] = useState("17:00");
  const [settingsGrace, setSettingsGrace] = useState(10);
  const [settingsOt, setSettingsOt] = useState(true);
  const [exportFrom, setExportFrom] = useState(monthStartIso);
  const [exportTo, setExportTo] = useState(todayIso);
  const [qrInfo, setQrInfo] = useState<StaffQrCredential | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getStaffAttendanceDay({
        date,
        department: department || undefined,
        status: status || undefined,
        search: search || undefined,
      });
      setData(res);
      setSettingsCheckIn(res.settings.checkInTime);
      setSettingsCheckOut(res.settings.checkOutTime);
      setSettingsGrace(res.settings.graceMinutes);
      setSettingsOt(res.settings.overtimeEnabled !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Data fetch on filter change (same pattern as other school dashboards).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load()
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filter change
  }, [date, department, status]);

  useEffect(() => {
    const userId = searchParams.get("userId");
    const name = searchParams.get("name");
    if (!userId) return;
    /* Deep-link: open history modal from query params */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot deep link
    setHistoryName(name?.trim() || "Employee");
    setModal({
      type: "history",
      row: {
        userId,
        employeeName: name?.trim() || "Employee",
        email: "",
        portalRole: "",
        roleName: "",
        roleTemplateSlug: null,
        department: "",
        date: todayIso(),
        recordId: null,
        status: null,
        checkInAt: null,
        checkOutAt: null,
        checkInLabel: "",
        checkOutLabel: "",
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        workedMinutes: null,
        reason: null,
        notes: null,
        recordedBy: null,
        updatedBy: null,
      },
    });
    setHistory([]);
    void getStaffAttendanceHistory(userId)
      .then(setHistory)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load history"),
      );
  }, [searchParams]);

  async function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  async function onCheckIn(row: StaffAttendanceDayRow) {
    if (!canManage) return;
    setBusyId(row.userId);
    setError("");
    try {
      await staffCheckIn({ userId: row.userId, date });
      setToast(`Checked in ${row.employeeName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onCheckOut(row: StaffAttendanceDayRow) {
    if (!canManage) return;
    setBusyId(row.userId);
    setError("");
    try {
      await staffCheckOut({ userId: row.userId, date });
      setToast(`Checked out ${row.employeeName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setBusyId(null);
    }
  }

  function openManual(row: StaffAttendanceDayRow) {
    setFormStatus(row.status ?? "absent");
    setFormReason(row.reason ?? "");
    setFormNotes(row.notes ?? "");
    setFormCheckIn(row.checkInLabel || "");
    setFormCheckOut(row.checkOutLabel || "");
    setModal({ type: "manual", row });
  }

  function openCorrect(row: StaffAttendanceDayRow) {
    if (!row.recordId) {
      openManual(row);
      return;
    }
    setFormStatus(row.status ?? "present");
    setFormReason("");
    setFormNotes(row.notes ?? "");
    setFormCheckIn(row.checkInLabel || "");
    setFormCheckOut(row.checkOutLabel || "");
    setModal({ type: "correct", row });
  }

  async function openHistory(row: StaffAttendanceDayRow) {
    setHistoryName(row.employeeName);
    setModal({ type: "history", row });
    setHistory([]);
    setQrInfo(null);
    try {
      const [hist, qr] = await Promise.all([
        getStaffAttendanceHistory(row.userId),
        canQr ? getStaffQr(row.userId).catch(() => null) : Promise.resolve(null),
      ]);
      setHistory(hist);
      setQrInfo(qr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history");
    }
  }

  async function onBulkMarkAbsent(unmarked: number) {
    if (!canManage) return;
    if (unmarked <= 0) {
      setToast("Everyone in this view is already marked");
      return;
    }
    const ok = window.confirm(
      `Mark ${unmarked} unmarked ${unmarked === 1 ? "person" : "people"} as absent for ${date}?`,
    );
    if (!ok) return;
    setBulkBusy(true);
    setError("");
    try {
      const res = await bulkMarkUnmarkedStaff({
        date,
        status: "absent",
        department: department || undefined,
        search: search || undefined,
        reason: "Bulk mark unmarked as absent",
      });
      setToast(
        res.marked > 0
          ? `Marked ${res.marked} as absent`
          : "No unmarked staff to update",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk mark failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function saveManual() {
    if (!modal || modal.type !== "manual") return;
    setBusyId(modal.row.userId);
    try {
      await upsertManualStaffAttendance({
        userId: modal.row.userId,
        date,
        status: formStatus,
        checkInAt: formCheckIn || undefined,
        checkOutAt: formCheckOut || undefined,
        reason: formReason || undefined,
        notes: formNotes || undefined,
      });
      setToast("Attendance saved");
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  async function saveCorrect() {
    if (!modal || modal.type !== "correct" || !modal.row.recordId) return;
    if (!formReason.trim()) {
      setError("Correction reason is required");
      return;
    }
    setBusyId(modal.row.userId);
    try {
      await correctStaffAttendance(modal.row.recordId, {
        status: formStatus,
        checkInAt: formCheckIn || null,
        checkOutAt: formCheckOut || null,
        reason: formReason.trim(),
        notes: formNotes || undefined,
      });
      setToast("Attendance corrected");
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correction failed");
    } finally {
      setBusyId(null);
    }
  }

  async function saveSettings() {
    try {
      await updateStaffAttendanceSettings({
        checkInTime: settingsCheckIn,
        checkOutTime: settingsCheckOut,
        graceMinutes: settingsGrace,
        overtimeEnabled: settingsOt,
      });
      setToast("Working hours updated");
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settings update failed");
    }
  }

  async function onExport() {
    try {
      await downloadStaffAttendanceCsv({
        from: exportFrom,
        to: exportTo,
        group:
          department === "teachers"
            ? "teachers"
            : department
              ? "staff"
              : undefined,
      });
      setToast("Export downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  const summary = data?.summary;
  const unmarkedCount = summary?.unmarked ?? 0;

  return (
    <div className="sa-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Attendance</span>
            <h2 className="tch-v2__hero-title">Staff Attendance</h2>
            <p className="tch-v2__hero-sub">
              Manage teacher and staff attendance, check-ins, absences and
              working hours.
              {canExport ? (
                <>
                  {" "}
                  Open{" "}
                  <Link
                    href="/admin/staff-attendance/analytics"
                    className="tch-v2__hero-link"
                  >
                    Analytics
                  </Link>
                  .
                </>
              ) : null}
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>
                {loading || summary == null ? "—" : summary.present}
              </strong>
              <span>Present</span>
            </div>
            <div className="tch-v2__stat">
              <strong>
                {loading || summary == null ? "—" : summary.late}
              </strong>
              <span>Late</span>
            </div>
            <div className="tch-v2__stat">
              <strong>
                {loading || summary == null ? "—" : summary.absent}
              </strong>
              <span>Absent</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {loading || summary == null ? "—" : unmarkedCount}
              </strong>
              <span>Unmarked</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-hero__actions">
        {canManage ? (
          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            onClick={() => setModal({ type: "settings" })}
          >
            <DashIcon name="settings" className="dash-icon--sm" />
            Hours
          </button>
        ) : null}
        {canManage ? (
          <button
            type="button"
            className="sa-btn sa-btn--danger"
            disabled={bulkBusy || loading || unmarkedCount <= 0}
            onClick={() => void onBulkMarkAbsent(unmarkedCount)}
          >
            Mark rest absent
            {unmarkedCount > 0 ? ` (${unmarkedCount})` : ""}
          </button>
        ) : null}
        {canExport ? (
          <Link
            href="/admin/staff-attendance/analytics"
            className="sa-btn sa-btn--ghost"
          >
            <DashIcon name="chart" className="dash-icon--sm" />
            Analytics
          </Link>
        ) : null}
        {canExport ? (
          <button
            type="button"
            className="sa-btn sa-btn--primary"
            onClick={() => void onExport()}
          >
            <DashIcon name="chart" className="dash-icon--sm" />
            Export CSV
          </button>
        ) : null}
      </div>

      <div className="sa-stats">
        {(
          [
            ["Present", summary?.present, "present"],
            ["Late", summary?.late, "late"],
            ["Absent", summary?.absent, "absent"],
            ["On leave", summary?.on_leave, "leave"],
            ["Half day", summary?.half_day, "half"],
            ["Excused", summary?.excused, "excused"],
          ] as const
        ).map(([label, value, tone]) => (
          <div key={label} className={`sa-stat sa-stat--${tone}`}>
            <span className="sa-stat__label">{label}</span>
            <strong className="sa-stat__value">
              {loading || value == null ? "—" : value}
            </strong>
          </div>
        ))}
      </div>

      <nav className="sa-tabs" aria-label="Staff attendance views">
        <button
          type="button"
          className={`sa-tab${tab === "roll" ? " sa-tab--active" : ""}`}
          onClick={() => setTab("roll")}
        >
          Daily roll
        </button>
        {canManage ? (
          <button
            type="button"
            className={`sa-tab${tab === "scan" ? " sa-tab--active" : ""}`}
            onClick={() => setTab("scan")}
          >
            Scan QR
          </button>
        ) : null}
      </nav>

      {tab === "scan" && canManage ? (
        <StaffAttendanceScanner
          date={date}
          onDateChange={setDate}
          onScanned={() => void load()}
        />
      ) : null}

      {tab === "roll" ? (
      <>
      <div className="sa-toolbar">
        <label className="sa-field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="sa-field">
          <span>Department</span>
          <select
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value as StaffDepartment | "")
            }
          >
            <option value="">All departments</option>
            {Object.entries(STAFF_DEPARTMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="unmarked">Unmarked</option>
            {Object.entries(STAFF_ATTENDANCE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <form className="sa-search" onSubmit={onSearchSubmit}>
          <label className="sa-field sa-field--grow">
            <span>Search</span>
            <input
              type="search"
              placeholder="Name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="submit" className="sa-btn sa-btn--ghost">
            Search
          </button>
        </form>
        {canExport ? (
          <div className="sa-export-range">
            <label className="sa-field">
              <span>From</span>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
              />
            </label>
            <label className="sa-field">
              <span>To</span>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Late</th>
              <th>Worked</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="sa-empty">
                  Loading…
                </td>
              </tr>
            ) : !data?.rows.length ? (
              <tr>
                <td colSpan={9} className="sa-empty">
                  No staff match these filters.
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr key={row.userId}>
                  <td>
                    <div className="sa-emp">
                      <strong>{row.employeeName}</strong>
                      <span>{row.email}</span>
                    </div>
                  </td>
                  <td>{row.department}</td>
                  <td>{row.roleName}</td>
                  <td>
                    {row.status ? (
                      <span className={`sa-badge sa-badge--${row.status}`}>
                        {STAFF_ATTENDANCE_STATUS_LABELS[row.status]}
                      </span>
                    ) : (
                      <span className="sa-badge sa-badge--unmarked">
                        Unmarked
                      </span>
                    )}
                  </td>
                  <td>{row.checkInLabel || "—"}</td>
                  <td>{row.checkOutLabel || "—"}</td>
                  <td>{row.status ? formatLateLabel(row.lateMinutes) : "—"}</td>
                  <td>{formatWorkedHours(row.workedMinutes)}</td>
                  <td>
                    <div className="sa-actions">
                      <button
                        type="button"
                        className="sa-link"
                        onClick={() => void openHistory(row)}
                      >
                        View
                      </button>
                      {canManage && !row.checkInAt && !row.status ? (
                        <button
                          type="button"
                          className="sa-link"
                          disabled={busyId === row.userId}
                          onClick={() => void onCheckIn(row)}
                        >
                          Check-in
                        </button>
                      ) : null}
                      {canManage && row.checkInAt && !row.checkOutAt ? (
                        <button
                          type="button"
                          className="sa-link"
                          disabled={busyId === row.userId}
                          onClick={() => void onCheckOut(row)}
                        >
                          Check-out
                        </button>
                      ) : null}
                      {canManage ? (
                        <button
                          type="button"
                          className="sa-link"
                          onClick={() =>
                            row.recordId ? openCorrect(row) : openManual(row)
                          }
                        >
                          {row.recordId ? "Edit" : "Mark"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data?.settings ? (
        <p className="sa-hours-note">
          Expected hours {data.settings.checkInTime}–{data.settings.checkOutTime}
          , grace {data.settings.graceMinutes} min · {summary?.unmarked ?? 0}{" "}
          unmarked of {summary?.totalStaff ?? 0}
        </p>
      ) : null}
      </>
      ) : null}

      {modal ? (
        <div className="sa-modal-backdrop" role="presentation">
          <div
            className="sa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sa-modal-title"
          >
            {modal.type === "settings" ? (
              <>
                <h3 id="sa-modal-title">Working hours</h3>
                <p className="sa-modal__sub">
                  School-level expected check-in, check-out, and grace period.
                </p>
                <div className="sa-form-grid">
                  <label className="sa-field">
                    <span>Check-in</span>
                    <input
                      type="time"
                      value={settingsCheckIn}
                      onChange={(e) => setSettingsCheckIn(e.target.value)}
                    />
                  </label>
                  <label className="sa-field">
                    <span>Check-out</span>
                    <input
                      type="time"
                      value={settingsCheckOut}
                      onChange={(e) => setSettingsCheckOut(e.target.value)}
                    />
                  </label>
                  <label className="sa-field">
                    <span>Grace (minutes)</span>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={settingsGrace}
                      onChange={(e) =>
                        setSettingsGrace(Number(e.target.value) || 0)
                      }
                    />
                  </label>
                  <label className="sa-field sa-field--full">
                    <span>Overtime</span>
                    <label className="sa-check">
                      <input
                        type="checkbox"
                        checked={settingsOt}
                        onChange={(e) => setSettingsOt(e.target.checked)}
                      />
                      Count minutes after expected check-out as overtime
                    </label>
                  </label>
                </div>
                <div className="sa-modal__actions">
                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    onClick={() => void saveSettings()}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : null}

            {modal.type === "manual" || modal.type === "correct" ? (
              <>
                <h3 id="sa-modal-title">
                  {modal.type === "correct" ? "Correct attendance" : "Mark attendance"}
                </h3>
                <p className="sa-modal__sub">
                  {modal.row.employeeName} · {date}
                </p>
                <div className="sa-form-grid">
                  <label className="sa-field">
                    <span>Status</span>
                    <select
                      value={formStatus}
                      onChange={(e) =>
                        setFormStatus(e.target.value as StaffAttendanceStatus)
                      }
                    >
                      {Object.entries(STAFF_ATTENDANCE_STATUS_LABELS).map(
                        ([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="sa-field">
                    <span>Check-in</span>
                    <input
                      type="time"
                      value={formCheckIn}
                      onChange={(e) => setFormCheckIn(e.target.value)}
                    />
                  </label>
                  <label className="sa-field">
                    <span>Check-out</span>
                    <input
                      type="time"
                      value={formCheckOut}
                      onChange={(e) => setFormCheckOut(e.target.value)}
                    />
                  </label>
                  <label className="sa-field sa-field--full">
                    <span>
                      {modal.type === "correct" ? "Correction reason" : "Reason"}
                    </span>
                    <input
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      placeholder={
                        modal.type === "correct"
                          ? "Why is this being changed?"
                          : "Optional"
                      }
                    />
                  </label>
                  <label className="sa-field sa-field--full">
                    <span>Notes</span>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </label>
                </div>
                <div className="sa-modal__actions">
                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    disabled={busyId === modal.row.userId}
                    onClick={() =>
                      void (modal.type === "correct"
                        ? saveCorrect()
                        : saveManual())
                    }
                  >
                    Save
                  </button>
                </div>
              </>
            ) : null}

            {modal.type === "history" ? (
              <>
                <h3 id="sa-modal-title">Attendance history</h3>
                <p className="sa-modal__sub">
                  {historyName || modal.row.employeeName}
                </p>
                {canQr ? (
                  <div className="sa-qr-admin">
                    <p className="sa-modal__sub">
                      Staff gate QR{" "}
                      {qrInfo
                        ? qrInfo.active
                          ? "(active)"
                          : "(deactivated)"
                        : "(not issued)"}
                    </p>
                    {qrInfo ? (
                      <p className="sa-scan__hint">
                        <code>{qrInfo.payload}</code>
                      </p>
                    ) : null}
                    <div className="sa-modal__actions" style={{ justifyContent: "flex-start" }}>
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost"
                        onClick={() =>
                          void (qrInfo ? rotateStaffQr : issueStaffQr)(modal.row.userId)
                            .then((r) => {
                              setQrInfo(r);
                              setToast(qrInfo ? "QR rotated" : "QR issued");
                            })
                            .catch((err) =>
                              setError(
                                err instanceof Error ? err.message : "QR failed",
                              ),
                            )
                        }
                      >
                        {qrInfo ? "Regenerate" : "Issue QR"}
                      </button>
                      {qrInfo ? (
                        <button
                          type="button"
                          className="sa-btn sa-btn--ghost"
                          onClick={() =>
                            void setStaffQrActive(modal.row.userId, !qrInfo.active)
                              .then((r) => {
                                setQrInfo(r);
                                setToast(
                                  r.active ? "QR reactivated" : "QR deactivated",
                                );
                              })
                              .catch((err) =>
                                setError(
                                  err instanceof Error ? err.message : "QR failed",
                                ),
                              )
                          }
                        >
                          {qrInfo.active ? "Deactivate" : "Reactivate"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="sa-history">
                  {!history.length ? (
                    <p className="sa-empty">No records yet.</p>
                  ) : (
                    <table className="sa-table sa-table--compact">
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
                        {history.map((r) => (
                          <tr key={r.id}>
                            <td>{r.date}</td>
                            <td>
                              <span className={`sa-badge sa-badge--${r.status}`}>
                                {STAFF_ATTENDANCE_STATUS_LABELS[r.status]}
                              </span>
                            </td>
                            <td>{r.checkInLabel || "—"}</td>
                            <td>{r.checkOutLabel || "—"}</td>
                            <td>{formatLateLabel(r.lateMinutes)}</td>
                            <td>{formatWorkedHours(r.workedMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="sa-modal__actions">
                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost"
                    onClick={() => setModal(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
