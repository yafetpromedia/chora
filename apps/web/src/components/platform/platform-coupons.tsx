"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { handlePlatformAuthFailure } from "@/lib/platform-auth";
import {
  createPlatformCoupon,
  listPlatformCoupons,
  updatePlatformCoupon,
  type CouponKind,
  type PlatformCoupon,
} from "@/lib/platform-coupons";
import { AppToast } from "@/components/ui/app-toast";

const KINDS: { value: CouponKind; label: string }[] = [
  { value: "EXTRA_TRIAL_DAYS", label: "Extra trial days" },
  { value: "PERCENT_OFF", label: "Percent off invoice" },
  { value: "COMPLIMENTARY", label: "Complimentary plan" },
];

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

export function PlatformCoupons() {
  const router = useRouter();
  const [rows, setRows] = useState<PlatformCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<CouponKind>("EXTRA_TRIAL_DAYS");
  const [percentOff, setPercentOff] = useState("50");
  const [extraDays, setExtraDays] = useState("14");
  const [months, setMonths] = useState("3");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  async function refresh() {
    const list = await listPlatformCoupons();
    setRows(list);
  }

  useEffect(() => {
    void refresh()
      .catch((err) => fail(err, "Could not load coupons"))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createPlatformCoupon({
        code,
        kind,
        percentOff: kind === "PERCENT_OFF" ? Number(percentOff) : undefined,
        extraDays: kind === "EXTRA_TRIAL_DAYS" ? Number(extraDays) : undefined,
        complimentaryMonths: kind === "COMPLIMENTARY" ? Number(months) : undefined,
        plan: kind === "COMPLIMENTARY" ? "STARTER" : undefined,
        notes: notes.trim() || undefined,
      });
      setCode("");
      setNotes("");
      setToast("Coupon created");
      await refresh();
    } catch (err) {
      fail(err, "Could not create coupon");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: PlatformCoupon) {
    setError("");
    try {
      await updatePlatformCoupon(row.id, { isActive: !row.isActive });
      await refresh();
    } catch (err) {
      fail(err, "Could not update coupon");
    }
  }

  return (
    <div className="plat-panel">
      {toast ? <AppToast message={toast} onDone={() => setToast(null)} /> : null}
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}
      <header className="plat-panel__head">
        <div>
          <h2 className="plat-panel__title">Coupon codes</h2>
          <p className="plat-panel__hint">
            When a school trial ends they must pay, unless a coupon extends or unlocks access.
          </p>
        </div>
      </header>

      <form className="plat-form" onSubmit={(e) => void onCreate(e)}>
        <label>
          Code
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required minLength={3} />
        </label>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as CouponKind)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {kind === "PERCENT_OFF" ? (
          <label>
            Percent off
            <input value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
          </label>
        ) : null}
        {kind === "EXTRA_TRIAL_DAYS" ? (
          <label>
            Extra days
            <input value={extraDays} onChange={(e) => setExtraDays(e.target.value)} />
          </label>
        ) : null}
        {kind === "COMPLIMENTARY" ? (
          <label>
            Months
            <input value={months} onChange={(e) => setMonths(e.target.value)} />
          </label>
        ) : null}
        <label>
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create coupon"}
        </button>
      </form>

      {loading ? (
        <p>Loading coupons…</p>
      ) : (
        <ul className="plat-list">
          {rows.map((row) => (
            <li key={row.id} className="plat-list__item">
              <div>
                <strong>{row.code}</strong>
                <p>
                  {kindLabel(row.kind)} · {effectText(row)} · used {row.redeemedCount}
                  {row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ""} ·{" "}
                  {row.isActive ? "Active" : "Off"}
                </p>
              </div>
              <button type="button" onClick={() => void toggleActive(row)}>
                {row.isActive ? "Disable" : "Enable"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
