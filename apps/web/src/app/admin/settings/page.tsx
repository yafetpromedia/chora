"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AdminInvitePanel } from "@/components/auth/admin-invite-panel";
import { TrialBanner } from "@/components/trial-banner";
import {
  downloadAttendanceExport,
  type AttendanceMode,
} from "@/lib/attendance";
import type { SchoolType } from "@/lib/api";
import { getSchoolSubscription, type SubscriptionStatus } from "@/lib/api";
import {
  AUTH_ROLE_KEY,
  AUTH_SCHOOL_NAME_KEY,
  AUTH_TOKEN_KEY,
  isSchoolWorkspaceRole,
} from "@/lib/auth";
import {
  getSchoolSettings,
  updateSchoolSettings,
  type SchoolSettings,
} from "@/lib/school-settings";

type Tab = "school" | "attendance" | "access" | "plan";

const SCHOOL_TYPES: { value: SchoolType; label: string }[] = [
  { value: "KINDERGARTEN", label: "Kindergarten" },
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "PREPARATORY", label: "Preparatory" },
  { value: "MIXED", label: "Mixed (K–12)" },
];

const ATTENDANCE_MODES: {
  value: AttendanceMode;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { value: "DAILY", label: "Daily", desc: "Once per day — primary schools", icon: "☀️" },
  { value: "PERIOD", label: "Period", desc: "Each class period", icon: "🕐" },
  { value: "BOTH", label: "Both", desc: "Daily + period tracking", icon: "⚡" },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("school");
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [name, setName] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType>("MIXED");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Ethiopia");
  const [logoUrl, setLogoUrl] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>("DAILY");

  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10));

  function applySchool(s: SchoolSettings) {
    setSchool(s);
    setName(s.name);
    setSchoolType((s.schoolType as SchoolType) ?? "MIXED");
    setAddress(s.address ?? "");
    setEmail(s.email ?? "");
    setPhone(s.phone ?? "");
    setCountry(s.country ?? "Ethiopia");
    setLogoUrl(s.logoUrl ?? "");
    setBankName(s.bankName ?? "");
    setBankAccountHolder(s.bankAccountHolder ?? "");
    setBankAccountNumber(s.bankAccountNumber ?? "");
    setPaymentInstructions(s.paymentInstructions ?? "");
    setAttendanceMode(s.attendanceMode);
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void Promise.all([getSchoolSettings(), getSchoolSubscription()])
      .then(([s, sub]) => {
        applySchool(s);
        setSubscription(sub);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onSaveSchool(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await updateSchoolSettings({
        name: name.trim(),
        schoolType,
        address: address.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        country: country.trim(),
        logoUrl: logoUrl.trim(),
        bankName: bankName.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        paymentInstructions: paymentInstructions.trim(),
      });
      applySchool(updated);
      localStorage.setItem(AUTH_SCHOOL_NAME_KEY, updated.name);
      setToast("School profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveAttendanceMode(mode: AttendanceMode) {
    setAttendanceMode(mode);
    setError("");
    try {
      const updated = await updateSchoolSettings({ attendanceMode: mode });
      applySchool(updated);
      setToast("Attendance mode updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update attendance mode");
    }
  }

  function copyJoinCode() {
    if (!school?.joinCode) return;
    void navigator.clipboard.writeText(school.joinCode);
    setCodeCopied(true);
    window.setTimeout(() => setCodeCopied(false), 2000);
  }

  if (loading) {
    return (
      <DashboardPage role="admin" title="Settings" subtitle="Loading school configuration…">
        <p className="setup-hint">Loading…</p>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      role="admin"
      title="Settings"
      subtitle="School profile, attendance rules, access, and billing — separate from daily management."
      eyebrow="Configuration"
    >
      <div className="cfg-page">
        {error ? <p className="cfg-toast cfg-toast--error">{error}</p> : null}
        {toast ? (
          <p className="cfg-toast" role="status">
            {toast}
            <button
              type="button"
              style={{ marginLeft: "0.75rem", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
              onClick={() => setToast(null)}
            >
              Dismiss
            </button>
          </p>
        ) : null}

        <nav className="cfg-tabs" aria-label="Settings sections">
          {(
            [
              ["school", "School profile"],
              ["attendance", "Attendance"],
              ["access", "Access & invites"],
              ["plan", "Plan & reports"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`cfg-tab${tab === id ? " cfg-tab--active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "school" && (
          <section className="cfg-section">
            <h2 className="cfg-section__title">School profile</h2>
            <p className="cfg-section__lead">
              This name appears on your admin dashboard, reports, and parent communications.
            </p>
            <form className="cfg-form" onSubmit={onSaveSchool}>
              <div className="cfg-field">
                <label htmlFor="cfg-name">School name</label>
                <input
                  id="cfg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Everest Youth Academy"
                />
              </div>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="cfg-type">School type</label>
                  <select
                    id="cfg-type"
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value as SchoolType)}
                  >
                    {SCHOOL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cfg-field">
                  <label htmlFor="cfg-country">Country</label>
                  <input
                    id="cfg-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="cfg-address">Address</label>
                <textarea
                  id="cfg-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, sub-city, woreda…"
                />
              </div>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="cfg-email">School email</label>
                  <input
                    id="cfg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@school.et"
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="cfg-phone">Phone</label>
                  <input
                    id="cfg-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0911…"
                  />
                </div>
              </div>
              <h3 className="setup-panel-label" style={{ marginTop: "1.25rem" }}>
                Bank account (parent fee payments)
              </h3>
              <p className="cfg-section__lead">
                Shown to parents when they pay by bank transfer. Telebirr / Chapa can be added later.
              </p>
              <div className="cfg-field">
                <label htmlFor="cfg-bank">Bank name</label>
                <input
                  id="cfg-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Commercial Bank of Ethiopia"
                />
              </div>
              <div className="cfg-form-row">
                <div className="cfg-field">
                  <label htmlFor="cfg-acc-name">Account holder</label>
                  <input
                    id="cfg-acc-name"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                  />
                </div>
                <div className="cfg-field">
                  <label htmlFor="cfg-acc-num">Account number</label>
                  <input
                    id="cfg-acc-num"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="cfg-field">
                <label htmlFor="cfg-pay-note">Payment instructions</label>
                <textarea
                  id="cfg-pay-note"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Include student name in transfer reference…"
                />
              </div>
              <div className="cfg-field">
                <label htmlFor="cfg-logo">Logo URL (optional)</label>
                <input
                  id="cfg-logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="cfg-actions">
                <button type="submit" className="cfg-btn cfg-btn--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save profile"}
                </button>
                <Link href="/admin/setup" className="cfg-btn cfg-btn--ghost">
                  Edit grade structure →
                </Link>
              </div>
            </form>
          </section>
        )}

        {tab === "attendance" && (
          <section className="cfg-section">
            <h2 className="cfg-section__title">Attendance mode</h2>
            <p className="cfg-section__lead">
              Controls how teachers mark attendance. Changes apply to all classes immediately.
            </p>
            <div className="att-mode-grid">
              {ATTENDANCE_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`att-mode-card${attendanceMode === m.value ? " att-mode-card--active" : ""}`}
                  onClick={() => void onSaveAttendanceMode(m.value)}
                >
                  <span className="att-mode-card__icon" aria-hidden>
                    {m.icon}
                  </span>
                  <span className="att-mode-card__title">{m.label}</span>
                  <span className="att-mode-card__desc">{m.desc}</span>
                </button>
              ))}
            </div>
            <p className="cfg-hint" style={{ marginTop: "1rem" }}>
              To mark attendance day-to-day, use{" "}
              <Link href="/admin/attendance">Attendance → Mark</Link>.
            </p>
          </section>
        )}

        {tab === "access" && school && (
          <>
            <section className="cfg-section">
              <h2 className="cfg-section__title">School join code</h2>
              <p className="cfg-section__lead">
                Teachers, students, and parents enter this at{" "}
                <Link href="/join">/join</Link> to connect to your school.
              </p>
              <div className="cfg-code-box">
                <code className="cfg-code">{school.joinCode}</code>
                <button type="button" className="cfg-btn cfg-btn--ghost" onClick={copyJoinCode}>
                  {codeCopied ? "Copied!" : "Copy code"}
                </button>
              </div>
              <p className="cfg-hint">Join code cannot be changed — share invitation links below for more control.</p>
            </section>
            <section className="cfg-section">
              <h2 className="cfg-section__title">Invitation links</h2>
              <p className="cfg-section__lead">
                Create role-specific links for teachers, students, or parents.
              </p>
              <AdminInvitePanel />
            </section>
          </>
        )}

        {tab === "plan" && (
          <>
            {subscription ? <TrialBanner subscription={subscription} /> : null}
            <section className="cfg-section">
              <h2 className="cfg-section__title">Subscription</h2>
              <p className="cfg-section__lead">
                Current plan: <strong>{subscription?.plan ?? "—"}</strong>
                {subscription?.daysRemaining != null
                  ? ` · ${subscription.daysRemaining} days remaining on trial`
                  : ""}
              </p>
              <div className="cfg-link-row">
                <Link href="/admin/upgrade" className="cfg-btn cfg-btn--primary">
                  Upgrade plan
                </Link>
              </div>
            </section>
            <section className="cfg-section">
              <h2 className="cfg-section__title">Attendance export</h2>
              <p className="cfg-section__lead">Download attendance records as CSV for Excel.</p>
              <div className="att-export-row">
                <label className="att-field">
                  <span>From</span>
                  <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
                </label>
                <label className="att-field">
                  <span>To</span>
                  <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="cfg-btn cfg-btn--primary"
                  onClick={() =>
                    void downloadAttendanceExport(exportFrom, exportTo).catch((err) =>
                      setError(err instanceof Error ? err.message : "Export failed"),
                    )
                  }
                >
                  Download CSV
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardPage>
  );
}
