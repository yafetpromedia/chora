"use client";

import { useCallback, useEffect, useState } from "react";
import type { GradeWithSections } from "@/lib/api";
import {
  listAttendancePermissionRequests,
  listGradesForAttendance,
  reviewAttendancePermissionRequest,
  type AttendancePermissionRequest,
  type AttendancePermissionType,
} from "@/lib/attendance";
import { getMyTeacherProfile } from "@/lib/teachers";

const TYPE_LABEL: Record<AttendancePermissionType, string> = {
  ABSENCE: "Absence",
  LATE: "Late arrival",
  EARLY_LEAVE: "Early leave",
  OTHER: "Other",
};

const REASON_LABEL: Record<string, string> = {
  sick: "Sick",
  family_emergency: "Family emergency",
  unexcused: "Unexcused",
  other: "Other",
};

function formatDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AttendancePermissionReview() {
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [requests, setRequests] = useState<AttendancePermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  const selectedGrade = grades.find((g) => g.id === gradeId);

  const load = useCallback(async () => {
    if (!gradeId) return;
    setLoading(true);
    setError("");
    try {
      const rows = await listAttendancePermissionRequests({
        gradeId,
        sectionId: sectionId || undefined,
        status: filter === "PENDING" ? "PENDING" : undefined,
      });
      setRequests(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [gradeId, sectionId, filter]);

  useEffect(() => {
    void Promise.all([listGradesForAttendance(), getMyTeacherProfile().catch(() => null)])
      .then(([g, profile]) => {
        setGrades(g);
        const homeroom = profile?.homeroom;
        const preferred =
          homeroom?.gradeId && g.some((x) => x.id === homeroom.gradeId)
            ? homeroom.gradeId
            : g[0]?.id ?? "";
        setGradeId(preferred);
        const grade = g.find((x) => x.id === preferred);
        const sectionPreferred =
          homeroom?.sectionId && grade?.sections.some((s) => s.id === homeroom.sectionId)
            ? homeroom.sectionId
            : "";
        setSectionId(sectionPreferred);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (gradeId) void load();
  }, [gradeId, sectionId, filter, load]);

  async function onReview(id: string, status: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setError("");
    try {
      await reviewAttendancePermissionRequest(id, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="att-perm-review">
      <section className="att-v4__filters">
        <div className="att-v4__field">
          <span>Grade</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
            }}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-v4__field">
          <span>Section</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="att-manual__view-tabs att-perm-review__tabs">
          <button
            type="button"
            className={`att-manual__view-tab${filter === "PENDING" ? " att-manual__view-tab--on" : ""}`}
            onClick={() => setFilter("PENDING")}
          >
            Pending
            <span className="att-manual__view-count">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`att-manual__view-tab${filter === "ALL" ? " att-manual__view-tab--on" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All
          </button>
        </div>
      </section>

      {error ? <p className="att-v4__flash att-v4__flash--err">{error}</p> : null}

      <section className="att-perm-review__list-card">
        <header className="att-perm-review__list-head">
          <h2 className="att-perm-review__list-title">Permission requests</h2>
          <p className="att-perm-review__list-sub">
            Students and parents can seek absence, late, or early-leave permission here.
          </p>
        </header>

        {loading ? (
          <div className="att-manual__empty">
            <span className="att-manual__empty-spinner" aria-hidden />
            <p>Loading requests…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="att-manual__empty">
            <p className="att-manual__empty-title">No requests</p>
            <span>
              {filter === "PENDING"
                ? "No pending permission requests for this class."
                : "No permission requests found for this class."}
            </span>
          </div>
        ) : (
          <ul className="att-perm-review__list">
            {requests.map((r) => (
              <li
                key={r.id}
                className={`att-perm-review__item att-perm-review__item--${r.status.toLowerCase()}`}
              >
                <div className="att-perm-review__item-main">
                  <div className="att-perm-review__item-top">
                    <p className="att-perm-review__student">{r.studentName}</p>
                    <span className={`att-perm__status att-perm__status--${r.status.toLowerCase()}`}>
                      {r.status === "PENDING"
                        ? "Pending"
                        : r.status === "APPROVED"
                          ? "Approved"
                          : "Rejected"}
                    </span>
                  </div>
                  <p className="att-perm-review__meta">
                    {TYPE_LABEL[r.type]} · {formatDate(r.date)}
                    {r.sectionName ? ` · ${r.sectionName}` : ""}
                  </p>
                  {r.reason ? (
                    <p className="att-perm-review__reason">
                      Reason: {REASON_LABEL[r.reason] ?? r.reason}
                    </p>
                  ) : null}
                  {r.note ? <p className="att-perm-review__note">{r.note}</p> : null}
                  <p className="att-perm-review__by">
                    Requested by {r.requestedBy}
                    {r.requestedByRole === "parent" ? " (parent)" : ""}
                  </p>
                  {r.reviewNote ? (
                    <p className="att-perm-review__review-note">Your note: {r.reviewNote}</p>
                  ) : null}
                </div>
                {r.status === "PENDING" ? (
                  <div className="att-perm-review__actions">
                    <button
                      type="button"
                      className="att-v4__btn att-v4__btn--primary"
                      disabled={busyId === r.id}
                      onClick={() => void onReview(r.id, "APPROVED")}
                    >
                      {busyId === r.id ? "…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="att-v4__btn att-v4__btn--ghost"
                      disabled={busyId === r.id}
                      onClick={() => void onReview(r.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
