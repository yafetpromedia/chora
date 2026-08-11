"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { reportCardPrintUrl, type ReportCardPrintMode } from "@/lib/results";

export function ReportCardPrintInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const studentProfileId = searchParams.get("studentProfileId") ?? "";
  const termId = searchParams.get("termId") ?? "";
  const mode: ReportCardPrintMode =
    searchParams.get("mode") === "annual" ? "annual" : "term";

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !studentProfileId || !termId) {
      router.replace("/login");
      return;
    }
    setError("");
    try {
      const res = await fetch(reportCardPrintUrl(studentProfileId, termId, mode), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load report");
      setHtml(await res.text());
    } catch {
      setError(
        "Report card is not available. Publish results for all class subjects first.",
      );
    }
  }, [studentProfileId, termId, mode, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function onPrint() {
    window.print();
  }

  if (error) {
    return (
      <div className="rc-print-shell">
        <p className="rc-print-error">{error}</p>
        <button
          type="button"
          className="rc-print-btn"
          onClick={() => router.replace("/admin/report-cards")}
        >
          Back to report cards
        </button>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="rc-print-shell">
        <p className="rc-print-loading">Preparing report card…</p>
      </div>
    );
  }

  return (
    <div className="rc-print-wrap">
      <div className="rc-print-toolbar no-print">
        <p>
          {mode === "annual" ? (
            <>
              <strong>Year-end report</strong> — choose <strong>Landscape</strong>, then Print →
              &quot;Save as PDF&quot;. Page 1 is the summary (with promotion stamp when recorded);
              page 2 is the full-year results grid.
            </>
          ) : (
            <>
              <strong>Term report</strong> — choose <strong>Landscape</strong>, then Print →
              &quot;Save as PDF&quot;. One page per student.
            </>
          )}
        </p>
        <div className="rc-print-toolbar__actions">
          <button
            type="button"
            className="rc-print-btn rc-print-btn--primary"
            onClick={onPrint}
          >
            Print / Save PDF
          </button>
          <button
            type="button"
            className="rc-print-btn"
            onClick={() => router.replace("/admin/report-cards")}
          >
            Close
          </button>
        </div>
      </div>
      <iframe title="Report card" className="rc-print-frame" srcDoc={html} />
    </div>
  );
}
