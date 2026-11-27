"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
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
  const { t } = useLocale();
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
      <button
        type="button"
        className="sid-modal-backdrop"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div className="sid-print-dialog" role="dialog" aria-labelledby="sid-print-dialog-title">
        <header className="sid-print-dialog__head">
          <h2 id="sid-print-dialog-title">{t("studentIdCardPrintUi.title")}</h2>
          <p>{t("studentIdCardPrintUi.sub")}</p>
          <button
            type="button"
            className="sid-modal__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </header>

        <div className="sid-print-dialog__body">
          <div className="sid-print-dialog__filters">
            <div className="att-field">
              <span>{t("studentIdCardPrintUi.grade")}</span>
              <select
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setSectionId("");
                }}
              >
                <option value="">{t("studentIdCardPrintUi.allGrades")}</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedGrade && selectedGrade.sections.length > 0 ? (
              <div className="att-field">
                <span>{t("studentIdCardPrintUi.section")}</span>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                  <option value="">{t("studentIdCardPrintUi.allSectionsInGrade")}</option>
                  {selectedGrade.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="att-field">
              <span>{t("studentIdCardPrintUi.printStyle")}</span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as IdCardPrintStyle)}
              >
                <option value="full">{t("studentIdCardPrintUi.styleFull")}</option>
                <option value="sheet">{t("studentIdCardPrintUi.styleSheet")}</option>
              </select>
            </div>
            {style === "sheet" ? (
              <div className="att-field">
                <span>{t("studentIdCardPrintUi.cardsPerPage")}</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(e.target.value as BulkPrintLayout)}
                >
                  <option value="6">{t("studentIdCardPrintUi.perPage6")}</option>
                  <option value="8">{t("studentIdCardPrintUi.perPage8")}</option>
                </select>
              </div>
            ) : null}
          </div>

          <label className="sid-modal__toggle sid-print-dialog__toggle">
            <input type="checkbox" checked={duplex} onChange={(e) => setDuplex(e.target.checked)} />
            {t("studentIdCardPrintUi.includeBacks")}
          </label>

          <div className="sid-print-dialog__summary">
            {countLoading ? (
              <p>{t("studentIdCardPrintUi.counting")}</p>
            ) : count == null ? (
              <p>{t("studentIdCardPrintUi.countFailed")}</p>
            ) : count === 0 ? (
              <p>{t("studentIdCardPrintUi.noMatch")}</p>
            ) : (
              <>
                <p>
                  {t(
                    count === 1
                      ? "studentIdCardPrintUi.prepared"
                      : "studentIdCardPrintUi.preparedPlural",
                    { count: count.toLocaleString() },
                  )}
                  {gradeId && selectedGrade ? ` · ${selectedGrade.name}` : ""}
                  {sectionId && selectedGrade
                    ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}`
                    : ""}
                </p>
                {batchCount > 1 ? (
                  <p className="sid-print-dialog__meta">
                    {t(
                      batchCount === 1
                        ? "studentIdCardPrintUi.batchMeta"
                        : "studentIdCardPrintUi.batchMetaPlural",
                      { size: BULK_PRINT_BATCH_SIZE, batches: batchCount },
                    )}
                  </p>
                ) : null}
                {needsGrade ? (
                  <p className="sid-print-dialog__warn">
                    {t("studentIdCardPrintUi.pickGradeWarn", {
                      count: count.toLocaleString(),
                    })}
                  </p>
                ) : count > BULK_PRINT_WARN_ALL && !duplex ? null : count > 1200 ? (
                  <p className="sid-print-dialog__warn">{t("studentIdCardPrintUi.largeJobWarn")}</p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <footer className="sid-print-dialog__foot">
          <button type="button" className="att-btn att-btn--ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="att-btn att-btn--ghost"
            disabled={!count || needsGrade}
            onClick={() => startPrint(false)}
          >
            {t("studentIdCardPrintUi.printBatch1")}
          </button>
          <button
            type="button"
            className="att-btn att-btn--primary"
            disabled={!count || needsGrade}
            onClick={() => startPrint(true)}
          >
            {t("studentIdCardPrintUi.prepareAll")}
          </button>
        </footer>
      </div>
    </>
  );
}