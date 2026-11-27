"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveScoreCorrection,
  listScoreCorrections,
  proposeScoreCorrection,
  rejectScoreCorrection,
  type AcademicTerm,
  type ScoreCorrectionRequest,
  type ScoreCorrectionStatus,
} from "@/lib/results";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { subjectCompactLabel } from "@/lib/subject-label";

type Mode = "teacher" | "admin";

type Props = {
  mode: Mode;
  terms?: AcademicTerm[];
  defaultTermId?: string;
  onCountChange?: (count: number) => void;
  onError?: (message: string) => void;
};

function statusLabel(
  status: ScoreCorrectionStatus,
  t: (key: string) => string,
) {
  const map: Record<ScoreCorrectionStatus, string> = {
    OPEN: t("scoreCorrectionsUi.statusOpen"),
    PROPOSED: t("scoreCorrectionsUi.statusProposed"),
    APPROVED: t("scoreCorrectionsUi.statusApproved"),
    REJECTED: t("scoreCorrectionsUi.statusRejected"),
  };
  return map[status];
}

export function ScoreCorrectionsPanel({
  mode,
  terms = [],
  defaultTermId,
  onCountChange,
  onError,
}: Props) {
  const { t } = useLocale();
  const [termIdState, setTermId] = useState(defaultTermId ?? "");
  const termId = termIdState || defaultTermId || "";
  const [statusFilter, setStatusFilter] = useState<ScoreCorrectionStatus | "">(
    mode === "admin" ? "PROPOSED" : "",
  );
  const [rows, setRows] = useState<ScoreCorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [proposedScore, setProposedScore] = useState("");
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listScoreCorrections({
        ...(termId ? { termId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setRows(data);
      const pending =
        mode === "admin"
          ? data.filter((r) => r.status === "PROPOSED").length
          : data.filter((r) => r.status === "OPEN" || r.status === "PROPOSED")
              .length;
      onCountChange?.(pending);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("scoreCorrectionsUi.loadFailed");
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [termId, statusFilter, mode, onCountChange, onError, t]);

  const loadKey = `${termId}|${statusFilter}`;
  const [prevLoadKey, setPrevLoadKey] = useState(loadKey);
  if (loadKey !== prevLoadKey) {
    setPrevLoadKey(loadKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listScoreCorrections({
          ...(termId ? { termId } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        if (cancelled) return;
        setRows(data);
        const pending =
          mode === "admin"
            ? data.filter((r) => r.status === "PROPOSED").length
            : data.filter((r) => r.status === "OPEN" || r.status === "PROPOSED")
                .length;
        onCountChange?.(pending);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : t("scoreCorrectionsUi.loadFailed");
        setError(msg);
        onError?.(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [termId, statusFilter, mode, onCountChange, onError, t]);

  const active = useMemo(
    () => rows.find((r) => r.id === activeId) ?? null,
    [rows, activeId],
  );

  const queueStats = useMemo(() => {
    const open = rows.filter((r) => r.status === "OPEN").length;
    const proposed = rows.filter((r) => r.status === "PROPOSED").length;
    const closed = rows.filter(
      (r) => r.status === "APPROVED" || r.status === "REJECTED",
    ).length;
    const actionNeeded =
      mode === "admin"
        ? proposed
        : open + proposed;
    return { open, proposed, closed, actionNeeded, total: rows.length };
  }, [rows, mode]);

  const selectedTerm = useMemo(
    () => terms.find((t) => t.id === termId) ?? null,
    [terms, termId],
  );

  function openRow(row: ScoreCorrectionRequest) {
    setActiveId(row.id);
    setProposedScore(
      row.proposedScore != null
        ? String(row.proposedScore)
        : row.currentScore != null
          ? String(row.currentScore)
          : "",
    );
    setNote(row.reviewNote ?? "");
    setFlash("");
  }

  async function submitPropose() {
    if (!active) return;
    const score = Number(proposedScore);
    if (!Number.isFinite(score) || score < 0) {
      setError(t("scoreCorrectionsUi.invalidScore"));
      return;
    }
    setBusyId(active.id);
    setError("");
    try {
      await proposeScoreCorrection(active.id, {
        proposedScore: Math.round(score),
        ...(note.trim() ? { replyNote: note.trim() } : {}),
      });
      setFlash(t("scoreCorrectionsUi.proposedSent"));
      setActiveId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scoreCorrectionsUi.proposeFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function submitReview(action: "approve" | "reject") {
    if (!active) return;
    setBusyId(active.id);
    setError("");
    try {
      if (action === "approve") {
        await approveScoreCorrection(active.id, {
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
        });
        setFlash(t("scoreCorrectionsUi.approvedFlash"));
      } else {
        await rejectScoreCorrection(active.id, {
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
        });
        setFlash(t("scoreCorrectionsUi.rejectedFlash"));
      }
      setActiveId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scoreCorrectionsUi.reviewFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      className={`res-approvals res-approvals--queue res-score-reports${
        mode === "teacher" ? " res-score-reports--teacher" : ""
      }`}
    >
      <div className="res-scores-head res-scores-head--modern res-score-reports__head">
        <div className="res-scores-context res-scores-context--hero">
          <div className="res-scores-context__main">
            <div className="res-scores-context__brand">
              <span className="res-scores-context__chip">
                {mode === "admin"
                  ? t("scoreCorrectionsUi.chipAdmin")
                  : t("scoreCorrectionsUi.chipTeacher")}
              </span>
            </div>
            <h2 className="res-scores-context__title">
              {mode === "admin"
                ? t("scoreCorrectionsUi.titleAdmin")
                : t("scoreCorrectionsUi.titleTeacher")}
            </h2>
            <p className="res-scores-context__meta">
              {selectedTerm?.name ??
                (termId
                  ? t("scoreCorrectionsUi.metaSelectedTerm")
                  : t("scoreCorrectionsUi.metaAllTerms"))}
              {mode === "admin"
                ? t("scoreCorrectionsUi.metaAdmin")
                : t("scoreCorrectionsUi.metaTeacher")}
            </p>
          </div>
          <div
            className="res-scores-context__metrics"
            aria-label={t("scoreCorrectionsUi.queueAria")}
          >
            <div className="res-metric-pill">
              <strong>{loading ? "…" : queueStats.total}</strong>
              <span>{t("scoreCorrectionsUi.total")}</span>
            </div>
            {mode === "teacher" ? (
              <div className="res-metric-pill">
                <strong>{loading ? "…" : queueStats.open}</strong>
                <span>{t("scoreCorrectionsUi.awaitingYou")}</span>
              </div>
            ) : (
              <div className="res-metric-pill">
                <strong>{loading ? "…" : queueStats.proposed}</strong>
                <span>{t("scoreCorrectionsUi.toReview")}</span>
              </div>
            )}
            <div className="res-metric-pill res-metric-pill--accent">
              <strong>{loading ? "…" : queueStats.actionNeeded}</strong>
              <span>{t("scoreCorrectionsUi.action")}</span>
            </div>
          </div>
        </div>

        <div className="res-approvals__toolbar res-score-reports__toolbar">
        {terms.length > 0 ? (
          <label className="res-approvals__filter">
            <span>{t("scoreCorrectionsUi.term")}</span>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            >
              <option value="">{t("scoreCorrectionsUi.allTerms")}</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="res-approvals__filter">
          <span>{t("scoreCorrectionsUi.status")}</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                (e.target.value || "") as ScoreCorrectionStatus | "",
              )
            }
          >
            <option value="">{t("scoreCorrectionsUi.filterAll")}</option>
            <option value="OPEN">{t("scoreCorrectionsUi.statusOpen")}</option>
            <option value="PROPOSED">{t("scoreCorrectionsUi.statusProposed")}</option>
            <option value="APPROVED">{t("scoreCorrectionsUi.statusApproved")}</option>
            <option value="REJECTED">{t("scoreCorrectionsUi.statusRejected")}</option>
          </select>
        </label>
        </div>
      </div>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      {flash ? <p className="res-approvals__flash">{flash}</p> : null}

      <div className="res-approvals__table-wrap res-score-reports__table-wrap">
        <table className="res-approvals__table">
          <thead>
            <tr>
              <th>{t("scoreCorrectionsUi.colStudent")}</th>
              <th>{t("scoreCorrectionsUi.colSubject")}</th>
              <th>{t("scoreCorrectionsUi.colScores")}</th>
              <th>{t("scoreCorrectionsUi.colStatus")}</th>
              <th className="res-approvals__actions-col">
                {t("scoreCorrectionsUi.colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="res-approvals__empty">
                  {t("scoreCorrectionsUi.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="res-approvals__empty">
                  {mode === "admin"
                    ? t("scoreCorrectionsUi.emptyAdmin")
                    : t("scoreCorrectionsUi.emptyTeacher")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.studentName}</strong>
                    <div className="res-approvals__meta">
                      {row.classLabel}
                      {row.studentExternalRef
                        ? ` · ${row.studentExternalRef}`
                        : ""}
                    </div>
                  </td>
                  <td>
                    <strong title={row.subjectName}>
                      {subjectCompactLabel({ name: row.subjectName })}
                    </strong>
                    <div className="res-approvals__meta">
                      {row.assessmentName} · {row.termName}
                    </div>
                    <div className="res-approvals__meta">{row.message}</div>
                  </td>
                  <td>
                    <div>
                      {t("scoreCorrectionsUi.current")}{" "}
                      <strong>
                        {row.currentScore == null ? "—" : row.currentScore}/
                        {row.maxScore}
                      </strong>
                    </div>
                    <div className="res-approvals__meta">
                      {t("scoreCorrectionsUi.proposed")}{" "}
                      {row.proposedScore == null
                        ? "—"
                        : `${row.proposedScore}/${row.maxScore}`}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`res-scores-workflow-pill res-scores-workflow-pill--${
                        row.status === "APPROVED"
                          ? "published"
                          : row.status === "REJECTED"
                            ? "draft"
                            : "draft"
                      }`}
                    >
                      {statusLabel(row.status, t)}
                    </span>
                  </td>
                  <td className="res-approvals__actions-col">
                    <button
                      type="button"
                      className="res-approvals__btn res-approvals__btn--sm res-approvals__btn--primary"
                      onClick={() => openRow(row)}
                    >
                      {mode === "teacher" && row.status === "OPEN"
                        ? t("scoreCorrectionsUi.btnPropose")
                        : mode === "admin" && row.status === "PROPOSED"
                          ? t("scoreCorrectionsUi.btnReview")
                          : t("scoreCorrectionsUi.btnView")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {active ? (
        <div className="res-correction-drawer" role="dialog" aria-modal="true">
          <div className="res-correction-drawer__panel">
            <header className="res-correction-drawer__head">
              <div>
                <h3>
                  {subjectCompactLabel({ name: active.subjectName })} —{" "}
                  {active.assessmentName}
                </h3>
                <p>
                  {t("scoreCorrectionsUi.reportedBy", {
                    student: active.studentName,
                    name: active.reportedByName,
                  })}
                </p>
              </div>
              <button
                type="button"
                className="res-approvals__btn res-approvals__btn--sm"
                onClick={() => setActiveId(null)}
              >
                {t("scoreCorrectionsUi.close")}
              </button>
            </header>
            <p className="res-correction-drawer__msg">{active.message}</p>
            <dl className="res-correction-drawer__stats">
              <div>
                <dt>{t("scoreCorrectionsUi.currentPublished")}</dt>
                <dd>
                  {active.currentScore == null ? "—" : active.currentScore}/
                  {active.maxScore}
                </dd>
              </div>
              <div>
                <dt>{t("scoreCorrectionsUi.status")}</dt>
                <dd>{statusLabel(active.status, t)}</dd>
              </div>
            </dl>

            {mode === "teacher" && active.status === "OPEN" ? (
              <>
                <label className="res-correction-drawer__field">
                  <span>{t("scoreCorrectionsUi.proposedScore")}</span>
                  <input
                    type="number"
                    min={0}
                    max={active.maxScore}
                    value={proposedScore}
                    onChange={(e) => setProposedScore(e.target.value)}
                  />
                </label>
                <label className="res-correction-drawer__field">
                  <span>{t("scoreCorrectionsUi.noteToAdmin")}</span>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <div className="res-correction-drawer__actions">
                  <button
                    type="button"
                    className="res-approvals__btn res-approvals__btn--primary"
                    disabled={busyId === active.id}
                    onClick={() => void submitPropose()}
                  >
                    {busyId === active.id
                      ? t("scoreCorrectionsUi.sending")
                      : t("scoreCorrectionsUi.sendForApproval")}
                  </button>
                </div>
              </>
            ) : null}

            {mode === "admin" && active.status === "PROPOSED" ? (
              <>
                <p className="res-correction-drawer__proposed">
                  {t("scoreCorrectionsUi.teacherProposes")}{" "}
                  <strong>
                    {active.proposedScore}/{active.maxScore}
                  </strong>
                </p>
                <label className="res-correction-drawer__field">
                  <span>{t("scoreCorrectionsUi.reviewNote")}</span>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <div className="res-correction-drawer__actions">
                  <button
                    type="button"
                    className="res-approvals__btn res-approvals__btn--primary"
                    disabled={busyId === active.id}
                    onClick={() => void submitReview("approve")}
                  >
                    {busyId === active.id
                      ? t("scoreCorrectionsUi.working")
                      : t("scoreCorrectionsUi.approveUpdate")}
                  </button>
                  <button
                    type="button"
                    className="res-approvals__btn"
                    disabled={busyId === active.id}
                    onClick={() => void submitReview("reject")}
                  >
                    {t("scoreCorrectionsUi.reject")}
                  </button>
                </div>
              </>
            ) : null}

            {active.status === "APPROVED" ||
            active.status === "REJECTED" ||
            (mode === "teacher" && active.status === "PROPOSED") ||
            (mode === "admin" && active.status === "OPEN") ? (
              <p className="res-correction-drawer__hint">
                {active.reviewNote
                  ? t("scoreCorrectionsUi.notePrefix", { note: active.reviewNote })
                  : t("scoreCorrectionsUi.noFurtherAction")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
