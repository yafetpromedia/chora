"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listScoreCorrections,
  type ScoreCorrectionRequest,
  type ScoreCorrectionStatus,
} from "@/lib/results";

type Props = {
  termId: string;
  refreshKey?: number;
  role: "student" | "parent";
  /** Parent portal: show only this child's reports. */
  studentProfileId?: string;
};

const STATUS_LABEL: Record<ScoreCorrectionStatus, string> = {
  OPEN: "With teacher",
  PROPOSED: "Awaiting school approval",
  APPROVED: "Corrected",
  REJECTED: "Declined",
};

const STATUS_CLASS: Record<ScoreCorrectionStatus, string> = {
  OPEN: "stu-res__report-status--open",
  PROPOSED: "stu-res__report-status--proposed",
  APPROVED: "stu-res__report-status--approved",
  REJECTED: "stu-res__report-status--rejected",
};

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

function scoreLine(row: ScoreCorrectionRequest) {
  const current =
    row.currentScore == null ? "—" : `${row.currentScore}/${row.maxScore}`;
  if (row.proposedScore == null) return `Showing ${current}`;
  return `${current} → proposed ${row.proposedScore}/${row.maxScore}`;
}

export function MyScoreReportsPanel({
  termId,
  refreshKey = 0,
  role,
  studentProfileId,
}: Props) {
  const [rows, setRows] = useState<ScoreCorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!termId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await listScoreCorrections({ termId });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load score reports");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [termId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const visibleRows = useMemo(() => {
    if (!studentProfileId) return rows;
    return rows.filter((row) => row.studentProfileId === studentProfileId);
  }, [rows, studentProfileId]);

  const pendingCount = useMemo(
    () =>
      visibleRows.filter((row) => row.status === "OPEN" || row.status === "PROPOSED")
        .length,
    [visibleRows],
  );

  return (
    <section
      className="stu-res__panel stu-res__panel--reports"
      aria-label="My score reports"
    >
      <header className="stu-res__reports-head">
        <div>
          <p className="stu-res__eyebrow">Score reports</p>
          <h2 className="stu-res__reports-title">My score reports</h2>
          <p className="stu-res__reports-sub">
            {role === "parent"
              ? "Reports you submitted about your child's published marks. The teacher reviews first, then the school office approves any change."
              : "Reports you submitted about published marks. Your teacher reviews first, then the school office approves any change."}
          </p>
        </div>
        {!loading && pendingCount > 0 ? (
          <span className="stu-res__reports-pending">
            {pendingCount} in progress
          </span>
        ) : null}
      </header>

      {error ? <p className="stu-res__alert stu-res__alert--error">{error}</p> : null}

      {loading ? (
        <div className="stu-res__loading">
          <span className="stu-res__spinner" aria-hidden />
          <p>Loading score reports…</p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="stu-res__empty stu-res__empty--reports">
          <h3>No score reports yet</h3>
          <p>
            When you use <strong>Report</strong> on a published score above, it will
            appear here with its status until the school finishes reviewing it.
          </p>
        </div>
      ) : (
        <ul className="stu-res__timeline stu-res__timeline--reports">
          {visibleRows.map((row) => (
            <li key={row.id} className="stu-res__timeline-item">
              <div className="stu-res__timeline-dot" aria-hidden />
              <div className="stu-res__timeline-body">
                <div className="stu-res__timeline-top">
                  <div>
                    <p className="stu-res__timeline-title">
                      {row.subjectName} · {row.assessmentName}
                    </p>
                    {role === "parent" ? (
                      <p className="stu-res__timeline-meta">{row.studentName}</p>
                    ) : null}
                  </div>
                  <span
                    className={`stu-res__report-status ${STATUS_CLASS[row.status]}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>
                <p className="stu-res__timeline-score stu-res__timeline-score--inline">
                  {scoreLine(row)}
                </p>
                <p className="stu-res__timeline-meta">
                  Submitted {formatDate(row.createdAt)}
                  {row.reviewedAt && row.status !== "OPEN"
                    ? ` · Updated ${formatDate(row.reviewedAt)}`
                    : ""}
                </p>
                <p className="stu-res__report-message">{row.message}</p>
                {row.reviewNote && row.status !== "OPEN" ? (
                  <p className="stu-res__report-reply">
                    <strong>School reply:</strong> {row.reviewNote}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
