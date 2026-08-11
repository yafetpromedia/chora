"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import type { ReportCardPrintMode } from "@/lib/results";

function reportCardPrintUrl(
  termId: string,
  mode: ReportCardPrintMode,
  studentProfileId?: string | null,
) {
  const q = new URLSearchParams({ termId, mode });
  if (studentProfileId) q.set("studentProfileId", studentProfileId);
  return `${getApiBaseUrl()}/results/report-card/html?${q}`;
}

export function ParentReportCardPrintInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [html, setHtml] = useState("");
  const termId = searchParams.get("termId") ?? "";
  const studentProfileId = searchParams.get("studentProfileId");
  const mode: ReportCardPrintMode =
    searchParams.get("mode") === "annual" ? "annual" : "term";

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !termId) {
      router.replace("/login");
      return;
    }
    void fetch(reportCardPrintUrl(termId, mode, studentProfileId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load report");
        return res.text();
      })
      .then((text) => {
        setHtml(text);
        setTimeout(() => window.print(), 500);
      })
      .catch(() => router.replace("/parent/report-card"));
  }, [termId, mode, studentProfileId, router]);

  if (!html) {
    return <p style={{ padding: "2rem" }}>Preparing report card…</p>;
  }

  return (
    <iframe
      title="Report card"
      srcDoc={html}
      style={{ width: "100%", minHeight: "100vh", border: "none" }}
    />
  );
}
