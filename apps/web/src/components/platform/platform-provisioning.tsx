"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { platformFetch } from "@/lib/platform-auth";

type ProvisioningLogRow = {
  id: string;
  packageKey: string | null;
  step: string;
  status: string;
  message: string | null;
  createdAt: string;
  school: { name: string; joinCode: string };
};

export function PlatformProvisioning() {
  const [logs, setLogs] = useState<ProvisioningLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await platformFetch<ProvisioningLogRow[]>(
        "/platform/provisioning-logs?limit=100",
      );
      setLogs(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const stats = useMemo(() => {
    const ok = logs.filter((l) => l.status.toLowerCase() === "ok" || l.status.toLowerCase() === "success").length;
    const failed = logs.filter((l) => l.status.toLowerCase().includes("fail") || l.status.toLowerCase().includes("error")).length;
    const schools = new Set(logs.map((l) => l.school.joinCode)).size;
    return { total: logs.length, ok, failed, schools };
  }, [logs]);

  if (loading) {
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="settings" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Content & Curriculum Engine</p>
            <h2 className="plat-subjects-v2__title">School provisioning</h2>
            <p className="plat-subjects-v2__sub">
              Audit trail when schools are created or re-provisioned from a
              curriculum package.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.total}</strong>
            <span>Events</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.schools}</strong>
            <span>Schools</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.failed}</strong>
            <span>Failed</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__toolbar">
        <button
          type="button"
          className="plat-btn plat-btn--ghost plat-tenants-v2__toolbar-btn"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>When</th>
              <th>School</th>
              <th>Package</th>
              <th>Step</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="plat-subjects-v2__empty">
                  No provisioning runs yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="plat-subjects-v2__muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span className="plat-subjects-v2__name">{log.school.name}</span>
                    <span className="plat-subjects-v2__code"> {log.school.joinCode}</span>
                  </td>
                  <td>{log.packageKey ?? "—"}</td>
                  <td>{log.step}</td>
                  <td>
                    <span className="plat-subjects-v2__pill">{log.status}</span>
                    {log.message ? (
                      <span className="plat-subjects-v2__muted"> · {log.message}</span>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
