"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { listTeacherIdCards, type TeacherIdCard } from "@/lib/teacher-cards";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

export default function PrintTeacherIdCardsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [cards, setCards] = useState<TeacherIdCard[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    void listTeacherIdCards()
      .then((rows) => {
        setCards(rows);
        setReady(true);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("idCardPrintChromeUi.loadFailed")),
      );
  }, [router, t]);

  useEffect(() => {
    if (!ready || cards.length === 0) return;
    const timeout = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timeout);
  }, [ready, cards.length]);

  if (error) {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="sid-print-page">
        <p className="sid-print-page__loading">{t("idCardPrintChromeUi.preparingFaculty")}</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>{t("idCardPrintChromeUi.noTeacherCards")}</p>
      </div>
    );
  }

  return (
    <div className="sid-print-page sid-print-page--bulk">
      <header className="sid-print-meta sid-print-meta--page no-print">
        <p className="sid-print-meta__brand">
          {t("idCardPrintChromeUi.facultyBulkPrint", { brand: BRAND_NAME })}
        </p>
        <p className="sid-print-meta__sub">
          {t("idCardPrintChromeUi.facultyBulkSub", { count: cards.length })}
        </p>
      </header>

      <div className="sid-bulk-grid sid-bulk-grid--6">
        {cards.map((c) => (
          <div key={c.userId} className="sid-bulk-cell">
            <TeacherIdCardView card={c} variant="standard" showBack={false} />
          </div>
        ))}
      </div>

      <div className="sid-bulk-sheet">
        <p className="sid-bulk-sheet__label sid-bulk-sheet__label--back">
          {t("idCardPrintChromeUi.backSides")}
        </p>
        <div className="sid-bulk-grid sid-bulk-grid--6">
          {cards.map((c) => (
            <div key={`${c.userId}-back`} className="sid-bulk-cell">
              <TeacherIdCardView card={c} variant="standard" backOnly />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}