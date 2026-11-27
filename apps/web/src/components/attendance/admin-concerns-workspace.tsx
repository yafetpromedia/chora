"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { listGradesForAttendance } from "@/lib/attendance";
import {
  getAttendanceConcernsSummary,
  listAttendanceConcerns,
  type AttendanceConcern,
  type AttendanceConcernStatus,
  type AttendanceConcernType,
} from "@/lib/attendance-concerns";

type GradeOpt = {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
};

type StatusFilter = AttendanceConcernStatus | "";

const STATUS_CHIP_IDS: { id: StatusFilter; key: string }[] = [
  { id: "", key: "chipAll" },
  { id: "OPEN", key: "chipOpen" },
  { id: "UNDER_REVIEW", key: "chipInReview" },
  { id: "RESOLVED", key: "chipResolved" },
  { id: "DISMISSED", key: "chipDismissed" },
];

function classLabel(c: AttendanceConcern) {
  return c.section ? `${c.grade.name} ${c.section.name}` : c.grade.name;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminConcernsWorkspace() {
  const { t } = useLocale();
  const [items, setItems] = useState<AttendanceConcern[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{
    open: number;
    underReview: number;
    resolved: number;
    today: number;
  } | null>(null);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [concernType, setConcernType] = useState<AttendanceConcernType | "">(
    "",
  );
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [query, setQuery] = useState("");
  const [grades, setGrades] = useState<GradeOpt[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const concernTypeLabel = (ty: AttendanceConcernType) =>
    t(`attendanceConcernsUi.type_${ty}`);
  const statusLabel = (st: AttendanceConcernStatus) =>
    t(`attendanceConcernsUi.status_${st}`);

  useEffect(() => {
    void listGradesForAttendance()
      .then((rows) => setGrades(rows as GradeOpt[]))
      .catch(() => setGrades([]));
    void getAttendanceConcernsSummary()
      .then((s) =>
        setSummary({
          open: s.open,
          underReview: s.items.filter((i) => i.status === "UNDER_REVIEW")
            .length,
          resolved: s.resolved,
          today: s.today,
        }),
      )
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
    });
    void listAttendanceConcerns({
      date: date || undefined,
      status: status || undefined,
      concernType: concernType || undefined,
      gradeId: gradeId || undefined,
      sectionId: sectionId || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, status, concernType, gradeId, sectionId]);

  const sections = grades.find((g) => g.id === gradeId)?.sections ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const hay = [
        classLabel(c),
        c.subject?.name,
        c.reportedBy.name,
        c.student?.name,
        concernTypeLabel(c.concernType),
        c.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, t]);

  function clearFilters() {
    setDate("");
    setStatus("");
    setConcernType("");
    setGradeId("");
    setSectionId("");
    setQuery("");
  }

  const hasFilters = Boolean(
    date || status || concernType || gradeId || sectionId || query.trim(),
  );

  const kpiRows = [
    { key: "statOpen" as const, value: summary?.open, tone: "late" as const, action: () => setStatus("OPEN") },
    { key: "statInReview" as const, value: summary?.underReview, tone: "half" as const, action: () => setStatus("UNDER_REVIEW") },
    { key: "statResolved" as const, value: summary?.resolved, tone: "present" as const, action: () => setStatus("RESOLVED") },
    {
      key: "statToday" as const,
      value: summary?.today,
      tone: "leave" as const,
      action: () => {
        setDate(new Date().toISOString().slice(0, 10));
        setStatus("");
      },
    },
  ];

  return (
    <div className="att-concern att-concern--wide">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="tch-v2__hero">
        <div className="tch-v2__hero-glow" aria-hidden />
        <div className="tch-v2__hero-inner">
          <div className="tch-v2__hero-main">
            <span className="tch-v2__chip">{t("attendanceConcernsUi.chip")}</span>
            <h2 className="tch-v2__hero-title">{t("attendanceConcernsUi.title")}</h2>
            <p className="tch-v2__hero-sub">{t("attendanceConcernsUi.heroSub")}</p>
          </div>
          <div className="tch-v2__hero-stats">
            <div className="tch-v2__stat">
              <strong>{summary?.open ?? "—"}</strong>
              <span>{t("attendanceConcernsUi.statOpen")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{summary?.today ?? "—"}</strong>
              <span>{t("attendanceConcernsUi.statToday")}</span>
            </div>
            <div className="tch-v2__stat">
              <strong>{summary?.resolved ?? "—"}</strong>
              <span>{t("attendanceConcernsUi.statClosed")}</span>
            </div>
            <div className="tch-v2__stat tch-v2__stat--accent">
              <strong>{loading ? "—" : total}</strong>
              <span>{t("attendanceConcernsUi.statShowing")}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-stats att-concern__kpis">
        {kpiRows.map(({ key, value, tone, action }) => (
          <button
            key={key}
            type="button"
            className={`sa-stat sa-stat--${tone} att-concern__kpi-btn`}
            onClick={action}
          >
            <span className="sa-stat__label">{t(`attendanceConcernsUi.${key}`)}</span>
            <strong className="sa-stat__value">
              {value == null ? "—" : value}
            </strong>
          </button>
        ))}
      </div>

      <div className="att-concern__chips" role="tablist" aria-label={t("employeesUi.status")}>
        {STATUS_CHIP_IDS.map((chip) => (
          <button
            key={chip.id || "all"}
            type="button"
            role="tab"
            aria-selected={status === chip.id}
            className={`att-concern__chip${
              status === chip.id ? " att-concern__chip--active" : ""
            }`}
            onClick={() => setStatus(chip.id)}
          >
            {t(`attendanceConcernsUi.${chip.key}`)}
          </button>
        ))}
      </div>

      <div className="sa-toolbar att-concern__toolbar">
        <label className="sa-field">
          <span>{t("staffAttendanceUi.date")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="sa-field">
          <span>{t("attendanceConcernsUi.concernType")}</span>
          <select
            value={concernType}
            onChange={(e) =>
              setConcernType(e.target.value as AttendanceConcernType | "")
            }
          >
            <option value="">{t("attendanceConcernsUi.allTypes")}</option>
            {(
              [
                "STUDENT_APPEARS_ABSENT",
                "STUDENT_APPEARS_PRESENT",
                "COUNT_MISMATCH",
                "STUDENT_LEFT_CLASS",
                "OTHER",
              ] as AttendanceConcernType[]
            ).map((ty) => (
              <option key={ty} value={ty}>
                {concernTypeLabel(ty)}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field">
          <span>{t("attendanceConcernsUi.grade")}</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">{t("attendanceConcernsUi.allGrades")}</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field">
          <span>{t("attendanceConcernsUi.section")}</span>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!gradeId}
          >
            <option value="">{t("attendanceConcernsUi.allSections")}</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sa-field sa-field--grow">
          <span>{t("common.search")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("attendanceConcernsUi.searchPlaceholder")}
          />
        </label>
        {hasFilters ? (
          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            onClick={clearFilters}
          >
            {t("common.clear")}
          </button>
        ) : null}
      </div>

      <div className="att-concern__panel att-concern__results">
        <div className="att-concern__results-head">
          <h3>
            {loading
              ? t("attendanceConcernsUi.loadingConcerns")
              : filtered.length === 1
                ? t("attendanceConcernsUi.concernOne")
                : t("attendanceConcernsUi.concernsMany", {
                    count: filtered.length,
                  })}
          </h3>
          <p>{t("attendanceConcernsUi.resultsSub")}</p>
        </div>

        {loading ? (
          <div className="att-concern__loading">
            <span className="dash-loading-spinner" aria-hidden />
            <p>{t("attendanceConcernsUi.fetching")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="att-concern__empty-card">
            <strong>{t("attendanceConcernsUi.noMatchTitle")}</strong>
            <p>
              {hasFilters
                ? t("attendanceConcernsUi.noMatchFiltered")
                : t("attendanceConcernsUi.noMatchEmpty")}
            </p>
            {hasFilters ? (
              <button
                type="button"
                className="sa-btn sa-btn--primary"
                onClick={clearFilters}
              >
                {t("common.clearFilters")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>{t("attendanceConcernsUi.colClassSubject")}</th>
                  <th>{t("attendanceConcernsUi.colType")}</th>
                  <th>{t("attendanceConcernsUi.colReportedBy")}</th>
                  <th>{t("attendanceConcernsUi.colDate")}</th>
                  <th>{t("attendanceConcernsUi.colCounts")}</th>
                  <th>{t("attendanceConcernsUi.colStatus")}</th>
                  <th>{t("attendanceConcernsUi.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{classLabel(c)}</strong>
                      <div className="sa-emp">
                        <span>
                          {c.subject?.name ?? "—"}
                          {c.periodLabel ? ` · ${c.periodLabel}` : ""}
                        </span>
                        {c.student ? (
                          <span>
                            {t("attendanceConcernsUi.studentPrefix")}{" "}
                            {c.student.name}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>{concernTypeLabel(c.concernType)}</td>
                    <td>
                      <strong>{c.reportedBy.name}</strong>
                      <div className="sa-emp">
                        <span>{formatWhen(c.createdAt)}</span>
                      </div>
                    </td>
                    <td>{c.date}</td>
                    <td>
                      <div className="att-concern__counts">
                        <span>
                          {t("attendanceConcernsUi.offCount")}{" "}
                          {c.officialPresentCount ?? "—"}/
                          {c.officialAbsentCount ?? "—"}
                        </span>
                        <span>
                          {t("attendanceConcernsUi.obsCount")}{" "}
                          {c.observedPresentCount ?? "—"}/
                          {c.observedAbsentCount ?? "—"}
                        </span>
                        {c.difference != null ? (
                          <span
                            className={
                              c.difference !== 0
                                ? "att-concern__diff att-concern__diff--warn"
                                : "att-concern__diff"
                            }
                          >
                            Δ {c.difference > 0 ? "+" : ""}
                            {c.difference}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`att-concern__badge att-concern__badge--${c.status.toLowerCase()}`}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="sa-link"
                        href={`/admin/attendance/concerns/${c.id}`}
                      >
                        {c.status === "OPEN" || c.status === "UNDER_REVIEW"
                          ? t("attendanceConcernsUi.review")
                          : t("attendanceConcernsUi.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}