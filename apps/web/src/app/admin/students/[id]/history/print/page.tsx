"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";

export default function TranscriptPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [html, setHtml] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    void fetch(
      `${getApiBaseUrl()}/schools/students/${id}/records/transcript/html`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
      .then((r) => r.text())
      .then(setHtml)
      .catch(() => setHtml("<p>Could not load transcript.</p>"));
  }, [id]);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ minHeight: "100vh" }}
    />
  );
}
