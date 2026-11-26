"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { StaffAttendanceScanner } from "@/components/staff-attendance/staff-attendance-scanner";
import { AppToast } from "@/components/ui/app-toast";
import { hasPermission, Permission } from "@/lib/permissions";
import { useLocale } from "@/components/i18n/locale-provider";
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

function staffStatusLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  status: StaffAttendanceStatus | null,
  unmarked = false,
) {
  if (unmarked || !status) return t("staffAttendanceUi.unmarked");
  if (status === "present") return t("common.present");
  if (status === "late") return t("common.late");
  if (status === "absent") return t("common.absent");
  if (status === "excused") return t("common.excused");
  if (status === "half_day") return t("staffAttendanceUi.status_half_day");
  if (status === "on_leave") return t("staffAttendanceUi.status_on_leave");
  return STAFF_ATTENDANCE_STATUS_LABELS[status];
}

function staffDeptLabel(
  t: (key: string) => string,
  dept: StaffDepartment,
) {
  const key = `staffAttendanceUi.dept_${dept}`;
  const out = t(key);
  return out === key ? STAFF_DEPARTMENT_LABELS[dept] : out;
}

function monthStartIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function StaffAttendanceWorkspace() {
  const { t } = useLocale();
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
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.loadFailed"));
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
    setHistoryName(name?.trim() || t("staffAttendanceUi.employeeFallback"));
    setModal({
      type: "history",
      row: {
        userId,
        employeeName: name?.trim() || t("staffAttendanceUi.employeeFallback"),
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
        setError(
          err instanceof Error ? err.message : t("staffAttendanceUi.historyLoadFailed"),
        ),
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
      setToast(t("staffAttendanceUi.checkedIn", { name: row.employeeName }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.checkInFailed"));
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
      setToast(t("staffAttendanceUi.checkedOut", { name: row.employeeName }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.checkOutFailed"));
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
      setError(
        err instanceof Error ? err.message : t("staffAttendanceUi.historyLoadFailed"),
      );
    }
  }

  async function onBulkMarkAbsent(unmarked: number) {
    if (!canManage) return;
    if (unmarked <= 0) {
      setToast(t("staffAttendanceUi.allMarked"));
      return;
    }
    const ok = window.confirm(
      t("staffAttendanceUi.bulkConfirm", {
        count: unmarked,
        people:
          unmarked === 1
            ? t("staffAttendanceUi.personOne")
            : t("staffAttendanceUi.peopleMany"),
        date,
      }),
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
          ? t("staffAttendanceUi.markedAbsent", { count: res.marked })
          : t("staffAttendanceUi.noUnmarkedUpdate"),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.bulkMarkFailed"));
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
      setToast(t("staffAttendanceUi.attendanceSaved"));
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.saveFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function saveCorrect() {
    if (!modal || modal.type !== "correct" || !modal.row.recordId) return;
    if (!formReason.trim()) {
      setError(t("staffAttendanceUi.correctionReasonRequired"));
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
      setToast(t("staffAttendanceUi.attendanceCorrected"));
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.correctionFailed"));
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
      setToast(t("staffAttendanceUi.workingHoursUpdated"));
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.settingsUpdateFailed"));
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
      setToast(t("staffAttendanceUi.exportDownloaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffAttendanceUi.exportFailed"));
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
            <span className="tch-v2__chip">{t("staffAttendanceUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{t("staffAttendanceUi.title")}</h2>
            <p className="tch-v2__hero-sub">
              {t("staffAttendanceUi.heroSub")}
              {canExport ? (
                <>
                  {" "}
                  {t("staffAttendanceUi.heroSubAnalyticsPrefix")}{" "}
                  <Link
                    href="/admin/staff-attendance/analytics"
                    className="tch-v2__hero-link"
                  >
                    {t("staffAttendanceUi.analytics")}
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
              <span>{t("common.present")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>
                {loading || summary == null ? "—" : summary.late}
              </strong>
              <span>{t("common.late")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>
                {loading || summary == null ? "—" : summary.absent}
              </strong>
              <span>{t("common.absent")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {loading || summary == null ? "—" : unmarkedCount}
              </strong>
              <span>{t("staffAttendanceUi.statUnmarked")}</span>
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
            {t("staffAttendanceUi.hours")}
          </button>
        ) : null}
        {canManage ? (
          <button
            type="button"
            className="sa-btn sa-btn--danger"
            disabled={bulkBusy || loading || unmarkedCount <= 0}
            onClick={() => void onBulkMarkAbsent(unmarkedCount)}
          >
            {t("staffAttendanceUi.markRestAbsent")}
            {unmarkedCount > 0 ? ` (${unmarkedCount})` : ""}
          </button>
        ) : null}
        {canExport ? (
          <Link
            href="/admin/staff-attendance/analytics"
            className="sa-btn sa-btn--ghost"
          >
            <DashIcon name="chart" className="dash-icon--sm" />
            {t("staffAttendanceUi.analytics")}
          </Link>
        ) : null}
        {canExport ? (
          <button
            type="button"
            className="sa-btn sa-btn--primary"
            onClick={() => void onExport()}
          >
            <DashIcon name="chart" className="dash-icon--sm" />
            {t("staffAttendanceUi.exportCsv")}
          </button>
        ) : null}
      </div>

      <div className="sa-stats">
        {(
          [
            [t("common.present"), summary?.present, "present"],
            [t("common.late"), summary?.late, "late"],
            [t("common.absent"), summary?.absent, "absent"],
            [t("staffAttendanceUi.statOnLeave"), summary?.on_leave, "leave"],
            [t("staffAttendanceUi.statHalfDay"), summary?.half_day, "half"],
            [t("common.excused"), summary?.excused, "excused"],
          ] as const
        ).map(([label, value, tone]) => (
          <div key={tone} className={`sa-stat sa-stat--${tone}`}>
            <span className="sa-stat__label">{label}</span>
            <strong className="sa-stat__value">
              {loading || value == null ? "—" : value}
            </strong>
          </div>
        ))}
      </div>

      <nav className="sa-tabs" aria-label={t("staffAttendanceUi.tabsAria")}>
        <button
          type="button"
          className={`sa-tab${tab === "roll" ? " sa-tab--active" : ""}`}
          onClick={() => setTab("roll")}
        >
          {t("staffAttendanceUi.tabRoll")}
        </button>
        {canManage ? (
          <button
            type="button"
            className={`sa-tab${tab === "scan" ? " sa-tab--active" : ""}`}
            onClick={() => setTab("scan")}
          >
            {t("staffAttendanceUi.tabScan")}
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
          <span>{t("staffAttendanceUi.date")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="sa-field">
          <span>{t("staffAttendanceUi.department")}</span>
          <select
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value as StaffDepartment | "")
            }
          >
            <option value="">{t("staffAttendanceUi.allDepartments")}</option>
            {(Object.keys(STAFF_DEPARTMENT_LABELS) as StaffDepartment[]).map(
              (k) => (
                <option key={k} value={k}>
                  {staffDeptLabel(t, k)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="sa-field">
          <span>{t("staffAttendanceUi.status")}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("staffAttendanceUi.allStatuses")}</option>
            <option value="unmarked">{t("staffAttendanceUi.unmarked")}</option>
            {(Object.keys(STAFF_ATTENDANCE_STATUS_LABELS) as StaffAttendanceStatus[]).map(
              (k) => (
                <option key={k} value={k}>
                  {staffStatusLabel(t, k)}
                </option>
              ),
            )}
          </select>
        </label>
        <form className="sa-search" onSubmit={onSearchSubmit}>
          <label className="sa-field sa-field--grow">
            <span>{t("common.search")}</span>
            <input
              type="search"
              placeholder={t("staffAttendanceUi.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button type="submit" className="sa-btn sa-btn--ghost">
            {t("common.search")}
          </button>
        </form>
        {canExport ? (
          <div className="sa-export-range">
            <label className="sa-field">
              <span>{t("staffAttendanceUi.from")}</span>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
              />
            </label>
            <label className="sa-field">
              <span>{t("staffAttendanceUi.to")}</span>
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
              <th>{t("staffAttendanceUi.colEmployee")}</th>
              <th>{t("staffAttendanceUi.colDepartment")}</th>
              <th>{t("staffAttendanceUi.colRole")}</th>
              <th>{t("staffAttendanceUi.colStatus")}</th>
              <th>{t("staffAttendanceUi.colCheckIn")}</th>
              <th>{t("staffAttendanceUi.colCheckOut")}</th>
              <th>{t("staffAttendanceUi.colLate")}</th>
              <th>{t("staffAttendanceUi.colWorked")}</th>
              <th>{t("staffAttendanceUi.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="sa-empty">
                  {t("common.loading")}
                </td>
              </tr>
            ) : !data?.rows.length ? (
              <tr>
                <td colSpan={9} className="sa-empty">
                  {t("staffAttendanceUi.noStaffMatch")}
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
                        {staffStatusLabel(t, row.status)}
                      </span>
                    ) : (
                      <span className="sa-badge sa-badge--unmarked">
                        {t("staffAttendanceUi.unmarked")}
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
                        {t("staffAttendanceUi.view")}
                      </button>
                      {canManage && !row.checkInAt && !row.status ? (
                        <button
                          type="button"
                          className="sa-link"
                          disabled={busyId === row.userId}
                          onClick={() => void onCheckIn(row)}
                        >
                          {t("staffAttendanceUi.checkIn")}
                        </button>
                      ) : null}
                      {canManage && row.checkInAt && !row.checkOutAt ? (
                        <button
                          type="button"
                          className="sa-link"
                          disabled={busyId === row.userId}
                          onClick={() => void onCheckOut(row)}
                        >
                          {t("staffAttendanceUi.checkOut")}
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
                          {row.recordId
                            ? t("staffAttendanceUi.edit")
                            : t("staffAttendanceUi.mark")}
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
          {t("staffAttendanceUi.hoursNote", {
            checkIn: data.settings.checkInTime,
            checkOut: data.settings.checkOutTime,
            grace: data.settings.graceMinutes,
            unmarked: summary?.unmarked ?? 0,
            total: summary?.totalStaff ?? 0,
          })}
        </p>
      ) : null}
      </>
      ) : null}

      {modal ? (
        <div
          className="sa-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className={`sa-modal${modal.type === "history" ? " sa-modal--history" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sa-modal-title"
          >
            {modal.type === "settings" ? (
              <>
                <h3 id="sa-modal-title">{t("staffAttendanceUi.modalWorkingHours")}</h3>
                <p className="sa-modal__sub">
                  {t("staffAttendanceUi.modalWorkingHoursSub")}
                </p>
                <div className="sa-form-grid">
                  <label className="sa-field">
                    <span>{t("staffAttendanceUi.checkIn")}</span>
                    <input
                      type="time"
                      value={settingsCheckIn}
                      onChange={(e) => setSettingsCheckIn(e.target.value)}
                    />
                  </label>
                  <label className="sa-field">
                    <span>{t("staffAttendanceUi.checkOut")}</span>
                    <input
                      type="time"
                      value={settingsCheckOut}
                      onChange={(e) => setSettingsCheckOut(e.target.value)}
                    />
                  </label>
                  <label className="sa-field">
                    <span>{t("staffAttendanceUi.graceMinutes")}</span>
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
                    <span>{t("staffAttendanceUi.overtime")}</span>
                    <label className="sa-check">
                      <input
                        type="checkbox"
                        checked={settingsOt}
                        onChange={(e) => setSettingsOt(e.target.checked)}
                      />
                      {t("staffAttendanceUi.overtimeHint")}
                    </label>
                  </label>
                </div>
                <div className="sa-modal__actions">
                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost"
                    onClick={() => setModal(null)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    onClick={() => void saveSettings()}
                  >
                    {t("common.save")}
                  </button>
                </div>
              </>
            ) : null}

            {modal.type === "manual" || modal.type === "correct" ? (
              <>
                <h3 id="sa-modal-title">
                  {modal.type === "correct"
                    ? t("staffAttendanceUi.modalCorrect")
                    : t("staffAttendanceUi.modalMark")}
                </h3>
                <p className="sa-modal__sub">
                  {modal.row.employeeName} · {date}
                </p>
                <div className="sa-form-grid">
                  <label className="sa-field">
                    <span>{t("staffAttendanceUi.status")}</span>
                    <select
                      value={formStatus}
                      onChange={(e) =>
                        setFormStatus(e.target.value as StaffAttendanceStatus)
                      }
                    >
                      {(
                        Object.keys(
                          STAFF_ATTENDANCE_STATUS_LABELS,
                        ) as StaffAttendanceStatus[]
                      ).map((k) => (
                        <option key={k} value={k}>
                          {staffStatusLabel(t, k)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sa-field">
                    <span>{t("staffAttendanceUi.checkIn")}</span>
                    <input
                      type="time"
                      value={formCheckIn}
                      onChange={(e) => setFormCheckIn(e.target.value)}
                    />
                  </label>
                  <label className="sa-field">
                    <span>{t("staffAttendanceUi.checkOut")}</span>
                    <input
                      type="time"
                      value={formCheckOut}
                      onChange={(e) => setFormCheckOut(e.target.value)}
                    />
                  </label>
                  <label className="sa-field sa-field--full">
                    <span>
                      {modal.type === "correct"
                        ? t("staffAttendanceUi.correctionReason")
                        : t("staffAttendanceUi.reason")}
                    </span>
                    <input
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      placeholder={
                        modal.type === "correct"
                          ? t("staffAttendanceUi.reasonWhyChanged")
                          : t("staffAttendanceUi.optional")
                      }
                    />
                  </label>
                  <label className="sa-field sa-field--full">
                    <span>{t("staffAttendanceUi.notes")}</span>
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
                    {t("common.cancel")}
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
                    {t("common.save")}
                  </button>
                </div>
              </>
            ) : null}

            {modal.type === "history" ? (
              <>
                <header className="sa-hist-hero">
                  <div className="sa-hist-hero__avatar" aria-hidden>
                    {(historyName || modal.row.employeeName)
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="sa-hist-hero__main">
                    <p className="sa-hist-hero__eyebrow">
                      {t("staffAttendanceUi.historyEyebrow")}
                    </p>
                    <h3 id="sa-modal-title" className="sa-hist-hero__title">
                      {historyName || modal.row.employeeName}
                    </h3>
                    <p className="sa-hist-hero__meta">
                      {[
                        modal.row.roleName,
                        modal.row.department
                          ? staffDeptLabel(
                              t,
                              modal.row.department as StaffDepartment,
                            )
                          : modal.row.department,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="sa-hist-hero__close"
                    aria-label={t("common.close")}
                    onClick={() => setModal(null)}
                  >
                    ×
                  </button>
                </header>

                {canQr ? (
                  <section className="sa-qr-card">
                    <div className="sa-qr-card__head">
                      <span className="sa-qr-card__icon" aria-hidden>
                        <DashIcon name="id-card" className="dash-icon--sm" />
                      </span>
                      <div>
                        <h4 className="sa-qr-card__title">
                          {t("staffAttendanceUi.staffGateQr")}
                        </h4>
                        <p className="sa-qr-card__sub">
                          {t("staffAttendanceUi.staffGateQrSub")}
                        </p>
                      </div>
                      <span
                        className={`sa-qr-card__status sa-qr-card__status--${
                          qrInfo
                            ? qrInfo.active
                              ? "active"
                              : "off"
                            : "none"
                        }`}
                      >
                        {qrInfo
                          ? qrInfo.active
                            ? t("staffAttendanceUi.qrActive")
                            : t("staffAttendanceUi.qrDeactivated")
                          : t("staffAttendanceUi.qrNotIssued")}
                      </span>
                    </div>
                    {qrInfo ? (
                      <p className="sa-qr-card__payload">
                        <code>{qrInfo.payload}</code>
                      </p>
                    ) : (
                      <p className="sa-qr-card__hint">
                        {t("staffAttendanceUi.qrIssueHint")}
                      </p>
                    )}
                    <div className="sa-qr-card__actions">
                      <button
                        type="button"
                        className={`sa-btn ${qrInfo ? "sa-btn--ghost" : "sa-btn--primary"}`}
                        onClick={() =>
                          void (qrInfo ? rotateStaffQr : issueStaffQr)(
                            modal.row.userId,
                          )
                            .then((r) => {
                              setQrInfo(r);
                              setToast(
                                qrInfo
                                  ? t("staffAttendanceUi.qrRotated")
                                  : t("staffAttendanceUi.qrIssued"),
                              );
                            })
                            .catch((err) =>
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : t("staffAttendanceUi.qrFailed"),
                              ),
                            )
                        }
                      >
                        {qrInfo
                          ? t("staffAttendanceUi.regenerate")
                          : t("staffAttendanceUi.issueQr")}
                      </button>
                      {qrInfo ? (
                        <button
                          type="button"
                          className="sa-btn sa-btn--ghost"
                          onClick={() =>
                            void setStaffQrActive(
                              modal.row.userId,
                              !qrInfo.active,
                            )
                              .then((r) => {
                                setQrInfo(r);
                                setToast(
                                  r.active
                                    ? t("staffAttendanceUi.qrReactivated")
                                    : t("staffAttendanceUi.qrDeactivatedToast"),
                                );
                              })
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "QR failed",
                                ),
                              )
                          }
                        >
                          {qrInfo.active
                            ? t("staffAttendanceUi.deactivate")
                            : t("staffAttendanceUi.reactivate")}
                        </button>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section className="sa-history">
                  <div className="sa-history__head">
                    <h4 className="sa-history__title">
                      {t("staffAttendanceUi.recentRecords")}
                    </h4>
                    <span className="sa-history__count">
                      {history.length === 1
                        ? t("staffAttendanceUi.dayOne")
                        : t("staffAttendanceUi.daysMany", {
                            count: history.length,
                          })}
                    </span>
                  </div>
                  {!history.length ? (
                    <div className="sa-history__empty">
                      <span className="sa-history__empty-icon" aria-hidden>
                        <DashIcon name="attendance" className="dash-icon--sm" />
                      </span>
                      <p className="sa-history__empty-title">
                        {t("staffAttendanceUi.noRecordsTitle")}
                      </p>
                      <p className="sa-history__empty-sub">
                        {t("staffAttendanceUi.noRecordsSub")}
                      </p>
                    </div>
                  ) : (
                    <ul className="sa-history__list">
                      {history.map((r) => (
                        <li key={r.id} className="sa-history__row">
                          <div className="sa-history__date">
                            <strong>
                              {new Date(r.date + "T12:00:00").toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </strong>
                            <span>{r.date}</span>
                          </div>
                          <span className={`sa-badge sa-badge--${r.status}`}>
                            {staffStatusLabel(t, r.status)}
                          </span>
                          <div className="sa-history__times">
                            <span>
                              {t("staffAttendanceUi.historyIn")}{" "}
                              <strong>{r.checkInLabel || "—"}</strong>
                            </span>
                            <span>
                              {t("staffAttendanceUi.historyOut")}{" "}
                              <strong>{r.checkOutLabel || "—"}</strong>
                            </span>
                          </div>
                          <div className="sa-history__metrics">
                            <span>{formatLateLabel(r.lateMinutes)}</span>
                            <span>{formatWorkedHours(r.workedMinutes)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="sa-modal__actions sa-modal__actions--history">
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    onClick={() => setModal(null)}
                  >
                    {t("common.close")}
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
