"use client";

import Link from "next/link";
import { EtbAmount } from "@/components/billing/etb-amount";
import { FormEvent, useCallback, useEffect, useState } from "react";
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

const CERT_TYPES = [
  { value: "ENROLLMENT", label: "Enrollment" },
  { value: "COMPLETION", label: "Completion" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "CONDUCT", label: "Conduct" },
] as const;

export function StudentAcademicRecord({ profileId }: { profileId: string }) {
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
    ([s, enr, tr, t]: Awaited<ReturnType<typeof fetchRecord>>) => {
      setSummary(s);
      setEnrollments(enr);
      setTranscript(tr);
      setTerms(t.map((x) => ({ id: x.id, name: x.name, isCurrent: x.isCurrent })));
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
      setError(err instanceof Error ? err.message : "Load failed");
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
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
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
      setError(err instanceof Error ? err.message : "Could not save health record");
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
    if (!confirm("Mark this student as graduated and issue certificate?")) return;
    await executeGraduation(profileId);
    await load();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "attendance", label: "Attendance" },
    { id: "results", label: "Results" },
    { id: "fees", label: "Fees" },
    { id: "documents", label: "Documents" },
    { id: "transcript", label: "Transcript" },
    { id: "certificates", label: "Certificates" },
    { id: "health", label: "Health" },
  ];

  if (loading && !summary) {
    return <p className="stu-rec-loading">Loading academic record…</p>;
  }

  if (!summary) {
    return <p className="auth-alert auth-alert--error">{error || "Student not found"}</p>;
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
            ← Students
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
                    Blood {bloodChip}
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
            Refresh
          </button>
          <button
            type="button"
            className="stu-rec-btn stu-rec-btn--primary"
            onClick={() => openTranscriptPrint(profileId)}
          >
            Print transcript
          </button>
        </div>
      </header>

      <div className="stu-rec-kpis">
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">Attendance</span>
          <strong>{summary.attendance.rate ?? "—"}%</strong>
          <span className="stu-rec-kpi__hint">
            {summary.attendance.present}/{summary.attendance.total} present
          </span>
        </div>
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">Enrollment</span>
          <strong>{enrollmentYears}</strong>
          <span className="stu-rec-kpi__hint">Academic years</span>
        </div>
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">Documents</span>
          <strong>{summary.counts.documents}</strong>
          <span className="stu-rec-kpi__hint">On file</span>
        </div>
        <div className="stu-rec-kpi">
          <span className="stu-rec-kpi__label">Fees due</span>
          <strong>
            {summary.finance ? (
              <EtbAmount cents={summary.finance.outstandingCents} maximumFractionDigits={0} />
            ) : (
              "—"
            )}
          </strong>
          <span className="stu-rec-kpi__hint">Outstanding</span>
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
                  <h2 className="stu-rec-card__title">Promotion history</h2>
                  <p className="stu-rec-card__lead">
                    Year-by-year grade path for this student.
                  </p>
                </div>
                <span className="stu-rec-card__count">
                  {enrollments.length}{" "}
                  {enrollments.length === 1 ? "year" : "years"}
                </span>
              </header>
              {enrollments.length === 0 ? (
                <p className="stu-rec-empty">No enrollment years recorded yet.</p>
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
                                Current
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
                    <h2 className="stu-rec-card__title">Graduation readiness</h2>
                    <p className="stu-rec-card__lead">
                      Checklist before marking the student graduated.
                    </p>
                  </div>
                  {(() => {
                    const met = gradPreview.requirements.filter((r) => r.met).length;
                    const total = gradPreview.requirements.length || 1;
                    const pct = Math.round((met / total) * 100);
                    return (
                      <div
                        className={`stu-rec-progress${gradPreview.ready ? " stu-rec-progress--ready" : ""}`}
                        style={{ ["--stu-rec-pct" as string]: `${pct}%` }}
                        aria-label={`${met} of ${total} requirements met`}
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
                        {r.met ? "Met" : "Pending"}
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
                      Graduate student
                    </button>
                  </div>
                ) : (
                  <p className="stu-rec-grad-note">
                    Complete the pending items to unlock graduation.
                  </p>
                )}
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "attendance" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">Attendance</h2>
                <p className="stu-rec-section__lead">Daily presence summary for this student.</p>
              </div>
            </header>
            <div className="stu-rec-stat-grid">
              <div className="stu-rec-stat">
                <span>Rate</span>
                <strong>{summary.attendance.rate ?? 0}%</strong>
              </div>
              <div className="stu-rec-stat">
                <span>Present</span>
                <strong>{summary.attendance.present}</strong>
              </div>
              <div className="stu-rec-stat">
                <span>Records</span>
                <strong>{summary.attendance.total}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "results" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">Report cards</h2>
                <p className="stu-rec-section__lead">
                  Open published term report cards for this student.
                </p>
              </div>
            </header>
            <ul className="stu-rec-rows">
              {terms.map((t) => (
                <li key={t.id} className="stu-rec-row">
                  <div>
                    <strong>{t.name}</strong>
                    {t.isCurrent ? (
                      <span className="stu-rec-pill stu-rec-pill--current">Current</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="plat-btn plat-btn--ghost plat-btn--xs"
                    onClick={() => openReportCardPrint(profileId, t.id)}
                  >
                    Report card
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
                <h2 className="stu-rec-section__title">Fees</h2>
                <p className="stu-rec-section__lead">Billing snapshot for this student.</p>
              </div>
              <Link href="/admin/finance" className="plat-btn plat-btn--ghost plat-btn--xs">
                Open finance
              </Link>
            </header>
            {summary.finance ? (
              <div className="stu-rec-stat-grid">
                <div className="stu-rec-stat">
                  <span>Total due</span>
                  <strong>
                    <EtbAmount cents={summary.finance.totalDueCents} maximumFractionDigits={0} />
                  </strong>
                </div>
                <div className="stu-rec-stat">
                  <span>Paid</span>
                  <strong>
                    <EtbAmount cents={summary.finance.totalPaidCents} maximumFractionDigits={0} />
                  </strong>
                </div>
                <div className="stu-rec-stat">
                  <span>Outstanding</span>
                  <strong>
                    <EtbAmount cents={summary.finance.outstandingCents} maximumFractionDigits={0} />
                  </strong>
                </div>
              </div>
            ) : (
              <p className="stu-rec-empty">No finance data yet.</p>
            )}
          </section>
        ) : null}

        {tab === "documents" ? (
          <section className="stu-rec-section">
            <header className="stu-rec-section__head">
              <div>
                <h2 className="stu-rec-section__title">Documents</h2>
                <p className="stu-rec-section__lead">
                  Upload and open permanent student files.
                </p>
              </div>
            </header>
            <form className="stu-rec-form stu-rec-form--modern" onSubmit={(e) => void onUploadDoc(e)}>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input type="file" name="file" required />
              <button type="submit" className="plat-btn plat-btn--primary plat-btn--xs">
                Upload
              </button>
            </form>
            {documents.length === 0 ? (
              <p className="stu-rec-empty">No documents uploaded yet.</p>
            ) : (
              <ul className="stu-rec-rows">
                {documents.map((d) => (
                  <li key={d.id} className="stu-rec-row">
                    <div>
                      <strong>{d.title ?? d.type.replace(/_/g, " ")}</strong>
                      <span className="stu-rec-row__meta">{d.type.replace(/_/g, " ")}</span>
                    </div>
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--xs"
                      onClick={() => void openStudentDocument(d.fileUrl)}
                    >
                      Open
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
                <h2 className="stu-rec-section__title">Transcript</h2>
                <p className="stu-rec-section__lead">Cumulative academic performance.</p>
              </div>
              <div className="stu-rec-transcript-score">
                <span>
                  Avg <strong>{transcript.overallAverage ?? "—"}%</strong>
                </span>
                <span>
                  GPA <strong>{transcript.overallGpa ?? "—"}</strong>
                </span>
              </div>
            </header>
            {transcript.years.length === 0 ? (
              <p className="stu-rec-empty">No transcript years yet.</p>
            ) : (
              <div className="stu-rec-transcript">
                {transcript.years.map((y) => (
                  <section key={y.academicYear} className="stu-rec-year">
                    <h3>
                      {y.academicYear} — {y.grade}
                      {y.yearAverage != null ? ` (${y.yearAverage}%)` : ""}
                    </h3>
                    {y.terms.map((t) => (
                      <div key={t.termId} className="stu-rec-term">
                        <h4>{t.termName}</h4>
                        <table className="stu-rec-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Avg</th>
                              <th>Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.subjects.map((s) => (
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
                <h2 className="stu-rec-section__title">Certificates</h2>
                <p className="stu-rec-section__lead">Issue and print official certificates.</p>
              </div>
            </header>
            <div className="stu-rec-cert-actions">
              {CERT_TYPES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="plat-btn plat-btn--ghost plat-btn--xs"
                  onClick={() => void onIssueCert(c.value)}
                >
                  Issue {c.label}
                </button>
              ))}
            </div>
            {certificates.length === 0 ? (
              <p className="stu-rec-empty">No certificates issued yet.</p>
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
                      Print
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
                <h2 className="stu-rec-section__title">Health record</h2>
                <p className="stu-rec-section__lead">
                  Blood group and medical notes for ID cards and emergencies.
                </p>
              </div>
              <div className="stu-rec-health-actions">
                {healthSaved ? (
                  <span className="stu-rec-health-saved" role="status">
                    Saved
                  </span>
                ) : null}
                <button
                  type="submit"
                  className="stu-rec-btn stu-rec-btn--primary"
                  disabled={healthSaving}
                >
                  {healthSaving ? "Saving…" : "Save health record"}
                </button>
              </div>
            </header>
            <div className="stu-rec-health__grid">
              <label>
                Blood type
                <select
                  value={health.bloodType ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, bloodType: e.target.value });
                  }}
                >
                  <option value="">Select blood group</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Emergency contact
                <input
                  value={health.emergencyContactName ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, emergencyContactName: e.target.value });
                  }}
                />
              </label>
              <label>
                Emergency phone
                <input
                  value={health.emergencyContactPhone ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, emergencyContactPhone: e.target.value });
                  }}
                />
              </label>
              <label>
                Allergies
                <textarea
                  value={health.allergies ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, allergies: e.target.value });
                  }}
                />
              </label>
              <label>
                Medical conditions
                <textarea
                  value={health.medicalConditions ?? ""}
                  onChange={(e) => {
                    setHealthSaved(false);
                    setHealth({ ...health, medicalConditions: e.target.value });
                  }}
                />
              </label>
              <label>
                Medication notes
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
                {healthSaving ? "Saving…" : "Save health record"}
              </button>
              <p className="stu-rec-section__lead">
                Choose blood type, then click Save. It appears on the ID card after saving.
              </p>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
