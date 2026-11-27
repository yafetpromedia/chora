"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import {
  listHrDepartments,
  listHrEmployees,
  listHrPositions,
  type EmployeeListItem,
  type HrOrgUnit,
} from "@/lib/hr";
import { hasPermission, Permission } from "@/lib/permissions";

const EMP_STATUS_KEYS = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "TERMINATED",
] as const;

export function EmployeesWorkspace() {
  const { t } = useLocale();
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
      setError(
        err instanceof Error ? err.message : t("employeesUi.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, status]);

  function statusLabel(code: string | undefined) {
    if (!code) return "—";
    const key = `employeeDetailUi.empStatus_${code}`;
    const translated = t(key);
    return translated === key ? code : translated;
  }

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("employeesUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{t("employeesUi.title")}</h2>
            <p className="tch-v2__hero-sub">
              {t("employeesUi.heroSub")}{" "}
              <Link href="/admin/hr/departments" className="tch-v2__hero-link">
                {t("employeesUi.linkDepartments")}
              </Link>
              {" · "}
              <Link href="/admin/hr/positions" className="tch-v2__hero-link">
                {t("employeesUi.linkPositions")}
              </Link>
              {canViewPayroll ? (
                <>
                  {" · "}
                  <Link href="/admin/payroll" className="tch-v2__hero-link">
                    {t("employeesUi.linkPayroll")}
                  </Link>
                </>
              ) : null}
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : rows.length}</strong>
              <span>{t("employeesUi.statEmployees")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : activeCount}</strong>
              <span>{t("employeesUi.statActive")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{loading ? "—" : assignedDeptCount}</strong>
              <span>{t("employeesUi.statInDept")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{loading ? "—" : departments.length}</strong>
              <span>{t("employeesUi.statDepartments")}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-toolbar">
        <label className="sa-field sa-field--wide">
          <span>{t("common.search")}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
            placeholder={t("employeesUi.searchPlaceholder")}
          />
        </label>
        <label className="sa-field">
          <span>{t("employeesUi.department")}</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">{t("common.all")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field">
          <span>{t("employeesUi.status")}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("common.all")}</option>
            {EMP_STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {t(`employeeDetailUi.empStatus_${s}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="sa-btn sa-btn--ghost"
          onClick={() => void load()}
        >
          {t("employeesUi.refresh")}
        </button>
      </div>

      {loading ? (
        <p className="sa-empty">{t("common.loading")}</p>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t("employeesUi.colEmployee")}</th>
                <th>{t("employeesUi.colCode")}</th>
                <th>{t("employeesUi.colRole")}</th>
                <th>{t("employeesUi.colDepartment")}</th>
                <th>{t("employeesUi.colPosition")}</th>
                <th>{t("employeesUi.colStatus")}</th>
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
                  <td>{statusLabel(r.profile?.employmentStatus)}</td>
                  <td>
                    <Link
                      className="sa-link"
                      href={`/admin/hr/employees/${r.userId}`}
                    >
                      {canManage
                        ? t("employeesUi.open")
                        : t("employeesUi.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="sa-empty">{t("employeesUi.noMatch")}</p>
          ) : null}
          {!positions.length ? null : null}
        </div>
      )}
    </div>
  );
}