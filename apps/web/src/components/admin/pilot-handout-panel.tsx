"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Props = {
  schoolName: string;
  joinCode: string;
  loginUrl?: string;
};

export function PilotHandoutPanel({ schoolName, joinCode, loginUrl }: Props) {
  const [copied, setCopied] = useState<"parent" | "student" | null>(null);
  const baseUrl =
    loginUrl ??
    (typeof window !== "undefined" ? `${window.location.origin}/login` : "https://your-school.chora.app/login");

  const parentText = useMemo(
    () =>
      `${schoolName} — Parent portal\n\n` +
      `1. Open: ${baseUrl}\n` +
      `2. School code: ${joinCode}\n` +
      `3. Username: (from the school — often your phone-based login)\n` +
      `4. Password: (temporary password from registrar)\n\n` +
      `View fees, timetable, and announcements after sign-in.`,
    [schoolName, joinCode, baseUrl],
  );

  const studentText = useMemo(
    () =>
      `${schoolName} — Student portal\n\n` +
      `1. Open: ${baseUrl}\n` +
      `2. School code: ${joinCode}\n` +
      `3. Username: your Student ID (STU-… on ID card)\n` +
      `4. Password: (from Manage student in admin, or change in Profile)\n\n` +
      `View results, classwork, fees, and campus ID after sign-in.`,
    [schoolName, joinCode, baseUrl],
  );

  async function copy(kind: "parent" | "student", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="cfg-section pilot-handout">
      <h2 className="cfg-section__title">Pilot login handout</h2>
      <p className="cfg-section__lead">
        Copy text for parents and students. Run{" "}
        <Link href="/admin/academics">Academics setup</Link> before the first term of results.
      </p>
      <div className="pilot-handout__grid">
        <div className="pilot-handout__card">
          <h3>Parents</h3>
          <pre className="pilot-handout__pre">{parentText}</pre>
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => void copy("parent", parentText)}
          >
            {copied === "parent" ? "Copied!" : "Copy parent handout"}
          </button>
        </div>
        <div className="pilot-handout__card">
          <h3>Students</h3>
          <pre className="pilot-handout__pre">{studentText}</pre>
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => void copy("student", studentText)}
          >
            {copied === "student" ? "Copied!" : "Copy student handout"}
          </button>
        </div>
      </div>
      <p className="cfg-hint">
        Staff sign-in: same page with personal username (not email). Teachers use TCH- ID or username
        from <Link href="/admin/teachers">Teachers</Link>.
      </p>
    </section>
  );
}
