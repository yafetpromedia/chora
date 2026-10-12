"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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

export function EmployeeDetailPanel({ userId }: { userId: string }) {
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
  const [reason, setReason] = useState("Initial package");

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
      setError(err instanceof Error ? err.message : "Load failed");
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
        reason: String(fd.get("reason") || "Employment update"),
      });
      setToast("Employment saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
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
      setToast("Compensation package recorded");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compensation failed");
    }
  }

  if (!emp) {
    return <p className="sa-empty">{error || "Loading…"}</p>;
  }

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">Employee</span>
            <h2 className="tch-v2__hero-title">{emp.name}</h2>
            <p className="tch-v2__hero-sub">
              <Link href="/admin/hr/employees" className="tch-v2__hero-link">
                Employees
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
              <strong>{emp.profile?.employmentStatus ?? "—"}</strong>
              <span>Status</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{emp.profile?.employmentType ?? "—"}</strong>
              <span>Type</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{comps.length}</strong>
              <span>Packages</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{canManage ? "Edit" : "View"}</strong>
              <span>Access</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="sa-tabs" aria-label="Employee sections">
        {(
          [
            ["overview", "Overview"],
            ["employment", "Employment"],
            ["compensation", "Compensation"],
            ["attendance", "Attendance"],
            ["leave", "Leave"],
          ] as const
        ).map(([id, label]) => (
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
            <h3>Contact</h3>
            <p>{emp.email}</p>
            <p>{emp.phone || "No phone"}</p>
          </div>
          <div className="hr-card">
            <h3>Employment</h3>
            <p>{emp.profile?.employmentType ?? "Not set"}</p>
            <p>{emp.profile?.employmentStatus ?? "—"}</p>
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
            <span>Employee ID</span>
            <input
              name="employeeCode"
              defaultValue={emp.profile?.employeeCode ?? ""}
              disabled={!canManage}
            />
          </label>
          <label className="sa-field">
            <span>Type</span>
            <select
              name="employmentType"
              defaultValue={emp.profile?.employmentType ?? "FULL_TIME"}
              disabled={!canManage}
            >
              {[
                "FULL_TIME",
                "PART_TIME",
                "CONTRACT",
                "TEMPORARY",
                "DAILY",
                "HOURLY",
                "INTERNSHIP",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>Status</span>
            <select
              name="employmentStatus"
              defaultValue={emp.profile?.employmentStatus ?? "ACTIVE"}
              disabled={!canManage}
            >
              {[
                "ACTIVE",
                "ON_LEAVE",
                "SUSPENDED",
                "TERMINATED",
                "RESIGNED",
                "RETIRED",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="sa-field">
            <span>Department</span>
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
            <span>Position</span>
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
            <span>Hire date</span>
            <input
              type="date"
              name="hireDate"
              defaultValue={emp.profile?.hireDate ?? ""}
              disabled={!canManage}
            />
          </label>
          <label className="sa-field sa-field--full">
            <span>Reason</span>
            <input name="reason" defaultValue="Employment update" disabled={!canManage} />
          </label>
          {canManage ? (
            <button type="submit" className="sa-btn sa-btn--primary">
              Save employment
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
                  <th>Effective</th>
                  <th>Frequency</th>
                  <th>Basic</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {String(c.effectiveFrom).slice(0, 10)}
                      {c.effectiveTo
                        ? ` → ${String(c.effectiveTo).slice(0, 10)}`
                        : " → current"}
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
              <p className="sa-empty">No compensation history yet.</p>
            ) : null}
          </div>
          {canComp ? (
            <form className="hr-form" onSubmit={(e) => void onAddCompensation(e)}>
              <h3>New salary package</h3>
              <label className="sa-field">
                <span>Frequency</span>
                <select value={freq} onChange={(e) => setFreq(e.target.value)}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="DAILY">Daily</option>
                  <option value="HOURLY">Hourly</option>
                </select>
              </label>
              <label className="sa-field">
                <span>Amount (ETB)</span>
                <input value={basic} onChange={(e) => setBasic(e.target.value)} />
              </label>
              <label className="sa-field">
                <span>Effective from</span>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </label>
              <label className="sa-field sa-field--full">
                <span>Reason</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <button type="submit" className="sa-btn sa-btn--primary">
                Record package ({formatCents(Math.round(Number(basic) * 100))} ETB)
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {tab === "attendance" ? (
        <div className="hr-card">
          <p>
            Staff attendance is managed in the existing roll.{" "}
            <Link href="/admin/staff-attendance">Open Staff Attendance</Link>
          </p>
        </div>
      ) : null}

      {tab === "leave" ? (
        <div className="hr-card">
          <p>
            Leave requests live in the leave module.{" "}
            <Link href="/admin/leave">Open Leave</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
