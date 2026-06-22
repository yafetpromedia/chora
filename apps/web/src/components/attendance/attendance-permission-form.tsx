"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  createAttendancePermissionRequest,
  listMyAttendancePermissionRequests,
  type AttendancePermissionRequest,
  type AttendancePermissionType,
  type AttendanceReason,
} from "@/lib/attendance";

const TYPES: {
  value: AttendancePermissionType;
  label: string;
  hint: string;
  icon: "absence" | "late" | "leave" | "other";
}[] = [
  { value: "ABSENCE", label: "Absence", hint: "I will not be in class", icon: "absence" },
  { value: "LATE", label: "Late arrival", hint: "Arriving after roll call", icon: "late" },
  { value: "EARLY_LEAVE", label: "Early leave", hint: "Leaving before end of day", icon: "leave" },
  { value: "OTHER", label: "Other", hint: "Another attendance request", icon: "other" },
];

const REASONS: { value: AttendanceReason; label: string }[] = [
  { value: "sick", label: "Sick" },
  { value: "family_emergency", label: "Family emergency" },
  { value: "other", label: "Other" },
];

const TYPE_LABEL: Record<AttendancePermissionType, string> = {
  ABSENCE: "Absence",
  LATE: "Late arrival",
  EARLY_LEAVE: "Early leave",
  OTHER: "Other",
};

const REASON_LABEL: Record<AttendanceReason, string> = {
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
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function TypeIcon({ kind }: { kind: (typeof TYPES)[number]["icon"] }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: 20,
    height: 20,
    "aria-hidden": true,
  };

  switch (kind) {
    case "absence":
      return (
        <svg {...p}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" y1="8" x2="23" y2="14" />
          <line x1="23" y1="8" x2="17" y2="14" />
        </svg>
      );
    case "late":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "leave":
      return (
        <svg {...p}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      );
  }
}

export function AttendancePermissionForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<AttendancePermissionType>("ABSENCE");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState<AttendanceReason>("sick");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [requests, setRequests] = useState<AttendancePermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    void listMyAttendancePermissionRequests()
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    return { total: requests.length, pending, approved };
  }, [requests]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await createAttendancePermissionRequest({
        type,
        date,
        reason,
        note: note.trim() || undefined,
      });
      setSaved("Request sent to your homeroom teacher.");
      setNote("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setBusy(false);
    }
  }

  const selectedType = TYPES.find((t) => t.value === type);

  return (
    <div className="att-perm-v2">
      <header className="att-perm-v2__hero">
        <div className="att-perm-v2__hero-glow" aria-hidden />
        <div className="att-perm-v2__hero-inner">
          <div className="att-perm-v2__hero-main">
            <span className="att-perm-v2__chip">Homeroom request</span>
            <h2 className="att-perm-v2__hero-title">Attendance permission</h2>
            <p className="att-perm-v2__hero-sub">
              Tell your homeroom teacher before you miss class, arrive late, or leave early.
            </p>
          </div>
          <div className="att-perm-v2__stats">
            <div className="att-perm-v2__stat">
              <strong>{stats.pending}</strong>
              <span>Pending</span>
            </div>
            <div className="att-perm-v2__stat">
              <strong>{stats.approved}</strong>
              <span>Approved</span>
            </div>
            <div className="att-perm-v2__stat att-perm-v2__stat--accent">
              <strong>{stats.total}</strong>
              <span>Total</span>
            </div>
          </div>
        </div>
      </header>

      <div className="att-perm-v2__grid">
        <section className="att-perm-v2__card att-perm-v2__card--form">
          <div className="att-perm-v2__card-head">
            <span className="att-perm-v2__card-icon" aria-hidden>
              <DashIcon name="attendance" className="dash-icon--sm" />
            </span>
            <div>
              <h3 className="att-perm-v2__card-title">New request</h3>
              <p className="att-perm-v2__card-sub">Choose a type and send it to your homeroom teacher</p>
            </div>
          </div>

          {error ? (
            <div className="att-perm-v2__alert att-perm-v2__alert--err" role="alert">
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="att-perm-v2__alert att-perm-v2__alert--ok" role="status">
              {saved}
            </div>
          ) : null}

          <form className="att-perm-v2__form" onSubmit={(e) => void onSubmit(e)}>
            <fieldset className="att-perm-v2__types">
              <legend className="att-perm-v2__legend">Request type</legend>
              <div className="att-perm-v2__type-grid">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`att-perm-v2__type${type === t.value ? " att-perm-v2__type--on" : ""}`}
                    onClick={() => setType(t.value)}
                    aria-pressed={type === t.value}
                  >
                    <span className="att-perm-v2__type-icon">
                      <TypeIcon kind={t.icon} />
                    </span>
                    <span className="att-perm-v2__type-label">{t.label}</span>
                    <span className="att-perm-v2__type-hint">{t.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {selectedType ? (
              <p className="att-perm-v2__type-active">
                Selected: <strong>{selectedType.label}</strong> — {selectedType.hint}
              </p>
            ) : null}

            <div className="att-perm-v2__fields">
              <label className="att-perm-v2__field">
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label className="att-perm-v2__field">
                <span>Reason</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as AttendanceReason)}
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="att-perm-v2__field att-perm-v2__field--full">
              <span>Message to teacher <em>(optional)</em></span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain why you need permission…"
              />
            </label>

            <button type="submit" className="att-perm-v2__submit" disabled={busy}>
              {busy ? "Sending…" : "Submit request"}
            </button>
          </form>
        </section>

        <section className="att-perm-v2__card att-perm-v2__card--history">
          <div className="att-perm-v2__card-head">
            <span className="att-perm-v2__card-icon att-perm-v2__card-icon--muted" aria-hidden>
              <DashIcon name="calendar" className="dash-icon--sm" />
            </span>
            <div>
              <h3 className="att-perm-v2__card-title">Your requests</h3>
              <p className="att-perm-v2__card-sub">Track what your homeroom teacher has decided</p>
            </div>
          </div>

          {loading ? (
            <div className="att-perm-v2__loading">
              <span className="att-perm-v2__spinner" aria-hidden />
              <p>Loading requests…</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="att-perm-v2__empty">
              <span className="att-perm-v2__empty-icon" aria-hidden>
                <DashIcon name="attendance" className="dash-icon--lg" />
              </span>
              <h4>No requests yet</h4>
              <p>Submit your first permission request using the form. Your teacher will approve or reject it.</p>
            </div>
          ) : (
            <ul className="att-perm-v2__list">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className={`att-perm-v2__item att-perm-v2__item--${r.status.toLowerCase()}`}
                >
                  <div className="att-perm-v2__item-accent" aria-hidden />
                  <div className="att-perm-v2__item-body">
                    <div className="att-perm-v2__item-top">
                      <div>
                        <p className="att-perm-v2__item-type">{TYPE_LABEL[r.type]}</p>
                        <p className="att-perm-v2__item-date">{formatDate(r.date)}</p>
                      </div>
                      <span
                        className={`att-perm-v2__badge att-perm-v2__badge--${r.status.toLowerCase()}`}
                      >
                        {r.status === "PENDING"
                          ? "Pending"
                          : r.status === "APPROVED"
                            ? "Approved"
                            : "Rejected"}
                      </span>
                    </div>
                    {r.reason ? (
                      <p className="att-perm-v2__item-meta">
                        Reason: {REASON_LABEL[r.reason] ?? r.reason}
                      </p>
                    ) : null}
                    {r.note ? <p className="att-perm-v2__item-note">{r.note}</p> : null}
                    {r.reviewNote ? (
                      <p className="att-perm-v2__item-review">
                        <strong>Teacher:</strong> {r.reviewNote}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
