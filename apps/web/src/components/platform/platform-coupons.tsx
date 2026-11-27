"use client";

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanType } from "@/lib/api";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import {
  createPlatformCoupon,
  listPlatformCoupons,
  updatePlatformCoupon,
  type CouponKind,
  type PlatformCoupon,
} from "@/lib/platform-coupons";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

const KIND_VALUES: CouponKind[] = [
  "EXTRA_TRIAL_DAYS",
  "PERCENT_OFF",
  "COMPLIMENTARY",
];

const PAID_PLANS: { value: Exclude<PlanType, "TRIAL">; labelKey: string }[] = [
  { value: "STARTER", labelKey: "platformUi.planStarter" },
  { value: "PROFESSIONAL", labelKey: "platformUi.planProfessional" },
  { value: "ENTERPRISE", labelKey: "platformUi.planEnterprise" },
];

type StatusFilter = "ALL" | "ACTIVE" | "OFF";

type CreateForm = {
  code: string;
  kind: CouponKind;
  percentOff: string;
  extraDays: string;
  months: string;
  plan: Exclude<PlanType, "TRIAL">;
  maxRedemptions: string;
  expiresAt: string;
  notes: string;
};

type EditDraft = {
  percentOff: string;
  extraDays: string;
  months: string;
  plan: Exclude<PlanType, "TRIAL">;
  maxRedemptions: string;
  expiresAt: string;
  notes: string;
};

const EMPTY_CREATE: CreateForm = {
  code: "",
  kind: "EXTRA_TRIAL_DAYS",
  percentOff: "50",
  extraDays: "14",
  months: "3",
  plan: "STARTER",
  maxRedemptions: "",
  expiresAt: "",
  notes: "",
};

const KIND_META: Record<
  CouponKind,
  { labelKey: string; hintKey: string }
> = {
  EXTRA_TRIAL_DAYS: {
    labelKey: "platformUi.couponKindTrial",
    hintKey: "platformUi.couponKindTrialHint",
  },
  PERCENT_OFF: {
    labelKey: "platformUi.couponKindPercent",
    hintKey: "platformUi.couponKindPercentHint",
  },
  COMPLIMENTARY: {
    labelKey: "platformUi.couponKindComp",
    hintKey: "platformUi.couponKindCompHint",
  },
};

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function usageText(c: PlatformCoupon) {
  const used = c._count?.redemptions ?? c.redeemedCount;
  if (c.maxRedemptions != null) return `${used} / ${c.maxRedemptions}`;
  return `${used}`;
}

function draftFromCoupon(c: PlatformCoupon): EditDraft {
  const plan =
    c.plan === "PROFESSIONAL" || c.plan === "ENTERPRISE" || c.plan === "STARTER"
      ? c.plan
      : "STARTER";
  return {
    percentOff: String(c.percentOff || 50),
    extraDays: String(c.extraDays || 14),
    months: String(c.complimentaryMonths || 1),
    plan,
    maxRedemptions: c.maxRedemptions != null ? String(c.maxRedemptions) : "",
    expiresAt: toDateInput(c.expiresAt),
    notes: c.notes ?? "",
  };
}

function optionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function PlatformCoupons() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<PlatformCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  function kindLabel(kind: CouponKind) {
    return t(KIND_META[kind].labelKey);
  }

  function effectText(c: PlatformCoupon) {
    if (c.kind === "EXTRA_TRIAL_DAYS") {
      return t("platformUi.couponEffectTrial", { days: c.extraDays ?? 0 });
    }
    if (c.kind === "COMPLIMENTARY") {
      return t("platformUi.couponEffectComp", {
        months: c.complimentaryMonths ?? 0,
        plan: c.plan ?? "STARTER",
      });
    }
    return t("platformUi.couponEffectPercent", { percent: c.percentOff ?? 0 });
  }

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setError("");
    const list = await listPlatformCoupons();
    setRows(list);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void load()
        .catch((err) => fail(err, t("platformUi.couponErrLoad")))
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, router]);

  const stats = useMemo(() => {
    const used = rows.reduce(
      (sum, row) => sum + (row._count?.redemptions ?? row.redeemedCount),
      0,
    );
    return {
      total: rows.length,
      active: rows.filter((r) => r.isActive).length,
      off: rows.filter((r) => !r.isActive).length,
      used,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "ACTIVE" && !row.isActive) return false;
      if (statusFilter === "OFF" && row.isActive) return false;
      if (!q) return true;
      return (
        row.code.toLowerCase().includes(q) ||
        kindLabel(row.kind).toLowerCase().includes(q) ||
        (row.notes ?? "").toLowerCase().includes(q) ||
        effectText(row).toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  function startEdit(row: PlatformCoupon) {
    setEditingId(row.id);
    setDraft(draftFromCoupon(row));
    setShowCreate(false);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const code = createForm.code.trim();
    if (code.length < 3) {
      setError(t("platformUi.couponCodeMin"));
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createPlatformCoupon({
        code,
        kind: createForm.kind,
        percentOff:
          createForm.kind === "PERCENT_OFF" ? Number(createForm.percentOff) : undefined,
        extraDays:
          createForm.kind === "EXTRA_TRIAL_DAYS" ? Number(createForm.extraDays) : undefined,
        complimentaryMonths:
          createForm.kind === "COMPLIMENTARY" ? Number(createForm.months) : undefined,
        plan: createForm.kind === "COMPLIMENTARY" ? createForm.plan : undefined,
        maxRedemptions: optionalInt(createForm.maxRedemptions) ?? undefined,
        expiresAt: createForm.expiresAt || undefined,
        notes: createForm.notes.trim() || undefined,
      });
      setCreateForm(EMPTY_CREATE);
      setShowCreate(false);
      setMessage(t("platformUi.couponCreated"));
      await load();
    } catch (err) {
      fail(err, t("platformUi.couponErrCreate"));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(row: PlatformCoupon) {
    if (!draft) return;
    setBusyId(row.id);
    setError("");
    setMessage("");
    try {
      await updatePlatformCoupon(row.id, {
        notes: draft.notes.trim() || null,
        maxRedemptions: optionalInt(draft.maxRedemptions),
        expiresAt: draft.expiresAt || null,
        percentOff: row.kind === "PERCENT_OFF" ? Number(draft.percentOff) : undefined,
        extraDays: row.kind === "EXTRA_TRIAL_DAYS" ? Number(draft.extraDays) : undefined,
        complimentaryMonths:
          row.kind === "COMPLIMENTARY" ? Number(draft.months) : undefined,
        plan: row.kind === "COMPLIMENTARY" ? draft.plan : undefined,
      });
      setEditingId(null);
      setDraft(null);
      setMessage(t("platformUi.couponUpdated"));
      await load();
    } catch (err) {
      fail(err, t("platformUi.couponErrUpdate"));
    } finally {
      setBusyId("");
    }
  }

  async function toggleActive(row: PlatformCoupon) {
    setBusyId(row.id);
    setError("");
    try {
      await updatePlatformCoupon(row.id, { isActive: !row.isActive });
      setMessage(row.isActive ? t("platformUi.couponDisabled") : t("platformUi.couponEnabled"));
      await load();
    } catch (err) {
      fail(err, t("platformUi.couponErrUpdate"));
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <div className="plat-subjects-v2 plat-subjects-v2--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton" />
      </div>
    );
  }

  const createHint = t(KIND_META[createForm.kind].hintKey);

  return (
    <div className="plat-subjects-v2 dash-admin dash-admin--modern plat-billing-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={message} tone="success" onDismiss={() => setMessage("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="fees" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">{t("platformUi.couponEyebrow")}</p>
            <h2 className="plat-subjects-v2__title">{t("platformUi.couponTitle")}</h2>
            <p className="plat-subjects-v2__sub">
              {t("platformUi.couponSub")}
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.total}</strong>
            <span>{t("platformUi.couponStatCodes")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.active}</strong>
            <span>{t("platformUi.couponStatActive")}</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.used}</strong>
            <span>{t("platformUi.couponStatRedemptions")}</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="templates" className="dash-icon--sm" />
          <div>
            <strong>{stats.active}</strong>
            <span>{t("platformUi.couponStatActive")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="alert" className="dash-icon--sm" />
          <div>
            <strong>{stats.off}</strong>
            <span>{t("platformUi.couponStatDisabled")}</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="users" className="dash-icon--sm" />
          <div>
            <strong>{stats.used}</strong>
            <span>{t("platformUi.couponTimesUsed")}</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="fees" className="dash-icon--sm" />
          <input
            type="search"
            placeholder={t("platformUi.couponSearchPh")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("platformUi.couponSearchAria")}
          />
        </div>
        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          {(
            [
              { id: "ALL", label: t("common.all") },
              { id: "ACTIVE", label: t("platformUi.couponStatActive") },
              { id: "OFF", label: t("platformUi.couponDisabledLabel") },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.id}
              className={`plat-filter-tab${
                statusFilter === f.id ? " plat-filter-tab--active" : ""
              }`}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="plat-v2__btn plat-v2__btn--primary"
          onClick={() => {
            setShowCreate((v) => !v);
            setEditingId(null);
            setDraft(null);
          }}
        >
          <DashIcon name="plus" className="dash-icon--sm" />
          {showCreate ? t("common.cancel") : t("platformUi.couponNew")}
        </button>
      </div>

      {showCreate ? (
        <form
          className="plat-billing-v2__panel plat-billing-v2__form"
          onSubmit={(e) => void onCreate(e)}
        >
          <h3 className="plat-billing-v2__panel-title">{t("platformUi.couponCreate")}</h3>
          <p className="plat-billing-v2__panel-hint">{createHint}</p>
          <div className="plat-invoice-form__grid">
            <label className="plat-field">
              <span>{t("platformUi.couponCode")}</span>
              <input
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="PILOT14"
                required
                minLength={3}
                autoComplete="off"
              />
            </label>
            <label className="plat-field">
              <span>{t("platformUi.couponType")}</span>
              <select
                className="plat-select"
                value={createForm.kind}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, kind: e.target.value as CouponKind }))
                }
              >
                {KIND_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(KIND_META[value].labelKey)}
                  </option>
                ))}
              </select>
            </label>
            {createForm.kind === "PERCENT_OFF" ? (
              <label className="plat-field">
                <span>{t("platformUi.couponPercentOff")}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={createForm.percentOff}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, percentOff: e.target.value }))
                  }
                />
              </label>
            ) : null}
            {createForm.kind === "EXTRA_TRIAL_DAYS" ? (
              <label className="plat-field">
                <span>{t("platformUi.couponExtraDays")}</span>
                <input
                  type="number"
                  min={1}
                  value={createForm.extraDays}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, extraDays: e.target.value }))
                  }
                />
              </label>
            ) : null}
            {createForm.kind === "COMPLIMENTARY" ? (
              <>
                <label className="plat-field">
                  <span>{t("platformUi.couponMonths")}</span>
                  <input
                    type="number"
                    min={1}
                    value={createForm.months}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, months: e.target.value }))
                    }
                  />
                </label>
                <label className="plat-field">
                  <span>{t("platformUi.couponPlan")}</span>
                  <select
                    className="plat-select"
                    value={createForm.plan}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        plan: e.target.value as Exclude<PlanType, "TRIAL">,
                      }))
                    }
                  >
                    {PAID_PLANS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {t(p.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            <label className="plat-field">
              <span>{t("platformUi.couponMaxUses")}</span>
              <input
                type="number"
                min={1}
                value={createForm.maxRedemptions}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, maxRedemptions: e.target.value }))
                }
                placeholder={t("platformUi.couponUnlimited")}
              />
            </label>
            <label className="plat-field">
              <span>{t("platformUi.couponExpires")}</span>
              <input
                type="date"
                value={createForm.expiresAt}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, expiresAt: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="plat-field">
            <span>{t("platformUi.couponNotes")}</span>
            <input
              value={createForm.notes}
              onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("platformUi.couponNotesPh")}
            />
          </label>
          <div className="plat-subjects-v2__actions">
            <button
              type="button"
              className="plat-btn plat-btn--ghost"
              onClick={() => setShowCreate(false)}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className="plat-btn plat-btn--primary" disabled={saving}>
              {saving ? t("platformUi.saving") : t("platformUi.couponCreate")}
            </button>
          </div>
        </form>
      ) : null}

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>{t("platformUi.couponCode")}</th>
              <th>{t("platformUi.couponType")}</th>
              <th>{t("platformUi.couponEffect")}</th>
              <th>{t("platformUi.couponUsage")}</th>
              <th>{t("platformUi.couponExpiresCol")}</th>
              <th>{t("platformUi.status")}</th>
              <th aria-label={t("platformUi.actions")} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="plat-subjects-v2__empty">
                  {t("platformUi.couponNoMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td>
                      <div className="plat-coupon-code">
                        <span className="plat-subjects-v2__name">{row.code}</span>
                        {row.notes ? (
                          <span className="plat-billing-v2__muted">{row.notes}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{kindLabel(row.kind)}</td>
                    <td>
                      <span className="plat-subjects-v2__count">{effectText(row)}</span>
                    </td>
                    <td className="plat-billing-v2__muted">{usageText(row)}</td>
                    <td className="plat-billing-v2__muted">
                      {row.expiresAt ? formatDate(row.expiresAt) : t("platformUi.couponNoExpiry")}
                    </td>
                    <td>
                      <span
                        className={`plat-invoice-status ${
                          row.isActive
                            ? "plat-invoice-status--paid"
                            : "plat-invoice-status--draft"
                        }`}
                      >
                        {row.isActive ? t("platformUi.couponStatActive") : "Off"}
                      </span>
                    </td>
                    <td>
                      <div className="plat-subjects-v2__actions">
                        <button
                          type="button"
                          className="plat-btn plat-btn--ghost plat-btn--xs"
                          disabled={busyId === row.id}
                          onClick={() =>
                            editingId === row.id
                              ? (setEditingId(null), setDraft(null))
                              : startEdit(row)
                          }
                        >
                          {editingId === row.id ? t("common.close") : t("common.edit")}
                        </button>
                        <button
                          type="button"
                          className={`plat-btn plat-btn--xs ${
                            row.isActive
                              ? "plat-btn--ghost plat-btn--danger"
                              : "plat-btn--primary"
                          }`}
                          disabled={busyId === row.id}
                          onClick={() => void toggleActive(row)}
                        >
                          {row.isActive ? t("platformUi.couponDisable") : t("platformUi.couponEnable")}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === row.id && draft ? (
                    <tr className="plat-coupon-edit">
                      <td colSpan={7}>
                        <h3 className="plat-billing-v2__panel-title">Edit {row.code}</h3>
                        <p className="plat-billing-v2__panel-hint">
                          {t("platformUi.couponEditHint")}
                        </p>
                        <div className="plat-invoice-form__grid">
                          {row.kind === "PERCENT_OFF" ? (
                            <label className="plat-field">
                              <span>{t("platformUi.couponPercentOff")}</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={draft.percentOff}
                                onChange={(e) =>
                                  setDraft((d) =>
                                    d ? { ...d, percentOff: e.target.value } : d,
                                  )
                                }
                              />
                            </label>
                          ) : null}
                          {row.kind === "EXTRA_TRIAL_DAYS" ? (
                            <label className="plat-field">
                              <span>{t("platformUi.couponExtraDays")}</span>
                              <input
                                type="number"
                                min={1}
                                value={draft.extraDays}
                                onChange={(e) =>
                                  setDraft((d) =>
                                    d ? { ...d, extraDays: e.target.value } : d,
                                  )
                                }
                              />
                            </label>
                          ) : null}
                          {row.kind === "COMPLIMENTARY" ? (
                            <>
                              <label className="plat-field">
                                <span>{t("platformUi.couponMonths")}</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={draft.months}
                                  onChange={(e) =>
                                    setDraft((d) =>
                                      d ? { ...d, months: e.target.value } : d,
                                    )
                                  }
                                />
                              </label>
                              <label className="plat-field">
                                <span>{t("platformUi.couponPlan")}</span>
                                <select
                                  className="plat-select"
                                  value={draft.plan}
                                  onChange={(e) =>
                                    setDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            plan: e.target.value as Exclude<
                                              PlanType,
                                              "TRIAL"
                                            >,
                                          }
                                        : d,
                                    )
                                  }
                                >
                                  {PAID_PLANS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                      {t(p.labelKey)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </>
                          ) : null}
                          <label className="plat-field">
                            <span>{t("platformUi.couponMaxUsesShort")}</span>
                            <input
                              type="number"
                              min={1}
                              value={draft.maxRedemptions}
                              onChange={(e) =>
                                setDraft((d) =>
                                  d ? { ...d, maxRedemptions: e.target.value } : d,
                                )
                              }
                              placeholder={t("platformUi.couponUnlimited")}
                            />
                          </label>
                          <label className="plat-field">
                            <span>{t("platformUi.couponExpiresCol")}</span>
                            <input
                              type="date"
                              value={draft.expiresAt}
                              onChange={(e) =>
                                setDraft((d) =>
                                  d ? { ...d, expiresAt: e.target.value } : d,
                                )
                              }
                            />
                          </label>
                        </div>
                        <label className="plat-field">
                          <span>{t("platformUi.couponNotesShort")}</span>
                          <input
                            value={draft.notes}
                            onChange={(e) =>
                              setDraft((d) => (d ? { ...d, notes: e.target.value } : d))
                            }
                          />
                        </label>
                        <div className="plat-subjects-v2__actions">
                          <button
                            type="button"
                            className="plat-btn plat-btn--ghost"
                            onClick={() => {
                              setEditingId(null);
                              setDraft(null);
                            }}
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            type="button"
                            className="plat-btn plat-btn--primary"
                            disabled={busyId === row.id}
                            onClick={() => void saveEdit(row)}
                          >
                            {busyId === row.id ? t("platformUi.saving") : t("platformUi.saveChanges")}
                          </button>
                        </div>
                        {row.redemptions && row.redemptions.length > 0 ? (
                          <>
                            <h4 className="plat-billing-v2__panel-title">{t("platformUi.couponRecent")}</h4>
                            <ul className="plat-coupon-redemptions">
                              {row.redemptions.map((r) => (
                                <li key={r.id}>
                                  <strong>
                                    {r.school.name} ({r.school.joinCode})
                                  </strong>
                                  <span>
                                    {r.result ? `${r.result} · ` : ""}
                                    {formatDate(r.createdAt)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="plat-billing-v2__panel-hint">
                            {t("platformUi.couponNoRedemptions")}
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
