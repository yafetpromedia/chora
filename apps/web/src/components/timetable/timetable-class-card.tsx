"use client";

import type { TimetableOverviewClass } from "@/lib/timetable";

type Props = {
  cls: TimetableOverviewClass;
  onOpen: () => void;
  onStack?: () => void;
};

export function TimetableClassCard({ cls, onOpen, onStack }: Props) {
  const open = Math.max(cls.totalSlots - cls.scheduled, 0);
  const pct =
    cls.totalSlots > 0
      ? Math.round((cls.scheduled / cls.totalSlots) * 100)
      : 0;
  const title = cls.sectionName
    ? `${cls.gradeName} · ${cls.sectionName}`
    : cls.gradeName;

  return (
    <article className="tt-class-card">
      <div className="tt-class-card__top">
        <h3 className="tt-class-card__title">{title}</h3>
        <span
          className={`tt-class-card__pct${pct >= 90 ? " tt-class-card__pct--full" : pct === 0 ? " tt-class-card__pct--empty" : ""}`}
        >
          {pct}%
        </span>
      </div>
      <div className="tt-class-card__meter" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      <dl className="tt-class-card__meta">
        <div>
          <dt>Scheduled</dt>
          <dd>
            {cls.scheduled}
            <span> / {cls.totalSlots}</span>
          </dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd>{open}</dd>
        </div>
      </dl>
      <div className="tt-class-card__actions">
        <button type="button" className="tt-admin__btn tt-admin__btn--primary" onClick={onOpen}>
          Open class
        </button>
        {onStack ? (
        <button type="button" className="tt-admin__btn tt-admin__btn--ghost" onClick={onStack}>
          View board
        </button>
        ) : null}
      </div>
    </article>
  );
}
