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
import { AppToast } from "@/components/ui/app-toast";

type Mode = "teacher" | "admin";

type Props = {
  mode: Mode;
  terms?: AcademicTerm[];
  defaultTermId?: string;
  onCountChange?: (count: number) => void;
  onError?: (message: string) => void;
};

const STATUS_LABEL: Record<ScoreCorrectionStatus, string> = {
  OPEN: "Awaiting teacher",
  PROPOSED: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function ScoreCorrectionsPanel({
  mode,
  terms = [],
  defaultTermId,
  onCountChange,
  onError,
}: Props) {
  const [termId, setTermId] = useState(defaultTermId ?? "");
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
        err instanceof Error ? err.message : "Could not load score reports";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [termId, statusFilter, mode, onCountChange, onError]);

  useEffect(() => {
    if (defaultTermId && !termId) setTermId(defaultTermId);
  }, [defaultTermId, termId]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(
    () => rows.find((r) => r.id === activeId) ?? null,
    [rows, activeId],
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
      setError("Enter a valid proposed score");
      return;
    }
    setBusyId(active.id);
    setError("");
    try {
      await proposeScoreCorrection(active.id, {
        proposedScore: Math.round(score),
        ...(note.trim() ? { replyNote: note.trim() } : {}),
      });
      setFlash("Proposed score sent for admin approval");
      setActiveId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not propose score");
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
        setFlash("Correction approved — published score updated");
      } else {
        await rejectScoreCorrection(active.id, {
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
        });
        setFlash("Correction rejected — published score unchanged");
      }
      setActiveId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete review");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="res-approvals res-approvals--queue">
      <div className="res-approvals__banner">
        <div className="res-approvals__banner-icon" aria-hidden>
          ✓
        </div>
        <div className="res-approvals__banner-copy">
          <h2 className="res-approvals__title">
            {mode === "admin" ? "Score correction approvals" : "Score reports"}
          </h2>
          <p className="res-approvals__sub">
            {mode === "admin"
              ? "Teachers propose a corrected mark after a family report. Approve to update the published score without reopening the whole sheet."
              : "Families can flag a published mark. Propose a corrected score — admin must approve before it goes live."}
          </p>
        </div>
        <span className="res-approvals__count">{loading ? "…" : rows.length}</span>
      </div>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      {flash ? <p className="res-approvals__flash">{flash}</p> : null}

      <div className="res-approvals__toolbar">
        {terms.length > 0 ? (
          <label className="res-approvals__filter">
            <span>Term</span>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            >
              <option value="">All terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="res-approvals__filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                (e.target.value || "") as ScoreCorrectionStatus | "",
              )
            }
          >
            <option value="">All open & closed</option>
            <option value="OPEN">Awaiting teacher</option>
            <option value="PROPOSED">Awaiting approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>

      <div className="res-approvals__table-wrap">
        <table className="res-approvals__table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Subject / component</th>
              <th>Scores</th>
              <th>Status</th>
              <th className="res-approvals__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="res-approvals__empty">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="res-approvals__empty">
                  {mode === "admin"
                    ? "No corrections waiting in this filter."
                    : "No score reports yet."}
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
                    <strong>{row.subjectName}</strong>
                    <div className="res-approvals__meta">
                      {row.assessmentName} · {row.termName}
                    </div>
                    <div className="res-approvals__meta">{row.message}</div>
                  </td>
                  <td>
                    <div>
                      Current:{" "}
                      <strong>
                        {row.currentScore == null ? "—" : row.currentScore}/
                        {row.maxScore}
                      </strong>
                    </div>
                    <div className="res-approvals__meta">
                      Proposed:{" "}
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
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="res-approvals__actions-col">
                    <button
                      type="button"
                      className="res-approvals__btn res-approvals__btn--sm res-approvals__btn--primary"
                      onClick={() => openRow(row)}
                    >
                      {mode === "teacher" && row.status === "OPEN"
                        ? "Propose"
                        : mode === "admin" && row.status === "PROPOSED"
                          ? "Review"
                          : "View"}
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
                <h3>{active.subjectName} — {active.assessmentName}</h3>
                <p>
                  {active.studentName} · reported by {active.reportedByName}
                </p>
              </div>
              <button
                type="button"
                className="res-approvals__btn res-approvals__btn--sm"
                onClick={() => setActiveId(null)}
              >
                Close
              </button>
            </header>
            <p className="res-correction-drawer__msg">{active.message}</p>
            <dl className="res-correction-drawer__stats">
              <div>
                <dt>Current published</dt>
                <dd>
                  {active.currentScore == null ? "—" : active.currentScore}/
                  {active.maxScore}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{STATUS_LABEL[active.status]}</dd>
              </div>
            </dl>

            {mode === "teacher" && active.status === "OPEN" ? (
              <>
                <label className="res-correction-drawer__field">
                  <span>Proposed score</span>
                  <input
                    type="number"
                    min={0}
                    max={active.maxScore}
                    value={proposedScore}
                    onChange={(e) => setProposedScore(e.target.value)}
                  />
                </label>
                <label className="res-correction-drawer__field">
                  <span>Note to admin (optional)</span>
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
                    {busyId === active.id ? "Sending…" : "Send for approval"}
                  </button>
                </div>
              </>
            ) : null}

            {mode === "admin" && active.status === "PROPOSED" ? (
              <>
                <p className="res-correction-drawer__proposed">
                  Teacher proposes{" "}
                  <strong>
                    {active.proposedScore}/{active.maxScore}
                  </strong>
                </p>
                <label className="res-correction-drawer__field">
                  <span>Review note (optional)</span>
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
                    {busyId === active.id ? "Working…" : "Approve & update score"}
                  </button>
                  <button
                    type="button"
                    className="res-approvals__btn"
                    disabled={busyId === active.id}
                    onClick={() => void submitReview("reject")}
                  >
                    Reject
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
                  ? `Note: ${active.reviewNote}`
                  : "No further action on this item for your role."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
