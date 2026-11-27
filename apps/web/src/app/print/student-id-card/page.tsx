"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getStudentIdCard, type StudentIdCard } from "@/lib/student-cards";
import { BRAND_NAME } from "@/lib/brand";
import { prepareAndPrint, stripPreloaderFromDom } from "@/lib/id-card-print";
import { useLocale } from "@/components/i18n/locale-provider";

function PrintStudentIdCardInner() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentProfileId = searchParams.get("id") ?? "";
  const duplex = searchParams.get("duplex") !== "0";
  const pageRef = useRef<HTMLDivElement>(null);

  const [card, setCard] = useState<StudentIdCard | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    stripPreloaderFromDom();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!studentProfileId) {
        setError(t("idCardPrintChromeUi.missingStudent"));
        return;
      }
      try {
        const data = await getStudentIdCard(studentProfileId);
        if (cancelled) return;
        setCard(data);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("idCardPrintChromeUi.loadFailed"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentProfileId, router, t]);

  useEffect(() => {
    if (!ready || !card) return;
    let cancelled = false;
    void (async () => {
      setPrinting(true);
      try {
        await prepareAndPrint(pageRef.current);
      } finally {
        if (!cancelled) setPrinting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, card]);

  async function onPrint() {
    setPrinting(true);
    try {
      await prepareAndPrint(pageRef.current);
    } finally {
      setPrinting(false);
    }
  }

  if (error) {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>{error}</p>
        <button type="button" className="sid-print-toolbar__btn" onClick={() => router.back()}>
          {t("common.close")}
        </button>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="sid-print-page">
        <p className="sid-print-page__loading">{t("idCardPrintChromeUi.preparing")}</p>
      </div>
    );
  }

  const printedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="sid-print-page" ref={pageRef}>
      <div className="sid-print-toolbar no-print">
        <div className="sid-print-toolbar__copy">
          <p className="sid-print-toolbar__brand">
            {t("idCardPrintChromeUi.brandStudentId", { brand: BRAND_NAME })}
          </p>
          <p className="sid-print-toolbar__hint">{t("idCardPrintChromeUi.previewHint")}</p>
        </div>
        <div className="sid-print-toolbar__actions">
          <button
            type="button"
            className="sid-print-toolbar__btn sid-print-toolbar__btn--ghost"
            onClick={() => router.back()}
          >
            {t("idCardPrintChromeUi.done")}
          </button>
          <button
            type="button"
            className="sid-print-toolbar__btn sid-print-toolbar__btn--primary"
            disabled={printing}
            onClick={() => void onPrint()}
          >
            {printing ? t("idCardPrintChromeUi.preparing") : t("idCardPrintChromeUi.printAgain")}
          </button>
        </div>
      </div>

      <header className="sid-print-meta sid-print-meta--page">
        <div className="sid-print-meta__row">
          {card.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.schoolLogoUrl} alt="" className="sid-print-meta__logo" />
          ) : null}
          <div className="sid-print-meta__copy">
            <p className="sid-print-meta__brand">
              {t("idCardPrintChromeUi.brandStudentId", { brand: BRAND_NAME })}
            </p>
            <h1 className="sid-print-meta__title">{card.name}</h1>
            <p className="sid-print-meta__sub">
              {card.schoolName}
              {card.studentId ? ` · ${card.studentId}` : ""}
              {card.grade ? ` · ${card.grade}` : ""}
              {card.section ? ` ${card.section}` : ""}
            </p>
          </div>
        </div>
        <ul className="sid-print-checklist">
          <li>{t("idCardPrintChromeUi.checklistGraphics")}</li>
          <li>
            {duplex
              ? t("idCardPrintChromeUi.duplexLong")
              : t("idCardPrintChromeUi.frontOnlyHint")}
          </li>
          <li>{t("idCardPrintChromeUi.trimSize")}</li>
        </ul>
        <p className="sid-print-meta__date">
          {t("idCardPrintChromeUi.generated", { date: printedAt })}
        </p>
      </header>

      <div className={`sid-print-cards${duplex ? " sid-print-cards--duplex" : ""}`}>
        <div className="sid-print-mount">
          <span className="sid-print-side-label">{t("idCardPrintChromeUi.front")}</span>
          <div className="sid-print-mount__frame">
            <div className="sid-print-mount__scale">
              <StudentIdCardView card={card} showBack={false} />
            </div>
          </div>
        </div>
        {duplex ? (
          <div className="sid-print-mount sid-print-mount--back">
            <span className="sid-print-side-label">{t("idCardPrintChromeUi.backLong")}</span>
            <div className="sid-print-mount__frame">
              <div className="sid-print-mount__scale">
                <StudentIdCardView card={card} backOnly />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="sid-print-foot">
        {t("idCardPrintChromeUi.footer", {
          school: card.schoolName,
          code: card.cardCode,
        })}
      </footer>
    </div>
  );
}

function PrintStudentIdCardFallback() {
  const { t } = useLocale();
  return (
    <div className="sid-print-page">
      <p className="sid-print-page__loading">{t("idCardPrintChromeUi.loading")}</p>
    </div>
  );
}

export default function PrintStudentIdCardPage() {
  return (
    <Suspense fallback={<PrintStudentIdCardFallback />}>
      <PrintStudentIdCardInner />
    </Suspense>
  );
}
