"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Announcement, apiFetch } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import {
  getTeacherDashboard,
  type TeacherDashboardOverview,
} from "@/lib/teachers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

function formatDate(iso: string) {
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

export function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<TeacherDashboardOverview | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }

    void (async () => {
      try {
        const [dash, posts] = await Promise.all([
          getTeacherDashboard(),
          apiFetch<Announcement[]>("/announcements"),
        ]);
        setOverview(dash);
        setAnnouncements(posts);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Load failed";
        if (message === "Session expired" || message === "Not authenticated") {
          router.replace("/login");
          return;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="dash-loading">
        <span className="dash-loading-spinner" aria-hidden />
        Loading your classes…
      </div>
    );
  }

  const homeroomLabel = overview?.homeroom
    ? `${overview.homeroom.gradeName}${overview.homeroom.sectionName ? ` · ${overview.homeroom.sectionName}` : ""}`
    : null;

  return (
    <DashboardShell role="teacher">
      <section className="dash-welcome dash-welcome--modern">
        <div>
          <p className="dash-welcome-eyebrow">My workspace</p>
          <h2>Your classroom at a glance</h2>
          <p>
            {overview?.classesToday
              ? `${overview.classesToday} class${overview.classesToday !== 1 ? "es" : ""} today`
              : "No classes assigned yet"}
            {homeroomLabel ? ` · Homeroom: ${homeroomLabel}` : ""}
          </p>
        </div>
      </section>

      {error ? (
        <section className="auth-alert auth-alert--error dash-alert">{error}</section>
      ) : null}

      {overview && overview.classes.length === 0 ? (
        <section className="dash-panel dash-panel--flat">
          <div className="dash-empty">
            <div className="dash-empty-icon" aria-hidden>
              📚
            </div>
            <p>No classes assigned yet. Ask your school admin to set your homeroom or subject assignments.</p>
          </div>
        </section>
      ) : null}

      {overview && overview.teachingSlots.length > 0 ? (
        <section className="dash-panel dash-panel--flat dash-today">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Today — my subjects</h2>
            <span className="dash-panel-badge">{overview.date}</span>
          </div>
          <ul className="dash-list">
            {overview.teachingSlots.map((slot) => (
              <li key={slot.classSubjectId} className="dash-list-item">
                <div>
                  <p className="dash-list-title">{slot.label}</p>
                  <p className="dash-list-meta">{slot.subjectName}</p>
                </div>
                <Link
                  href={`/teacher/results?classSubjectId=${slot.classSubjectId}`}
                  className="dash-link-btn"
                >
                  Scores
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overview ? (
        <section className="dash-stats dash-stats--modern" aria-label="Today">
          <article className="dash-stat dash-stat--modern">
            <div className="dash-stat-icon" aria-hidden>
              📅
            </div>
            <p className="dash-stat-label">My classes</p>
            <p className="dash-stat-value">{overview.classesToday}</p>
          </article>
          <article className="dash-stat dash-stat--modern">
            <div className="dash-stat-icon" aria-hidden>
              ✓
            </div>
            <p className="dash-stat-label">Attendance pending</p>
            <p className="dash-stat-value">{overview.attendancePendingCount}</p>
          </article>
          <article className="dash-stat dash-stat--modern">
            <div className="dash-stat-icon" aria-hidden>
              📝
            </div>
            <p className="dash-stat-label">Grading pending</p>
            <p className="dash-stat-value">{overview.resultsPendingCount}</p>
          </article>
          <article className="dash-stat dash-stat--modern">
            <div className="dash-stat-icon" aria-hidden>
              📢
            </div>
            <p className="dash-stat-label">Announcements</p>
            <p className="dash-stat-value">{overview.announcements}</p>
          </article>
        </section>
      ) : null}

      <section className="dash-grid-2">
        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Today&apos;s classes</h2>
            <Link href="/teacher/attendance" className="dash-link-btn">
              Mark attendance
            </Link>
          </div>
          {overview && overview.classes.length > 0 ? (
            <ul className="dash-list">
              {overview.classes.map((c) => (
                <li key={`${c.gradeId}-${c.sectionId ?? "all"}`} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">
                      {c.label}
                      {c.isHomeroom ? (
                        <span className="dash-tag" style={{ marginLeft: "0.35rem" }}>
                          Homeroom
                        </span>
                      ) : null}
                    </p>
                    <p className="dash-list-meta">{c.studentCount} students</p>
                  </div>
                  <Link
                    href={`/teacher/attendance?gradeId=${c.gradeId}${c.sectionId ? `&sectionId=${c.sectionId}` : ""}`}
                    className="dash-link-btn"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="setup-hint">No classes on your roster.</p>
          )}
        </article>

        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Attendance pending</h2>
            <span className="dash-panel-badge">
              {overview?.attendancePendingCount ?? 0}
            </span>
          </div>
          {overview && overview.attendancePending.length > 0 ? (
            <ul className="dash-list">
              {overview.attendancePending.map((p) => (
                <li
                  key={`${p.gradeId}-${p.sectionId ?? "all"}`}
                  className="dash-list-item"
                >
                  <div>
                    <p className="dash-list-title">{p.label}</p>
                    <p className="dash-list-meta">
                      {p.pendingCount} of {p.studentCount} not marked · {overview.date}
                    </p>
                  </div>
                  <Link
                    href={`/teacher/attendance?gradeId=${p.gradeId}${p.sectionId ? `&sectionId=${p.sectionId}` : ""}`}
                    className="dash-link-btn"
                  >
                    Mark now
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dash-empty">
              <p>All assigned classes are marked for today.</p>
            </div>
          )}
        </article>
      </section>

      <section className="dash-grid-2">
        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Results pending</h2>
            <Link href="/teacher/results" className="dash-link-btn">
              Enter scores
            </Link>
          </div>
          {overview && overview.resultsPending.length > 0 ? (
            <ul className="dash-list">
              {overview.resultsPending.map((r) => (
                <li key={r.assessmentId} className="dash-list-item dash-list-item--stack">
                  <div>
                    <p className="dash-list-title">{r.name}</p>
                    <p className="dash-list-meta">
                      {r.classLabel} · {r.missingCount} score{r.missingCount !== 1 ? "s" : ""}{" "}
                      missing
                    </p>
                  </div>
                  <Link
                    href={`/teacher/results?assessmentId=${r.assessmentId}`}
                    className="dash-link-btn"
                  >
                    Grade
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dash-empty">
              <p>
                {overview?.currentTerm
                  ? `No pending scores for ${overview.currentTerm.name}.`
                  : "No current term configured."}
              </p>
            </div>
          )}
        </article>

        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">Recent announcements</h2>
            <span className="dash-panel-badge">{announcements.length}</span>
          </div>
          {announcements.length === 0 ? (
            <div className="dash-empty">
              <p>No announcements yet.</p>
            </div>
          ) : (
            <ul className="dash-list">
              {announcements.slice(0, 5).map((item) => (
                <li key={item.id} className="dash-list-item dash-list-item--stack">
                  <div>
                    <p className="dash-list-title">{item.title}</p>
                    <p className="dash-list-meta">{formatDate(item.createdAt)}</p>
                    {item.body ? (
                      <p className="dash-announce-body">{item.body}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {overview && overview.assignments.length > 0 ? (
        <article className="dash-panel dash-panel--flat">
          <div className="dash-panel-head">
            <h2 className="dash-panel-title">My assignments</h2>
          </div>
          <ul className="dash-list">
            {overview.assignments.map((a, i) => (
              <li key={i} className="dash-list-item">
                <div>
                  <p className="dash-list-title">
                    {a.subjectName ?? "Class"}
                  </p>
                  <p className="dash-list-meta">
                    {a.gradeName}
                    {a.sectionName ? ` · ${a.sectionName}` : ""}
                    {a.isHomeroom ? " · Homeroom" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </DashboardShell>
  );
}
