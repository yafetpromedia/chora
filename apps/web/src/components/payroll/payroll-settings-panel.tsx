"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { t } = useLocale();
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

  function fetchAll() {
    return Promise.all([
      getPayrollSettings(),
      listCompensationComponents(),
      listPayrollRuleSets(),
      listOvertimeApprovals("PENDING").catch(() => []),
    ]);
  }

  function applyLoaded([s, c, r, o]: Awaited<ReturnType<typeof fetchAll>>) {
    setSettings(s);
    setComponents(c);
    setRuleSets(r);
    setOt(o);
  }

  async function load() {
    if (!canSettings) return;
    setError("");
    try {
      applyLoaded(await fetchAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("payrollSettingsUi.loadFailed"));
    }
  }

  useEffect(() => {
    if (!canSettings) return;
    void fetchAll()
      .then(applyLoaded)
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("payrollSettingsUi.loadFailed"));
      });
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
      setToast(t("payrollSettingsUi.settingsSaved"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("payrollSettingsUi.saveFailed"));
    }
  }

  if (!canSettings) {
    return (
      <div className="hr-page">
        <div className="hr-empty">
          <p className="hr-empty__title">{t("payrollSettingsUi.noAccessTitle")}</p>
          <p className="hr-empty__sub">{t("payrollSettingsUi.noAccessSub")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-page">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("payrollSettingsUi.chipPayroll")}</span>
            <h2 className="tch-v2__hero-title">{t("payrollSettingsUi.title")}</h2>
            <p className="tch-v2__hero-sub">
              {t("payrollSettingsUi.heroSubPrefix")}{" "}
              <Link href="/admin/payroll" className="tch-v2__hero-link">
                {t("payrollSettingsUi.payrollRuns")}
              </Link>
              .
            </p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{components.length}</strong>
              <span>{t("payrollSettingsUi.statComponents")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{ruleSets.length}</strong>
              <span>{t("payrollSettingsUi.statRulePacks")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{ot.length}</strong>
              <span>{t("payrollSettingsUi.statOtPending")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>
                {settings?.overtimeEnabled
                  ? t("payrollSettingsUi.on")
                  : t("payrollSettingsUi.off")}
              </strong>
              <span>{t("payrollSettingsUi.statOvertime")}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="hr-banner hr-banner--warn">
        <p>
          <strong>{t("payrollSettingsUi.statutoryBannerTitle")}</strong>{" "}
          {t("payrollSettingsUi.statutoryBannerBody")}
        </p>
      </div>

      <div className="hr-settings-grid">
        {settings ? (
          <section className="hr-panel">
            <div className="hr-panel__head">
              <div>
                <h3 className="hr-panel__title">
                  {t("payrollSettingsUi.attendancePoliciesTitle")}
                </h3>
                <p className="hr-panel__hint">
                  {t("payrollSettingsUi.attendancePoliciesHint")}
                </p>
              </div>
            </div>
            <form className="hr-form" onSubmit={(e) => void onSaveSettings(e)}>
              <label className="sa-field">
                <span>{t("payrollSettingsUi.workingDaysMonth")}</span>
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
                <span>{t("payrollSettingsUi.otMultiplier")}</span>
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
                <span>{t("payrollSettingsUi.absenceDeduction")}</span>
                <select
                  value={settings.absenceDeductionMethod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      absenceDeductionMethod: e.target.value,
                    })
                  }
                >
                  <option value="NO_DEDUCTION">
                    {t("payrollSettingsUi.absenceNoDeduction")}
                  </option>
                  <option value="MONTHLY_DIVIDED_BY_WORKING_DAYS">
                    {t("payrollSettingsUi.absenceMonthlyWorking")}
                  </option>
                  <option value="MONTHLY_DIVIDED_BY_FIXED_DAYS">
                    {t("payrollSettingsUi.absenceMonthlyFixed")}
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
                <span>{t("payrollSettingsUi.overtimeEnabled")}</span>
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
                <span>{t("payrollSettingsUi.requireOtApproval")}</span>
              </label>
              <div className="hr-form__actions">
                <button type="submit" className="sa-btn sa-btn--primary">
                  {t("payrollSettingsUi.savePolicies")}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="hr-panel">
            <p className="sa-empty">{t("payrollSettingsUi.loadingPolicies")}</p>
          </section>
        )}

        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">
                {t("payrollSettingsUi.statutoryRuleTitle")}
              </h3>
              <p className="hr-panel__hint">{t("payrollSettingsUi.statutoryRuleHint")}</p>
            </div>
          </div>
          {ruleSets.length ? (
            ruleSets.map((r) => (
              <div key={r.id} className="hr-rule-card">
                <strong>{r.name}</strong>
                <p>
                  {t("payrollSettingsUi.rulePackMeta", {
                    code: r.code,
                    active: r.active
                      ? t("payrollSettingsUi.rulePackActive")
                      : t("payrollSettingsUi.rulePackInactive"),
                    brackets: r.taxBrackets.length,
                    contributions: r.contributions.length,
                  })}
                </p>
                <p>{t("payrollSettingsUi.rulePackRates")}</p>
              </div>
            ))
          ) : (
            <p className="hr-panel__hint">{t("payrollSettingsUi.noRulePacks")}</p>
          )}
        </section>
      </div>

      <section className="hr-panel">
        <div className="hr-panel__head">
          <div>
            <h3 className="hr-panel__title">
              {t("payrollSettingsUi.compComponentsTitle")}
            </h3>
            <p className="hr-panel__hint">{t("payrollSettingsUi.compComponentsHint")}</p>
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
                setToast(t("payrollSettingsUi.componentAdded"));
                await load();
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : t("payrollSettingsUi.addFailed")),
              );
          }}
        >
          <label className="sa-field">
            <span>{t("payrollSettingsUi.code")}</span>
            <input
              value={compCode}
              onChange={(e) => setCompCode(e.target.value)}
              required
              placeholder={t("payrollSettingsUi.codePh")}
            />
          </label>
          <label className="sa-field">
            <span>{t("payrollSettingsUi.name")}</span>
            <input
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              required
              placeholder={t("payrollSettingsUi.namePh")}
            />
          </label>
          <label className="sa-field">
            <span>{t("payrollSettingsUi.type")}</span>
            <select
              value={compType}
              onChange={(e) => setCompType(e.target.value)}
            >
              <option value="EARNING">{t("payrollSettingsUi.typeEarning")}</option>
              <option value="DEDUCTION">{t("payrollSettingsUi.typeDeduction")}</option>
            </select>
          </label>
          <div className="hr-form__actions">
            <button type="submit" className="sa-btn sa-btn--primary">
              {t("payrollSettingsUi.addComponent")}
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
                {c.type === "DEDUCTION"
                  ? t("payrollSettingsUi.typeDeduction")
                  : t("payrollSettingsUi.typeEarning")}
              </span>
            </div>
          ))}
        </div>
      </section>

      {canApprove && ot.length ? (
        <section className="hr-panel">
          <div className="hr-panel__head">
            <div>
              <h3 className="hr-panel__title">{t("payrollSettingsUi.pendingOtTitle")}</h3>
              <p className="hr-panel__hint">{t("payrollSettingsUi.pendingOtHint")}</p>
            </div>
          </div>
          <ul className="hr-ot-list">
            {ot.map((row) => (
              <li key={row.id}>
                <span>
                  {t("payrollSettingsUi.otMinutesRange", {
                    minutes: row.overtimeMinutes,
                    start: String(row.periodStart).slice(0, 10),
                    end: String(row.periodEnd).slice(0, 10),
                  })}
                </span>
                <span className="sa-actions">
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    onClick={() =>
                      void reviewOvertimeApproval(row.id, "APPROVED").then(
                        () => {
                          setToast(t("payrollSettingsUi.otApproved"));
                          return load();
                        },
                      )
                    }
                  >
                    {t("payrollSettingsUi.approve")}
                  </button>
                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost"
                    onClick={() =>
                      void reviewOvertimeApproval(row.id, "REJECTED").then(
                        () => {
                          setToast(t("payrollSettingsUi.otRejected"));
                          return load();
                        },
                      )
                    }
                  >
                    {t("payrollSettingsUi.reject")}
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
