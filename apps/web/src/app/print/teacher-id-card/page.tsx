"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getMyTeacherIdCard, listTeacherIdCards, type TeacherIdCard } from "@/lib/teacher-cards";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

function PrintTeacherIdCardInner() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const duplex = searchParams.get("duplex") !== "0";
  const me = searchParams.get("me") === "1";

  const [card, setCard] = useState<TeacherIdCard | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

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
    const timeout = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timeout);
  }, [ready, card]);

  if (error) {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>{error}</p>
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
    <div className="sid-print-page">
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
            <TeacherIdCardView card={card} showBack={false} />
          </div>
        </div>
        {duplex ? (
          <div className="sid-print-mount sid-print-mount--back">
            <span className="sid-print-side-label">{t("idCardPrintChromeUi.backLong")}</span>
            <div className="sid-print-mount__frame">
              <TeacherIdCardView card={card} backOnly />
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