"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getMyTeacherIdCard, listTeacherIdCards, type TeacherIdCard } from "@/lib/teacher-cards";
import { BRAND_NAME } from "@/lib/brand";
import { prepareAndPrint, stripPreloaderFromDom } from "@/lib/id-card-print";
import { useLocale } from "@/components/i18n/locale-provider";

function PrintTeacherIdCardInner() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const duplex = searchParams.get("duplex") !== "0";
  const me = searchParams.get("me") === "1";
  const pageRef = useRef<HTMLDivElement>(null);

  const [card, setCard] = useState<TeacherIdCard | null>(null);
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
    const load = me
      ? getMyTeacherIdCard()
      : userId
        ? listTeacherIdCards().then((rows) => {
            const found = rows.find((r) => r.userId === userId);
            if (!found) throw new Error(t("idCardPrintChromeUi.teacherNotFound"));
            return found;
          })
        : Promise.reject(new Error(t("idCardPrintChromeUi.missingStaff")));

    void load
      .then((data) => {
        setCard(data);
        setReady(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("idCardPrintChromeUi.loadFailed"));
      });
  }, [userId, me, router, t]);

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
        <p className="sid-print-page__loading">{t("idCardPrintChromeUi.preparingStaff")}</p>
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
            {t("idCardPrintChromeUi.facultyId", { brand: BRAND_NAME })}
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
            {printing ? t("idCardPrintChromeUi.preparingStaff") : t("idCardPrintChromeUi.printAgain")}
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
              {t("idCardPrintChromeUi.facultyId", { brand: BRAND_NAME })}
            </p>
            <h1 className="sid-print-meta__title">{card.name}</h1>
            <p className="sid-print-meta__sub">
              {card.schoolName}
              {card.teacherId ? ` · ${card.teacherId}` : ""}
              {card.homeroom ? ` · ${card.homeroom}` : ""}
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
              <TeacherIdCardView card={card} showBack={false} />
            </div>
          </div>
        </div>
        {duplex ? (
          <div className="sid-print-mount sid-print-mount--back">
            <span className="sid-print-side-label">{t("idCardPrintChromeUi.backLong")}</span>
            <div className="sid-print-mount__frame">
              <div className="sid-print-mount__scale">
                <TeacherIdCardView card={card} backOnly />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="sid-print-foot">
        {t("idCardPrintChromeUi.facultyProperty", {
          school: card.schoolName,
          code: card.cardCode,
        })}
      </footer>
    </div>
  );
}

function PrintTeacherIdCardFallback() {
  const { t } = useLocale();
  return (
    <div className="sid-print-page">
      <p className="sid-print-page__loading">{t("idCardPrintChromeUi.loading")}</p>
    </div>
  );
}

export default function PrintTeacherIdCardPage() {
  return (
    <Suspense fallback={<PrintTeacherIdCardFallback />}>
      <PrintTeacherIdCardInner />
    </Suspense>
  );
}
