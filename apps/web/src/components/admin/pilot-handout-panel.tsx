"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildParentHandout,
  buildStudentHandout,
  getLoginUrl,
  normalizeLoginUrl,
  readSavedHandoutLoginUrl,
  saveHandoutLoginUrl,
} from "@/lib/school-welcome";

type Props = {
  schoolName: string;
  joinCode: string;
  loginUrl?: string;
};

export function PilotHandoutPanel({ schoolName, joinCode, loginUrl }: Props) {
  const detectedUrl = loginUrl ?? getLoginUrl();
  const [urlDraft, setUrlDraft] = useState(detectedUrl);
  const [copied, setCopied] = useState<"parent" | "student" | null>(null);

  useEffect(() => {
    const saved = readSavedHandoutLoginUrl(joinCode);
    setUrlDraft(saved ?? detectedUrl);
  }, [joinCode, detectedUrl]);

  const portalUrl = normalizeLoginUrl(urlDraft) || detectedUrl;
  const isLocal =
    /localhost|127\.0\.0\.1/i.test(portalUrl) || portalUrl.startsWith("/");

  const parentText = useMemo(
    () => buildParentHandout({ schoolName, joinCode, loginUrl: portalUrl }),
    [schoolName, joinCode, portalUrl],
  );

  const studentText = useMemo(
    () => buildStudentHandout({ schoolName, joinCode, loginUrl: portalUrl }),
    [schoolName, joinCode, portalUrl],
  );

  function persistUrl(next: string) {
    const normalized = normalizeLoginUrl(next) || detectedUrl;
    setUrlDraft(normalized);
    saveHandoutLoginUrl(joinCode, normalized);
  }

  async function copy(kind: "parent" | "student", text: string) {
    persistUrl(urlDraft);
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
        Copy text for parents and students. Set the public login URL before you share — it is saved
        for this school. Run <Link href="/admin/academics">Academics setup</Link> before the first
        term of results.
      </p>

      <label className="pilot-handout__url">
        <span>Public login URL</span>
        <div className="pilot-handout__url-row">
          <input
            type="url"
            value={urlDraft}
            placeholder="https://your-school.chora.app/login"
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={(e) => persistUrl(e.target.value)}
          />
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => persistUrl(detectedUrl)}
          >
            Reset
          </button>
        </div>
        <em>
          {isLocal
            ? "This looks like a local address. Change it to the URL families should open (for example https://app.chora.app/login)."
            : "This URL is what parents and students will copy. You can change it anytime."}
        </em>
      </label>

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
        Staff and teachers use the same login page with credentials from{" "}
        <Link href="/admin/teachers">Teachers</Link> or Admin → Settings → Access.
      </p>
    </section>
  );
}
