"use client";

import type { ReactNode } from "react";
import {
  AcademicsAlert,
  AcademicsHero,
  type AcademicsStatItem,
} from "@/components/academics/academics-ui";
import { SchoolBillingNav } from "@/components/school-billing/school-billing-nav";

type Props = {
  title: string;
  subtitle: string;
  stats?: AcademicsStatItem[];
  badges?: ReactNode;
  heroExtra?: ReactNode;
  error?: string;
  success?: string;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

export function SchoolBillingShell({
  title,
  subtitle,
  stats,
  badges,
  heroExtra,
  error,
  success,
  loading,
  loadingLabel = "Loading billing…",
  children,
}: Props) {
  return (
    <div className="sb-v2">
      <AcademicsHero
        title={title}
        subtitle={subtitle}
        stats={stats}
        badges={badges}
      />

      {error ? <AcademicsAlert tone="error">{error}</AcademicsAlert> : null}
      {success ? (
        <p className="sb-v2__alert sb-v2__alert--ok" role="status">
          {success}
        </p>
      ) : null}

      <div className="sb-v2__toolbar">
        <SchoolBillingNav />
        {heroExtra ? <div className="sb-v2__toolbar-extra">{heroExtra}</div> : null}
      </div>

      {loading ? (
        <div className="sb-v2__loading" aria-busy="true">
          <span className="sb-v2__loading-spinner" aria-hidden />
          <p>{loadingLabel}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
