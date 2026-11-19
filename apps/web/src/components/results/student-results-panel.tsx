"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listMyScoreUpdates,
  listTerms,
  type AcademicTerm,
  type StudentScoreUpdate,
} from "@/lib/results";

function formatReleasedDate(iso: string) {
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

function ScoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

export function StudentResultsPanel() {
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [termId, setTermId] = useState("");
  const [scores, setScores] = useState<StudentScoreUpdate[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresError, setScoresError] = useState("");

  useEffect(() => {
    void listTerms()
      .then((available) => {
        setTerms(available);
        const current = available.find((t) => t.isCurrent) ?? available[0];
        if (current) setTermId(current.id);
      })
      .catch((err) => setScoresError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  const scoresKey = !loading && termId ? termId : "";
  const [prevScoresKey, setPrevScoresKey] = useState("");
  if (scoresKey !== prevScoresKey) {
    setPrevScoresKey(scoresKey);
    if (scoresKey) {
      setScoresError("");
      setScoresLoading(true);
    }
  }

  useEffect(() => {
    if (loading || !termId) return;
    void (async () => {
      try {
        setScores(await listMyScoreUpdates(termId));
      } catch (err) {
        setScoresError(err instanceof Error ? err.message : "Failed to load scores");
      } finally {
        setScoresLoading(false);
      }
    })();
  }, [loading, termId]);

  const groupedScores = useMemo(() => {
    const map = new Map<string, StudentScoreUpdate[]>();
    for (const row of scores) {
      const key = row.subject;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [scores]);

  const scoreStats = useMemo(() => {
    if (scores.length === 0) return null;
    const avg =
      Math.round(
        (scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length) * 10,
      ) / 10;
    const subjects = new Set(scores.map((s) => s.subject)).size;
    return { count: scores.length, avg, subjects };
  }, [scores]);

  return (
    <div className="stu-res">
      <section className="stu-res__panel stu-res__panel--scores" aria-label="Score updates">
        <header className="stu-res__hero stu-res__hero--scores">
          <div>
            <p className="stu-res__eyebrow">Live updates</p>
            <h2 className="stu-res__hero-title">Your latest scores</h2>
            <p className="stu-res__hero-sub">
              Teachers release marks after each quiz, test, or assignment — often weekly or
              monthly. Check back as new results are posted.
            </p>
          </div>
          {scoreStats ? (
            <div className="stu-res__hero-stats">
              <div className="stu-res__hero-stat">
                <strong>{scoreStats.count}</strong>
                <span>Released</span>
              </div>
              <div className="stu-res__hero-stat">
                <strong>{scoreStats.subjects}</strong>
                <span>Subjects</span>
              </div>
              <div className="stu-res__hero-stat">
                <strong>{scoreStats.avg}%</strong>
                <span>Average</span>
              </div>
            </div>
          ) : null}
        </header>

        <div className="stu-res__filter">
          <label className="stu-res__field">
            <span>Term</span>
            <select
              className="stu-res__select"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              disabled={loading || terms.length === 0}
            >
              {terms.length === 0 ? (
                <option value="">No terms</option>
              ) : (
                terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.academicYear.name})
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {scoresError ? <p className="stu-res__alert stu-res__alert--error">{scoresError}</p> : null}

        {scoresLoading || loading ? (
          <div className="stu-res__loading">
            <span className="stu-res__spinner" aria-hidden />
            <p>Loading score updates…</p>
          </div>
        ) : scores.length === 0 ? (
          <div className="stu-res__empty stu-res__empty--scores">
            <ScoreIcon className="stu-res__empty-icon" />
            <h3>No score updates yet</h3>
            <p>
              When your teacher finishes marking and releases a test or assignment, it will
              appear here — usually within days or weeks, not at term end.
            </p>
          </div>
        ) : (
          <div className="stu-res__score-groups">
            {groupedScores.map(([subject, rows]) => (
              <article key={subject} className="stu-res__subject">
                <header className="stu-res__subject-head">
                  <h3>{subject}</h3>
                  <span>{rows.length} update{rows.length === 1 ? "" : "s"}</span>
                </header>
                <ul className="stu-res__timeline">
                  {rows.map((row) => (
                    <li key={row.id} className="stu-res__timeline-item">
                      <div className="stu-res__timeline-dot" aria-hidden />
                      <div className="stu-res__timeline-body">
                        <div className="stu-res__timeline-top">
                          <p className="stu-res__timeline-title">{row.assessmentName}</p>
                          <span className="stu-res__timeline-score">
                            {row.score}/{row.maxScore}
                            <small>{row.percentage}%</small>
                          </span>
                        </div>
                        <p className="stu-res__timeline-meta">
                          {row.classLabel} · {row.termName} ·{" "}
                          {row.published
                            ? `Published ${formatReleasedDate(row.publishedAt ?? row.releasedAt)}`
                            : `Updated ${formatReleasedDate(row.releasedAt)} · awaiting official publish`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
