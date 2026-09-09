"use client";

import Link from "next/link";

type Props = {
  moduleLabel?: string;
};

/** Soft empty state when a deep link hits a module the school has not purchased. */
export function ModuleLockedState({ moduleLabel = "This module" }: Props) {
  return (
    <div className="module-locked" role="status">
      <h2>{moduleLabel} is not on your plan</h2>
      <p>
        Your school has not enabled this module. An administrator can add it from Billing → Plans.
      </p>
      <Link href="/admin/billing/plans" className="btn-brand">
        Open plans & modules
      </Link>
    </div>
  );
}
