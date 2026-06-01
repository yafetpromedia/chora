"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { telHref } from "@/lib/student-photo";
import { listParents, type ParentRecord } from "@/lib/parents";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

function childLine(c: ParentRecord["children"][0]) {
  const grade = c.sectionName ? `${c.gradeName} · ${c.sectionName}` : c.gradeName;
  return `${c.name} (${grade})`;
}

export default function AdminParentsPage() {
  const router = useRouter();
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => {
      const hay = [
        p.name,
        p.email,
        p.phone,
        ...p.children.map((c) => c.name),
        ...p.children.map((c) => c.gradeName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [parents, search]);

  const linkedChildren = parents.reduce((n, p) => n + p.children.length, 0);

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void listParents()
      .then(setParents)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load parents"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardPage
      role="admin"
      title="Parents & guardians"
      eyebrow="Families"
    >
      <div className="att-page par-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}

        <div className="par-stats">
          <div className="par-stat">
            <span className="par-stat__value">{parents.length}</span>
            <span className="par-stat__label">Parent accounts</span>
          </div>
          <div className="par-stat">
            <span className="par-stat__value">{linkedChildren}</span>
            <span className="par-stat__label">Student links</span>
          </div>
        </div>

        <div className="tch-toolbar">
          <label className="att-field par-search">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, child, grade…"
            />
          </label>
        </div>

        {loading ? (
          <p className="setup-hint">Loading parents…</p>
        ) : filtered.length === 0 ? (
          <p className="setup-hint">
            {parents.length === 0
              ? "No parent accounts yet. Add students with parent phone numbers to create them."
              : "No parents match your search."}
          </p>
        ) : (
          <div className="tch-table-wrap">
            <table className="tch-table">
              <thead>
                <tr>
                  <th>Parent / guardian</th>
                  <th>Contact</th>
                  <th>Children</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.userId}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="tch-meta">{p.email}</div>
                    </td>
                    <td>
                      {p.phone ? (
                        <a className="stu-phone-link" href={telHref(p.phone) ?? "#"}>
                          {p.phone}
                        </a>
                      ) : (
                        <span className="tch-meta">—</span>
                      )}
                    </td>
                    <td>
                      {p.children.length === 0 ? (
                        <span className="tch-meta">No students linked</span>
                      ) : (
                        <ul className="par-children">
                          {p.children.map((c) => (
                            <li key={c.profileId}>
                              <Link href={`/admin/students`} className="par-child-link">
                                {childLine(c)}
                              </Link>
                              {c.studentId ? (
                                <span className="tch-meta"> · {c.studentId}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
