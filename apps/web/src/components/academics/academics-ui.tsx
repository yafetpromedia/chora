"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";

export type AcademicsCrumb = { label: string; href?: string };

export function AcademicsBreadcrumb({ items }: { items: AcademicsCrumb[] }) {
  return (
    <nav className="acad-crumb" aria-label="Academics">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="acad-crumb__segment">
          {i > 0 ? <span className="acad-crumb__sep" aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="acad-crumb__current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AcademicsAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <p className={`acad-alert acad-alert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export type AcademicsStatItem = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
};

export function AcademicsHero({
  title,
  subtitle,
  badges,
  stats,
  chip = "School academics",
}: {
  title: string;
  subtitle: string;
  badges?: ReactNode;
  stats?: AcademicsStatItem[];
  chip?: string;
}) {
  return (
    <header className="acad-v2__hero">
      <div className="acad-v2__hero-glow" aria-hidden />
      <div className="acad-v2__hero-inner">
        <div className="acad-v2__hero-main">
          <span className="acad-v2__chip">{chip}</span>
          <h2 className="acad-v2__hero-title">{title}</h2>
          <p className="acad-v2__hero-sub">{subtitle}</p>
          {badges ? <div className="acad-v2__hero-badges">{badges}</div> : null}
        </div>
        {stats && stats.length > 0 ? (
          <div className="acad-v2__hero-stats">
            {stats.map((item) => (
              <div
                key={item.label}
                className={`acad-v2__stat${item.accent ? " acad-v2__stat--accent" : ""}`}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                {item.hint ? <em>{item.hint}</em> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function AcademicsBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "live" | "muted";
}) {
  return <span className={`acad-v2__badge acad-v2__badge--${variant}`}>{children}</span>;
}

export function AcademicsStatGrid({ items }: { items: AcademicsStatItem[] }) {
  return (
    <div className="acad-v2__stats-row">
      {items.map((item) => (
        <div key={item.label} className="acad-v2__stat-card">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
          {item.hint ? <em>{item.hint}</em> : null}
        </div>
      ))}
    </div>
  );
}

export type PipelineStep = {
  step: number;
  href: string;
  title: string;
  detail: string;
  icon: DashIconName;
  status: "done" | "active" | "pending";
  meta?: string;
};

const STEP_STATUS_LABEL = {
  done: "Ready",
  active: "Next",
  pending: "Pending",
} as const;

export function AcademicsPipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="acad-v2__pipeline">
      {steps.map((s) => (
        <Link key={s.href} href={s.href} className={`acad-v2__step acad-v2__step--${s.status}`}>
          <div className="acad-v2__step-head">
            <span className="acad-v2__step-num">{s.step}</span>
            <span className="acad-v2__step-icon">
              <DashIcon name={s.icon} className="dash-icon--sm" />
            </span>
            <span className={`acad-v2__step-pill acad-v2__step-pill--${s.status}`}>
              {STEP_STATUS_LABEL[s.status]}
            </span>
          </div>
          <h3 className="acad-v2__step-title">{s.title}</h3>
          <p className="acad-v2__step-detail">{s.detail}</p>
          {s.meta ? <p className="acad-v2__step-meta">{s.meta}</p> : null}
          <span className="acad-v2__step-cta">Open workspace →</span>
        </Link>
      ))}
    </div>
  );
}

export function AcademicsPanel({
  title,
  subtitle,
  children,
  aside,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className={`acad-layout${aside ? " acad-layout--split" : ""}`}>
      <section className="acad-panel">
        <header className="acad-panel__head">
          <h3 className="acad-panel__title">{title}</h3>
          {subtitle ? <p className="acad-panel__sub">{subtitle}</p> : null}
        </header>
        {children}
      </section>
      {aside ? <aside className="acad-panel acad-panel--form">{aside}</aside> : null}
    </div>
  );
}

export function AcademicsEmpty({ message }: { message: string }) {
  return <p className="acad-empty">{message}</p>;
}

export function formatAcadDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function yearProgress(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

export function termProgress(startIso: string, endIso: string) {
  return yearProgress(startIso, endIso);
}

export function termStatus(startIso: string, endIso: string): "active" | "upcoming" | "completed" {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}

export function termDaysRemaining(endIso: string) {
  const end = new Date(endIso);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function termDurationDays(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}
