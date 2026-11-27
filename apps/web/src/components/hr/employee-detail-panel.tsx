"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { EtbAmount } from "@/components/billing/etb-amount";
import {
  getHrEmployee,
  listHrDepartments,
  listHrPositions,
  updateHrEmployee,
  type EmployeeListItem,
  type HrOrgUnit,
} from "@/lib/hr";
import {
  createEmployeeCompensation,
  formatCents,
  listEmployeeCompensation,
} from "@/lib/payroll";
import { hasPermission, Permission } from "@/lib/permissions";

type Tab = "overview" | "employment" | "compensation" | "attendance" | "leave";

const EMP_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "DAILY",
  "HOURLY",
  "INTERNSHIP",
] as const;

const EMP_STATUSES = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "TERMINATED",
  "RESIGNED",
  "RETIRED",
] as const;

export function EmployeeDetailPanel({ userId }: { userId: string }) {
  const { t } = useLocale();
  const canManage = hasPermission(Permission.HR_EMPLOYEES_MANAGE);
  const canComp = hasPermission(Permission.PAYROLL_SETTINGS);
  const [tab, setTab] = useState<Tab>("overview");
  const [emp, setEmp] = useState<EmployeeListItem | null>(null);
  const [deps, setDeps] = useState<HrOrgUnit[]>([]);
  const [pos, setPos] = useState<HrOrgUnit[]>([]);
  const [comps, setComps] = useState<Awaited<ReturnType<typeof listEmployeeCompensation>>>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [basic, setBasic] = useState("15000");
  const [freq, setFreq] = useState("MONTHLY");
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState(t("employeeDetailUi.initialPackage"));

  function empTypeLabel(code: string) {
    const key = `employeeDetailUi.empType_${code}`;
    const translated = t(key);
    return translated === key ? code : translated;
  }

  function empStatusLabel(code: string) {
    const key = `employeeDetailUi.empStatus_${code}`;
    const translated = t(key);
    return translated === key ? code : translated;
  }

  async function load() {
    setError("");
    try {
      const [e, d, p] = await Promise.all([
        getHrEmployee(userId),
        listHrDepartments(),
        listHrPositions(),
      ]);
      setEmp(e);
      setDeps(d);
      setPos(p);
      if (hasPermission(Permission.PAYROLL_VIEW)) {
        setComps(await listEmployeeCompensation(userId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("employeeDetailUi.loadFailed"));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function onSaveEmployment(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !emp) return;
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await updateHrEmployee(userId, {
        employeeCode: String(fd.get("employeeCode") || ""),
        employmentType: String(fd.get("employmentType") || "FULL_TIME"),
        employmentStatus: String(fd.get("employmentStatus") || "ACTIVE"),
        hrDepartmentId: String(fd.get("hrDepartmentId") || "") || null,
        hrPositionId: String(fd.get("hrPositionId") || "") || null,
        hireDate: String(fd.get("hireDate") || "") || null,
        reason: String(fd.get("reason") || t("employeeDetailUi.employmentUpdateDefault")),
      });
      setToast(t("employeeDetailUi.employmentSaved"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("employeeDetailUi.saveFailed"));
    }
  }

  async function onAddCompensation(e: FormEvent) {
    e.preventDefault();
    if (!canComp) return;
    try {
      const basicAmountCents = Math.round(Number(basic) * 100);
      await createEmployeeCompensation(userId, {
        payFrequency: freq,
        basicAmountCents,
        hourlyRateCents:
          freq === "HOURLY" ? Math.round(Number(basic) * 100) : undefined,
        dailyRateCents:
          freq === "DAILY" ? Math.round(Number(basic) * 100) : undefined,
        effectiveFrom,
        reason,
      });
      setToast(t("employeeDetailUi.compensationRecorded"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("employeeDetailUi.compensationFailed"));
    }
  }

  if (!emp) {
    return <p className="sa-empty">{error || t("employeeDetailUi.loading")}</p>;
  }

  const tabs = [
    ["overview", t("employeeDetailUi.tabOverview")] as const,
    ["employment", t("employeeDetailUi.tabEmployment")] as const,
    ["compensation", t("employeeDetailUi.tabCompensation")] as const,
    ["attendance", t("employeeDetailUi.tabAttendance")] as const,
    ["leave", t("employeeDetailUi.tabLeave")] as const,
  ];

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("employeeDetailUi.chipEmployee")}</span>
            <h2 className="tch-v2__hero-title">{emp.name}</h2>
            <p className="tch-v2__hero-sub">
              <Link href="/admin/hr/employees" className="tch-v2__hero-link">
                {t("employeeDetailUi.employeesLink")}
              </Link>
              {" · "}
              {emp.roleName}
              {emp.profile?.employeeCode
                ? ` · ${emp.profile.employeeCode}`
                : ""}
              {emp.profile?.departmentName
                ? ` · ${emp.profile.departmentName}`
                : ""}
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>
                {emp.profile?.employmentStatus
                  ? empStatusLabel(emp.profile.employmentStatus)
                  : "—"}
              </strong>
              <span>{t("employeeDetailUi.statStatus")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>
                {emp.profile?.employmentType
                  ? empTypeLabel(emp.profile.employmentType)
                  : "—"}
              </strong>
              <span>{t("employeeDetailUi.statType")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{comps.length}</strong>
              <span>{t("employeeDetailUi.statPackages")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {canManage
                  ? t("employeeDetailUi.accessEdit")
                  : t("employeeDetailUi.accessView")}
              </strong>
              <span>{t("employeeDetailUi.statAccess")}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="sa-tabs" aria-label={t("employeeDetailUi.tabsAria")}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`sa-tab${tab === id ? " sa-tab--active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="hr-cards">
          <div className="hr-card">
            <h3>{t("employeeDetailUi.contact")}</h3>
            <p>{emp.email}</p>
            <p>{emp.phone || t("employeeDetailUi.noPhone")}</p>
          </div>
          <div className="hr-card">
            <h3>{t("employeeDetailUi.employment")}</h3>
            <p>
              {emp.profile?.employmentType
                ? empTypeLabel(emp.profile.employmentType)
                : t("employeeDetailUi.notSet")}
            </p>
            <p>
              {emp.profile?.employmentStatus
                ? empStatusLabel(emp.profile.employmentStatus)
                : "—"}
            </p>
            <p>
              {emp.profile?.departmentName ?? "—"} ·{" "}
              {emp.profile?.positionName ?? "—"}
            </p>
          </div>
        </div>
      ) : null}

      {tab === "employment" ? (
        <form className="hr-form" onSubmit={(e) => void onSaveEmployment(e)}>
          <label className="sa-field">
            <span>{t("employeeDetailUi.employeeId")}</span>
            <input
              name="employeeCode"
              defaultValue={emp.profile?.employeeCode ?? ""}
              disabled={!canManage}
            />
          </label>
          <label className="sa-field">
            <span>{t("employeeDetailUi.type")}</span>
            <select
              name="employmentType"
              defaultValue={emp.profile?.employmentType ?? "FULL_TIME"}
              disabled={!canManage}
            >
              {EMP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {empTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>{t("employeeDetailUi.status")}</span>
            <select
              name="employmentStatus"
              defaultValue={emp.profile?.employmentStatus ?? "ACTIVE"}
              disabled={!canManage}
            >
              {EMP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {empStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>{t("employeeDetailUi.department")}</span>
            <select
              name="hrDepartmentId"
              defaultValue={emp.profile?.hrDepartmentId ?? ""}
              disabled={!canManage}
            >
              <option value="">—</option>
              {deps.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>{t("employeeDetailUi.position")}</span>
            <select
              name="hrPositionId"
              defaultValue={emp.profile?.hrPositionId ?? ""}
              disabled={!canManage}
            >
              <option value="">—</option>
              {pos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>{t("employeeDetailUi.hireDate")}</span>
            <input
              type="date"
              name="hireDate"
              defaultValue={emp.profile?.hireDate ?? ""}
              disabled={!canManage}
            />
          </label>
          <label className="sa-field sa-field--full">
            <span>{t("employeeDetailUi.reason")}</span>
            <input
              name="reason"
              defaultValue={t("employeeDetailUi.employmentUpdateDefault")}
              disabled={!canManage}
            />
          </label>
          {canManage ? (
            <button type="submit" className="sa-btn sa-btn--primary">
              {t("employeeDetailUi.saveEmployment")}
            </button>
          ) : null}
        </form>
      ) : null}

      {tab === "compensation" ? (
        <div className="hr-stack">
          <div className="sa-table-wrap">
            <table className="sa-table sa-table--compact">
              <thead>
                <tr>
                  <th>{t("employeeDetailUi.tableEffective")}</th>
                  <th>{t("employeeDetailUi.tableFrequency")}</th>
                  <th>{t("employeeDetailUi.tableBasic")}</th>
                  <th>{t("employeeDetailUi.tableReason")}</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {String(c.effectiveFrom).slice(0, 10)}
                      {c.effectiveTo
                        ? ` → ${String(c.effectiveTo).slice(0, 10)}`
                        : t("employeeDetailUi.effectiveToCurrent")}
                    </td>
                    <td>{c.payFrequency}</td>
                    <td>
                      <EtbAmount cents={c.basicAmountCents} />
                    </td>
                    <td>{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!comps.length ? (
              <p className="sa-empty">{t("employeeDetailUi.noCompHistory")}</p>
            ) : null}
          </div>
          {canComp ? (
            <form className="hr-form" onSubmit={(e) => void onAddCompensation(e)}>
              <h3>{t("employeeDetailUi.newSalaryPackage")}</h3>
              <label className="sa-field">
                <span>{t("employeeDetailUi.frequency")}</span>
                <select value={freq} onChange={(e) => setFreq(e.target.value)}>
                  <option value="MONTHLY">{t("employeeDetailUi.freqMonthly")}</option>
                  <option value="WEEKLY">{t("employeeDetailUi.freqWeekly")}</option>
                  <option value="DAILY">{t("employeeDetailUi.freqDaily")}</option>
                  <option value="HOURLY">{t("employeeDetailUi.freqHourly")}</option>
                </select>
              </label>
              <label className="sa-field">
                <span>{t("employeeDetailUi.amountEtb")}</span>
                <input value={basic} onChange={(e) => setBasic(e.target.value)} />
              </label>
              <label className="sa-field">
                <span>{t("employeeDetailUi.effectiveFrom")}</span>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </label>
              <label className="sa-field sa-field--full">
                <span>{t("employeeDetailUi.reason")}</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <button type="submit" className="sa-btn sa-btn--primary">
                {t("employeeDetailUi.recordPackage", {
                  amount: formatCents(Math.round(Number(basic) * 100)),
                })}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {tab === "attendance" ? (
        <div className="hr-card">
          <p>
            {t("employeeDetailUi.attendanceBlurb")}{" "}
            <Link href="/admin/staff-attendance">
              {t("employeeDetailUi.openStaffAttendance")}
            </Link>
          </p>
        </div>
      ) : null}

      {tab === "leave" ? (
        <div className="hr-card">
          <p>
            {t("employeeDetailUi.leaveBlurb")}{" "}
            <Link href="/admin/leave">{t("employeeDetailUi.openLeave")}</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}