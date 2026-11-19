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

const KINDS: { value: CouponKind; label: string; hint: string }[] = [
  {
    value: "EXTRA_TRIAL_DAYS",
    label: "Extra trial days",
    hint: "Extends the school trial. They still pay when the new trial ends.",
  },
  {
    value: "PERCENT_OFF",
    label: "Percent off invoice",
    hint: "Discount on the next invoice. The school still has to pay.",
  },
  {
    value: "COMPLIMENTARY",
    label: "Complimentary plan",
    hint: "Unlocks a paid plan for a set number of months, no payment required.",
  },
];

const PAID_PLANS: { value: Exclude<PlanType, "TRIAL">; label: string }[] = [
  { value: "STARTER", label: "Starter" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "ENTERPRISE", label: "Enterprise" },
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

function kindLabel(kind: CouponKind) {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}

function effectText(c: PlatformCoupon) {
  if (c.kind === "EXTRA_TRIAL_DAYS") return `+${c.extraDays} trial days`;
  if (c.kind === "COMPLIMENTARY") {
    return `${c.complimentaryMonths} month complimentary ${c.plan ?? "STARTER"}`;
  }
  return `${c.percentOff}% off`;
}

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
        .catch((err) => fail(err, "Could not load coupons"))
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
      setError("Coupon code must be at least 3 characters");
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
      setMessage("Coupon created");
      await load();
    } catch (err) {
      fail(err, "Could not create coupon");
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
      setMessage("Coupon updated");
      await load();
    } catch (err) {
      fail(err, "Could not update coupon");
    } finally {
      setBusyId("");
    }
  }

  async function toggleActive(row: PlatformCoupon) {
    setBusyId(row.id);
    setError("");
    try {
      await updatePlatformCoupon(row.id, { isActive: !row.isActive });
      setMessage(row.isActive ? "Coupon disabled" : "Coupon enabled");
      await load();
    } catch (err) {
      fail(err, "Could not update coupon");
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

  const createHint = KINDS.find((k) => k.value === createForm.kind)?.hint;

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
            <p className="plat-subjects-v2__eyebrow">Billing</p>
            <h2 className="plat-subjects-v2__title">Coupons</h2>
            <p className="plat-subjects-v2__sub">
              Create, edit, and disable codes that extend trials, discount invoices, or unlock a plan.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{stats.total}</strong>
            <span>Codes</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.active}</strong>
            <span>Active</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{stats.used}</strong>
            <span>Redemptions</span>
          </div>
        </div>
      </header>

      <div className="plat-subjects-v2__kpis">
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="templates" className="dash-icon--sm" />
          <div>
            <strong>{stats.active}</strong>
            <span>Active</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="alert" className="dash-icon--sm" />
          <div>
            <strong>{stats.off}</strong>
            <span>Disabled</span>
          </div>
        </article>
        <article className="plat-subjects-v2__kpi">
          <DashIcon name="users" className="dash-icon--sm" />
          <div>
            <strong>{stats.used}</strong>
            <span>Times used</span>
          </div>
        </article>
      </div>

      <div className="plat-subjects-v2__toolbar">
        <div className="plat-tenants-v2__search plat-subjects-v2__search">
          <DashIcon name="fees" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search code, type, or notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search coupons"
          />
        </div>
        <div className="plat-filter-tabs plat-subjects-v2__filters" role="tablist">
          {(
            [
              { id: "ALL", label: "All" },
              { id: "ACTIVE", label: "Active" },
              { id: "OFF", label: "Disabled" },
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
          {showCreate ? "Cancel" : "New coupon"}
        </button>
      </div>

      {showCreate ? (
        <form
          className="plat-billing-v2__panel plat-billing-v2__form"
          onSubmit={(e) => void onCreate(e)}
        >
          <h3 className="plat-billing-v2__panel-title">Create coupon</h3>
          <p className="plat-billing-v2__panel-hint">{createHint}</p>
          <div className="plat-invoice-form__grid">
            <label className="plat-field">
              <span>Code</span>
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
              <span>Type</span>
              <select
                className="plat-select"
                value={createForm.kind}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, kind: e.target.value as CouponKind }))
                }
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            {createForm.kind === "PERCENT_OFF" ? (
              <label className="plat-field">
                <span>Percent off</span>
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
                <span>Extra days</span>
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
                  <span>Months</span>
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
                  <span>Plan</span>
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
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            <label className="plat-field">
              <span>Max uses (optional)</span>
              <input
                type="number"
                min={1}
                value={createForm.maxRedemptions}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, maxRedemptions: e.target.value }))
                }
                placeholder="Unlimited"
              />
            </label>
            <label className="plat-field">
              <span>Expires (optional)</span>
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
            <span>Notes (optional)</span>
            <input
              value={createForm.notes}
              onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Pilot schools, partner agency…"
            />
          </label>
          <div className="plat-subjects-v2__actions">
            <button
              type="button"
              className="plat-btn plat-btn--ghost"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button type="submit" className="plat-btn plat-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Create coupon"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="plat-subjects-v2__table-wrap">
        <table className="plat-subjects-v2__table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Effect</th>
              <th>Usage</th>
              <th>Expires</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="plat-subjects-v2__empty">
                  No coupons match. Create one to extend a trial or unlock a plan.
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
                      {row.expiresAt ? formatDate(row.expiresAt) : "No expiry"}
                    </td>
                    <td>
                      <span
                        className={`plat-invoice-status ${
                          row.isActive
                            ? "plat-invoice-status--paid"
                            : "plat-invoice-status--draft"
                        }`}
                      >
                        {row.isActive ? "Active" : "Off"}
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
                          {editingId === row.id ? "Close" : "Edit"}
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
                          {row.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === row.id && draft ? (
                    <tr className="plat-coupon-edit">
                      <td colSpan={7}>
                        <h3 className="plat-billing-v2__panel-title">Edit {row.code}</h3>
                        <p className="plat-billing-v2__panel-hint">
                          Code and type stay the same. Change the effect, limits, notes, or expiry.
                        </p>
                        <div className="plat-invoice-form__grid">
                          {row.kind === "PERCENT_OFF" ? (
                            <label className="plat-field">
                              <span>Percent off</span>
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
                              <span>Extra days</span>
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
                                <span>Months</span>
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
                                <span>Plan</span>
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
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </>
                          ) : null}
                          <label className="plat-field">
                            <span>Max uses</span>
                            <input
                              type="number"
                              min={1}
                              value={draft.maxRedemptions}
                              onChange={(e) =>
                                setDraft((d) =>
                                  d ? { ...d, maxRedemptions: e.target.value } : d,
                                )
                              }
                              placeholder="Unlimited"
                            />
                          </label>
                          <label className="plat-field">
                            <span>Expires</span>
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
                          <span>Notes</span>
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
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="plat-btn plat-btn--primary"
                            disabled={busyId === row.id}
                            onClick={() => void saveEdit(row)}
                          >
                            {busyId === row.id ? "Saving…" : "Save changes"}
                          </button>
                        </div>
                        {row.redemptions && row.redemptions.length > 0 ? (
                          <>
                            <h4 className="plat-billing-v2__panel-title">Recent redemptions</h4>
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
                            No schools have used this code yet.
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
