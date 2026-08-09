"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  classworkListPath,
  closeAssignment,
  getTeacherAssignment,
  listSubmissions,
  publishAssignment,
  type ClassworkAssignment,
  type ClassworkStatus,
  type ClassworkSubmission,
  type ClassworkType,
} from "@/lib/classwork";
import { openClassworkFile } from "@/lib/teacher-cards";
import { ClassworkSubmissionReview } from "@/components/classwork/classwork-submission-review";
import { AppToast } from "@/components/ui/app-toast";

type Props = {
  mode: ClassworkType;
  assignmentId: string;
};

const MODE_LABEL: Record<ClassworkType, string> = {
  WORKSHEET: "worksheet",
  ASSIGNMENT: "assignment",
};

function formatDue(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  return new Date(dueAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: ClassworkStatus }) {
  return (
    <span className={`cw-status cw-status--${status.toLowerCase()}`}>
      {status}
    </span>
  );
}

export function ClassworkSubmissionsPage({ mode, assignmentId }: Props) {
  const [assignment, setAssignment] = useState<ClassworkAssignment | null>(
    null,
  );
  const [submissions, setSubmissions] = useState<ClassworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const listPath = classworkListPath(mode);
  const singular = MODE_LABEL[mode];

  const load = useCallback(async () => {
    const [row, rows] = await Promise.all([
      getTeacherAssignment(assignmentId),
      listSubmissions(assignmentId),
    ]);
    if (row.type !== mode) {
      throw new Error(`This ${singular} was not found.`);
    }
    setAssignment(row);
    setSubmissions(rows);
  }, [assignmentId, mode, singular]);

  useEffect(() => {
    setLoading(true);
    setError("");
    void load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Load failed"),
      )
      .finally(() => setLoading(false));
  }, [load]);

  function retryLoad() {
    setError("");
    setLoading(true);
    void load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Load failed"),
      )
      .finally(() => setLoading(false));
  }

  async function onPublish() {
    if (!assignment) return;
    setBusy(true);
    setError("");
    try {
      await publishAssignment(assignment.id);
      setSaved("Published — students can see it now.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClose() {
    if (!assignment) return;
    setBusy(true);
    setError("");
    try {
      await closeAssignment(assignment.id);
      setSaved("Closed — no new submissions.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Close failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="cw-loading">
        <div className="cw-loading__spinner" aria-hidden />
        <p>Loading submissions…</p>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="cw-empty">
        <p className="cw-empty__title">Could not open this {singular}</p>
        <p className="cw-empty__sub">{error}</p>
        <Link href={listPath} className="cw-back">
          ← Back to {mode === "WORKSHEET" ? "worksheets" : "assignments"}
        </Link>
      </div>
    );
  }

  if (!assignment) return null;

  return (
    <div
      className={`cw-page cw-page--${mode === "ASSIGNMENT" ? "assignment" : "worksheet"} cw-page--review`}
    >
      <Link href={listPath} className="cw-back">
        ← Back to {mode === "WORKSHEET" ? "worksheets" : "assignments"}
      </Link>

      {error ? (
        <div className="cw-alert cw-alert--error cw-alert--row">
          <span>{error}</span>
          <button type="button" className="cw-btn cw-btn--ghost cw-btn--sm" onClick={retryLoad}>
            Retry
          </button>
        </div>
      ) : null}
      <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

      <section className="cw-card cw-detail cw-detail--modern">
        <header className="cw-detail__head cw-detail__head--modern">
          <div className="cw-detail__intro">
            <div className="cw-detail__title-row">
              <h1 className="cw-detail__title">{assignment.title}</h1>
              <StatusBadge status={assignment.status} />
            </div>
            <p className="cw-detail__class">{assignment.classLabel}</p>
            <div className="cw-detail__meta-row">
              {assignment.dueAt ? (
                <span className="cw-detail__due">
                  Due {formatDue(assignment.dueAt)}
                </span>
              ) : (
                <span className="cw-detail__due cw-detail__due--none">
                  No due date
                </span>
              )}
              <span className="cw-detail__points">
                Graded out of {assignment.maxScore}
              </span>
            </div>
          </div>
          <div className="cw-actions">
            {assignment.status === "DRAFT" ? (
              <button
                type="button"
                className="cw-btn cw-btn--primary"
                disabled={busy}
                onClick={() => void onPublish()}
              >
                Publish to students
              </button>
            ) : null}
            {assignment.status === "PUBLISHED" ? (
              <button
                type="button"
                className="cw-btn cw-btn--ghost"
                disabled={busy}
                onClick={() => void onClose()}
              >
                Close submissions
              </button>
            ) : null}
            {assignment.fileUrl ? (
              <button
                type="button"
                className="cw-btn cw-btn--ghost"
                onClick={() => void openClassworkFile(assignment.fileUrl!)}
              >
                Open attachment
              </button>
            ) : null}
          </div>
        </header>

        {assignment.description ? (
          <p className="cw-detail__desc">{assignment.description}</p>
        ) : null}

        <ClassworkSubmissionReview
          assignment={assignment}
          submissions={submissions}
          mode={mode}
          onGraded={() => void load()}
        />
      </section>
    </div>
  );
}
