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
    setLoading(true);
    void listTerms()
      .then((t) => {
        setTerms(t);
        const current = t.find((x) => x.isCurrent) ?? t[0];
        if (current) setTermId((prev) => prev || current.id);
        if (students[0]) setViewStudentId((prev) => prev || students[0].id);
      })
      .catch((err) => {
        setErr(err instanceof Error ? err.message : "Could not load report cards workspace");
      })
      .finally(() => setLoading(false));
  }, [setErr, students]);

  const currentTerm = terms.find((t) => t.isCurrent) ?? terms.find((t) => t.id === termId);
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
      { label: "Students", value: loading ? "—" : students.length },
      { label: "Terms", value: loading ? "—" : terms.length },
      {
        label: "Ready to print",
        value: loading ? "—" : report ? "1 loaded" : "—",
        accent: !!report,
      },
    ],
    [loading, students.length, terms.length, report],
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
    void refreshPublishStatus(viewStudentId, termId);
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
      setErr(err instanceof Error ? err.message : "Could not load report card");
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
        `Publish report cards for ${gradeLabel} in this term?\n\nStudents and parents will be able to open the official report card. This publishes all subject sheets for the class.`,
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
          ? `Published ${result.published} subject sheet${result.published === 1 ? "" : "s"} for ${gradeLabel}. Families can open the report card now.`
          : `Report cards already published for ${gradeLabel}.`,
      );
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Could not publish report cards");
    } finally {
      setPublishBusy(false);
    }
  }

  return (
    <div className="acad-page acad-page--results rc-v2">
      <AcademicsHero
        title="Report cards"
        subtitle={
          selectedStudent
            ? `Preview, comment, and print the official booklet for ${selectedStudent.user.firstName} ${selectedStudent.user.lastName}.`
            : "Preview student report cards, add teacher comments, and print the official booklet for families."
        }
        stats={heroStats}
        badges={
          <>
            {currentTerm ? (
              <AcademicsBadge variant="live">{currentTerm.name}</AcademicsBadge>
            ) : (
              <AcademicsBadge variant="muted">No current term</AcademicsBadge>
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
          <span>Term</span>
          <select
            value={termId}
            onChange={(e) => onSelectionChange(viewStudentId, e.target.value)}
            disabled={Boolean(loading || terms.length === 0)}
            autoComplete="off"
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="rc-v2__field rc-v2__field--mode" role="group" aria-label="Report type">
          <span>Report type</span>
          <div className="rc-v2__mode-toggle">
            <button
              type="button"
              className={`rc-v2__mode-btn${printMode === "term" ? " is-active" : ""}`}
              aria-pressed={printMode === "term"}
              onClick={() => setPrintMode("term")}
            >
              Term
            </button>
            <button
              type="button"
              className={`rc-v2__mode-btn${printMode === "annual" ? " is-active" : ""}`}
              aria-pressed={printMode === "annual"}
              onClick={() => setPrintMode("annual")}
            >
              Yearly
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
                ? "Visible to families"
                : `${publishStatus.publishedCount}/${publishStatus.total} sheets published`}
            </span>
          ) : null}
          <button
            type="button"
            className="rc-v2__btn rc-v2__btn--primary"
            disabled={Boolean(previewBusy || !viewStudentId || !termId)}
            onClick={() => void onPreviewReport()}
          >
            {previewBusy ? "Loading…" : "Load preview"}
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
              title="Publish all subject sheets for this student's class so families can open the report card"
            >
              {publishBusy
                ? "Publishing…"
                : publishStatus?.published
                  ? "Published"
                  : "Publish to families"}
            </button>
          ) : null}
          {viewStudentId && termId ? (
            <button
              type="button"
              className="rc-v2__btn rc-v2__btn--ghost"
              onClick={() => openReportCardPrint(viewStudentId, termId, printMode)}
            >
              Print / PDF
            </button>
          ) : null}
        </div>
      </div>

      <div className="rc-v2__grid">
        <section className="rc-v2__card" aria-label="Report card preview">
          <header className="rc-v2__card-head">
            <span className="rc-v2__card-icon" aria-hidden>
              <DashIcon name="report-card" className="dash-icon--sm" />
            </span>
            <div>
              <h3 className="rc-v2__card-title">Preview &amp; print</h3>
              <p className="rc-v2__card-sub">
                {printMode === "annual"
                  ? "Yearly: A4 landscape duplex — left/right columns on each side. Front: grading + cover; back: student info, QR, results. Print with short-edge flip."
                  : "Term: A4 landscape, front only — each card is half a page so two term reports print on one sheet."}
              </p>
            </div>
          </header>

          {report ? (
            <div className={`rc-booklet${printMode === "term" ? " rc-booklet--term" : ""}`}>
              <div className="rc-booklet__toolbar">
                <p>
                  {printMode === "annual"
                    ? `A4 landscape duplex · Yearly · ${report.term.academicYear}`
                    : `A4 landscape · Term · 2 per page · ${report.term.name}`}
                </p>
                <span>Matches the printed card</span>
              </div>

              {printMode === "term" ? (
                <div className="rc-term-sheet" aria-label="Term report — two per A4">
                  <article className="rc-sheet-card rc-sheet-card--half" aria-label="Term report preview">
                    <div className="rc-sheet-card__corner rc-sheet-card__corner--bl" aria-hidden />
                    <span className="rc-sheet-card__badge">Term · Front</span>

                    <header className="rc-sheet-card__head">
                      <div className="rc-sheet-card__brand">
                        <BrandMark className="rc-sheet-card__chora" />
                        <div>
                          <strong>{BRAND_NAME.toUpperCase()}</strong>
                          <em>{BRAND_NAME_AM}</em>
                        </div>
                      </div>
                      <div className="rc-sheet-card__title">
                        <h4>Student Report Card</h4>
                        <p>{report.term.name} Report</p>
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
                        <span>Student:</span> <strong>{report.student.name}</strong>
                      </div>
                      <div>
                        <span>ID:</span>{" "}
                        <strong>{report.student.studentId ?? "—"}</strong>
                      </div>
                      <div>
                        <span>Grade:</span>{" "}
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
                            <th>No.</th>
                            <th>Subject</th>
                            <th>Score</th>
                            <th>Grade</th>
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
                        <em>Average</em>
                        <strong>
                          {report.overallAverage != null ? `${report.overallAverage}%` : "—"}
                          {report.overallLetter ? ` ${report.overallLetter}` : ""}
                        </strong>
                      </div>
                      <div>
                        <em>Attendance</em>
                        <strong>
                          {report.attendance.present}/{report.attendance.total}
                        </strong>
                      </div>
                      <div className="rc-sheet-card__term-sign">
                        <i />
                        <strong>Signature</strong>
                      </div>
                      <div className="rc-sheet-card__qr rc-sheet-card__qr--sm" aria-hidden>
                        <img src={BRAND_LOGO_SRC} alt="" />
                        <span>Verify</span>
                      </div>
                    </footer>
                  </article>

                  <article className="rc-sheet-card rc-sheet-card--half rc-sheet-card--slot" aria-label="Second term slot">
                    <span className="rc-sheet-card__cut">Cut here</span>
                    <strong>Reserved for 2nd student</strong>
                    <p>
                      This blank half is intentional — one landscape A4 holds two term
                      reports. Print a second student into this slot, then cut along the dashed line.
                    </p>
                  </article>
                </div>
              ) : yearlyHtml ? (
                <iframe
                  title="Yearly report card preview"
                  className="rc-v2__yearly-preview"
                  srcDoc={yearlyHtml}
                />
              ) : (
                <div className="rc-booklet__pages">
                  <article className="rc-sheet-card" aria-label="Front page preview">
                    <div className="rc-sheet-card__corner rc-sheet-card__corner--bl" aria-hidden />
                    <span className="rc-sheet-card__badge">Front</span>

                    <header className="rc-sheet-card__head">
                      <div className="rc-sheet-card__brand">
                        <BrandMark className="rc-sheet-card__chora" />
                        <div>
                          <strong>{BRAND_NAME.toUpperCase()}</strong>
                          <em>{BRAND_NAME_AM}</em>
                        </div>
                      </div>
                      <div className="rc-sheet-card__title">
                        <h4>Student Report Card</h4>
                        <p>Academic Year Report</p>
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
                        <span>Student Name:</span> <strong>{report.student.name}</strong>
                      </div>
                      <div>
                        <span>Academic Year:</span>{" "}
                        <strong>{report.term.academicYear}</strong>
                      </div>
                      <div>
                        <span>Student ID:</span>{" "}
                        <strong>{report.student.studentId ?? "—"}</strong>
                      </div>
                      <div>
                        <span>Grade:</span>{" "}
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
                            <th>No.</th>
                            <th>Subject</th>
                            <th>Average</th>
                            <th>Grade</th>
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
                        <strong>Grading Scale</strong>
                        <p>A 90–100 · B 80–89 · C 70–79 · D 60–69 · F 0–59</p>
                      </div>
                      <p className="rc-sheet-card__motto">
                        Better Students
                        <em>A Brighter Future</em>
                      </p>
                    </footer>
                  </article>

                  <article className="rc-sheet-card" aria-label="Back page preview">
                    <div className="rc-sheet-card__corner rc-sheet-card__corner--br" aria-hidden />
                    <span className="rc-sheet-card__badge">Back</span>

                    <div className="rc-sheet-card__split">
                      <section className="rc-sheet-card__panel">
                        <h5>Attendance Summary</h5>
                        <ul>
                          <li>
                            <span>Days Present</span>
                            <strong>{report.attendance.present}</strong>
                          </li>
                          <li>
                            <span>Days Absent</span>
                            <strong>
                              {Math.max(0, report.attendance.total - report.attendance.present)}
                            </strong>
                          </li>
                          <li>
                            <span>Attendance Rate</span>
                            <strong>
                              {report.attendance.rate != null ? `${report.attendance.rate}%` : "—"}
                            </strong>
                          </li>
                          <li>
                            <span>Total School Days</span>
                            <strong>{report.attendance.total}</strong>
                          </li>
                        </ul>
                      </section>
                      <section className="rc-sheet-card__panel">
                        <h5>Conduct / Behavior</h5>
                        <ul>
                          <li>
                            <span>Discipline</span>
                            <strong>—</strong>
                          </li>
                          <li>
                            <span>Participation</span>
                            <strong>—</strong>
                          </li>
                          <li>
                            <span>Attitude</span>
                            <strong>—</strong>
                          </li>
                          <li>
                            <span>Overall</span>
                            <strong>{report.overallLetter ?? "—"}</strong>
                          </li>
                        </ul>
                      </section>
                    </div>

                    <div className="rc-sheet-card__kpis">
                      <div>
                        <em>Class Rank</em>
                        <strong>
                          {report.rank != null ? `${report.rank} / ${report.classSize}` : "—"}
                        </strong>
                      </div>
                      <div>
                        <em>Overall Average</em>
                        <strong>
                          {report.overallAverage != null ? `${report.overallAverage}%` : "—"}
                          {report.overallLetter ? ` ${report.overallLetter}` : ""}
                        </strong>
                      </div>
                      <div>
                        <em>Subjects</em>
                        <strong>{report.subjects.length}</strong>
                      </div>
                    </div>

                    <div className="rc-sheet-card__signs">
                      <div>
                        <i />
                        <strong>Class Teacher</strong>
                        <span>Signature</span>
                      </div>
                      <div>
                        <i />
                        <strong>Principal / Director</strong>
                        <span>Signature</span>
                      </div>
                      <div className="rc-sheet-card__qr" aria-hidden>
                        <img src={BRAND_LOGO_SRC} alt="" />
                        <span>Scan to verify</span>
                      </div>
                    </div>

                    {(report.teacherComment || report.principalComment) && (
                      <section className="rc-sheet-card__remarks">
                        <h5>General Remarks</h5>
                        <p>
                          {report.principalComment || report.teacherComment}
                        </p>
                      </section>
                    )}

                    <p className="rc-sheet-card__tagline">Learn | Grow | Succeed</p>
                  </article>
                </div>
              )}

              <div className="rc-booklet__actions">
                <button
                  type="button"
                  className="rc-v2__btn rc-v2__btn--primary"
                  onClick={() => openReportCardPrint(viewStudentId, termId, printMode)}
                >
                  Open print {printMode === "annual" ? "yearly" : "term"} report
                </button>
                <p>
                  {printMode === "annual"
                    ? "Print duplex · landscape A4 · short-edge flip · branding from Settings"
                    : "Print landscape A4 · two term cards per sheet · cut along the dashed line"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rc-v2__empty">
              <span className="rc-v2__empty-icon" aria-hidden>
                <DashIcon name="report-card" className="dash-icon--lg" />
              </span>
              <h4>No preview loaded</h4>
              <p>Choose a student and term above, then load to review before printing.</p>
            </div>
          )}
        </section>

        <section
          className="rc-v2__card rc-v2__card--comments"
          aria-label="Report card comments"
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
        Scores must be published before report cards reflect final marks. Manage grading in{" "}
        <Link href="/admin/results" className="rc-v2__text-link">
          Results
        </Link>
        .
      </p>
    </div>
  );
}
