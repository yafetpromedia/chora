"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { createSubject, listSubjects, type Subject } from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AdminSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setSubjects(await listSubjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subjects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void load();
  }, [router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await createSubject({ name: name.trim(), code: code.trim().toUpperCase() });
      setName("");
      setCode("");
      setSaved("Subject added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add subject");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Subjects"
      subtitle="School subject catalog — then assign subjects to grades and teachers."
      eyebrow="Academics"
    >
      <div className="att-page sub-page">
        {error ? <p className="att-toast att-toast--error">{error}</p> : null}
        {saved ? <p className="att-toast">{saved}</p> : null}

        <Link href="/admin/subjects/assign" className="sub-assign-card">
          <span className="sub-assign-card__title">Assign subjects to classes</span>
          <span className="sub-assign-card__desc">
            Pick a grade, add subjects, and assign a teacher for each (Math, English, etc.).
          </span>
          <span className="sub-assign-card__cta">Open assignment →</span>
        </Link>

        <section className="sub-catalog">
          <h2 className="setup-panel-label">Subject catalog</h2>
          <p className="setup-hint">
            Add every subject your school teaches once. Class assignment links them to grades.
          </p>

          <form className="sub-add-form" onSubmit={(e) => void onCreate(e)}>
            <label>
              Subject name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mathematics"
                required
              />
            </label>
            <label>
              Code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MATH"
                required
                maxLength={12}
              />
            </label>
            <button type="submit" className="att-btn att-btn--primary" disabled={busy}>
              {busy ? "Adding…" : "Add subject"}
            </button>
          </form>

          {loading ? (
            <p className="setup-hint">Loading subjects…</p>
          ) : subjects.length === 0 ? (
            <p className="setup-hint">No subjects yet. Add your first subject above.</p>
          ) : (
            <div className="tch-table-wrap">
              <table className="tch-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>
                        <code className="sub-code">{s.code}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardPage>
  );
}
