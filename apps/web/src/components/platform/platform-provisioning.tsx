"use client";

import { useCallback, useEffect, useState } from "react";
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
    void load();
  }, [load]);

  if (loading) return <p className="plat-loading">Loading provisioning logs…</p>;

  return (
    <div className="plat-section plat-curriculum">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      <header className="plat-section-hero plat-section-hero--curriculum">
        <div>
          <p className="plat-section-hero__eyebrow">Content & Curriculum Engine</p>
          <h2 className="plat-section-hero__title">School provisioning</h2>
          <p className="plat-section-hero__sub">
            Audit trail when schools are created or re-provisioned from a curriculum package.
          </p>
        </div>
      </header>
      <div className="plat-toolbar">
        <button type="button" className="plat-btn plat-btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      <div className="plat-curriculum-table-wrap">
        <table className="plat-curriculum-table">
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
                <td colSpan={5} className="plat-curriculum-table__empty">
                  No provisioning runs yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="plat-curriculum-table__muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>{log.school.name}</td>
                  <td>
                    <code>{log.packageKey ?? "—"}</code>
                  </td>
                  <td>{log.step}</td>
                  <td>
                    <span
                      className={`plat-curriculum-level plat-curriculum-level--${log.status.toLowerCase()}`}
                    >
                      {log.status}
                    </span>
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
