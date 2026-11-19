"use client";

import { useEffect, useMemo, useState } from "react";
import type { GradeWithSections } from "@/lib/api";
import {
  BULK_PRINT_BATCH_SIZE,
  BULK_PRINT_WARN_ALL,
  openBulkIdCardPrint,
  printStudentIdCard,
  type BulkPrintLayout,
  type IdCardPrintStyle,
} from "@/lib/student-card-print";
import { countStudentIdCards, listStudentIdCards } from "@/lib/student-cards";

type Props = {
  open: boolean;
  onClose: () => void;
  grades: GradeWithSections[];
  initialGradeId?: string;
  initialSectionId?: string;
};

export function StudentIdCardPrintDialog({
  open,
  onClose,
  grades,
  initialGradeId = "",
  initialSectionId = "",
}: Props) {
  const [gradeId, setGradeId] = useState(initialGradeId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [style, setStyle] = useState<IdCardPrintStyle>("full");
  const [duplex, setDuplex] = useState(true);
  const [perPage, setPerPage] = useState<BulkPrintLayout>("6");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(open);

  const selectedGrade = grades.find((g) => g.id === gradeId);

  const initialKey = open ? `${initialGradeId}|${initialSectionId}` : "";
  const [prevInitialKey, setPrevInitialKey] = useState(initialKey);
  if (initialKey !== prevInitialKey) {
    setPrevInitialKey(initialKey);
    if (open) {
      setGradeId(initialGradeId);
      setSectionId(initialSectionId);
    }
  }

  const countKey = open ? `${gradeId}|${sectionId}` : "";
  const [prevCountKey, setPrevCountKey] = useState(countKey);
  if (countKey !== prevCountKey) {
    setPrevCountKey(countKey);
    if (open) setCountLoading(true);
  }

  useEffect(() => {
    if (!open) return;
    void countStudentIdCards({
      gradeId: gradeId || undefined,
      sectionId: sectionId || undefined,
    })
      .then((r) => {
        setCount(r.count);
        setStyle(r.count > 60 ? "sheet" : "full");
      })
      .catch(() => setCount(null))
      .finally(() => setCountLoading(false));
  }, [open, gradeId, sectionId]);

  const batchCount = useMemo(() => {
    if (count == null || count === 0) return 0;
    return Math.ceil(count / BULK_PRINT_BATCH_SIZE);
  }, [count]);

  if (!open) return null;

  const needsGrade = count != null && count > BULK_PRINT_WARN_ALL && !gradeId;

  async function startPrint(all: boolean) {
    if (needsGrade || !count) return;

    if (count === 1) {
      const [one] = await listStudentIdCards({
        gradeId: gradeId || undefined,
        sectionId: sectionId || undefined,
        take: 1,
      });
      if (one) {
        printStudentIdCard({ studentProfileId: one.studentProfileId, duplex });
        onClose();
        return;
      }
    }

    openBulkIdCardPrint({
      gradeId: gradeId || undefined,
      sectionId: sectionId || undefined,
      duplex,
      style,
      perPage,
      all,
      batchSize: BULK_PRINT_BATCH_SIZE,
      batch: 0,
    });
    onClose();
  }

  return (
    <>
      <button type="button" className="sid-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="sid-print-dialog" role="dialog" aria-labelledby="sid-print-dialog-title">
        <header className="sid-print-dialog__head">
          <h2 id="sid-print-dialog-title">Print ID cards</h2>
          <p>Choose who to print — works for large schools (2,000+ students in batches).</p>
          <button type="button" className="sid-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="sid-print-dialog__body">
          <div className="sid-print-dialog__filters">
            <div className="att-field">
              <span>Grade</span>
              <select
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setSectionId("");
                }}
              >
                <option value="">All grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedGrade && selectedGrade.sections.length > 0 ? (
              <div className="att-field">
                <span>Section</span>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                  <option value="">All sections in grade</option>
                  {selectedGrade.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="att-field">
              <span>Print style</span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as IdCardPrintStyle)}
              >
                <option value="full">Full card (matches preview)</option>
                <option value="sheet">Mini sheets (6–8 per page, large schools)</option>
              </select>
            </div>
            {style === "sheet" ? (
              <div className="att-field">
                <span>Cards per page</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(e.target.value as BulkPrintLayout)}
                >
                  <option value="6">6 per page</option>
                  <option value="8">8 per page</option>
                </select>
              </div>
            ) : null}
          </div>

          <label className="sid-modal__toggle sid-print-dialog__toggle">
            <input type="checkbox" checked={duplex} onChange={(e) => setDuplex(e.target.checked)} />
            Include card backs (QR for attendance)
          </label>

          <div className="sid-print-dialog__summary">
            {countLoading ? (
              <p>Counting students…</p>
            ) : count == null ? (
              <p>Could not load student count.</p>
            ) : count === 0 ? (
              <p>No students match this filter.</p>
            ) : (
              <>
                <p>
                  <strong>{count.toLocaleString()}</strong> card{count === 1 ? "" : "s"} will be
                  prepared
                  {gradeId && selectedGrade ? ` · ${selectedGrade.name}` : ""}
                  {sectionId && selectedGrade
                    ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}`
                    : ""}
                </p>
                {batchCount > 1 ? (
                  <p className="sid-print-dialog__meta">
                    Loaded in batches of {BULK_PRINT_BATCH_SIZE} for speed (
                    {batchCount} batch{batchCount === 1 ? "" : "es"}).
                  </p>
                ) : null}
                {needsGrade ? (
                  <p className="sid-print-dialog__warn">
                    Select a <strong>grade</strong> before printing {count.toLocaleString()}{" "}
                    students at once.
                  </p>
                ) : count > BULK_PRINT_WARN_ALL && !duplex ? null : count > 1200 ? (
                  <p className="sid-print-dialog__warn">
                    Large job — prefer PDF in the print dialog. Allow a minute to prepare QR codes.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <footer className="sid-print-dialog__foot">
          <button type="button" className="att-btn att-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="att-btn att-btn--ghost"
            disabled={!count || needsGrade}
            onClick={() => startPrint(false)}
          >
            Print batch 1
          </button>
          <button
            type="button"
            className="att-btn att-btn--primary"
            disabled={!count || needsGrade}
            onClick={() => startPrint(true)}
          >
            Prepare all & print
          </button>
        </footer>
      </div>
    </>
  );
}
