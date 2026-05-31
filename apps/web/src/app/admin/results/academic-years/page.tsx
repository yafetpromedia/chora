"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  createAcademicYear,
  listAcademicYears,
  setCurrentAcademicYear,
  type AcademicYear,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";

export default function AcademicYearsPage() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);

  async function load() {
    setYears(await listAcademicYears());
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createAcademicYear({ name, startDate, endDate, isCurrent });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function onSetCurrent(id: string) {
    setError("");
    try {
      await setCurrentAcademicYear(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <DashboardPage
      role="admin"
      title="Academic years"
      subtitle="Define the school calendar. Terms and class subjects belong to the active year."
      eyebrow="Academics"
    >
      <p className="setup-hint">
        <Link href="/admin/results">← Results</Link>
        {" · "}
        <Link href="/admin/results/promotion">End-of-year promotion</Link>
      </p>
      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      {loading ? (
        <p className="setup-hint">Loading…</p>
      ) : (
        <ul className="setup-student-list">
          {years.map((y) => (
            <li key={y.id}>
              <strong>{y.name}</strong>
              {y.isCurrent ? " (current)" : ""}
              <span className="setup-hint">
                {" "}
                · {y._count?.academicTerms ?? 0} terms · {y._count?.classSubjects ?? 0}{" "}
                class subjects
              </span>
              {!y.isCurrent ? (
                <button
                  type="button"
                  className="dash-copy-btn"
                  style={{ marginLeft: "0.5rem" }}
                  onClick={() => void onSetCurrent(y.id)}
                >
                  Set current
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <section className="att-admin-section">
        <h2 className="setup-panel-label">Add academic year</h2>
        <form className="setup-form-grid" onSubmit={(e) => void onCreate(e)}>
          <label className="att-field att-field--wide">
            <span>Name</span>
            <input
              className="auth-input auth-input--login auth-input--login-plain"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2026/2027"
              required
            />
          </label>
          <label className="att-field">
            <span>Start</span>
            <input
              type="date"
              className="auth-input auth-input--login auth-input--login-plain"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="att-field">
            <span>End</span>
            <input
              type="date"
              className="auth-input auth-input--login auth-input--login-plain"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label className="att-field">
            <span>
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
              />{" "}
              Set as current year
            </span>
          </label>
          <button type="submit" className="auth-page-submit">
            Create year
          </button>
        </form>
      </section>
    </DashboardPage>
  );
}
