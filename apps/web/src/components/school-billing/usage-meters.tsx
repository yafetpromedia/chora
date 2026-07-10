"use client";

import type { SubscriptionStatus } from "@/lib/api";

function pct(used: number, limit: number | null) {
  if (limit == null || limit <= 0) return null;
  return Math.min(1, used / limit);
}

type Props = {
  subscription: SubscriptionStatus;
};

export function UsageMeters({ subscription }: Props) {
  const items = [
    { key: "students", label: "Students", used: subscription.usage.students, limit: subscription.limits.students },
    { key: "teachers", label: "Teachers", used: subscription.usage.teachers, limit: subscription.limits.teachers },
    { key: "admins", label: "Admins", used: subscription.usage.admins, limit: subscription.limits.admins },
  ] as const;

  return (
    <div className="sb-v2__usage-grid">
      {items.map((item) => {
        const ratio = pct(item.used, item.limit);
        const over = item.limit != null && item.limit > 0 && item.used > item.limit;
        const warn = ratio != null && ratio >= 0.85 && !over;
        return (
          <article
            key={item.key}
            className={`sb-v2__usage-card${over ? " sb-v2__usage-card--over" : ""}`}
          >
            <div className="sb-v2__usage-card__head">
              <span className="sb-v2__usage-card__label">{item.label}</span>
              <span className={`sb-v2__usage-card__count${over ? " sb-v2__usage-card__count--over" : ""}`}>
                {item.used} / {item.limit == null ? "∞" : item.limit}
              </span>
            </div>
            {ratio != null ? (
              <div className="sb-v2__usage-bar">
                <div
                  className={`sb-v2__usage-bar__fill${over ? " sb-v2__usage-bar__fill--over" : warn ? " sb-v2__usage-bar__fill--warn" : ""}`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            ) : (
              <p className="sb-v2__muted">Unlimited on your plan</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
