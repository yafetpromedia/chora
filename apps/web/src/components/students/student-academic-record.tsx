"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createBehavior,
  executeGraduation,
  getEnrollmentHistory,
  getHealth,
  getStudentRecordsSummary,
  getTranscript,
  issueCertificate,
  listBehavior,
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
  | "discipline"
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

const BEHAVIOR_TYPES = [
  "LATE_ARRIVAL",
  "ABSENT_WITHOUT_REASON",
  "DISRUPTIVE",
  "EXCELLENT_CONDUCT",
  "WARNING",
  "SUSPENSION",
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
  const [behavior, setBehavior] = useState<
    Array<{
      id: string;
      date: string;
      type: string;
      note: string | null;
      recordedBy: { firstName: string; lastName: string };
    }>
  >([]);
  const [certificates, setCertificates] = useState<
    Array<{ id: string; type: string; certificateNumber: string; issuedAt: string }>
  >([]);
  const [health, setHealth] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [behaviorDate, setBehaviorDate] = useState("");
  const [behaviorType, setBehaviorType] = useState<string>("LATE_ARRIVAL");
  const [behaviorNote, setBehaviorNote] = useState("");
  const [docType, setDocType] = useState<string>("BIRTH_CERTIFICATE");
  const [gradPreview, setGradPreview] = useState<{
    ready: boolean;
    requirements: { label: string; met: boolean }[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, enr, tr, t] = await Promise.all([
        getStudentRecordsSummary(profileId),
        getEnrollmentHistory(profileId),
        getTranscript(profileId),
        listTerms(),
      ]);
      setSummary(s);
      setEnrollments(enr);
      setTranscript(tr);
      setTerms(t.map((x) => ({ id: x.id, name: x.name, isCurrent: x.isCurrent })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "documents") {
      void listDocuments(profileId).then(setDocuments).catch(() => {});
    }
    if (tab === "discipline") {
      void listBehavior(profileId).then(setBehavior).catch(() => {});
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
    await updateHealth(profileId, health);
    setError("");
  }

  async function onAddBehavior(e: FormEvent) {
    e.preventDefault();
    await createBehavior(profileId, {
      date: behaviorDate,
      type: behaviorType,
      note: behaviorNote || undefined,
    });
    setBehaviorNote("");
    setBehavior(await listBehavior(profileId));
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
    { id: "discipline", label: "Discipline" },
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

  return (
    <div className="stu-rec">
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <header className="stu-rec-hero">
        <div>
          <Link href="/admin/students" className="stu-rec-back">
            ← Students
          </Link>
          <h1>{summary.student.name}</h1>
          <p className="stu-rec-meta">
            {summary.student.studentId ?? "—"} · {summary.student.grade}
            {summary.student.section ? ` · ${summary.student.section}` : ""} ·{" "}
            <span className={`stu-rec-status stu-rec-status--${summary.student.status.toLowerCase()}`}>
              {summary.student.status}
            </span>
          </p>
        </div>
        <div className="stu-rec-hero-actions">
          <button type="button" className="plat-btn plat-btn--ghost" onClick={() => void load()}>
            Refresh
          </button>
          <button
            type="button"
            className="plat-btn plat-btn--primary"
            onClick={() => openTranscriptPrint(profileId)}
          >
            Print transcript
          </button>
        </div>
      </header>

      <div className="stu-rec-kpis">
        <div className="stu-rec-kpi">
          <strong>{summary.attendance.rate ?? "—"}%</strong>
          <span>Attendance rate</span>
        </div>
        <div className="stu-rec-kpi">
          <strong>{enrollments.length}</strong>
          <span>Enrollment years</span>
        </div>
        <div className="stu-rec-kpi">
          <strong>{summary.counts.documents}</strong>
          <span>Documents</span>
        </div>
        <div className="stu-rec-kpi">
          <strong>
            {summary.finance
              ? `${(summary.finance.outstandingCents / 100).toLocaleString()} ETB due`
              : "—"}
          </strong>
          <span>Outstanding fees</span>
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
            <h2>Promotion history</h2>
            <ul className="stu-rec-timeline">
              {enrollments.map((e) => (
                <li key={e.id}>
                  <strong>{e.academicYear.name}</strong> — {e.grade.name}
                  {e.section ? ` (${e.section.name})` : ""}
                  <span className="stu-rec-pill">{e.promotionOutcome}</span>
                  {e.isCurrent ? <span className="stu-rec-pill stu-rec-pill--current">Current</span> : null}
                </li>
              ))}
            </ul>
            {gradPreview ? (
              <section className="stu-rec-grad">
                <h2>Graduation readiness</h2>
                <ul>
                  {gradPreview.requirements.map((r) => (
                    <li key={r.label} className={r.met ? "stu-rec-met" : "stu-rec-unmet"}>
                      {r.met ? "✓" : "○"} {r.label}
                    </li>
                  ))}
                </ul>
                {gradPreview.ready && summary.student.status === "ACTIVE" ? (
                  <button type="button" className="plat-btn plat-btn--primary" onClick={() => void onGraduate()}>
                    Graduate student
                  </button>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "attendance" ? (
          <p className="stu-rec-hint">
            Present {summary.attendance.present} of {summary.attendance.total} daily records (
            {summary.attendance.rate ?? 0}%).
          </p>
        ) : null}

        {tab === "results" ? (
          <div>
            <p className="stu-rec-hint">Open report cards per term (published results).</p>
            <ul className="stu-rec-list">
              {terms.map((t) => (
                <li key={t.id}>
                  {t.name}
                  {t.isCurrent ? " (current)" : ""}
                  <button
                    type="button"
                    className="dash-copy-btn"
                    onClick={() => openReportCardPrint(profileId, t.id)}
                  >
                    Report card
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "fees" ? (
          <div>
            {summary.finance ? (
              <ul className="stu-rec-list">
                <li>Total due: {(summary.finance.totalDueCents / 100).toLocaleString()} ETB</li>
                <li>Paid: {(summary.finance.totalPaidCents / 100).toLocaleString()} ETB</li>
                <li>
                  Outstanding: {(summary.finance.outstandingCents / 100).toLocaleString()} ETB
                </li>
              </ul>
            ) : (
              <p className="stu-rec-hint">No finance data.</p>
            )}
            <Link href="/admin/finance" className="plat-btn plat-btn--ghost plat-btn--xs">
              Open finance module
            </Link>
          </div>
        ) : null}

        {tab === "discipline" ? (
          <div>
            <form className="stu-rec-form" onSubmit={(e) => void onAddBehavior(e)}>
              <input type="date" value={behaviorDate} onChange={(e) => setBehaviorDate(e.target.value)} required />
              <select value={behaviorType} onChange={(e) => setBehaviorType(e.target.value)}>
                {BEHAVIOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input placeholder="Note" value={behaviorNote} onChange={(e) => setBehaviorNote(e.target.value)} />
              <button type="submit" className="plat-btn plat-btn--primary plat-btn--xs">
                Add record
              </button>
            </form>
            <ul className="stu-rec-list">
              {behavior.map((b) => (
                <li key={b.id}>
                  <strong>{new Date(b.date).toLocaleDateString()}</strong> — {b.type.replace(/_/g, " ")}
                  {b.note ? `: ${b.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "documents" ? (
          <div>
            <form className="stu-rec-form" onSubmit={(e) => void onUploadDoc(e)}>
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
            <ul className="stu-rec-list">
              {documents.map((d) => (
                <li key={d.id}>
                  {d.title ?? d.type} —{" "}
                  <button
                    type="button"
                    className="dash-copy-btn"
                    onClick={() => void openStudentDocument(d.fileUrl)}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "transcript" && transcript ? (
          <div className="stu-rec-transcript">
            <p>
              Overall average: <strong>{transcript.overallAverage ?? "—"}%</strong> · GPA:{" "}
              <strong>{transcript.overallGpa ?? "—"}</strong>
            </p>
            {transcript.years.map((y) => (
              <section key={y.academicYear} className="stu-rec-year">
                <h3>
                  {y.academicYear} — {y.grade}
                  {y.yearAverage != null ? ` (${y.yearAverage}%)` : ""}
                </h3>
                {y.terms.map((t) => (
                  <div key={t.termId}>
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
        ) : null}

        {tab === "certificates" ? (
          <div>
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
            <ul className="stu-rec-list">
              {certificates.map((c) => (
                <li key={c.id}>
                  {c.type} — {c.certificateNumber}
                  <button
                    type="button"
                    className="dash-copy-btn"
                    onClick={() => openCertificatePrint(profileId, c.id)}
                  >
                    Print
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "health" ? (
          <form className="stu-rec-health" onSubmit={(e) => void onSaveHealth(e)}>
            <label>
              Blood type
              <input value={health.bloodType ?? ""} onChange={(e) => setHealth({ ...health, bloodType: e.target.value })} />
            </label>
            <label>
              Emergency contact
              <input
                value={health.emergencyContactName ?? ""}
                onChange={(e) => setHealth({ ...health, emergencyContactName: e.target.value })}
              />
            </label>
            <label>
              Emergency phone
              <input
                value={health.emergencyContactPhone ?? ""}
                onChange={(e) => setHealth({ ...health, emergencyContactPhone: e.target.value })}
              />
            </label>
            <label>
              Allergies
              <textarea value={health.allergies ?? ""} onChange={(e) => setHealth({ ...health, allergies: e.target.value })} />
            </label>
            <label>
              Medical conditions
              <textarea
                value={health.medicalConditions ?? ""}
                onChange={(e) => setHealth({ ...health, medicalConditions: e.target.value })}
              />
            </label>
            <label>
              Medication notes
              <textarea
                value={health.medicationNotes ?? ""}
                onChange={(e) => setHealth({ ...health, medicationNotes: e.target.value })}
              />
            </label>
            <button type="submit" className="plat-btn plat-btn--primary">
              Save health record
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
