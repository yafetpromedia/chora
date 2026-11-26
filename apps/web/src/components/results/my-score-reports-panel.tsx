"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  listScoreCorrections,
  type ScoreCorrectionRequest,
  type ScoreCorrectionStatus,
} from "@/lib/results";

type Props = {
  termId: string;
  refreshKey?: number;
  role: "student" | "parent";
  studentProfileId?: string;
};

const STATUS_CLASS: Record<ScoreCorrectionStatus, string> = {
  OPEN: "stu-res__report-status--open",
  PROPOSED: "stu-res__report-status--proposed",
  APPROVED: "stu-res__report-status--approved",
  REJECTED: "stu-res__report-status--rejected",
};

const STATUS_I18N: Record<ScoreCorrectionStatus, string> = {
  OPEN: "resultsUi.statusWithTeacher",
  PROPOSED: "resultsUi.statusAwaitingApproval",
  APPROVED: "resultsUi.statusCorrected",
  REJECTED: "resultsUi.statusDeclined",
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

export function MyScoreReportsPanel({
  termId,
  refreshKey = 0,
  role,
  studentProfileId,
}: Props) {
  const { t } = useLocale();
  const [rows, setRows] = useState<ScoreCorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function scoreLine(row: ScoreCorrectionRequest) {
    const current =
      row.currentScore == null ? "—" : `${row.currentScore}/${row.maxScore}`;
    if (row.proposedScore == null) {
      return t("resultsUi.showingScore", { current });
    }
    return t("resultsUi.proposedScore", {
      current,
      proposed: row.proposedScore,
      max: row.maxScore,
    });
  }

  const loadKey = `${termId}:${refreshKey}`;
  const [prevLoadKey, setPrevLoadKey] = useState(loadKey);
  if (loadKey !== prevLoadKey) {
    setPrevLoadKey(loadKey);
    if (termId) {
      setLoading(true);
      setError("");
    }
  }

  useEffect(() => {
    if (!termId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await listScoreCorrections({ termId });
        if (cancelled) return;
        setRows(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("resultsUi.loadReportsFailed"));
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [termId, refreshKey, t]);

  const isLoading = Boolean(termId) && loading;

  const visibleRows = useMemo(() => {
    const loadedRows = termId ? rows : [];
    if (!studentProfileId) return loadedRows;
    return loadedRows.filter((row) => row.studentProfileId === studentProfileId);
  }, [termId, rows, studentProfileId]);

  const pendingCount = useMemo(
    () => visibleRows.filter((row) => row.status === "OPEN" || row.status === "PROPOSED").length,
    [visibleRows],
  );

  return (
    <section className="stu-res__panel stu-res__panel--reports" aria-label={t("resultsUi.reportsAria")}>
      <header className="stu-res__reports-head">
        <div>
          <p className="stu-res__eyebrow">{t("resultsUi.scoreReportsEyebrow")}</p>
          <h2 className="stu-res__reports-title">{t("resultsUi.myScoreReports")}</h2>
          <p className="stu-res__reports-sub">
            {role === "parent" ? t("resultsUi.scoreReportsSubParent") : t("resultsUi.scoreReportsSubStudent")}
          </p>
        </div>
        {!isLoading && pendingCount > 0 ? (
          <span className="stu-res__reports-pending">
            {t("resultsUi.inProgress", { count: pendingCount })}
          </span>
        ) : null}
      </header>

      {error ? <p className="stu-res__alert stu-res__alert--error">{error}</p> : null}

      {isLoading ? (
        <div className="stu-res__loading">
          <span className="stu-res__spinner" aria-hidden />
          <p>{t("resultsUi.loadingReports")}</p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="stu-res__empty stu-res__empty--reports">
          <h3>{t("resultsUi.noReports")}</h3>
          <p>
            {t("resultsUi.noReportsHintPrefix")}
            <strong>{t("resultsUi.noReportsHintBold")}</strong>
            {t("resultsUi.noReportsHintSuffix")}
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
                  <span className={`stu-res__report-status ${STATUS_CLASS[row.status]}`}>
                    {t(STATUS_I18N[row.status])}
                  </span>
                </div>
                <p className="stu-res__timeline-score stu-res__timeline-score--inline">{scoreLine(row)}</p>
                <p className="stu-res__timeline-meta">
                  {t("resultsUi.submittedOn", { date: formatDate(row.createdAt) })}
                  {row.reviewedAt && row.status !== "OPEN"
                    ? t("resultsUi.updatedOn", { date: formatDate(row.reviewedAt) })
                    : ""}
                </p>
                <p className="stu-res__report-message">{row.message}</p>
                {row.reviewNote && row.status !== "OPEN" ? (
                  <p className="stu-res__report-reply">
                    <strong>{t("resultsUi.schoolReply")}</strong> {row.reviewNote}
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