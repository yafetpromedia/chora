"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import type { ReportCardPrintMode } from "@/lib/results";

function myReportCardPrintUrl(termId: string, mode: ReportCardPrintMode) {
  const q = new URLSearchParams({ termId, mode });
  return `${getApiBaseUrl()}/results/report-card/html?${q}`;
}

export function StudentReportCardPrintInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const termId = searchParams.get("termId") ?? "";
  const mode: ReportCardPrintMode =
    searchParams.get("mode") === "annual" ? "annual" : "term";

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !termId) {
      router.replace("/login");
      return;
    }
    void fetch(myReportCardPrintUrl(termId, mode), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load report");
        return res.text();
      })
      .then((text) => {
        setHtml(text);
      })
      .catch(() => router.replace("/student/report-card"));
  }, [termId, mode, router]);

  useEffect(() => {
    if (!html) return;
    const timer = window.setTimeout(() => {
      const win = frameRef.current?.contentWindow;
      if (win) {
        win.focus();
        win.print();
      } else {
        window.print();
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [html]);

  if (!html) {
    return <p style={{ padding: "2rem" }}>Preparing report card…</p>;
  }

  return (
    <iframe
      ref={frameRef}
      title="Report card"
      srcDoc={html}
      style={{ width: "100%", minHeight: "100vh", border: "none" }}
    />
  );
}
