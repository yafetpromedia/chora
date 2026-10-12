"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  CONCERN_TYPE_LABELS,
  STATUS_LABELS,
  getAttendanceConcernsSummary,
  listAttendanceConcerns,
  type AttendanceConcern,
} from "@/lib/attendance-concerns";
import { hasPermission, Permission } from "@/lib/permissions";

export default function TeacherAttendanceConcernsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<{
    open: number;
    resolved: number;
    today: number;
  } | null>(null);
  const [items, setItems] = useState<AttendanceConcern[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canReview = hasPermission(Permission.ATTENDANCE_CONCERNS_REVIEW);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (role !== "teacher" && role !== "admin") {
      router.replace(`/${role ?? "login"}`);
      return;
    }

    const load = async () => {
      try {
        if (canReview) {
          const s = await getAttendanceConcernsSummary();
          setSummary({ open: s.open, resolved: s.resolved, today: s.today });
          setItems(s.items);
        } else {
          const list = await listAttendanceConcerns({ mine: true });
          setItems(list.items);
          setSummary({
            open: list.items.filter(
              (i) => i.status === "OPEN" || i.status === "UNDER_REVIEW",
            ).length,
            resolved: list.items.filter(
              (i) => i.status === "RESOLVED" || i.status === "DISMISSED",
            ).length,
            today: list.items.filter(
              (i) => i.date === new Date().toISOString().slice(0, 10),
            ).length,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load concerns");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [router, canReview]);

  return (
    <DashboardPage role="teacher" title="Attendance concerns">
      <div className="att-concern">
        <header className="att-concern__hero">
          <h1 className="att-concern__title">Attendance concerns</h1>
          <p className="att-concern__sub">
            {canReview
              ? "Review observations from subject teachers for your homeroom."
              : "Concerns you reported for your scheduled classes."}
          </p>
        </header>

        {summary && (
          <div className="att-concern__stats">
            <div>
              <strong>{summary.open}</strong>
              <span>Open</span>
            </div>
            <div>
              <strong>{summary.resolved}</strong>
              <span>Resolved</span>
            </div>
            <div>
              <strong>{summary.today}</strong>
              <span>Today</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>Loading…</p>
          </div>
        )}
        {error && <p className="att-concern__error">{error}</p>}

        <ul className="att-concern__list">
          {items.map((c) => {
            const label = c.section
              ? `${c.grade.name} ${c.section.name}`
              : c.grade.name;
            const headline =
              c.concernType === "COUNT_MISMATCH" && c.difference != null
                ? `${c.difference >= 0 ? "+" : ""}${c.difference} student discrepancy`
                : CONCERN_TYPE_LABELS[c.concernType];
            return (
              <li key={c.id}>
                <Link
                  href={`/teacher/attendance/concerns/${c.id}`}
                  className="att-concern__list-item"
                >
                  <div>
                    <strong>
                      {label}
                      {c.subject ? ` · ${c.subject.name}` : ""}
                    </strong>
                    <span>{headline}</span>
                    <span>
                      Reported by {c.reportedBy.name} ·{" "}
                      {new Date(c.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span className={`att-concern__badge att-concern__badge--${c.status.toLowerCase()}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {!loading && items.length === 0 && (
          <p className="att-concern__empty">No attendance concerns yet.</p>
        )}
      </div>
    </DashboardPage>
  );
}
