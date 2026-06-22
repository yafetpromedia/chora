"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";

export default function CertificatePrintPage() {
  const params = useParams();
  const id = params.id as string;
  const certificateId = params.certificateId as string;
  const [html, setHtml] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    void fetch(
      `${getApiBaseUrl()}/schools/students/${id}/records/certificates/${certificateId}/html`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
      .then((r) => r.text())
      .then(setHtml)
      .catch(() => setHtml("<p>Could not load certificate.</p>"));
  }, [id, certificateId]);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ minHeight: "100vh" }}
    />
  );
}
