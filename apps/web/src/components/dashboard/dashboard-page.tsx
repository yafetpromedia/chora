"use client";

import type { UserRole } from "@/lib/auth";
import { DashboardShell } from "./dashboard-shell";

type Props = {
  role: UserRole;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function DashboardPage({ role, title, subtitle, eyebrow, children }: Props) {
  return (
    <DashboardShell role={role} title={title} subtitle={subtitle}>
      <div className="dash-page co-page">
        {eyebrow ? <span className="co-page-tag">{eyebrow}</span> : null}
        <div className="dash-page-body co-page__body">{children}</div>
      </div>
    </DashboardShell>
  );
}
