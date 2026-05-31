"use client";

import { useState } from "react";
import { platformFetch } from "@/lib/platform-auth";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateSchoolDrawer({ open, onClose, onCreated }: Props) {
  const [schoolName, setSchoolName] = useState("");
  const [country, setCountry] = useState("Ethiopia");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function reset() {
    setSchoolName("");
    setCountry("Ethiopia");
    setAdminEmail("");
    setAdminFirstName("");
    setAdminLastName("");
    setAdminPassword("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await platformFetch("/platform/schools", {
        method: "POST",
        body: JSON.stringify({
          schoolName,
          country: country || undefined,
          adminEmail,
          adminFirstName,
          adminLastName,
          adminPassword,
        }),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create school");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="stu-drawer-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        className="stu-drawer plat-school-drawer"
        role="dialog"
        aria-labelledby="plat-create-school-title"
      >
        <header className="stu-drawer__head">
          <div>
            <h2 id="plat-create-school-title" className="stu-drawer__title">
              New school (tenant)
            </h2>
            <p className="stu-drawer__sub">
              Creates the school, trial status, and the first admin account.
            </p>
          </div>
          <button type="button" className="stu-drawer__close" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="stu-drawer__body" onSubmit={(e) => void submit(e)}>
          {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

          <label className="plat-field">
            <span>School name</span>
            <input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              autoComplete="organization"
            />
          </label>
          <label className="plat-field">
            <span>Country</span>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              autoComplete="country-name"
            />
          </label>

          <p className="plat-form-divider">First admin user</p>

          <div className="plat-field-row">
            <label className="plat-field">
              <span>First name</span>
              <input
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </label>
            <label className="plat-field">
              <span>Last name</span>
              <input
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </label>
          </div>
          <label className="plat-field">
            <span>Admin email</span>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="plat-field">
            <span>Admin password</span>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <footer className="stu-drawer__foot stu-drawer__foot--split">
            <button type="button" className="plat-btn plat-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="plat-btn plat-btn--primary" disabled={busy}>
              {busy ? "Creating…" : "Create school"}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}
