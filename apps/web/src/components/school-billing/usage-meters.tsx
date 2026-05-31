"use client";

import type { SubscriptionStatus } from "@/lib/api";

function pct(used: number, limit: number | null) {
  if (limit == null || limit <= 0) return null;
  return Math.min(1, used / limit);
}

type Props = {
  subscription: SubscriptionStatus;
  compact?: boolean;
};

export function UsageMeters({ subscription, compact }: Props) {
  const items = [
    { key: "students", label: "Students", used: subscription.usage.students, limit: subscription.limits.students },
    { key: "teachers", label: "Teachers", used: subscription.usage.teachers, limit: subscription.limits.teachers },
    { key: "admins", label: "Admins", used: subscription.usage.admins, limit: subscription.limits.admins },
  ] as const;

  return (
    <div className={compact ? "sbill-usage-grid" : "sbill-usage-grid"}>
      {items.map((item) => {
        const ratio = pct(item.used, item.limit);
        const over = item.limit != null && item.limit > 0 && item.used > item.limit;
        const warn = ratio != null && ratio >= 0.85 && !over;
        return (
          <article
            key={item.key}
            className={`sbill-usage-card${over ? " sbill-usage-card--over" : ""}`}
          >
            <div className="sbill-usage-card__head">
              <span className="sbill-usage-card__label">{item.label}</span>
              <span className={`sbill-usage-card__count${over ? " sbill-usage-card__count--over" : ""}`}>
                {item.used} / {item.limit == null ? "∞" : item.limit}
              </span>
            </div>
            {ratio != null ? (
              <div className="sbill-usage-bar">
                <div
                  className={`sbill-usage-bar__fill${over ? " sbill-usage-bar__fill--over" : warn ? " sbill-usage-bar__fill--warn" : ""}`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            ) : (
              <p className="sbill-muted">Unlimited on your plan</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
