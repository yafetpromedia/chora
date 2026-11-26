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
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale, MessageKey } from "@/lib/i18n";

function dateLocaleTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

function TypeIcon({ kind }: { kind: "absence" | "late" | "leave" | "other" }) {
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

const TYPE_KEYS: Record<
  AttendancePermissionType,
  { label: MessageKey; hint: MessageKey; icon: "absence" | "late" | "leave" | "other" }
> = {
  ABSENCE: {
    label: "attendancePermissionFormUi.typeAbsence",
    hint: "attendancePermissionFormUi.typeAbsenceHint",
    icon: "absence",
  },
  LATE: {
    label: "attendancePermissionFormUi.typeLate",
    hint: "attendancePermissionFormUi.typeLateHint",
    icon: "late",
  },
  EARLY_LEAVE: {
    label: "attendancePermissionFormUi.typeEarlyLeave",
    hint: "attendancePermissionFormUi.typeEarlyLeaveHint",
    icon: "leave",
  },
  OTHER: {
    label: "attendancePermissionFormUi.typeOther",
    hint: "attendancePermissionFormUi.typeOtherHint",
    icon: "other",
  },
};

const REASON_KEYS: Record<AttendanceReason, MessageKey> = {
  sick: "parentAttendance.sick",
  family_emergency: "parentAttendance.familyEmergency",
  unexcused: "parentAttendance.unexcused",
  other: "parentAttendance.other",
};

export function AttendancePermissionForm() {
  const { t, locale } = useLocale();
  const dateLocale = dateLocaleTag(locale);
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

  const types = useMemo(
    () =>
      (Object.keys(TYPE_KEYS) as AttendancePermissionType[]).map((value) => {
        const meta = TYPE_KEYS[value];
        return {
          value,
          label: t(meta.label),
          hint: t(meta.hint),
          icon: meta.icon,
        };
      }),
    [t],
  );

  const reasons = useMemo(
    () =>
      (["sick", "family_emergency", "other"] as AttendanceReason[]).map((value) => ({
        value,
        label: t(REASON_KEYS[value]),
      })),
    [t],
  );

  function formatDate(iso: string) {
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString(dateLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function typeLabel(permType: AttendancePermissionType) {
    return t(TYPE_KEYS[permType].label);
  }

  function reasonLabel(reasonKey: AttendanceReason) {
    return t(REASON_KEYS[reasonKey] ?? "parentAttendance.other");
  }

  function statusLabel(status: AttendancePermissionRequest["status"]) {
    if (status === "PENDING") return t("attendancePermissionFormUi.statusPending");
    if (status === "APPROVED") return t("attendancePermissionFormUi.statusApproved");
    return t("attendancePermissionFormUi.statusRejected");
  }

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
      setSaved(t("attendancePermissionFormUi.requestSent"));
      setNote("");
      load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("attendancePermissionFormUi.submitFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  const selectedType = types.find((item) => item.value === type);

  return (
    <div className="att-perm-v2">
      <header className="att-perm-v2__hero">
        <div className="att-perm-v2__hero-glow" aria-hidden />
        <div className="att-perm-v2__hero-inner">
          <div className="att-perm-v2__hero-main">
            <span className="att-perm-v2__chip">{t("attendancePermissionFormUi.chip")}</span>
            <h2 className="att-perm-v2__hero-title">{t("attendancePermissionFormUi.title")}</h2>
            <p className="att-perm-v2__hero-sub">{t("attendancePermissionFormUi.heroSub")}</p>
          </div>
          <div className="att-perm-v2__stats">
            <div className="att-perm-v2__stat">
              <strong>{stats.pending}</strong>
              <span>{t("attendancePermissionFormUi.statPending")}</span>
            </div>
            <div className="att-perm-v2__stat">
              <strong>{stats.approved}</strong>
              <span>{t("attendancePermissionFormUi.statApproved")}</span>
            </div>
            <div className="att-perm-v2__stat att-perm-v2__stat--accent">
              <strong>{stats.total}</strong>
              <span>{t("attendancePermissionFormUi.statTotal")}</span>
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
              <h3 className="att-perm-v2__card-title">{t("attendancePermissionFormUi.newRequest")}</h3>
              <p className="att-perm-v2__card-sub">{t("attendancePermissionFormUi.newRequestSub")}</p>
            </div>
          </div>

          <AppToast message={error} tone="error" onDismiss={() => setError("")} />
          <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

          <form className="att-perm-v2__form" onSubmit={(e) => void onSubmit(e)}>
            <fieldset className="att-perm-v2__types">
              <legend className="att-perm-v2__legend">{t("attendancePermissionFormUi.requestType")}</legend>
              <div className="att-perm-v2__type-grid">
                {types.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`att-perm-v2__type${type === item.value ? " att-perm-v2__type--on" : ""}`}
                    onClick={() => setType(item.value)}
                    aria-pressed={type === item.value}
                  >
                    <span className="att-perm-v2__type-icon">
                      <TypeIcon kind={item.icon} />
                    </span>
                    <span className="att-perm-v2__type-label">{item.label}</span>
                    <span className="att-perm-v2__type-hint">{item.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {selectedType ? (
              <p className="att-perm-v2__type-active">
                {t("attendancePermissionFormUi.selectedPrefix")}{" "}
                <strong>{selectedType.label}</strong> — {selectedType.hint}
              </p>
            ) : null}

            <div className="att-perm-v2__fields">
              <label className="att-perm-v2__field">
                <span>{t("parentAttendance.date")}</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label className="att-perm-v2__field">
                <span>{t("parentAttendance.reason")}</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as AttendanceReason)}
                >
                  {reasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="att-perm-v2__field att-perm-v2__field--full">
              <span>
                {t("attendancePermissionFormUi.messageTeacher")}{" "}
                <em>{t("attendancePermissionFormUi.optional")}</em>
              </span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("attendancePermissionFormUi.messagePlaceholder")}
              />
            </label>

            <button type="submit" className="att-perm-v2__submit" disabled={busy}>
              {busy ? t("attendancePermissionFormUi.sending") : t("attendancePermissionFormUi.submitRequest")}
            </button>
          </form>
        </section>

        <section className="att-perm-v2__card att-perm-v2__card--history">
          <div className="att-perm-v2__card-head">
            <span className="att-perm-v2__card-icon att-perm-v2__card-icon--muted" aria-hidden>
              <DashIcon name="calendar" className="dash-icon--sm" />
            </span>
            <div>
              <h3 className="att-perm-v2__card-title">{t("attendancePermissionFormUi.yourRequests")}</h3>
              <p className="att-perm-v2__card-sub">{t("attendancePermissionFormUi.yourRequestsSub")}</p>
            </div>
          </div>

          {loading ? (
            <div className="att-perm-v2__loading">
              <span className="att-perm-v2__spinner" aria-hidden />
              <p>{t("attendancePermissionFormUi.loadingRequests")}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="att-perm-v2__empty">
              <span className="att-perm-v2__empty-icon" aria-hidden>
                <DashIcon name="attendance" className="dash-icon--lg" />
              </span>
              <h4>{t("attendancePermissionFormUi.emptyTitle")}</h4>
              <p>{t("attendancePermissionFormUi.emptySub")}</p>
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
                        <p className="att-perm-v2__item-type">{typeLabel(r.type)}</p>
                        <p className="att-perm-v2__item-date">{formatDate(r.date)}</p>
                      </div>
                      <span
                        className={`att-perm-v2__badge att-perm-v2__badge--${r.status.toLowerCase()}`}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    {r.reason ? (
                      <p className="att-perm-v2__item-meta">
                        {t("attendancePermissionFormUi.reasonPrefix")}{" "}
                        {reasonLabel(r.reason as AttendanceReason)}
                      </p>
                    ) : null}
                    {r.note ? <p className="att-perm-v2__item-note">{r.note}</p> : null}
                    {r.reviewNote ? (
                      <p className="att-perm-v2__item-review">
                        <strong>{t("attendancePermissionFormUi.teacherNotePrefix")}</strong>{" "}
                        {r.reviewNote}
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