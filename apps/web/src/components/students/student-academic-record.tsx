"use client";

import Link from "next/link";
import { EtbAmount } from "@/components/billing/etb-amount";
import { useLocale } from "@/components/i18n/locale-provider";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { MessageKey } from "@/lib/i18n";
import {
  executeGraduation,
  getEnrollmentHistory,
  getHealth,
  getStudentRecordsSummary,
  getTranscript,
  issueCertificate,
  listCertificates,
  listDocuments,
  openTranscriptPrint,
  openCertificatePrint,
  previewGraduation,
  updateHealth,
  uploadDocument,
  openStudentDocument,
  type EnrollmentRow,
  type StudentRecordSummary,
  type Transcript,
} from "@/lib/student-records";
import { listTerms, openReportCardPrint } from "@/lib/results";

type Tab =
  | "overview"
  | "attendance"
  | "results"
  | "fees"
  | "documents"
  | "transcript"
  | "certificates"
  | "health";

const DOC_TYPES = [
  "BIRTH_CERTIFICATE",
  "NATIONAL_ID",
  "PASSPORT",
  "TRANSFER_LETTER",
  "RECOMMENDATION_LETTER",
  "MEDICAL",
  "PHOTO",
  "OTHER",
] as const;

const CERT_TYPES = ["ENROLLMENT", "COMPLETION", "GRADUATION", "CONDUCT"] as const;

export function StudentAcademicRecord({ profileId }: { profileId: string }) {
  const { t, tn } = useLocale();
  const docLabel = (type: string) =>
    t(`studentAcademicRecordUi.docType_${type}` as MessageKey);
  const certLabel = (value: string) =>
    t(`studentAcademicRecordUi.cert_${value}` as MessageKey);

  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<StudentRecordSummary | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [terms, setTerms] = useState<{ id: string; name: string; isCurrent: boolean }[]>([]);
  const [documents, setDocuments] = useState<
    Array<{ id: string; type: string; title: string | null; fileUrl: string; uploadedAt: string }>
  >([]);
  const [certificates, setCertificates] = useState<
    Array<{ id: string; type: string; certificateNumber: string; issuedAt: string }>
  >([]);
  const [health, setHealth] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [healthSaving, setHealthSaving] = useState(false);
  const [healthSaved, setHealthSaved] = useState(false);
  const [docType, setDocType] = useState<string>("BIRTH_CERTIFICATE");
  const [gradPreview, setGradPreview] = useState<{
    ready: boolean;
    requirements: { label: string; met: boolean }[];
  } | null>(null);

  const fetchRecord = useCallback(
    () =>
      Promise.all([
        getStudentRecordsSummary(profileId),
        getEnrollmentHistory(profileId),
        getTranscript(profileId),
        listTerms(),
      ]),
    [profileId],
  );

  const applyRecord = useCallback(
    ([s, enr, tr, termList]: Awaited<ReturnType<typeof fetchRecord>>) => {
      setSummary(s);
      setEnrollments(enr);
      setTranscript(tr);
      setTerms(
        termList.map((x) => ({ id: x.id, name: x.name, isCurrent: x.isCurrent })),
      );
      if (s.health) {
        setHealth({
          bloodType: s.health.bloodType ?? "",
          emergencyContactName: s.health.emergencyContactName ?? "",
          emergencyContactPhone: s.health.emergencyContactPhone ?? "",
          allergies: s.health.allergies ?? "",
          medicalConditions: s.health.medicalConditions ?? "",
          medicationNotes: s.health.medicationNotes ?? "",
        });
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      applyRecord(await fetchRecord());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studentAcademicRecordUi.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [fetchRecord, applyRecord]);

  const [prevProfileId, setPrevProfileId] = useState(profileId);
  if (profileId !== prevProfileId) {
    setPrevProfileId(profileId);
    setLoading(true);
    setError("");
  }

  useEffect(() => {
    void fetchRecord()
      .then(applyRecord)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("studentAcademicRecordUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [fetchRecord, applyRecord]);

  useEffect(() => {
    if (tab === "documents") {
      void listDocuments(profileId).then(setDocuments).catch(() => {});
    }
    if (tab === "certificates") {
      void listCertificates(profileId).then(setCertificates).catch(() => {});
    }
    if (tab === "health") {
      void getHealth(profileId).then((h) => {
        if (h) {
          setHealth({
            bloodType: h.bloodType ?? "",
            emergencyContactName: h.emergencyContactName ?? "",
            emergencyContactPhone: h.emergencyContactPhone ?? "",
            allergies: h.allergies ?? "",
            medicalConditions: h.medicalConditions ?? "",
            medicationNotes: h.medicationNotes ?? "",
          });
        }
      });
    }
    if (tab === "overview") {
      void previewGraduation(profileId).then(setGradPreview).catch(() => {});
    }
  }, [tab, profileId]);

  async function onSaveHealth(e: FormEvent) {
    e.preventDefault();
    setHealthSaving(true);
    setHealthSaved(false);
    setError("");
    try {
      await updateHealth(profileId, health);
      const s = await getStudentRecordsSummary(profileId);
      setSummary(s);
      setHealthSaved(true);
      window.setTimeout(() => setHealthSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studentAcademicRecordUi.saveHealthFailed"));
    } finally {
      setHealthSaving(false);
    }
  }

  async function onUploadDoc(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    await uploadDocument(profileId, docType, file);
    setDocuments(await listDocuments(profileId));
    form.reset();
  }

  async function onIssueCert(type: string) {
    await issueCertificate(profileId, type);
    setCertificates(await listCertificates(profileId));
  }

  async function onGraduate() {
    if (!confirm(t("studentAcademicRecordUi.graduateConfirm"))) return;
    await executeGraduation(profileId);
    await load();
  }

  const tabs: { id: Tab; label: string }[] = useMemo(
    () => [
      { id: "overview", label: t("studentAcademicRecordUi.tabOverview") },
      { id: "attendance", label: tn("Attendance") },
      { id: "results", label: tn("Results") },
      { id: "fees", label: tn("Fees") },
      { id: "documents", label: t("studentAcademicRecordUi.tabDocuments") },
      { id: "transcript", label: t("studentAcademicRecordUi.tabTranscript") },
      { id: "certificates", label: t("studentAcademicRecordUi.tabCertificates") },
      { id: "health", label: t("studentAcademicRecordUi.tabHealth") },
    ],
    [t, tn],
  );

  if (loading && !summary) {
    return <p className="stu-rec-loading">{t("studentAcademicRecordUi.loading")}</p>;
  }

  if (!summary) {
    return (
      <p className="auth-alert auth-alert--error">
        {error || t("studentAcademicRecordUi.notFound")}
      </p>
    );
  }

  const bloodChip =
    health.bloodType?.trim() ||
    summary.health?.bloodType?.trim() ||
    null;
  const enrollmentYears = Math.max(
    enrollments.length,
    summary.counts.enrollments ?? 0,
  );

  return (
    <div className="stu-rec">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <header className="stu-rec-hero">
        <div className="stu-rec-hero__main">
          <Link href="/admin/students" className="stu-rec-back">
            {t("studentAcademicRecordUi.backStudents")}
          </Link>
          <div className="stu-rec-hero__identity">
            {summary.student.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={summary.student.photoUrl}
                alt=""
                className="stu-rec-hero__photo"
              />
            ) : (
              <div className="stu-rec-hero__photo stu-rec-hero__photo--empty" aria-hidden>
                {summary.student.name.trim().slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="stu-rec-hero__text">
              <h1>{summary.student.name}</h1>
              <div className="stu-rec-meta">
                <span className="stu-rec-chip">{summary.student.studentId ?? "—"}</span>
                <span className="stu-rec-chip">{summary.student.grade}</span>
                {summary.student.section ? (
                  <span className="stu-rec-chip">{summary.student.section}</span>
                ) : null}
                <span
                  className={`stu-rec-chip stu-rec-chip--status stu-rec-status--${summary.student.status.toLowerCase()}`}
                >
                  {summary.student.status}
                </span>
                {bloodChip ? (
                  <span className="stu-rec-chip stu-rec-chip--blood">
                    {t("studentAcademicRecordUi.bloodChip", { type: bloodChip })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="stu-rec-hero-actions">
          <button
            type="button"
            className="stu-rec-btn stu-rec-btn--ghost"
            onClick={() => void load()}
          >
            {t("studentAcademicRecordUi.refresh")}
          </button>
          <button
            type="button"
            className="stu-rec-btn stu-rec-btn--primary"
            onClick={() => openTranscriptPrint(profileId)}
          >
            {t("studentAcademicRecordUi.printTranscript")}
          </button>
        </div>
      </header>

      <div className="stu-rec-kpis">
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">{t("studentAcademicRecordUi.kpiAttendance")}</span>
          <strong>{summary.attendance.rate ?? "—"}%</strong>
          <span className="stu-rec-kpi__hint">
            {t("studentAcademicRecordUi.presentOf", {
              present: summary.attendance.present,
              total: summary.attendance.total,
            })}
          </span>
        </div>
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">{t("studentAcademicRecordUi.kpiEnrollment")}</span>
          <strong>{enrollmentYears}</strong>
          <span className="stu-rec-kpi__hint">{t("studentAcademicRecordUi.academicYears")}</span>
        </div>
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">{t("studentAcademicRecordUi.kpiDocuments")}</span>
          <strong>{summary.counts.documents}</strong>
          <span className="stu-rec-kpi__hint">{t("studentAcademicRecordUi.onFile")}</span>
        </div>
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">{t("studentAcademicRecordUi.kpiFeesDue")}</span>
          <strong>
            {summary.finance ? (
              <EtbAmount cents={summary.finance.outstandingCents} maximumFractionDigits={0} />
            ) : (
              "—"
            )}
          </strong>
          <span className="stu-rec-kpi__hint">{t("studentAcademicRecordUi.outstanding")}</span>
        </div>
      </div>

      <nav className="stu-rec-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={`stu-rec-tab${tab === t.id ? " stu-rec-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="stu-rec-panel">
        {tab === "overview" ? (
          <div className="stu-rec-overview">
            <section className="stu-rec-card">
              <header className="stu-rec-card__head">
                <div>
                  <h2 className="stu-rec-card__title">{t("studentAcademicRecordUi.promotionTitle")}</h2>
                  <p className="stu-rec-card__lead">{t("studentAcademicRecordUi.promotionLead")}</p>
                </div>
                <span className="stu-rec-card__count">
                  {enrollments.length}{" "}
                  {enrollments.length === 1
                    ? t("studentAcademicRecordUi.yearOne")
                    : t("studentAcademicRecordUi.yearMany")}
                </span>
              </header>
              {enrollments.length === 0 ? (
                <p className="stu-rec-empty">{t("studentAcademicRecordUi.noEnrollmentYears")}</p>
              ) : (
                <ol className="stu-rec-timeline">
                  {enrollments.map((e, index) => (
                    <li
                      key={e.id}
                      className={`stu-rec-timeline__item${e.isCurrent ? " stu-rec-timeline__item--current" : ""}`}
                    >
                      <span className="stu-rec-timeline__rail" aria-hidden>
                        <span className="stu-rec-timeline__dot" />
                        {index < enrollments.length - 1 ? (
                          <span className="stu-rec-timeline__line" />
                        ) : null}
                      </span>
                      <div className="stu-rec-timeline__body">
                        <div className="stu-rec-timeline__top">
                          <strong className="stu-rec-timeline__year">
                            {e.academicYear.name}
                          </strong>
                          <div className="stu-rec-timeline__tags">
                            {e.isCurrent ? (
                              <span className="stu-rec-pill stu-rec-pill--current">
                                {t("studentAcademicRecordUi.current")}
                              </span>
                            ) : null}
                            {e.promotionOutcome ? (
                              <span className="stu-rec-pill">
                                {e.promotionOutcome}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="stu-rec-timeline__grade">
                          {e.grade.name}
                          {e.section ? (
                            <span className="stu-rec-timeline__section">
                              {" "}
                              · {e.section.name}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {gradPreview ? (
              <section className="stu-rec-card stu-rec-card--grad">
                <header className="stu-rec-card__head">
                  <div>
                    <h2 className="stu-rec-card__title">{t("studentAcademicRecordUi.graduationTitle")}</h2>
                    <p className="stu-rec-card__lead">{t("studentAcademicRecordUi.graduationLead")}</p>
                  </div>
                  {(() => {
                    const met = gradPreview.requirements.filter((r) => r.met).length;
                    const total = gradPreview.requirements.length || 1;
                    const pct = Math.round((met / total) * 100);
                    return (
                      <div
                        className={`stu-rec-progress${gradPreview.ready ? " stu-rec-progress--ready" : ""}`}
                        style={{ ["--stu-rec-pct" as string]: `${pct}%` }}
                        aria-label={t("studentAcademicRecordUi.requirementsAria", {
                          met,
                          total,
                        })}
                      >
                        <span className="stu-rec-progress__ring" aria-hidden />
                        <span className="stu-rec-progress__val">
                          {met}/{total}
                        </span>
                      </div>
                    );
                  })()}
                </header>
                <ul className="stu-rec-checks">
                  {gradPreview.requirements.map((r) => (
                    <li
                      key={r.label}
                      className={`stu-rec-check${r.met ? " stu-rec-check--met" : " stu-rec-check--unmet"}`}
                    >
                      <span className="stu-rec-check__icon" aria-hidden>
                        {r.met ? (
                          <svg viewBox="0 0 20 20" width="16" height="16">
                            <path
                              fill="currentColor"
                              d="M8.2 13.6 4.9 10.3l1.4-1.4 1.9 1.9 5.5-5.5 1.4 1.4z"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 20 20" width="16" height="16">
                            <circle
                              cx="10"
                              cy="10"
                              r="6.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="stu-rec-check__label">{r.label}</span>
                      <span className="stu-rec-check__state">
                        {r.met ? t("studentAcademicRecordUi.met") : t("studentAcademicRecordUi.pending")}
                      </span>
                    </li>
                  ))}
                </ul>
                {gradPreview.ready && summary.student.status === "ACTIVE" ? (
                  <div className="stu-rec-grad-actions">
                    <button
                      type="button"
                      className="plat-btn plat-btn--primary"
                      onClick={() => void onGraduate()}
                    >
                      {t("studentAcademicRecordUi.graduateStudent")}
                    </button>
                  </div>
                ) : (
                  <p className="stu-rec-grad-note">{t("studentAcademicRecordUi.graduationLocked")}</p>
                )}
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "attendance" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">{t("studentAcademicRecordUi.attendanceTitle")}</h2>
                <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.attendanceLead")}</p>
              </div>
            </header>
            <div className="stu-rec-stat-grid">
              <div className="stu-rec-stat">
                <span>{t("studentAcademicRecordUi.rate")}</span>
                <strong>{summary.attendance.rate ?? 0}%</strong>
              </div>
              <div className="stu-rec-stat">
                <span>{t("studentAcademicRecordUi.present")}</span>
                <strong>{summary.attendance.present}</strong>
              </div>
              <div className="stu-rec-stat">
                <span>{t("studentAcademicRecordUi.records")}</span>
                <strong>{summary.attendance.total}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "results" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">{t("studentAcademicRecordUi.reportCardsTitle")}</h2>
                <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.reportCardsLead")}</p>
              </div>
            </header>
            <ul className="stu-rec-rows">
              {terms.map((term) => (
                <li key={term.id} className="stu-rec-row">
                  <div>
                    <strong>{term.name}</strong>
                    {term.isCurrent ? (
                      <span className="stu-rec-pill stu-rec-pill--current">
                        {t("studentAcademicRecordUi.current")}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="plat-btn plat-btn--ghost plat-btn--xs"
                    onClick={() => openReportCardPrint(profileId, term.id)}
                  >
                    {t("studentAcademicRecordUi.reportCard")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tab === "fees" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">{t("studentAcademicRecordUi.feesTitle")}</h2>
                <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.feesLead")}</p>
              </div>
              <Link href="/admin/finance" className="plat-btn plat-btn--ghost plat-btn--xs">
                {t("studentAcademicRecordUi.openFinance")}
              </Link>
            </header>
            {summary.finance ? (
              <div className="stu-rec-stat-grid">
                <div className="stu-rec-stat">
                  <span>{t("studentAcademicRecordUi.totalDue")}</span>
                  <strong>
                    <EtbAmount cents={summary.finance.totalDueCents} maximumFractionDigits={0} />
                  </strong>
                </div>
                <div className="stu-rec-stat">
                  <span>{t("studentAcademicRecordUi.paid")}</span>
                  <strong>
                    <EtbAmount cents={summary.finance.totalPaidCents} maximumFractionDigits={0} />
                  </strong>
                </div>
                <div className="stu-rec-stat">
                  <span>{t("studentAcademicRecordUi.outstanding")}</span>
                  <strong>
                    <EtbAmount cents={summary.finance.outstandingCents} maximumFractionDigits={0} />
                  </strong>
                </div>
              </div>
            ) : (
              <p className="stu-rec-empty">{t("studentAcademicRecordUi.noFinance")}</p>
            )}
          </section>
        ) : null}

        {tab === "documents" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">{t("studentAcademicRecordUi.documentsTitle")}</h2>
                <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.documentsLead")}</p>
              </div>
            </header>
            <form className="stu-rec-form stu-rec-form--modern" onSubmit={(e) => void onUploadDoc(e)}>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((docType) => (
                  <option key={docType} value={docType}>
                    {docLabel(docType)}
                  </option>
                ))}
              </select>
              <input type="file" name="file" required />
              <button type="submit" className="plat-btn plat-btn--primary plat-btn--xs">
                {t("studentAcademicRecordUi.upload")}
              </button>
            </form>
            {documents.length === 0 ? (
              <p className="stu-rec-empty">{t("studentAcademicRecordUi.noDocuments")}</p>
            ) : (
              <ul className="stu-rec-rows">
                {documents.map((d) => (
                  <li key={d.id} className="stu-rec-row">
                    <div>
                      <strong>{d.title ?? docLabel(d.type)}</strong>
                      <span className="stu-rec-row__meta">{docLabel(d.type)}</span>
                    </div>
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--xs"
                      onClick={() => void openStudentDocument(d.fileUrl)}
                    >
                      {t("studentAcademicRecordUi.open")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "transcript" && transcript ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">{t("studentAcademicRecordUi.transcriptTitle")}</h2>
                <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.transcriptLead")}</p>
              </div>
              <div className="stu-rec-transcript-score">
                <span>
                  {t("studentAcademicRecordUi.avg")}{" "}
                  <strong>{transcript.overallAverage ?? "—"}%</strong>
                </span>
                <span>
                  {t("studentAcademicRecordUi.gpa")} <strong>{transcript.overallGpa ?? "—"}</strong>
                </span>
              </div>
            </header>
            {transcript.years.length === 0 ? (
              <p className="stu-rec-empty">{t("studentAcademicRecordUi.noTranscriptYears")}</p>
            ) : (
              <div className="stu-rec-transcript">
                {transcript.years.map((y) => (
                  <section key={y.academicYear} className="stu-rec-year">
                    <h3>
                      {y.academicYear} — {y.grade}
                      {y.yearAverage != null ? ` (${y.yearAverage}%)` : ""}
                    </h3>
                    {y.terms.map((termRow) => (
                      <div key={termRow.termId} className="stu-rec-term">
                        <h4>{termRow.termName}</h4>
                        <table className="stu-rec-table">
                          <thead>
                            <tr>
                              <th>{t("studentAcademicRecordUi.colSubject")}</th>
                              <th>{t("studentAcademicRecordUi.colAvg")}</th>
                              <th>{t("studentAcademicRecordUi.colGrade")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {termRow.subjects.map((s) => (
                              <tr key={s.subject}>
                                <td>{s.subject}</td>
                                <td>{s.average}%</td>
                                <td>{s.letter}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "certificates" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">{t("studentAcademicRecordUi.certificatesTitle")}</h2>
                <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.certificatesLead")}</p>
              </div>
            </header>
            <div className="stu-rec-cert-actions">
              {CERT_TYPES.map((certType) => (
                <button
                  key={certType}
                  type="button"
                  className="plat-btn plat-btn--ghost plat-btn--xs"
                  onClick={() => void onIssueCert(certType)}
                >
                  {t("studentAcademicRecordUi.issue", { type: certLabel(certType) })}
                </button>
              ))}
            </div>
            {certificates.length === 0 ? (
              <p className="stu-rec-empty">{t("studentAcademicRecordUi.noCertificates")}</p>
            ) : (
              <ul className="stu-rec-rows">
                {certificates.map((c) => (
                  <li key={c.id} className="stu-rec-row">
                    <div>
                      <strong>{c.type}</strong>
                      <span className="stu-rec-row__meta">{c.certificateNumber}</span>
                    </div>
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--xs"
                      onClick={() => openCertificatePrint(profileId, c.id)}
                    >
                      {t("studentAcademicRecordUi.print")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "health" ? (
          <form className="stu-rec-health stu-rec-section" onSubmit={(e) => void onSaveHealth(e)}>
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">{t("studentAcademicRecordUi.healthTitle")}</h2>
                <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.healthLead")}</p>
              </div>
              <div className="stu-rec-health-actions">
                {healthSaved ? (
                  <span className="stu-rec-health-saved" role="status">
                    {t("studentAcademicRecordUi.saved")}
                  </span>
                ) : null}
                <button
                  type="submit"
                  className="stu-rec-btn stu-rec-btn--primary"
                  disabled={healthSaving}
                >
                  {healthSaving ? t("common.saving") : t("studentAcademicRecordUi.saveHealth")}
                </button>
              </div>
            </header>
            <div className="stu-rec-health__grid">
              <label>
                {t("studentAcademicRecordUi.bloodType")}
                <select
                  value={health.bloodType ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, bloodType: e.target.value });
                  }}
                >
                  <option value="">{t("studentAcademicRecordUi.selectBloodGroup")}</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("studentAcademicRecordUi.emergencyContact")}
                <input
                  value={health.emergencyContactName ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, emergencyContactName: e.target.value });
                  }}
                />
              </label>
              <label>
                {t("studentAcademicRecordUi.emergencyPhone")}
                <input
                  value={health.emergencyContactPhone ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, emergencyContactPhone: e.target.value });
                  }}
                />
              </label>
              <label>
                {t("studentAcademicRecordUi.allergies")}
                <textarea
                  value={health.allergies ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, allergies: e.target.value });
                  }}
                />
              </label>
              <label>
                {t("studentAcademicRecordUi.medicalConditions")}
                <textarea
                  value={health.medicalConditions ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, medicalConditions: e.target.value });
                  }}
                />
              </label>
              <label>
                {t("studentAcademicRecordUi.medicationNotes")}
                <textarea
                  value={health.medicationNotes ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, medicationNotes: e.target.value });
                  }}
                />
              </label>
            </div>
            <div className="stu-rec-health-footer">
              <button
                type="submit"
                className="stu-rec-btn stu-rec-btn--primary"
                disabled={healthSaving}
              >
                {healthSaving ? t("common.saving") : t("studentAcademicRecordUi.saveHealth")}
              </button>
              <p className="stu-rec-section__lead">{t("studentAcademicRecordUi.healthFooter")}</p>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
