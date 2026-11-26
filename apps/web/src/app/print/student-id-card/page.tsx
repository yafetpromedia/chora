"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getStudentIdCard, type StudentIdCard } from "@/lib/student-cards";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

function PrintStudentIdCardInner() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentProfileId = searchParams.get("id") ?? "";
  const duplex = searchParams.get("duplex") !== "0";

  const [card, setCard] = useState<StudentIdCard | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

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
  }, [studentProfileId, router]);

  useEffect(() => {
    if (!ready || !card) return;
    const t = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(t);
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
        <p className="sid-print-page__loading">{t("idCardPrintChromeUi.preparing")}</p>
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
            <StudentIdCardView card={card} showBack={false} />
          </div>
        </div>
        {duplex ? (
          <div className="sid-print-mount sid-print-mount--back">
            <span className="sid-print-side-label">{t("idCardPrintChromeUi.backLong")}</span>
            <div className="sid-print-mount__frame">
              <StudentIdCardView card={card} backOnly />
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
