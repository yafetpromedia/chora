"use client";



import { useCallback, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { AUTH_TOKEN_KEY } from "@/lib/auth";

import { reportCardPrintUrl } from "@/lib/results";



export function ReportCardPrintInner() {

  const searchParams = useSearchParams();

  const router = useRouter();

  const [html, setHtml] = useState("");

  const [error, setError] = useState("");

  const studentProfileId = searchParams.get("studentProfileId") ?? "";

  const termId = searchParams.get("termId") ?? "";



  const load = useCallback(async () => {

    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token || !studentProfileId || !termId) {

      router.replace("/login");

      return;

    }

    setError("");

    try {

      const res = await fetch(reportCardPrintUrl(studentProfileId, termId), {

        headers: { Authorization: `Bearer ${token}` },

      });

      if (!res.ok) throw new Error("Could not load report");

      setHtml(await res.text());

    } catch {

      setError("Report card is not available. Publish results for all class subjects first.");

    }

  }, [studentProfileId, termId, router]);



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

        <button type="button" className="rc-print-btn" onClick={() => router.replace("/admin/results")}>

          Back to results

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

          <strong>Save as PDF:</strong> click Print, then choose &quot;Save as PDF&quot; (or Microsoft Print to PDF).

        </p>

        <div className="rc-print-toolbar__actions">

          <button type="button" className="rc-print-btn rc-print-btn--primary" onClick={onPrint}>

            Print / Save PDF

          </button>

          <button type="button" className="rc-print-btn" onClick={() => router.replace("/admin/results")}>

            Close

          </button>

        </div>

      </div>

      <iframe

        title="Report card"

        className="rc-print-frame"

        srcDoc={html}

      />

    </div>

  );

}

