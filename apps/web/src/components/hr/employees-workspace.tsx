"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppToast } from "@/components/ui/app-toast";
import {
  listHrDepartments,
  listHrEmployees,
  listHrPositions,
  type EmployeeListItem,
  type HrOrgUnit,
} from "@/lib/hr";
import { hasPermission, Permission } from "@/lib/permissions";

export function EmployeesWorkspace() {
  const canManage = hasPermission(Permission.HR_EMPLOYEES_MANAGE);
  const canViewPayroll = hasPermission(Permission.PAYROLL_VIEW);
  const [rows, setRows] = useState<EmployeeListItem[]>([]);
  const [departments, setDepartments] = useState<HrOrgUnit[]>([]);
  const [positions, setPositions] = useState<HrOrgUnit[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const activeCount = useMemo(
    () =>
      rows.filter((r) => (r.profile?.employmentStatus ?? "ACTIVE") === "ACTIVE")
        .length,
    [rows],
  );
  const assignedDeptCount = useMemo(
    () => rows.filter((r) => Boolean(r.profile?.departmentName)).length,
    [rows],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [emps, deps, pos] = await Promise.all([
        listHrEmployees({
          search: search || undefined,
          departmentId: departmentId || undefined,
          status: status || undefined,
        }),
        listHrDepartments(),
        listHrPositions(),
      ]);
      setRows(emps);
      setDepartments(deps);
      setPositions(pos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, status]);

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">People</span>
            <h2 className="tch-v2__hero-title">Employees</h2>
            <p className="tch-v2__hero-sub">
              School workforce directory — teachers, office staff, and support
              roles. Manage org units on{" "}
              <Link href="/admin/hr/departments" className="tch-v2__hero-link">
                Departments
              </Link>
              {" · "}
              <Link href="/admin/hr/positions" className="tch-v2__hero-link">
                Positions
              </Link>
              {canViewPayroll ? (
                <>
                  {" · "}
                  <Link href="/admin/payroll" className="tch-v2__hero-link">
                    Payroll
                  </Link>
                </>
              ) : null}
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : rows.length}</strong>
              <span>Employees</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : activeCount}</strong>
              <span>Active</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : assignedDeptCount}</strong>
              <span>In dept</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{loading ? "—" : departments.length}</strong>
              <span>Departments</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-toolbar">
        <label className="sa-field sa-field--wide">
          <span>Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
            placeholder="Name, email, employee ID"
          />
        </label>
        <label className="sa-field">
          <span>Department</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </label>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="sa-empty">Loading…</p>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Role</th>
                <th>Department</th>
                <th>Position</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="sa-emp">
                      <span>{r.email}</span>
                    </div>
                  </td>
                  <td>{r.profile?.employeeCode ?? "—"}</td>
                  <td>{r.roleName}</td>
                  <td>{r.profile?.departmentName ?? "—"}</td>
                  <td>{r.profile?.positionName ?? "—"}</td>
                  <td>{r.profile?.employmentStatus ?? "—"}</td>
                  <td>
                    <Link className="sa-link" href={`/admin/hr/employees/${r.userId}`}>
                      {canManage ? "Open" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <p className="sa-empty">No employees match.</p> : null}
          {!positions.length ? null : null}
        </div>
      )}
    </div>
  );
}
