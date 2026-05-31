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
      <div className="dash-page">
        {eyebrow ? <p className="dash-page-eyebrow">{eyebrow}</p> : null}
        <div className="dash-page-body">{children}</div>
      </div>
    </DashboardShell>
  );
}
