"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeacherIdCardView } from "@/components/teacher/teacher-id-card";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { getMyTeacherIdCard, listTeacherIdCards, type TeacherIdCard } from "@/lib/teacher-cards";

function PrintTeacherIdCardInner() {
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
            if (!found) throw new Error("Teacher not found");
            return found;
          })
        : Promise.reject(new Error("Missing teacher."));

    void load
      .then((data) => {
        setCard(data);
        setReady(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load card");
      });
  }, [userId, me, router]);

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
        <p className="sid-print-page__loading">Preparing faculty ID card for print…</p>
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
            <p className="sid-print-meta__brand">CampusOne · Faculty ID</p>
            <h1 className="sid-print-meta__title">{card.name}</h1>
            <p className="sid-print-meta__sub">
              {card.schoolName}
              {card.teacherId ? ` · ${card.teacherId}` : ""}
              {card.homeroom ? ` · ${card.homeroom}` : ""}
            </p>
          </div>
        </div>
        <ul className="sid-print-checklist">
          <li>Turn on <strong>Background graphics</strong> in the print dialog</li>
          <li>
            {duplex
              ? "Use double-sided · Flip on long edge · Page 1 front, page 2 back"
              : "Front only — enable duplex in the app for both sides"}
          </li>
          <li>Trim along the dashed line · Standard card 85.6 × 54 mm (CR80)</li>
        </ul>
        <p className="sid-print-meta__date">Generated {printedAt}</p>
      </header>

      <div className={`sid-print-cards${duplex ? " sid-print-cards--duplex" : ""}`}>
        <div className="sid-print-mount">
          <span className="sid-print-side-label">Front</span>
          <div className="sid-print-mount__frame">
            <TeacherIdCardView card={card} showBack={false} />
          </div>
        </div>
        {duplex ? (
          <div className="sid-print-mount sid-print-mount--back">
            <span className="sid-print-side-label">Back — flip on long edge</span>
            <div className="sid-print-mount__frame">
              <TeacherIdCardView card={card} backOnly />
            </div>
          </div>
        ) : null}
      </div>

      <footer className="sid-print-foot">
        {card.schoolName} · Card {card.cardCode} · Faculty property of the school
      </footer>
    </div>
  );
}

export default function PrintTeacherIdCardPage() {
  return (
    <Suspense
      fallback={
        <div className="sid-print-page">
          <p className="sid-print-page__loading">Loading…</p>
        </div>
      }
    >
      <PrintTeacherIdCardInner />
    </Suspense>
  );
}
