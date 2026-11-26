"use client";

import { useEffect, useRef, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rowEstimate, setRowEstimate] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
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
      setStatus(t("studentImportUi.chooseCsv"));
      setError("");
      setResult(null);
      setDragOver(false);
    }
  }

  useEffect(() => {
    if (status === "" && open) {
      setStatus(t("studentImportUi.chooseCsv"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status]);

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
      setError(t("studentImportUi.csvOnly"));
      return;
    }
    setError("");
    setResult(null);
    setPhase("idle");
    setProgress(0);
    setFile(next);
    setStatus(t("studentImportUi.readyFile", { name: next.name }));
    try {
      const rows = await estimateRows(next);
      setRowEstimate(rows);
      setStatus(
        rows > 0
          ? t(rows === 1 ? "studentImportUi.readyRows" : "studentImportUi.readyRowsPlural", {
              count: rows,
              name: next.name,
            })
          : t("studentImportUi.readyFile", { name: next.name }),
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
        ? t(rowEstimate === 1 ? "studentImportUi.importing" : "studentImportUi.importingPlural", {
            count: rowEstimate,
          })
        : t("studentImportUi.uploading"),
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
          created > 0 ? t("studentImportUi.statCreated", { count: created }) : null,
          updated > 0 ? t("studentImportUi.statUpdated", { count: updated }) : null,
          skipped > 0 ? t("studentImportUi.statSkipped", { count: skipped }) : null,
          imported.failed > 0
            ? t("studentImportUi.statFailed", { count: imported.failed })
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || t("studentImportUi.importFinished"),
      );
      onImported(imported);
    } catch (err) {
      setPhase("error");
      setProgress(0);
      setError(err instanceof Error ? err.message : t("studentImportUi.importFailed"));
      setStatus(t("studentImportUi.importStopped"));
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
      const key = row.error?.trim() || t("studentImportUi.failedDefault");
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
        aria-label={t("studentImportUi.closeImport")}
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
            <p className="stu-import-modal__eyebrow">{t("studentImportUi.eyebrow")}</p>
            <h2 id="stu-import-title" className="stu-import-modal__title">
              {t("studentImportUi.title")}
            </h2>
            <p className="stu-import-modal__sub">{t("studentImportUi.sub")}</p>
          </div>
          <button
            type="button"
            className="stu-drawer__close"
            disabled={phase === "uploading"}
            onClick={onClose}
            aria-label={t("common.close")}
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
              {t("studentImportUi.downloadTemplate")}
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
            <strong>{file ? file.name : t("studentImportUi.dropOrBrowse")}</strong>
            <span>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB${
                    rowEstimate != null
                      ? ` · ${t("studentImportUi.rowsEstimate", { count: rowEstimate })}`
                      : ""
                  }`
                : t("studentImportUi.acceptedCsv")}
            </span>
            {!file ? (
              <span className="stu-import-modal__browse">{t("studentImportUi.browseFiles")}</span>
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
              aria-label={t("studentImportUi.progressAria")}
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
                  <span>{t("studentImportUi.created")}</span>
                </div>
                <div>
                  <strong>{result.updated ?? 0}</strong>
                  <span>{t("studentImportUi.updated")}</span>
                </div>
                <div>
                  <strong>{result.skipped ?? 0}</strong>
                  <span>{t("studentImportUi.skipped")}</span>
                </div>
                <div>
                  <strong>{result.failed}</strong>
                  <span>{t("studentImportUi.failed")}</span>
                </div>
              </div>
              {errorSummary && errorSummary.length > 0 ? (
                <ul className="stu-import-modal__errors">
                  {errorSummary.map(([msg, count]) => (
                    <li key={msg}>
                      {t(count === 1 ? "studentImportUi.rowErrors" : "studentImportUi.rowErrorsPlural", {
                        count,
                        msg,
                      })}
                    </li>
                  ))}
                  {failedPreview.length > 0 ? (
                    <li className="stu-import-modal__errors-sample">
                      {t("studentImportUi.examples")}{" "}
                      {failedPreview
                        .map(
                          (r) =>
                            `${t("studentImportUi.rowLabel", { row: r.row })}${
                              r.studentName ? ` (${r.studentName})` : ""
                            }`,
                        )
                        .join(", ")}
                      {failedRows.length > failedPreview.length
                        ? ` ${t("studentImportUi.moreFailed", {
                            count: failedRows.length - failedPreview.length,
                          })}`
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
            {phase === "done" ? t("common.close") : t("common.cancel")}
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
                setStatus(t("studentImportUi.chooseCsv"));
                inputRef.current?.click();
              }}
            >
              {t("studentImportUi.importAnother")}
            </button>
          ) : (
            <button
              type="button"
              className="stu-v2__btn stu-v2__btn--primary"
              disabled={!canImport}
              onClick={() => void startImport()}
            >
              {phase === "uploading" ? t("studentImportUi.importingBtn") : t("studentImportUi.startImport")}
            </button>
          )}
        </footer>
      </div>
    </>
  );
}