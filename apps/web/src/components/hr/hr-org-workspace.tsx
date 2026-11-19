"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
  const canManage = hasPermission(Permission.HR_ORG_MANAGE);
  const [rows, setRows] = useState<HrOrgUnit[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  async function load() {
    setError("");
    try {
      setRows(
        kind === "departments"
          ? await listHrDepartments()
          : await listHrPositions(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data =
          kind === "departments"
            ? await listHrDepartments()
            : await listHrPositions();
        if (!cancelled) {
          setError("");
          setRows(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    try {
      if (kind === "departments") {
        await createHrDepartment({ name, code });
      } else {
        await createHrPosition({ name, code });
      }
      setName("");
      setCode("");
      setToast("Saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  const title = kind === "departments" ? "Departments" : "Positions";
  const activeCount = rows.filter((r) => r.active).length;
  const otherHref =
    kind === "departments" ? "/admin/hr/positions" : "/admin/hr/departments";
  const otherLabel = kind === "departments" ? "Positions" : "Departments";

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />
      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">People</span>
            <h2 className="tch-v2__hero-title">{title}</h2>
            <p className="tch-v2__hero-sub">
              HR org chart units for this school (separate from curriculum
              departments). Open{" "}
              <Link href="/admin/hr/employees" className="tch-v2__hero-link">
                Employees
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
              <span>Total</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{activeCount}</strong>
              <span>Active</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{rows.length - activeCount}</strong>
              <span>Inactive</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{canManage ? "Edit" : "View"}</strong>
              <span>Access</span>
            </div>
          </div>
        </div>
      </header>

      {canManage ? (
        <form className="hr-form" onSubmit={(e) => void onCreate(e)}>
          <label className="sa-field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="sa-field">
            <span>Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="sa-btn sa-btn--primary">
            Add {kind === "departments" ? "department" : "position"}
          </button>
        </form>
      ) : null}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td>{r.code}</td>
                <td>{r.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
