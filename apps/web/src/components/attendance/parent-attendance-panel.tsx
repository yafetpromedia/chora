"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { ParentChildBar } from "@/components/parent/parent-child-bar";
import { useParentChild } from "@/hooks/use-parent-child";
import type { AppLocale, MessageKey } from "@/lib/i18n";
import {
  createAttendancePermissionRequest,
  getAttendanceSummary,
  type AttendancePermissionType,
  type AttendanceReason,
  type AttendanceStatus,
  type AttendanceSummary,
} from "@/lib/attendance";
import { AppToast } from "@/components/ui/app-toast";

type RangeKey = "7d" | "30d" | "month" | "90d" | "all" | "custom";
type StatusFilter = "all" | AttendanceStatus;

type TranslateFn = (
  key: MessageKey | string,
  vars?: Record<string, string | number>,
) => string;

function dateLocaleTag(locale: AppLocale) {
  return locale === "am" ? "am-ET" : undefined;
}

const STATUS_KEYS: Record<AttendanceStatus, MessageKey> = {
  present: "common.present",
  absent: "common.absent",
  late: "common.late",
  excused: "common.excused",
};

const REASON_KEYS: Record<AttendanceReason, MessageKey> = {
  sick: "parentAttendance.sick",
  family_emergency: "parentAttendance.familyEmergency",
  unexcused: "parentAttendance.unexcused",
  other: "parentAttendance.other",
};

function statusLabel(t: TranslateFn, status: AttendanceStatus) {
  return t(STATUS_KEYS[status]);
}

function attendanceReasonLabel(t: TranslateFn, reason: AttendanceReason) {
  return t(REASON_KEYS[reason]);
}

export function ParentAttendancePanel() {
  const { t, locale } = useLocale();
  const dateLocale = dateLocaleTag(locale);
  const { children, selectedId, selectChild, loading, error } = useParentChild();
  const [loadedSummary, setSummary] = useState<AttendanceSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [flash, setFlash] = useState("");
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [showRequest, setShowRequest] = useState(false);

  const rangeOptions = useMemo(
    () =>
      (
        [
          ["7d", "parentAttendance.range7d"],
          ["30d", "parentAttendance.range30d"],
          ["month", "parentAttendance.rangeMonth"],
          ["90d", "parentAttendance.range90d"],
          ["all", "parentAttendance.rangeAll"],
          ["custom", "parentAttendance.rangeCustom"],
        ] as const
      ).map(([key, labelKey]) => ({
        key: key as RangeKey,
        label: t(labelKey),
      })),
    [t],
  );

  const dateRange = useMemo(
    () => resolveRange(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo],
  );

  const summary = selectedId ? loadedSummary : null;

  useEffect(() => {
    if (!selectedId) return;
    if (rangeKey === "custom" && (!customFrom || !customTo)) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBusy(true);
      setLoadError("");
    });
    void getAttendanceSummary(selectedId, {
      from: dateRange.from,
      to: dateRange.to,
    })
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, dateRange.from, dateRange.to, rangeKey, customFrom, customTo]);

  const rangeLabel = useMemo(
    () => formatRangeLabel(rangeKey, dateRange, t),
    [rangeKey, dateRange, t],
  );

  const filteredDays = useMemo(() => {
    if (!summary) return [];
    const q = query.trim().toLowerCase();
    return summary.recent.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        formatFullDate(row.date, dateLocale),
        statusLabel(t, row.status),
        row.reason ? attendanceReasonLabel(t, row.reason) : "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [summary, statusFilter, query, t, dateLocale]);

  const markedDays = summary?.total ?? 0;
  const hasActiveFilters =
    statusFilter !== "all" || query.trim().length > 0 || rangeKey !== "30d";

  function clearFilters() {
    setStatusFilter("all");
    setQuery("");
    setRangeKey("30d");
    setCustomFrom("");
    setCustomTo("");
  }

  const shownCountLabel = useMemo(() => {
    if (!summary) return "";
    if (filteredDays.length !== summary.recent.length) {
      return `${filteredDays.length} ${t("parentAttendance.ofShown", {
        total: summary.recent.length,
      })}`;
    }
    return `${filteredDays.length} ${t("parentAttendance.shown")}`;
  }, [filteredDays.length, summary, t]);

  return (
    <div className="par-att">
      <AppToast
        message={loadError || error}
        tone="error"
        onDismiss={() => setLoadError("")}
      />
      <AppToast
        message={flash}
        tone="success"
        onDismiss={() => setFlash("")}
      />

      <ParentChildBar
        options={children}
        selectedId={selectedId}
        onChange={selectChild}
        loading={loading}
        label={t("common.child")}
      />

      {!loading && !selectedId ? (
        <div className="par-att__empty">
          <DashIcon name="students" />
          <p>{t("parentAttendance.noLinked")}</p>
          <span>{t("parentAttendance.noLinkedHint")}</span>
        </div>
      ) : null}

      {busy && !summary ? (
        <div className="par-att__empty par-att__empty--loading">
          <span className="dash-loading-spinner" aria-hidden />
          <p>{t("parentAttendance.loading")}</p>
        </div>
      ) : null}

      {summary ? (
        <>
          <section className={`par-att__hero${busy ? " par-att__hero--dim" : ""}`}>
            <div className="par-att__hero-copy">
              <p className="par-att__eyebrow">{t("parentAttendance.overview")}</p>
              <h2 className="par-att__title">{summary.student.name}</h2>
              <p className="par-att__sub">
                {summary.student.grade}
                {summary.student.section
                  ? ` · ${summary.student.section}`
                  : ""}
                {markedDays > 0
                  ? markedDays === 1
                    ? ` · ${t("parentAttendance.daysInRange", {
                        count: markedDays,
                        range: rangeLabel,
                      })}`
                    : ` · ${t("parentAttendance.daysInRangePlural", {
                        count: markedDays,
                        range: rangeLabel,
                      })}`
                  : ` · ${t("parentAttendance.noDaysInRange", {
                      range: rangeLabel,
                    })}`}
              </p>
            </div>
            <AttendanceRing rate={summary.rate} />
          </section>

          <BreakdownBar counts={summary.counts} total={markedDays} />

          <div className="par-att__stats" role="group" aria-label={t("parentAttendance.overview")}>
            <StatTile
              tone="present"
              label={t("common.present")}
              value={summary.counts.present}
              active={statusFilter === "present"}
              onClick={() =>
                setStatusFilter((s) => (s === "present" ? "all" : "present"))
              }
            />
            <StatTile
              tone="late"
              label={t("common.late")}
              value={summary.counts.late}
              active={statusFilter === "late"}
              onClick={() =>
                setStatusFilter((s) => (s === "late" ? "all" : "late"))
              }
            />
            <StatTile
              tone="absent"
              label={t("common.absent")}
              value={summary.counts.absent}
              active={statusFilter === "absent"}
              onClick={() =>
                setStatusFilter((s) => (s === "absent" ? "all" : "absent"))
              }
            />
            <StatTile
              tone="excused"
              label={t("common.excused")}
              value={summary.counts.excused}
              active={statusFilter === "excused"}
              onClick={() =>
                setStatusFilter((s) => (s === "excused" ? "all" : "excused"))
              }
            />
          </div>
        </>
      ) : null}

      {selectedId ? (
        <div className="par-att__toolbar">
          <div className="par-att__ranges" role="tablist">
            {rangeOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={rangeKey === opt.key}
                className={`par-att__chip${rangeKey === opt.key ? " par-att__chip--on" : ""}`}
                onClick={() => setRangeKey(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {rangeKey === "custom" ? (
            <div className="par-att__custom">
              <label>
                <span>{t("parentAttendance.from")}</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label>
                <span>{t("parentAttendance.to")}</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          <div className="par-att__tools">
            <label className="par-att__search">
              <span className="sr-only">{t("common.search")}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("parentAttendance.searchPlaceholder")}
              />
            </label>
            <button
              type="button"
              className="par-att__request-btn"
              onClick={() => setShowRequest((v) => !v)}
            >
              {showRequest
                ? t("parentAttendance.closeRequest")
                : t("parentAttendance.requestLeave")}
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                className="par-att__clear"
                onClick={clearFilters}
              >
                {t("common.clearFilters")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showRequest && selectedId ? (
        <PermissionRequestForm
          studentProfileId={selectedId}
          onDone={(msg) => {
            setFlash(msg);
            setShowRequest(false);
          }}
          onError={setLoadError}
        />
      ) : null}

      {!busy && rangeKey === "custom" && (!customFrom || !customTo) ? (
        <div className="par-att__empty par-att__empty--inset">
          <DashIcon name="attendance" />
          <p>{t("parentAttendance.pickCustom")}</p>
          <span>{t("parentAttendance.pickCustomHint")}</span>
        </div>
      ) : null}

      {summary ? (
        <section className="par-att__timeline">
          <header className="par-att__timeline-head">
            <div>
              <h3>{t("parentAttendance.attendanceLog")}</h3>
              <p>
                {statusFilter === "all"
                  ? t("parentAttendance.daysMarked", { range: rangeLabel })
                  : t("parentAttendance.statusDays", {
                      status: statusLabel(t, statusFilter),
                      range: rangeLabel,
                    })}
              </p>
            </div>
            <span className="par-att__count">{shownCountLabel}</span>
          </header>

          {filteredDays.length === 0 ? (
            <div className="par-att__empty par-att__empty--inset">
              <DashIcon name="attendance" />
              <p>
                {summary.recent.length === 0
                  ? t("parentAttendance.noRecords")
                  : t("parentAttendance.noMatching")}
              </p>
              <span>
                {summary.recent.length === 0
                  ? t("parentAttendance.noRecordsHint")
                  : t("parentAttendance.noMatchingHint")}
              </span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="par-att__clear par-att__clear--inline"
                  onClick={clearFilters}
                >
                  {t("common.clearFilters")}
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="par-att__days">
              {filteredDays.map((row) => (
                <li
                  key={row.id}
                  className={`par-att__day par-att__day--${row.status}`}
                >
                  <span className="par-att__day-cal" aria-hidden>
                    <em>{formatWeekday(row.date, dateLocale)}</em>
                    <strong>{formatDay(row.date)}</strong>
                    <small>{formatMonth(row.date, dateLocale)}</small>
                  </span>
                  <div className="par-att__day-body">
                    <p className="par-att__day-date">
                      {formatFullDate(row.date, dateLocale)}
                    </p>
                    {row.reason ? (
                      <p className="par-att__day-reason">
                        {attendanceReasonLabel(t, row.reason)}
                      </p>
                    ) : (
                      <p className="par-att__day-reason">
                        {t("parentAttendance.schoolDay")}
                      </p>
                    )}
                  </div>
                  <span className={`par-att__pill par-att__pill--${row.status}`}>
                    {statusLabel(t, row.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function BreakdownBar({
  counts,
  total,
}: {
  counts: AttendanceSummary["counts"];
  total: number;
}) {
  const { t } = useLocale();

  if (total <= 0) return null;
  const segments: Array<{ key: AttendanceStatus; value: number }> = [
    { key: "present", value: counts.present },
    { key: "late", value: counts.late },
    { key: "absent", value: counts.absent },
    { key: "excused", value: counts.excused },
  ];

  return (
    <div className="par-att__breakdown" aria-hidden>
      <div className="par-att__breakdown-bar">
        {segments.map((s) =>
          s.value > 0 ? (
            <span
              key={s.key}
              className={`par-att__breakdown-seg par-att__breakdown-seg--${s.key}`}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="par-att__breakdown-legend">
        {segments.map((s) => (
          <span key={s.key}>
            <i className={`par-att__dot par-att__dot--${s.key}`} />
            {statusLabel(t, s.key)} {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatTile({
  tone,
  label,
  value,
  active,
  onClick,
}: {
  tone: AttendanceStatus;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`par-att__stat par-att__stat--${tone}${active ? " par-att__stat--active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="par-att__stat-value">{value}</span>
      <span className="par-att__stat-label">{label}</span>
    </button>
  );
}

function PermissionRequestForm({
  studentProfileId,
  onDone,
  onError,
}: {
  studentProfileId: string;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { t } = useLocale();
  const [type, setType] = useState<AttendancePermissionType>("ABSENCE");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [reason, setReason] = useState<AttendanceReason>("sick");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAttendancePermissionRequest({
        studentProfileId,
        type,
        date,
        reason,
        note: note.trim() || undefined,
      });
      onDone(t("parentAttendance.leaveSent"));
      setNote("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="par-att__request" onSubmit={(e) => void submit(e)}>
      <header>
        <h3>{t("parentAttendance.leaveTitle")}</h3>
        <p>{t("parentAttendance.leaveHint")}</p>
      </header>
      <div className="par-att__request-grid">
        <label>
          <span>{t("parentAttendance.type")}</span>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as AttendancePermissionType)
            }
          >
            <option value="ABSENCE">{t("parentAttendance.absence")}</option>
            <option value="LATE">{t("parentAttendance.lateArrival")}</option>
            <option value="EARLY_LEAVE">{t("parentAttendance.earlyLeave")}</option>
            <option value="OTHER">{t("parentAttendance.other")}</option>
          </select>
        </label>
        <label>
          <span>{t("parentAttendance.date")}</span>
          <input
            type="date"
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          <span>{t("parentAttendance.reason")}</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as AttendanceReason)}
          >
            <option value="sick">{t("parentAttendance.sick")}</option>
            <option value="family_emergency">
              {t("parentAttendance.familyEmergency")}
            </option>
            <option value="unexcused">{t("parentAttendance.unexcused")}</option>
            <option value="other">{t("parentAttendance.other")}</option>
          </select>
        </label>
        <label className="par-att__request-note">
          <span>{t("parentAttendance.note")}</span>
          <input
            value={note}
            maxLength={200}
            placeholder={t("parentAttendance.notePlaceholder")}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      <button type="submit" className="par-att__request-submit" disabled={saving}>
        {saving ? t("parentAttendance.sending") : t("parentAttendance.sendRequest")}
      </button>
    </form>
  );
}

function AttendanceRing({ rate }: { rate: number }) {
  const { t } = useLocale();
  const r = 46;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, rate));
  const offset = c - (value / 100) * c;
  const tone = rate >= 90 ? "good" : rate >= 75 ? "ok" : "low";
  const attendanceWord = t("dash.attendance");

  return (
    <div
      className={`par-att__ring par-att__ring--${tone}`}
      aria-label={`${rate}% ${attendanceWord}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle className="par-att__ring-track" cx="60" cy="60" r={r} />
        <circle
          className="par-att__ring-value"
          cx="60"
          cy="60"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="par-att__ring-label">
        <strong>{rate}%</strong>
        <span>{attendanceWord}</span>
      </div>
    </div>
  );
}

function resolveRange(
  key: RangeKey,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  const today = new Date();
  const to = toInputDate(today);

  if (key === "all") return {};
  if (key === "custom") {
    return {
      from: customFrom || undefined,
      to: customTo || undefined,
    };
  }
  if (key === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toInputDate(start), to };
  }

  const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { from: toInputDate(start), to };
}

function formatRangeLabel(
  key: RangeKey,
  range: { from?: string; to?: string },
  t: TranslateFn,
) {
  if (key === "7d") return t("parentAttendance.last7");
  if (key === "30d") return t("parentAttendance.last30");
  if (key === "month") return t("parentAttendance.thisMonth");
  if (key === "90d") return t("parentAttendance.last90");
  if (key === "all") return t("parentAttendance.allTime");
  if (range.from && range.to) return `${range.from} → ${range.to}`;
  return t("parentAttendance.customRange");
}

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatFullDate(iso: string, dateLocale?: string) {
  const d = parseDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(dateLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatWeekday(iso: string, dateLocale?: string) {
  const d = parseDate(iso);
  if (!d) return "";
  return d.toLocaleDateString(dateLocale, { weekday: "short" }).toUpperCase();
}

function formatDay(iso: string) {
  const d = parseDate(iso);
  if (!d) return "—";
  return String(d.getDate());
}

function formatMonth(iso: string, dateLocale?: string) {
  const d = parseDate(iso);
  if (!d) return "";
  return d.toLocaleDateString(dateLocale, { month: "short" }).toUpperCase();
}