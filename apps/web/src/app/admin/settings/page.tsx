"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { AdminInvitePanel } from "@/components/auth/admin-invite-panel";
import { PilotHandoutPanel } from "@/components/admin/pilot-handout-panel";
import { TrialBanner } from "@/components/trial-banner";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { type AttendanceMode } from "@/lib/attendance";
import type { SchoolType } from "@/lib/api";
import { getSchoolSubscription, type SubscriptionStatus } from "@/lib/api";
import { SchoolLogoUpload } from "@/components/school/school-logo-upload";
import { AppToast } from "@/components/ui/app-toast";
import {
  AUTH_ROLE_KEY,
  AUTH_TOKEN_KEY,
  isSchoolWorkspaceRole,
} from "@/lib/auth";
import { persistSchoolBrand } from "@/lib/school-brand";
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
  mark: string;
}[] = [
  { value: "DAILY", label: "Daily", desc: "Once per day — primary schools", mark: "D" },
  { value: "PERIOD", label: "Period", desc: "Each class period", mark: "P" },
  { value: "BOTH", label: "Both", desc: "Daily + period tracking", mark: "B" },
];

const TABS: { id: Tab; label: string; icon: "settings" | "attendance" | "users" | "finance" }[] = [
  { id: "school", label: "School profile", icon: "settings" },
  { id: "attendance", label: "Attendance", icon: "attendance" },
  { id: "access", label: "Access & invites", icon: "users" },
  { id: "plan", label: "Plan & reports", icon: "finance" },
];

function schoolTypeLabel(value: SchoolType | null) {
  return SCHOOL_TYPES.find((t) => t.value === value)?.label ?? "Mixed";
}

function attendanceLabel(mode: AttendanceMode) {
  return ATTENDANCE_MODES.find((m) => m.value === mode)?.label ?? mode;
}

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
  const [reportCardTitle, setReportCardTitle] = useState("");
  const [reportCardTagline, setReportCardTagline] = useState("");
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>("DAILY");

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
    setReportCardTitle(s.reportCardTitle ?? "");
    setReportCardTagline(s.reportCardTagline ?? "");
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

  const heroSubtitle = useMemo(() => {
    if (!school) {
      return "Configure your school profile, attendance rules, access, and subscription.";
    }
    return `${schoolTypeLabel(school.schoolType)} · ${attendanceLabel(school.attendanceMode)} attendance · Join code ${school.joinCode}`;
  }, [school]);

  async function onSaveSchool(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setToast(null);
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
        reportCardTitle: reportCardTitle.trim(),
        reportCardTagline: reportCardTagline.trim(),
      });
      applySchool(updated);
      persistSchoolBrand({
        name: updated.name,
        logoUrl: updated.logoUrl ?? null,
      });
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
    setToast(null);
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

  const planShortLabel = subscription?.planLabel?.split(" ")[0] ?? "Plan";

  return (
    <DashboardPage role="admin" title="Settings">
      <div className="set-v2">
        <AcademicsHero
          title={loading ? "School settings" : school?.name ?? "School settings"}
          subtitle={heroSubtitle}
          stats={[
            {
              label: "Plan",
              value: loading ? "—" : subscription?.planLabel ?? "—",
            },
            {
              label: "Attendance",
              value: loading ? "—" : attendanceLabel(attendanceMode),
            },
            {
              label: "Join code",
              value: loading ? "—" : school?.joinCode ?? "—",
            },
            {
              label: "Setup",
              value: loading ? "—" : school?.setupComplete ? "Complete" : "In progress",
            },
          ]}
          badges={
            school ? (
              <>
                <AcademicsBadge variant="live">{schoolTypeLabel(school.schoolType)}</AcademicsBadge>
                {subscription?.plan === "TRIAL" ? (
                  <span className="set-v2__hero-badge">Trial active</span>
                ) : null}
              </>
            ) : undefined
          }
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />

        <div className="set-v2__toolbar">
          <nav className="set-v2__tabs" aria-label="Settings sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`set-v2__tab${tab === item.id ? " set-v2__tab--active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <DashIcon name={item.icon} className="dash-icon--sm" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="set-v2__loading" aria-busy="true">
            <span className="set-v2__loading-spinner" aria-hidden />
            <p>Loading school configuration…</p>
          </div>
        ) : null}

        {!loading && tab === "school" ? (
          <section className="set-v2__panel">
            <div className="set-v2__panel-head">
              <span className="set-v2__panel-icon" aria-hidden>
                <DashIcon name="settings" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="set-v2__panel-title">School profile</h2>
                <p className="set-v2__panel-sub">
                  This name appears on your admin dashboard, reports, and parent communications.
                </p>
              </div>
            </div>

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

              <h3 className="set-v2__subhead">Bank account (parent fee payments)</h3>
              <p className="set-v2__panel-sub" style={{ marginBottom: "0.85rem" }}>
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
                <label htmlFor="cfg-rc-title">Report card title</label>
                <input
                  id="cfg-rc-title"
                  value={reportCardTitle}
                  onChange={(e) => setReportCardTitle(e.target.value)}
                  placeholder="Student Report Card"
                />
                <p className="cfg-hint">
                  Shown at the top of the landscape print booklet. Leave blank for the default.
                </p>
              </div>
              <div className="cfg-field">
                <label htmlFor="cfg-rc-tag">Report card motto / tagline</label>
                <input
                  id="cfg-rc-tag"
                  value={reportCardTagline}
                  onChange={(e) => setReportCardTagline(e.target.value)}
                  placeholder="Excellence · Integrity · Service"
                />
              </div>
              <SchoolLogoUpload
                schoolName={name.trim() || school?.name || "Your school"}
                value={logoUrl}
                onChange={setLogoUrl}
              />
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
        ) : null}

        {!loading && tab === "attendance" ? (
          <section className="set-v2__panel">
            <div className="set-v2__panel-head">
              <span className="set-v2__panel-icon set-v2__panel-icon--attendance" aria-hidden>
                <DashIcon name="attendance" className="dash-icon--sm" />
              </span>
              <div>
                <h2 className="set-v2__panel-title">Attendance mode</h2>
                <p className="set-v2__panel-sub">
                  Controls how teachers mark attendance. Changes apply to all classes immediately.
                </p>
              </div>
            </div>

            <div className="set-v2__mode-grid">
              {ATTENDANCE_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`set-v2__mode-card${attendanceMode === m.value ? " set-v2__mode-card--active" : ""}`}
                  onClick={() => void onSaveAttendanceMode(m.value)}
                >
                  <span className="set-v2__mode-mark" aria-hidden>
                    {m.mark}
                  </span>
                  <span className="set-v2__mode-title">{m.label}</span>
                  <span className="set-v2__mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>
            <p className="cfg-hint" style={{ marginTop: "1rem" }}>
              To mark attendance day-to-day, use{" "}
              <Link href="/admin/attendance">Attendance → Mark</Link>.
            </p>
          </section>
        ) : null}

        {!loading && tab === "access" && school ? (
          <div className="set-v2__stack">
            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon set-v2__panel-icon--access" aria-hidden>
                  <DashIcon name="users" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">School join code</h2>
                  <p className="set-v2__panel-sub">
                    Users enter this school code on the{" "}
                    <Link href="/login">sign in</Link> page with the username and
                    password you create for them.
                  </p>
                </div>
              </div>
              <div className="set-v2__code-box">
                <code className="set-v2__code">{school.joinCode}</code>
                <button type="button" className="cfg-btn cfg-btn--ghost" onClick={copyJoinCode}>
                  {codeCopied ? "Copied!" : "Copy code"}
                </button>
              </div>
              <p className="cfg-hint" style={{ marginTop: "0.75rem" }}>
                Join code cannot be changed — share invitation links below for more control.
              </p>
            </section>

            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon set-v2__panel-icon--access" aria-hidden>
                  <DashIcon name="users" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">Invitation links</h2>
                  <p className="set-v2__panel-sub">
                    Create role-specific links for teachers, students, or parents.
                  </p>
                </div>
              </div>
              <AdminInvitePanel />
            </section>

            <PilotHandoutPanel schoolName={school.name} joinCode={school.joinCode} />
          </div>
        ) : null}

        {!loading && tab === "plan" ? (
          <div className="set-v2__stack">
            {subscription ? <TrialBanner subscription={subscription} /> : null}

            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon set-v2__panel-icon--plan" aria-hidden>
                  <DashIcon name="finance" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">CampusOne subscription</h2>
                  <p className="set-v2__panel-sub">
                    Your school plan, billing, and seat limits.
                  </p>
                </div>
              </div>
              <div className="set-v2__plan-row">
                <div className="set-v2__plan-main">
                  <span className="set-v2__plan-badge">{planShortLabel}</span>
                  <div>
                    <p className="set-v2__plan-label">{subscription?.planLabel ?? "—"}</p>
                    <p className="set-v2__plan-meta">
                      {subscription?.daysRemaining != null
                        ? `${subscription.daysRemaining} days remaining on trial`
                        : "Active school subscription"}
                      {subscription
                        ? ` · ${subscription.usage.students} students · ${subscription.usage.teachers} teachers`
                        : ""}
                    </p>
                  </div>
                </div>
                <Link href="/admin/billing" className="cfg-btn cfg-btn--primary">
                  Manage billing
                </Link>
              </div>
            </section>

            <section className="set-v2__panel">
              <div className="set-v2__panel-head">
                <span className="set-v2__panel-icon set-v2__panel-icon--access" aria-hidden>
                  <DashIcon name="chart" className="dash-icon--sm" />
                </span>
                <div>
                  <h2 className="set-v2__panel-title">School reports & exports</h2>
                  <p className="set-v2__panel-sub">
                    CSV downloads for attendance, fees, results, and rosters now live under
                    Reports.
                  </p>
                </div>
              </div>
              <Link href="/admin/reports" className="cfg-btn cfg-btn--primary">
                Open Reports
              </Link>
            </section>
          </div>
        ) : null}
      </div>
    </DashboardPage>
  );
}
