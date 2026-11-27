"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { reportCardPrintUrl, type ReportCardPrintMode } from "@/lib/results";
import { useLocale } from "@/components/i18n/locale-provider";

export function ReportCardPrintInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const studentProfileId = searchParams.get("studentProfileId") ?? "";
  const termId = searchParams.get("termId") ?? "";
  const mode: ReportCardPrintMode =
    searchParams.get("mode") === "annual" ? "annual" : "term";

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !studentProfileId || !termId) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!cancelled) setError("");
      try {
        const res = await fetch(reportCardPrintUrl(studentProfileId, termId, mode), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Could not load report");
        const text = await res.text();
        if (!cancelled) setHtml(text);
      } catch {
        if (!cancelled) {
          setError(t("reportCardPrintUi.loadFailed"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentProfileId, termId, mode, router]);

  function onPrint() {
    const frameWindow = frameRef.current?.contentWindow;
    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
      return;
    }
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
          {t("reportCardPrintUi.backToCards")}
        </button>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="rc-print-shell">
        <p className="rc-print-loading">{t("reportCardPrintUi.preparing")}</p>
      </div>
    );
  }

  return (
    <div className="rc-print-wrap">
      <div className="rc-print-toolbar no-print">
        <p>
          <strong>{t("reportCardPrintUi.toolbarTitle")}</strong>
          {mode === "annual"
            ? t("reportCardPrintUi.modeAnnual")
            : t("reportCardPrintUi.modeTerm")}{" "}
          {t("reportCardPrintUi.printHint")}
        </p>
        <div className="rc-print-toolbar__actions">
          <button
            type="button"
            className="rc-print-btn rc-print-btn--primary"
            onClick={onPrint}
          >
            {t("reportCardPrintUi.printSave")}
          </button>
          <button
            type="button"
            className="rc-print-btn"
            onClick={() => router.replace("/admin/report-cards")}
          >
            {t("common.close")}
          </button>
        </div>
      </div>
      <iframe
        ref={frameRef}
        title={t("reportCardPrintUi.frameTitle")}
        className="rc-print-frame"
        srcDoc={html}
      />
    </div>
  );
}
