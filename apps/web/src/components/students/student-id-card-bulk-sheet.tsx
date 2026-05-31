"use client";

import { StudentIdCardView } from "@/components/students/student-id-card";
import { chunk } from "@/lib/chunk";
import type { BulkPrintLayout } from "@/lib/student-card-print";
import type { StudentIdCard } from "@/lib/student-cards";

type Props = {
  cards: StudentIdCard[];
  perPage: BulkPrintLayout;
  duplex: boolean;
  qrMap: Map<string, string>;
  pageOffset?: number;
};

export function StudentIdCardBulkSheet({
  cards,
  perPage,
  duplex,
  qrMap,
  pageOffset = 0,
}: Props) {
  const per = perPage === "8" ? 8 : 6;
  const pages = chunk(cards, per);

  return (
    <div className="sid-bulk-sheets">
      {pages.map((pageCards, pageIndex) => {
        const sheetNum = pageOffset + pageIndex + 1;
        return (
          <div key={`f-${sheetNum}`} className="sid-bulk-sheet">
            <p className="sid-bulk-sheet__label">
              Front · sheet {sheetNum}
              <span className="sid-bulk-sheet__range">
                {pageCards[0]?.name}
                {pageCards.length > 1 ? ` – ${pageCards[pageCards.length - 1]?.name}` : ""}
              </span>
            </p>
            <div className={`sid-bulk-grid sid-bulk-grid--${per}`}>
              {pageCards.map((card) => (
                <div key={card.studentProfileId} className="sid-bulk-cell">
                  <StudentIdCardView card={card} variant="mini" qrDataUrl={qrMap.get(card.studentProfileId)} />
                </div>
              ))}
            </div>
            {duplex ? (
              <>
                <p className="sid-bulk-sheet__label sid-bulk-sheet__label--back">
                  Back · sheet {sheetNum} · flip on long edge
                </p>
                <div className={`sid-bulk-grid sid-bulk-grid--${per}`}>
                  {pageCards.map((card) => (
                    <div key={`b-${card.studentProfileId}`} className="sid-bulk-cell">
                      <StudentIdCardView
                        card={card}
                        variant="mini"
                        backOnly
                        qrDataUrl={qrMap.get(card.studentProfileId)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
