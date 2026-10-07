"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [rows, setRows] = useState<EmployeeListItem[]>([]);
  const [departments, setDepartments] = useState<HrOrgUnit[]>([]);
  const [positions, setPositions] = useState<HrOrgUnit[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      <header className="hr-hero">
        <div>
          <p className="hr-hero__eyebrow">People</p>
          <h2 className="hr-hero__title">Employees</h2>
          <p className="hr-hero__sub">
            School workforce directory — teachers, office staff, and support roles.
          </p>
        </div>
        <div className="hr-hero__actions">
          <Link href="/admin/hr/departments" className="sa-btn sa-btn--ghost">
            Departments
          </Link>
          <Link href="/admin/hr/positions" className="sa-btn sa-btn--ghost">
            Positions
          </Link>
          {hasPermission(Permission.PAYROLL_VIEW) ? (
            <Link href="/admin/payroll" className="sa-btn sa-btn--primary">
              Payroll
            </Link>
          ) : null}
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
