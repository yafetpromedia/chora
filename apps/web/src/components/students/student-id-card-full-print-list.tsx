"use client";

import { StudentIdCardView } from "@/components/students/student-id-card";
import type { StudentIdCard } from "@/lib/student-cards";

type Props = {
  cards: StudentIdCard[];
  duplex: boolean;
  qrMap: Map<string, string>;
};

/** One full-size card per student — matches on-screen preview. */
export function StudentIdCardFullPrintList({ cards, duplex, qrMap }: Props) {
  return (
    <div className="sid-full-print-list">
      {cards.map((card) => (
        <section key={card.studentProfileId} className="sid-full-print-student">
          <p className="sid-full-print-student__name">
            {card.name}
            {card.studentId ? ` · ${card.studentId}` : ""}
          </p>
          <div className="sid-print-mount">
            <span className="sid-print-side-label">Front</span>
            <div className="sid-print-mount__frame">
              <StudentIdCardView
                card={card}
                variant="standard"
                qrDataUrl={qrMap.get(card.studentProfileId)}
              />
            </div>
          </div>
          {duplex ? (
            <div className="sid-print-mount sid-print-mount--back">
              <span className="sid-print-side-label">Back · flip on long edge</span>
              <div className="sid-print-mount__frame">
                <StudentIdCardView
                  card={card}
                  variant="standard"
                  backOnly
                  qrDataUrl={qrMap.get(card.studentProfileId)}
                />
              </div>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
