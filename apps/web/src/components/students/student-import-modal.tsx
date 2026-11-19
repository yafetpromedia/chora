"use client";

import { useEffect, useRef, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import type { ImportStudentsResult } from "@/lib/api";
import {
  downloadStudentsImportTemplate,
  importStudentsCsv,
} from "@/lib/school-setup";

type Phase = "idle" | "uploading" | "done" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (result: ImportStudentsResult) => void;
};

function estimateRows(file: File): Promise<number> {
  return file.text().then((text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return Math.max(0, lines.length - 1);
  });
}

export function StudentImportModal({ open, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rowEstimate, setRowEstimate] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Choose a CSV file to begin.");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportStudentsResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFile(null);
      setRowEstimate(null);
      setPhase("idle");
      setProgress(0);
      setStatus("Choose a CSV file to begin.");
      setError("");
      setResult(null);
      setDragOver(false);
    }
  }

  useEffect(() => {
    if (phase !== "uploading") return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 88) return p;
        return p + Math.max(1, Math.round((90 - p) * 0.08));
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [phase]);

  async function pickFile(next: File | null) {
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    setError("");
    setResult(null);
    setPhase("idle");
    setProgress(0);
    setFile(next);
    setStatus(`Ready to import “${next.name}”.`);
    try {
      const rows = await estimateRows(next);
      setRowEstimate(rows);
      setStatus(
        rows > 0
          ? `Ready to import ${rows} student row${rows === 1 ? "" : "s"} from “${next.name}”.`
          : `Ready to import “${next.name}”.`,
      );
    } catch {
      setRowEstimate(null);
    }
  }

  async function startImport() {
    if (!file || phase === "uploading") return;
    setPhase("uploading");
    setProgress(8);
    setError("");
    setResult(null);
    setStatus(
      rowEstimate
        ? `Importing ${rowEstimate} student${rowEstimate === 1 ? "" : "s"}…`
        : "Uploading and importing students…",
    );

    try {
      const imported = await importStudentsCsv(file);
      setProgress(100);
      setResult(imported);
      setPhase("done");
      const created = imported.created ?? 0;
      const updated = imported.updated ?? 0;
      const skipped = imported.skipped ?? 0;
      setStatus(
        [
          created > 0 ? `${created} created` : null,
          updated > 0 ? `${updated} updated` : null,
          skipped > 0 ? `${skipped} skipped` : null,
          imported.failed > 0 ? `${imported.failed} failed` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Import finished.",
      );
      onImported(imported);
    } catch (err) {
      setPhase("error");
      setProgress(0);
      setError(err instanceof Error ? err.message : "Import failed");
      setStatus("Import stopped. Fix the file and try again.");
    }
  }

  if (!open) return null;

  const canImport = Boolean(file) && phase !== "uploading";
  const failedRows = result?.results.filter((r) => !r.ok) ?? [];
  const failedPreview = failedRows.slice(0, 8);
  const errorSummary = (() => {
    if (!failedRows.length) return null;
    const counts = new Map<string, number>();
    for (const row of failedRows) {
      const key = row.error?.trim() || "Failed";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  })();

  return (
    <>
      <button
        type="button"
        className="stu-drawer-backdrop"
        aria-label="Close import"
        onClick={() => {
          if (phase === "uploading") return;
          onClose();
        }}
      />
      <div
        className="stu-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stu-import-title"
      >
        <header className="stu-import-modal__head">
          <div>
            <p className="stu-import-modal__eyebrow">Bulk enroll</p>
            <h2 id="stu-import-title" className="stu-import-modal__title">
              Import students
            </h2>
            <p className="stu-import-modal__sub">
              Upload a CSV to add or update learners. Existing students are
              matched by FAN, student ID, ID number, or name + DOB/phone +
              grade — then updated instead of failing.
            </p>
          </div>
          <button
            type="button"
            className="stu-drawer__close"
            disabled={phase === "uploading"}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="stu-import-modal__body">
          <div className="stu-import-modal__steps">
            <button
              type="button"
              className="stu-import-modal__template"
              onClick={() => downloadStudentsImportTemplate()}
            >
              <DashIcon name="library" className="dash-icon--sm" />
              Download CSV template
            </button>
          </div>

          <label
            className={`stu-import-modal__drop${
              dragOver ? " stu-import-modal__drop--over" : ""
            }${file ? " stu-import-modal__drop--ready" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              disabled={phase === "uploading"}
              onChange={(e) => {
                void pickFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <span className="stu-import-modal__drop-icon" aria-hidden>
              <DashIcon name="students" className="dash-icon--md" />
            </span>
            <strong>
              {file ? file.name : "Drop CSV here or browse"}
            </strong>
            <span>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB${
                    rowEstimate != null ? ` · ~${rowEstimate} rows` : ""
                  }`
                : "Accepted format: .csv"}
            </span>
            {!file ? (
              <span className="stu-import-modal__browse">Browse files</span>
            ) : null}
          </label>

          <div className="stu-import-modal__progress-block">
            <div className="stu-import-modal__progress-meta">
              <span>{status}</span>
              <strong>
                {phase === "uploading" || phase === "done" ? `${progress}%` : ""}
              </strong>
            </div>
            <div
              className="stu-import-modal__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Import progress"
            >
              <div
                className={`stu-import-modal__fill${
                  phase === "uploading" ? " stu-import-modal__fill--pulse" : ""
                }${phase === "done" ? " stu-import-modal__fill--done" : ""}${
                  phase === "error" ? " stu-import-modal__fill--error" : ""
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {error ? (
            <p className="stu-import-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="stu-import-modal__result">
              <div className="stu-import-modal__result-stats stu-import-modal__result-stats--wide">
                <div>
                  <strong>{result.created ?? 0}</strong>
                  <span>Created</span>
                </div>
                <div>
                  <strong>{result.updated ?? 0}</strong>
                  <span>Updated</span>
                </div>
                <div>
                  <strong>{result.skipped ?? 0}</strong>
                  <span>Skipped</span>
                </div>
                <div>
                  <strong>{result.failed}</strong>
                  <span>Failed</span>
                </div>
              </div>
              {errorSummary && errorSummary.length > 0 ? (
                <ul className="stu-import-modal__errors">
                  {errorSummary.map(([msg, count]) => (
                    <li key={msg}>
                      {count} row{count === 1 ? "" : "s"}: {msg}
                    </li>
                  ))}
                  {failedPreview.length > 0 ? (
                    <li className="stu-import-modal__errors-sample">
                      Examples:{" "}
                      {failedPreview
                        .map(
                          (r) =>
                            `row ${r.row}${
                              r.studentName ? ` (${r.studentName})` : ""
                            }`,
                        )
                        .join(", ")}
                      {failedRows.length > failedPreview.length
                        ? ` +${failedRows.length - failedPreview.length} more`
                        : ""}
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="stu-import-modal__foot">
          <button
            type="button"
            className="stu-v2__btn stu-v2__btn--ghost"
            disabled={phase === "uploading"}
            onClick={onClose}
          >
            {phase === "done" ? "Close" : "Cancel"}
          </button>
          {phase === "done" ? (
            <button
              type="button"
              className="stu-v2__btn stu-v2__btn--ghost"
              onClick={() => {
                setFile(null);
                setRowEstimate(null);
                setPhase("idle");
                setProgress(0);
                setResult(null);
                setStatus("Choose a CSV file to begin.");
                inputRef.current?.click();
              }}
            >
              Import another
            </button>
          ) : (
            <button
              type="button"
              className="stu-v2__btn stu-v2__btn--primary"
              disabled={!canImport}
              onClick={() => void startImport()}
            >
              {phase === "uploading" ? "Importing…" : "Start import"}
            </button>
          )}
        </footer>
      </div>
    </>
  );
}
