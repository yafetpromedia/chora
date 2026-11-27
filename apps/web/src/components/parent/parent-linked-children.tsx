"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  childClassLabel,
  fetchParentChildren,
  type ParentChildOption,
} from "@/lib/parent-child";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export function ParentLinkedChildren() {
  const { t, tn } = useLocale();
  const [children, setChildren] = useState<ParentChildOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchParentChildren()
      .then(setChildren)
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="profile-card" aria-label={t("profile.linkedChildren")}>
      <div className="profile-card__head">
        <div>
          <h3 className="profile-card__title">{t("profile.linkedChildren")}</h3>
          <p className="profile-card__sub">{t("profile.linkedChildrenSub")}</p>
        </div>
        <span className="profile-card__icon" aria-hidden>
          <DashIcon name="students" />
        </span>
      </div>

      {loading ? (
        <p className="profile-facts__empty">{t("common.loading")}</p>
      ) : children.length === 0 ? (
        <p className="profile-facts__empty">{t("profile.noLinkedYet")}</p>
      ) : (
        <ul className="par-profile-kids">
          {children.map((child) => (
            <li key={child.profileId}>
              <span className="par-profile-kids__avatar" aria-hidden>
                {initials(child.name)}
              </span>
              <div className="par-profile-kids__body">
                <strong>{child.name}</strong>
                <span>{childClassLabel(child)}</span>
              </div>
              <div className="par-profile-kids__links">
                <Link href="/parent/attendance">{tn("Attendance")}</Link>
                <Link href="/parent/results">{tn("Results")}</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}