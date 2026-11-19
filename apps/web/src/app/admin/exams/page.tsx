"use client";

import { FormEvent, useEffect, useState } from "react";
import { useClientSnapshot } from "@/lib/use-client-snapshot";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AppToast } from "@/components/ui/app-toast";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { getOrEnsureCurrentAcademicYear, listTerms, type AcademicTerm } from "@/lib/results";
import {
  createExamSchedule,
  deleteExamSchedule,
  listExamSchedules,
  type ExamScheduleListItem,
} from "@/lib/exam-schedule";

export default function AdminExamSchedulesPage() {
  const router = useRouter();
  const canEdit = useClientSnapshot(
    () => hasPermission(Permission.TIMETABLE_MANAGE),
    false,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [yearId, setYearId] = useState("");
  const [yearName, setYearName] = useState("");
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [rows, setRows] = useState<ExamScheduleListItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [shiftLabel, setShiftLabel] = useState("");
  const [termId, setTermId] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        const year = await getOrEnsureCurrentAcademicYear();
        setYearId(year.id);
        setYearName(year.name);
        const [t, schedules] = await Promise.all([
          listTerms(year.id),
          listExamSchedules(year.id),
        ]);
        setTerms(t);
        setRows(schedules);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load exam schedules");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canEdit || !yearId || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await createExamSchedule({
        academicYearId: yearId,
        academicTermId: termId || null,
        title: title.trim(),
        shiftLabel: shiftLabel.trim() || null,
      });
      setCreateOpen(false);
      setTitle("");
      setShiftLabel("");
      setTermId("");
      router.push(`/admin/exams/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create schedule");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setBusy(true);
    setError("");
    try {
      await deleteExamSchedule(deleteId);
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      setSaved("Exam schedule deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardPage role="admin" title="Exam schedules">
      <div className="ex-page">
        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />
        <AppConfirmDialog
          open={Boolean(deleteId)}
          tone="danger"
          title="Delete exam schedule?"
          message="This removes all days and subjects on this schedule."
          confirmLabel="Delete"
          cancelLabel="Keep"
          busy={busy}
          onCancel={() => !busy && setDeleteId(null)}
          onConfirm={() => void confirmDelete()}
        />

        <header className="ex-hero">
          <div className="ex-hero__glow" aria-hidden />
          <div className="ex-hero__inner">
            <div>
              <p className="ex-hero__eyebrow">{yearName || "Academic year"}</p>
              <h2 className="ex-hero__title">Exam schedules</h2>
              <p className="ex-hero__sub">
                Mid and final exam calendars by date and grade — like the board posters, built for
                screen and print.
              </p>
            </div>
            {canEdit ? (
              <button
                type="button"
                className="ex-btn ex-btn--primary"
                onClick={() => setCreateOpen(true)}
              >
                + New schedule
              </button>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className="ex-loading">Loading schedules…</div>
        ) : rows.length === 0 ? (
          <div className="ex-empty">
            <h3>No exam schedules yet</h3>
            <p>Create one for a mid exam, final, or make-up week.</p>
            {canEdit ? (
              <button
                type="button"
                className="ex-btn ex-btn--primary"
                onClick={() => setCreateOpen(true)}
              >
                Create schedule
              </button>
            ) : null}
          </div>
        ) : (
          <div className="ex-list">
            {rows.map((row) => (
              <article key={row.id} className="ex-card">
                <div className="ex-card__top">
                  <div>
                    <h3 className="ex-card__title">{row.title}</h3>
                    <p className="ex-card__meta">
                      {[
                        row.shiftLabel,
                        row.academicTerm?.name,
                        `${row._count.days} day${row._count.days === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={`ex-pill ${row.status === "PUBLISHED" ? "ex-pill--live" : ""}`}
                  >
                    {row.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="ex-card__actions">
                  <Link href={`/admin/exams/${row.id}`} className="ex-btn ex-btn--primary">
                    Open
                  </Link>
                  {canEdit ? (
                    <button
                      type="button"
                      className="ex-btn ex-btn--ghost"
                      onClick={() => setDeleteId(row.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        {createOpen && canEdit ? (
          <div className="ex-modal" role="presentation">
            <button
              type="button"
              className="ex-modal__backdrop"
              aria-label="Close"
              onClick={() => setCreateOpen(false)}
            />
            <form className="ex-modal__panel" onSubmit={(e) => void onCreate(e)}>
              <h3 className="ex-modal__title">New exam schedule</h3>
              <label className="ex-field">
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 1st Term Mid Exam"
                  required
                />
              </label>
              <label className="ex-field">
                Shift (optional)
                <input
                  value={shiftLabel}
                  onChange={(e) => setShiftLabel(e.target.value)}
                  placeholder="e.g. Shift One"
                />
              </label>
              <label className="ex-field">
                Term (optional)
                <select value={termId} onChange={(e) => setTermId(e.target.value)}>
                  <option value="">No term</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ex-modal__actions">
                <button
                  type="button"
                  className="ex-btn ex-btn--ghost"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ex-btn ex-btn--primary" disabled={busy}>
                  {busy ? "Creating…" : "Create & edit"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </DashboardPage>
  );
}
