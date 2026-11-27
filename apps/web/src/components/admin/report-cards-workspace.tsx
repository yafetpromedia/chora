"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  AcademicsBadge,
  AcademicsHero,
} from "@/components/academics/academics-ui";
import { ReportCardCommentsPanel } from "@/components/results/report-card-comments-panel";
import {
  ResultsStudentPicker,
  type ResultsStudentOption,
} from "@/components/results/results-student-picker";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import type { StudentRecord } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { BRAND_LOGO_SRC, BRAND_NAME, BRAND_NAME_AM } from "@/lib/brand";
import {
  getReportCard,
  getReportCardPublishStatus,
  listTerms,
  openReportCardPrint,
  publishReportCardsForStudent,
  reportCardPrintUrl,
  type AcademicTerm,
  type ReportCard,
  type ReportCardPrintMode,
  type ReportCardPublishStatus,
} from "@/lib/results";

type Props = {
  students: StudentRecord[];
  onError?: (message: string) => void;
};

export function ReportCardsWorkspace({ students, onError }: Props) {
  const { t } = useLocale();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [termId, setTermId] = useState("");
  const [printMode, setPrintMode] = useState<ReportCardPrintMode>("annual");
  const [viewStudentId, setViewStudentId] = useState("");
  const [report, setReport] = useState<ReportCard | null>(null);
  const [yearlyHtml, setYearlyHtml] = useState("");
  const [publishStatus, setPublishStatus] = useState<ReportCardPublishStatus | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const setErr = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    void listTerms()
      .then((t) => {
        setTerms(t);
        const current = t.find((x) => x.isCurrent) ?? t[0];
        if (current) setTermId((prev) => prev || current.id);
        if (students[0]) setViewStudentId((prev) => prev || students[0].id);
      })
      .catch((err) => {
        setErr(
          err instanceof Error ? err.message : t("reportCardsUi.loadWorkspaceFailed"),
        );
      })
      .finally(() => setLoading(false));
  }, [setErr, students, t]);

  const currentTerm = terms.find((x) => x.isCurrent) ?? terms.find((x) => x.id === termId);
  const selectedStudent = students.find((s) => s.id === viewStudentId);

  const studentOptions = useMemo<ResultsStudentOption[]>(
    () =>
      students.map((s) => ({
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        grade: s.grade.name,
        gradeId: s.grade.id,
        section: s.section?.name ?? null,
        sectionId: s.section?.id ?? null,
        studentId: s.user.externalRef,
        photoUrl: s.photoUrl,
      })),
    [students],
  );

  const heroStats = useMemo(
    () => [
      { label: t("reportCardsUi.statStudents"), value: loading ? "—" : students.length },
      { label: t("reportCardsUi.statTerms"), value: loading ? "—" : terms.length },
      {
        label: t("reportCardsUi.statReady"),
        value: loading ? "—" : report ? t("reportCardsUi.loadedOne") : "—",
        accent: !!report,
      },
    ],
    [loading, students.length, terms.length, report, t],
  );

  function onSelectionChange(studentId: string, nextTermId: string) {
    setViewStudentId(studentId);
    setTermId(nextTermId);
    setReport(null);
    setPublishStatus(null);
    setSuccess("");
  }

  async function refreshPublishStatus(studentId: string, nextTermId: string) {
    if (!studentId || !nextTermId) {
      setPublishStatus(null);
      return;
    }
    try {
      setPublishStatus(await getReportCardPublishStatus(studentId, nextTermId));
    } catch {
      setPublishStatus(null);
    }
  }

  useEffect(() => {
    if (!viewStudentId || !termId) return;
    let cancelled = false;
    getReportCardPublishStatus(viewStudentId, termId)
      .then((status) => {
        if (!cancelled) setPublishStatus(status);
      })
      .catch(() => {
        if (!cancelled) setPublishStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [viewStudentId, termId]);

  async function onPreviewReport() {
    if (!viewStudentId || !termId) return;
    setPreviewBusy(true);
    setError("");
    try {
      setReport(await getReportCard(viewStudentId, termId));
      if (printMode === "annual") {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          const res = await fetch(
            reportCardPrintUrl(viewStudentId, termId, "annual"),
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (res.ok) setYearlyHtml(await res.text());
          else setYearlyHtml("");
        }
      } else {
        setYearlyHtml("");
      }
      await refreshPublishStatus(viewStudentId, termId);
    } catch (err) {
      setErr(err instanceof Error ? err.message : t("reportCardsUi.loadCardFailed"));
    } finally {
      setPreviewBusy(false);
    }
  }

  async function onPublishReportCards() {
    if (!viewStudentId || !termId || !selectedStudent) return;
    const gradeLabel = `${selectedStudent.grade.name}${
      selectedStudent.section ? ` · ${selectedStudent.section.name}` : ""
    }`;
    if (
      !window.confirm(
        t("reportCardsUi.publishConfirm", { grade: gradeLabel }),
      )
    ) {
      return;
    }
    setPublishBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await publishReportCardsForStudent(viewStudentId, termId);
      await refreshPublishStatus(viewStudentId, termId);
      setSuccess(
        result.published > 0
          ? t("reportCardsUi.publishSuccess", {
              count: result.published,
              plural: result.published === 1 ? "" : "s",
              grade: gradeLabel,
            })
          : t("reportCardsUi.publishAlready", { grade: gradeLabel }),
      );
    } catch (err) {
      setErr(err instanceof Error ? err.message : t("reportCardsUi.publishFailed"));
    } finally {
      setPublishBusy(false);
    }
  }

  return (
    <div className="acad-page acad-page--results rc-v2">
      <AcademicsHero
        title={t("reportCardsUi.title")}
        subtitle={
          selectedStudent
            ? t("reportCardsUi.subtitleStudent", {
                name: `${selectedStudent.user.firstName} ${selectedStudent.user.lastName}`.trim(),
              })
            : t("reportCardsUi.subtitleDefault")
        }
        stats={heroStats}
        badges={
          <>
            {currentTerm ? (
              <AcademicsBadge variant="live">{currentTerm.name}</AcademicsBadge>
            ) : (
              <AcademicsBadge variant="muted">{t("reportCardsUi.noCurrentTerm")}</AcademicsBadge>
            )}
            {selectedStudent ? (
              <span className="rc-v2__hero-badge">
                {selectedStudent.grade.name}
                {selectedStudent.section ? ` · ${selectedStudent.section.name}` : ""}
              </span>
            ) : null}
          </>
        }
      />

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

      <div className="rc-v2__toolbar">
        <div className="rc-v2__student-pick">
          <ResultsStudentPicker
            students={studentOptions}
            value={viewStudentId}
            onChange={(id) => onSelectionChange(id, termId)}
            disabled={Boolean(loading || students.length === 0)}
          />
        </div>
        <label className="rc-v2__field">
          <DashIcon name="calendar" className="dash-icon--sm" />
          <span>{t("reportCardsUi.term")}</span>
          <select
            value={termId}
            onChange={(e) => onSelectionChange(viewStudentId, e.target.value)}
            disabled={Boolean(loading || terms.length === 0)}
            autoComplete="off"
          >
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
                {term.isCurrent ? t("reportCardsUi.currentSuffix") : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="rc-v2__field rc-v2__field--mode" role="group" aria-label={t("reportCardsUi.reportTypeAria")}>
          <span>{t("reportCardsUi.reportType")}</span>
          <div className="rc-v2__mode-toggle">
            <button
              type="button"
              className={`rc-v2__mode-btn${printMode === "term" ? " is-active" : ""}`}
              aria-pressed={printMode === "term"}
              onClick={() => setPrintMode("term")}
            >
              {t("reportCardsUi.modeTerm")}
            </button>
            <button
              type="button"
              className={`rc-v2__mode-btn${printMode === "annual" ? " is-active" : ""}`}
              aria-pressed={printMode === "annual"}
              onClick={() => setPrintMode("annual")}
            >
              {t("reportCardsUi.modeYearly")}
            </button>
          </div>
        </div>
        <div className="rc-v2__toolbar-actions">
          {publishStatus ? (
            <span
              className={`rc-v2__publish-pill${
                publishStatus.published ? " is-live" : ""
              }`}
            >
              {publishStatus.published
                ? t("reportCardsUi.visibleFamilies")
                : t("reportCardsUi.sheetsPublished", {
                    published: publishStatus.publishedCount,
                    total: publishStatus.total,
                  })}
            </span>
          ) : null}
          <button
            type="button"
            className="rc-v2__btn rc-v2__btn--primary"
            disabled={Boolean(previewBusy || !viewStudentId || !termId)}
            onClick={() => void onPreviewReport()}
          >
            {previewBusy ? t("common.loading") : t("reportCardsUi.loadPreview")}
          </button>
          {viewStudentId && termId ? (
            <button
              type="button"
              className="rc-v2__btn rc-v2__btn--accent"
              disabled={Boolean(
                publishBusy ||
                  !publishStatus?.canPublish ||
                  publishStatus.published,
              )}
              onClick={() => void onPublishReportCards()}
              title={t("reportCardsUi.publishTitle")}
            >
              {publishBusy
                ? t("reportCardsUi.publishing")
                : publishStatus?.published
                  ? t("reportCardsUi.publishedBtn")
                  : t("reportCardsUi.publishToFamilies")}
            </button>
          ) : null}
          {viewStudentId && termId ? (
            <button
              type="button"
              className="rc-v2__btn rc-v2__btn--ghost"
              onClick={() => openReportCardPrint(viewStudentId, termId, printMode)}
            >
              {t("reportCardsUi.printPdf")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="rc-v2__grid">
        <section className="rc-v2__card" aria-label={t("reportCardsUi.previewAria")}>
          <header className="rc-v2__card-head">
            <span className="rc-v2__card-icon" aria-hidden>
              <DashIcon name="report-card" className="dash-icon--sm" />
            </span>
            <div>
              <h3 className="rc-v2__card-title">{t("reportCardsUi.previewTitle")}</h3>
              <p className="rc-v2__card-sub">
                {printMode === "annual"
                  ? t("reportCardsUi.previewSubAnnual")
                  : t("reportCardsUi.previewSubTerm")}
              </p>
            </div>
          </header>

          {report ? (
            <div className={`rc-booklet${printMode === "term" ? " rc-booklet--term" : ""}`}>
              <div className="rc-booklet__toolbar">
                <p>
                  {printMode === "annual"
                    ? t("reportCardsUi.bookletAnnualMeta", {
                        year: report.term.academicYear,
                      })
                    : t("reportCardsUi.bookletTermMeta", { term: report.term.name })}
                </p>
                <span>{t("reportCardsUi.matchesPrinted")}</span>
              </div>

              {printMode === "term" ? (
                <div className="rc-term-sheet" aria-label={t("reportCardsUi.modeTerm")}>
                  <article className="rc-sheet-card rc-sheet-card--half" aria-label={t("reportCardsUi.previewAria")}>
                    <div className="rc-sheet-card__corner rc-sheet-card__corner--bl" aria-hidden />
                    <span className="rc-sheet-card__badge">{t("reportCardsUi.termFrontBadge")}</span>

                    <header className="rc-sheet-card__head">
                      <div className="rc-sheet-card__brand">
                        <BrandMark className="rc-sheet-card__chora" />
                        <div>
                          <strong>{BRAND_NAME.toUpperCase()}</strong>
                          <em>{BRAND_NAME_AM}</em>
                        </div>
                      </div>
                      <div className="rc-sheet-card__title">
                        <h4>{t("reportCardsUi.studentReportCard")}</h4>
                        <p>{t("reportCardsUi.termReport", { term: report.term.name })}</p>
                      </div>
                    </header>

                    <div className="rc-sheet-card__school">
                      {report.school.logoUrl ? (
                        <img src={report.school.logoUrl} alt="" />
                      ) : (
                        <span aria-hidden>{report.school.name.slice(0, 2).toUpperCase()}</span>
                      )}
                      <div>
                        <strong>{report.school.name}</strong>
                        <p>
                          {report.term.academicYear} · {report.term.name}
                        </p>
                      </div>
                    </div>

                    <div className="rc-sheet-card__info rc-sheet-card__info--term">
                      <div>
                        <span>{t("reportCardsUi.studentLabel")}</span>{" "}
                        <strong>{report.student.name}</strong>
                      </div>
                      <div>
                        <span>{t("reportCardsUi.idLabel")}</span>{" "}
                        <strong>{report.student.studentId ?? "—"}</strong>
                      </div>
                      <div>
                        <span>{t("reportCardsUi.gradeLabel")}</span>{" "}
                        <strong>
                          {report.student.grade}
                          {report.student.section ? ` · ${report.student.section}` : ""}
                        </strong>
                      </div>
                    </div>

                    <div className="rc-sheet-card__table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("reportCardsUi.colNo")}</th>
                            <th>{t("reportCardsUi.colSubject")}</th>
                            <th>{t("reportCardsUi.colScore")}</th>
                            <th>{t("reportCardsUi.colGrade")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.subjects.slice(0, 6).map((s, i) => (
                            <tr key={s.subject}>
                              <td>{i + 1}</td>
                              <th scope="row">{s.subject}</th>
                              <td>{s.average}%</td>
                              <td>
                                <strong>{s.letter}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <footer className="rc-sheet-card__term-foot">
                      <div>
                        <em>{t("reportCardsUi.average")}</em>
                        <strong>
                          {report.overallAverage != null ? `${report.overallAverage}%` : "—"}
                          {report.overallLetter ? ` ${report.overallLetter}` : ""}
                        </strong>
                      </div>
                      <div>
                        <em>{t("reportCardsUi.attendance")}</em>
                        <strong>
                          {report.attendance.present}/{report.attendance.total}
                        </strong>
                      </div>
                      <div className="rc-sheet-card__term-sign">
                        <i />
                        <strong>{t("reportCardsUi.signature")}</strong>
                      </div>
                      <div className="rc-sheet-card__qr rc-sheet-card__qr--sm" aria-hidden>
                        <img src={BRAND_LOGO_SRC} alt="" />
                        <span>{t("reportCardsUi.verify")}</span>
                      </div>
                    </footer>
                  </article>

                  <article className="rc-sheet-card rc-sheet-card--half rc-sheet-card--slot" aria-label={t("reportCardsUi.secondSlotAria")}>
                    <span className="rc-sheet-card__cut">{t("reportCardsUi.cutHere")}</span>
                    <strong>{t("reportCardsUi.reservedSecond")}</strong>
                    <p>{t("reportCardsUi.secondSlotHint")}</p>
                  </article>
                </div>
              ) : yearlyHtml ? (
                <iframe
                  title={t("reportCardsUi.yearlyIframeTitle")}
                  className="rc-v2__yearly-preview"
                  srcDoc={yearlyHtml}
                />
              ) : (
                <div className="rc-booklet__pages">
                  <article className="rc-sheet-card" aria-label={t("reportCardsUi.previewAria")}>
                    <div className="rc-sheet-card__corner rc-sheet-card__corner--bl" aria-hidden />
                    <span className="rc-sheet-card__badge">{t("reportCardsUi.frontBadge")}</span>

                    <header className="rc-sheet-card__head">
                      <div className="rc-sheet-card__brand">
                        <BrandMark className="rc-sheet-card__chora" />
                        <div>
                          <strong>{BRAND_NAME.toUpperCase()}</strong>
                          <em>{BRAND_NAME_AM}</em>
                        </div>
                      </div>
                      <div className="rc-sheet-card__title">
                        <h4>{t("reportCardsUi.studentReportCard")}</h4>
                        <p>{t("reportCardsUi.academicYearReport")}</p>
                      </div>
                    </header>

                    <div className="rc-sheet-card__school">
                      {report.school.logoUrl ? (
                        <img src={report.school.logoUrl} alt="" />
                      ) : (
                        <span aria-hidden>{report.school.name.slice(0, 2).toUpperCase()}</span>
                      )}
                      <div>
                        <strong>{report.school.name}</strong>
                        <p>
                          {report.term.academicYear} · {report.term.name}
                        </p>
                      </div>
                    </div>

                    <div className="rc-sheet-card__info">
                      <div>
                        <span>{t("reportCardsUi.studentNameLabel")}</span>{" "}
                        <strong>{report.student.name}</strong>
                      </div>
                      <div>
                        <span>{t("reportCardsUi.academicYearLabel")}</span>{" "}
                        <strong>{report.term.academicYear}</strong>
                      </div>
                      <div>
                        <span>{t("reportCardsUi.idLabel")}</span>{" "}
                        <strong>{report.student.studentId ?? "—"}</strong>
                      </div>
                      <div>
                        <span>{t("reportCardsUi.gradeLabel")}</span>{" "}
                        <strong>
                          {report.student.grade}
                          {report.student.section ? ` · ${report.student.section}` : ""}
                        </strong>
                      </div>
                    </div>

                    <div className="rc-sheet-card__table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("reportCardsUi.colNo")}</th>
                            <th>{t("reportCardsUi.colSubject")}</th>
                            <th>{t("reportCardsUi.colAverage")}</th>
                            <th>{t("reportCardsUi.colGrade")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.subjects.slice(0, 8).map((s, i) => (
                            <tr key={s.subject}>
                              <td>{i + 1}</td>
                              <th scope="row">{s.subject}</th>
                              <td>{s.average}%</td>
                              <td>
                                <strong>{s.letter}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <footer className="rc-sheet-card__foot">
                      <div className="rc-sheet-card__scale">
                        <strong>{t("reportCardsUi.gradingScale")}</strong>
                        <p>{t("reportCardsUi.gradingScaleBody")}</p>
                      </div>
                      <p className="rc-sheet-card__motto">
                        {t("reportCardsUi.mottoLine1")}
                        <em>{t("reportCardsUi.mottoLine2")}</em>
                      </p>
                    </footer>
                  </article>

                  <article className="rc-sheet-card" aria-label={t("reportCardsUi.previewAria")}>
                    <div className="rc-sheet-card__corner rc-sheet-card__corner--br" aria-hidden />
                    <span className="rc-sheet-card__badge">{t("reportCardsUi.backBadge")}</span>

                    <div className="rc-sheet-card__split">
                      <section className="rc-sheet-card__panel">
                        <h5>{t("reportCardsUi.attendanceSummary")}</h5>
                        <ul>
                          <li>
                            <span>{t("reportCardsUi.daysPresent")}</span>
                            <strong>{report.attendance.present}</strong>
                          </li>
                          <li>
                            <span>{t("reportCardsUi.daysAbsent")}</span>
                            <strong>
                              {Math.max(0, report.attendance.total - report.attendance.present)}
                            </strong>
                          </li>
                          <li>
                            <span>{t("reportCardsUi.attendanceRate")}</span>
                            <strong>
                              {report.attendance.rate != null ? `${report.attendance.rate}%` : "—"}
                            </strong>
                          </li>
                          <li>
                            <span>{t("reportCardsUi.totalSchoolDays")}</span>
                            <strong>{report.attendance.total}</strong>
                          </li>
                        </ul>
                      </section>
                      <section className="rc-sheet-card__panel">
                        <h5>{t("reportCardsUi.conductTitle")}</h5>
                        <ul>
                          <li>
                            <span>{t("reportCardsUi.discipline")}</span>
                            <strong>—</strong>
                          </li>
                          <li>
                            <span>{t("reportCardsUi.participation")}</span>
                            <strong>—</strong>
                          </li>
                          <li>
                            <span>{t("reportCardsUi.attitude")}</span>
                            <strong>—</strong>
                          </li>
                          <li>
                            <span>{t("reportCardsUi.overall")}</span>
                            <strong>{report.overallLetter ?? "—"}</strong>
                          </li>
                        </ul>
                      </section>
                    </div>

                    <div className="rc-sheet-card__kpis">
                      <div>
                        <em>{t("reportCardsUi.classRank")}</em>
                        <strong>
                          {report.rank != null ? `${report.rank} / ${report.classSize}` : "—"}
                        </strong>
                      </div>
                      <div>
                        <em>{t("reportCardsUi.overallAverage")}</em>
                        <strong>
                          {report.overallAverage != null ? `${report.overallAverage}%` : "—"}
                          {report.overallLetter ? ` ${report.overallLetter}` : ""}
                        </strong>
                      </div>
                      <div>
                        <em>{t("reportCardsUi.subjectsCount")}</em>
                        <strong>{report.subjects.length}</strong>
                      </div>
                    </div>

                    <div className="rc-sheet-card__signs">
                      <div>
                        <i />
                        <strong>{t("reportCardsUi.classTeacher")}</strong>
                        <span>{t("reportCardsUi.signature")}</span>
                      </div>
                      <div>
                        <i />
                        <strong>{t("reportCardsUi.principalDirector")}</strong>
                        <span>{t("reportCardsUi.signature")}</span>
                      </div>
                      <div className="rc-sheet-card__qr" aria-hidden>
                        <img src={BRAND_LOGO_SRC} alt="" />
                        <span>{t("reportCardsUi.scanVerify")}</span>
                      </div>
                    </div>

                    {(report.teacherComment || report.principalComment) && (
                      <section className="rc-sheet-card__remarks">
                        <h5>{t("reportCardsUi.generalRemarks")}</h5>
                        <p>
                          {report.principalComment || report.teacherComment}
                        </p>
                      </section>
                    )}

                    <p className="rc-sheet-card__tagline">{t("reportCardsUi.tagline")}</p>
                  </article>
                </div>
              )}

              <div className="rc-booklet__actions">
                <button
                  type="button"
                  className="rc-v2__btn rc-v2__btn--primary"
                  onClick={() => openReportCardPrint(viewStudentId, termId, printMode)}
                >
                  {printMode === "annual"
                    ? t("reportCardsUi.openPrintYearly")
                    : t("reportCardsUi.openPrintTerm")}
                </button>
                <p>
                  {printMode === "annual"
                    ? t("reportCardsUi.printHintAnnual")
                    : t("reportCardsUi.printHintTerm")}
                </p>
              </div>
            </div>
          ) : (
            <div className="rc-v2__empty">
              <span className="rc-v2__empty-icon" aria-hidden>
                <DashIcon name="report-card" className="dash-icon--lg" />
              </span>
              <h4>{t("reportCardsUi.emptyTitle")}</h4>
              <p>{t("reportCardsUi.emptySub")}</p>
            </div>
          )}
        </section>

        <section
          className="rc-v2__card rc-v2__card--comments"
          aria-label={t("reportCardsUi.commentsAria")}
        >
          <ReportCardCommentsPanel
            terms={terms}
            students={students}
            defaultTermId={termId}
            defaultStudentId={viewStudentId}
            hideSelectors
            onError={setErr}
          />
        </section>
      </div>

      <p className="rc-v2__footer-hint">
        {t("reportCardsUi.footerHint")}{" "}
        <Link href="/admin/results" className="rc-v2__text-link">
          {t("reportCardsUi.resultsLink")}
        </Link>
        .
      </p>
    </div>
  );
}
