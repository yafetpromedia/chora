"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";

function myReportCardPrintUrl(termId: string) {
  const q = new URLSearchParams({ termId });
  return `${getApiBaseUrl()}/results/report-card/html?${q}`;
}

export function StudentReportCardPrintInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [html, setHtml] = useState("");
  const termId = searchParams.get("termId") ?? "";

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !termId) {
      router.replace("/login");
      return;
    }
    void fetch(myReportCardPrintUrl(termId), {
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
      .catch(() => router.replace("/student/report-card"));
  }, [termId, router]);

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
