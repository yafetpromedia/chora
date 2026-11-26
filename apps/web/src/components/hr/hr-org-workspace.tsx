"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import {
  createHrDepartment,
  createHrPosition,
  listHrDepartments,
  listHrPositions,
  type HrOrgUnit,
} from "@/lib/hr";
import { hasPermission, Permission } from "@/lib/permissions";

export function HrOrgWorkspace({ kind }: { kind: "departments" | "positions" }) {
  const { t, tn } = useLocale();
  const canManage = hasPermission(Permission.HR_ORG_MANAGE);
  const [rows, setRows] = useState<HrOrgUnit[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const isDepartments = kind === "departments";
  const title = isDepartments
    ? t("hrOrgUi.departmentsTitle")
    : t("hrOrgUi.positionsTitle");
  const otherHref = isDepartments
    ? "/admin/hr/positions"
    : "/admin/hr/departments";
  const otherLabel = isDepartments
    ? tn("Positions")
    : tn("Departments");

  async function load() {
    setError("");
    try {
      setRows(
        isDepartments ? await listHrDepartments() : await listHrPositions(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("hrOrgUi.loadFailed"));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = isDepartments
          ? await listHrDepartments()
          : await listHrPositions();
        if (!cancelled) {
          setError("");
          setRows(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("hrOrgUi.loadFailed"),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    try {
      if (isDepartments) {
        await createHrDepartment({ name, code });
      } else {
        await createHrPosition({ name, code });
      }
      setName("");
      setCode("");
      setToast(t("hrOrgUi.saved"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("hrOrgUi.createFailed"));
    }
  }

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />
      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("hrOrgUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{title}</h2>
            <p className="tch-v2__hero-sub">
              {t("hrOrgUi.heroSubPrefix")}{" "}
              <Link href="/admin/hr/employees" className="tch-v2__hero-link">
                {tn("Employees")}
              </Link>
              {" · "}
              <Link href={otherHref} className="tch-v2__hero-link">
                {otherLabel}
              </Link>
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{rows.length}</strong>
              <span>{t("hrOrgUi.statTotal")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{activeCount}</strong>
              <span>{t("hrOrgUi.statActive")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{rows.length - activeCount}</strong>
              <span>{t("hrOrgUi.statInactive")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {canManage ? t("hrOrgUi.accessEdit") : t("hrOrgUi.accessView")}
              </strong>
              <span>{t("hrOrgUi.statAccess")}</span>
            </div>
          </div>
        </div>
      </header>

      {canManage ? (
        <form className="hr-form" onSubmit={(e) => void onCreate(e)}>
          <label className="sa-field">
            <span>{t("hrOrgUi.name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="sa-field">
            <span>{t("hrOrgUi.code")}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="sa-btn sa-btn--primary">
            {isDepartments
              ? t("hrOrgUi.addDepartment")
              : t("hrOrgUi.addPosition")}
          </button>
        </form>
      ) : null}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t("hrOrgUi.name")}</th>
              <th>{t("hrOrgUi.code")}</th>
              <th>{t("hrOrgUi.active")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td>{r.code}</td>
                <td>{r.active ? t("hrOrgUi.yes") : t("hrOrgUi.no")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}