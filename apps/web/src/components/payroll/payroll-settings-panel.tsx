"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AppToast } from "@/components/ui/app-toast";
import {
  createCompensationComponent,
  getPayrollSettings,
  listCompensationComponents,
  listOvertimeApprovals,
  listPayrollRuleSets,
  reviewOvertimeApproval,
  updatePayrollSettings,
} from "@/lib/payroll";
import { hasPermission, Permission } from "@/lib/permissions";

export function PayrollSettingsPanel() {
  const canSettings = hasPermission(Permission.PAYROLL_SETTINGS);
  const canApprove = hasPermission(Permission.PAYROLL_APPROVE);
  const [settings, setSettings] = useState<Awaited<
    ReturnType<typeof getPayrollSettings>
  > | null>(null);
  const [components, setComponents] = useState<
    Awaited<ReturnType<typeof listCompensationComponents>>
  >([]);
  const [ruleSets, setRuleSets] = useState<
    Awaited<ReturnType<typeof listPayrollRuleSets>>
  >([]);
  const [ot, setOt] = useState<Awaited<ReturnType<typeof listOvertimeApprovals>>>(
    [],
  );
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [compName, setCompName] = useState("");
  const [compCode, setCompCode] = useState("");
  const [compType, setCompType] = useState("EARNING");

  async function load() {
    if (!canSettings) return;
    setError("");
    try {
      const [s, c, r, o] = await Promise.all([
        getPayrollSettings(),
        listCompensationComponents(),
        listPayrollRuleSets(),
        listOvertimeApprovals("PENDING").catch(() => []),
      ]);
      setSettings(s);
      setComponents(c);
      setRuleSets(r);
      setOt(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings || !canSettings) return;
    try {
      await updatePayrollSettings({
        workingDaysPerMonth: settings.workingDaysPerMonth,
        overtimeEnabled: settings.overtimeEnabled,
        overtimeMultiplierBp: settings.overtimeMultiplierBp,
        overtimeApprovalRequired: settings.overtimeApprovalRequired,
        absenceDeductionMethod: settings.absenceDeductionMethod,
        absenceFixedDays: settings.absenceFixedDays,
      });
      setToast("Settings saved (statutory remains inactive)");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (!canSettings) {
    return (
      <div className="hr-page">
        <div className="hr-empty">
          <p className="hr-empty__title">No settings access</p>
          <p className="hr-empty__sub">
            You need the payroll settings permission to manage policies and
            components.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="hr-hero">
        <div>
          <p className="hr-hero__eyebrow">Payroll</p>
          <h2 className="hr-hero__title">Settings</h2>
          <p className="hr-hero__sub">
            Attendance feed policies, compensation catalog, and inactive
            statutory packs for this school.
          </p>
        </div>
        <div className="hr-hero__actions">
          <Link href="/admin/payroll" className="sa-btn sa-btn--ghost">
            Back to runs
          </Link>
        </div>
      </header>

      <div className="hr-banner hr-banner--warn">
        <p>
          <strong>Statutory tax/pension inactive</strong> until MoF-verified.
          The engine always applies zero statutory amounts.
        </p>
      </div>

      <div className="hr-settings-grid">
        {settings ? (
          <section className="hr-panel">
            <div className="hr-panel__head">
              <div>
                <h3 className="hr-panel__title">Attendance feed policies</h3>
                <p className="hr-panel__hint">
                  How overtime and absence from staff attendance affect payroll.
                </p>
              </div>
            </div>
            <form className="hr-form" onSubmit={(e) => void onSaveSettings(e)}>
              <label className="sa-field">
                <span>Working days / month</span>
                <input
                  type="number"
                  min={1}
                  value={settings.workingDaysPerMonth}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workingDaysPerMonth: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="sa-field">
                <span>OT multiplier (bp, 15000 = 1.5×)</span>
                <input
                  type="number"
                  value={settings.overtimeMultiplierBp}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      overtimeMultiplierBp: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="sa-field sa-field--full">
                <span>Absence deduction</span>
                <select
                  value={settings.absenceDeductionMethod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      absenceDeductionMethod: e.target.value,
                    })
                  }
                >
                  <option value="NO_DEDUCTION">No deduction (default)</option>
                  <option value="MONTHLY_DIVIDED_BY_WORKING_DAYS">
                    Monthly ÷ working days
                  </option>
                  <option value="MONTHLY_DIVIDED_BY_FIXED_DAYS">
                    Monthly ÷ fixed days
                  </option>
                </select>
              </label>
              <label className="sa-check">
                <input
                  type="checkbox"
                  checked={settings.overtimeEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      overtimeEnabled: e.target.checked,
                    })
                  }
                />
                <span>Overtime enabled</span>
              </label>
              <label className="sa-check">
                <input
                  type="checkbox"
                  checked={settings.overtimeApprovalRequired}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      overtimeApprovalRequired: e.target.checked,
                    })
                  }
                />
                <span>Require OT approval before pay</span>
              </label>
              <div className="hr-form__actions">
                <button type="submit" className="sa-btn sa-btn--primary">
                  Save policies
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="hr-panel">
            <p className="sa-empty">Loading policies…</p>
          </section>
        )}

        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">Statutory rule packs</h3>
              <p className="hr-panel__hint">
                Versioned placeholders only — calculation stays off.
              </p>
            </div>
          </div>
          {ruleSets.length ? (
            ruleSets.map((r) => (
              <div key={r.id} className="hr-rule-card">
                <strong>{r.name}</strong>
                <p>
                  {r.code} · pack {r.active ? "flagged" : "inactive"} ·{" "}
                  {r.taxBrackets.length} brackets · {r.contributions.length}{" "}
                  contributions
                </p>
                <p>Rates are placeholders (0%). Do not treat as live MoF rules.</p>
              </div>
            ))
          ) : (
            <p className="hr-panel__hint">No rule packs loaded yet.</p>
          )}
        </section>
      </div>

      <section className="hr-panel">
        <div className="hr-panel__head">
          <div>
            <h3 className="hr-panel__title">Compensation components</h3>
            <p className="hr-panel__hint">
              School catalog for earnings and deductions used in packages.
            </p>
          </div>
        </div>
        <form
          className="hr-form"
          onSubmit={(e) => {
            e.preventDefault();
            void createCompensationComponent({
              code: compCode,
              name: compName,
              type: compType,
              method: "FIXED_AMOUNT",
            })
              .then(async () => {
                setCompCode("");
                setCompName("");
                setToast("Component added");
                await load();
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : "Failed"),
              );
          }}
        >
          <label className="sa-field">
            <span>Code</span>
            <input
              value={compCode}
              onChange={(e) => setCompCode(e.target.value)}
              required
              placeholder="TRANSPORT"
            />
          </label>
          <label className="sa-field">
            <span>Name</span>
            <input
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              required
              placeholder="Transport allowance"
            />
          </label>
          <label className="sa-field">
            <span>Type</span>
            <select
              value={compType}
              onChange={(e) => setCompType(e.target.value)}
            >
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </label>
          <div className="hr-form__actions">
            <button type="submit" className="sa-btn sa-btn--primary">
              Add component
            </button>
          </div>
        </form>
        <div className="hr-comp-grid">
          {components.map((c) => (
            <div key={c.id} className="hr-comp-row">
              <span className="hr-comp-row__code">{c.code}</span>
              <span className="hr-comp-row__name">{c.name}</span>
              <span
                className={`hr-badge hr-badge--${c.type === "DEDUCTION" ? "deduction" : "earning"}`}
              >
                {c.type}
              </span>
            </div>
          ))}
        </div>
      </section>

      {canApprove && ot.length ? (
        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">Pending overtime approvals</h3>
              <p className="hr-panel__hint">
                Approve before OT minutes are paid on the next calculate.
              </p>
            </div>
          </div>
          <ul className="hr-ot-list">
            {ot.map((row) => (
              <li key={row.id}>
                <span>
                  {row.overtimeMinutes} min ·{" "}
                  {String(row.periodStart).slice(0, 10)} →{" "}
                  {String(row.periodEnd).slice(0, 10)}
                </span>
                <span className="sa-actions">
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    onClick={() =>
                      void reviewOvertimeApproval(row.id, "APPROVED").then(
                        () => {
                          setToast("OT approved");
                          return load();
                        },
                      )
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost"
                    onClick={() =>
                      void reviewOvertimeApproval(row.id, "REJECTED").then(
                        () => {
                          setToast("OT rejected");
                          return load();
                        },
                      )
                    }
                  >
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
