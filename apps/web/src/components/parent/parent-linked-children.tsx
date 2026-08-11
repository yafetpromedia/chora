"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  childClassLabel,
  fetchParentChildren,
  type ParentChildOption,
} from "@/lib/parent-child";

export function ParentLinkedChildren() {
  const [children, setChildren] = useState<ParentChildOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchParentChildren()
      .then(setChildren)
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="par-profile-children" aria-busy="true">
        <h3>Linked children</h3>
        <p className="par-home__empty">Loading…</p>
      </section>
    );
  }

  return (
    <section className="par-profile-children" aria-label="Linked children">
      <h3>Linked children</h3>
      {children.length === 0 ? (
        <p className="par-home__empty">
          No students are linked to this account yet. Ask the school office to connect your child.
        </p>
      ) : (
        <ul>
          {children.map((child) => (
            <li key={child.profileId}>
              <div>
                <strong>{child.name}</strong>
                <div className="par-home__list-meta">{childClassLabel(child)}</div>
              </div>
              <Link href="/parent/results" className="par-home__link">
                Results
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
