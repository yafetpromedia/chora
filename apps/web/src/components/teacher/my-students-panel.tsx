"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import {
  listMyHomeroomStudents,
  setHomeroomStudentGroup,
  type HomeroomStudent,
  type HomeroomStudentsPayload,
} from "@/lib/teachers";

const PRESET_GROUPS = ["A", "B", "C", "Advanced", "Support"];

type SortKey = "name" | "attendance" | "results" | "classwork";

export function MyStudentsPanel() {
  const { t } = useLocale();
  const [data, setData] = useState<HomeroomStudentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [selected, setSelected] = useState<HomeroomStudent | null>(null);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const payload = await listMyHomeroomStudents();
      setData(payload);
      setSelected((prev) => {
        if (!prev) return null;
        return (
          payload.students.find(
            (s) => s.studentProfileId === prev.studentProfileId,
          ) ?? null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("teacherMyStudents.loadFailed"),
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch the teacher student list on mount.
    void reload();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const rows = data.students.filter((s) => {
      if (groupFilter === "ungrouped" && s.group) return false;
      if (
        groupFilter !== "all" &&
        groupFilter !== "ungrouped" &&
        s.group !== groupFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.studentId ?? "").toLowerCase().includes(q) ||
        (s.group ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q)
      );
    });

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortKey === "attendance") {
        return (b.attendance.rate ?? -1) - (a.attendance.rate ?? -1);
      }
      if (sortKey === "results") {
        return (
          (b.results.averagePercent ?? -1) - (a.results.averagePercent ?? -1)
        );
      }
      if (sortKey === "classwork") {
        return b.classwork.submitted - a.classwork.submitted;
      }
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [data, query, groupFilter, sortKey]);

  async function assignGroup(student: HomeroomStudent, group: string | null) {
    setBusyId(student.studentProfileId);
    try {
      await setHomeroomStudentGroup(student.studentProfileId, group);
      setFlash(
        group
          ? t("teacherMyStudents.groupAssigned", { name: student.name, group })
          : t("teacherMyStudents.groupRemoved", { name: student.name }),
      );
      await reload();
    } catch (err) {
      setFlash(
        err instanceof Error
          ? err.message
          : t("teacherMyStudents.groupUpdateFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="ms-panel ms-panel--loading">
        <span className="dash-loading-spinner" aria-hidden />
        <p>{t("teacherMyStudents.loading")}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="ms-panel ms-panel--error">
        <h3>{t("teacherMyStudents.unavailable")}</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const classLabel = data.homeroom.sectionName
    ? `${data.homeroom.gradeName} · ${data.homeroom.sectionName}`
    : data.homeroom.gradeName;
  const groupedCount = data.students.filter((s) => s.group).length;
  const avgAttendance = average(
    data.students.map((s) => s.attendance.rate).filter((n): n is number => n != null),
  );
  const avgResults = average(
    data.students
      .map((s) => s.results.averagePercent)
      .filter((n): n is number => n != null),
  );

  return (
    <div className="ms-panel">
      <AppToast message={flash} tone="success" onDismiss={() => setFlash("")} />

      <section className="ms-hero">
        <div className="ms-hero__copy">
          <p className="ms-hero__eyebrow">{t("teacherMyStudents.hubEyebrow")}</p>
          <h2 className="ms-hero__title">{classLabel}</h2>
          <p className="ms-hero__sub">{t("teacherMyStudents.hubSub")}</p>
        </div>
        <div className="ms-hero__stats">
          <div>
            <strong>{data.students.length}</strong>
            <span>{t("dash.students")}</span>
          </div>
          <div>
            <strong>{groupedCount}</strong>
            <span>{t("teacherMyStudents.inGroups")}</span>
          </div>
          <div>
            <strong>{avgAttendance != null ? `${avgAttendance}%` : "—"}</strong>
            <span>{t("teacherMyStudents.attendShort")}</span>
          </div>
          <div>
            <strong>{avgResults != null ? `${avgResults}%` : "—"}</strong>
            <span>{t("dash.results")}</span>
          </div>
        </div>
      </section>

      <div className="ms-quick">
        <Link href="/teacher/attendance" className="ms-quick__item">
          <DashIcon name="attendance" />
          <span>{t("dash.attendance")}</span>
        </Link>
        <Link href="/teacher/results/by-student" className="ms-quick__item">
          <DashIcon name="results" />
          <span>{t("dash.results")}</span>
        </Link>
        <Link href="/teacher/classwork" className="ms-quick__item">
          <DashIcon name="assign" />
          <span>{t("teacherMyStudents.classwork")}</span>
        </Link>
        <Link href="/teacher/worksheets" className="ms-quick__item">
          <DashIcon name="templates" />
          <span>{t("teacherMyStudents.worksheets")}</span>
        </Link>
        <Link href="/teacher/library" className="ms-quick__item">
          <DashIcon name="library" />
          <span>{t("teacherMyStudents.eLibrary")}</span>
        </Link>
        <Link href="/teacher/scan-id" className="ms-quick__item">
          <DashIcon name="id-card" />
          <span>{t("teacherMyStudents.scanId")}</span>
        </Link>
      </div>

      <div className="ms-toolbar">
        <label className="ms-search">
          <span className="sr-only">{t("teacherMyStudents.searchSr")}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("teacherMyStudents.searchPlaceholder")}
          />
        </label>
        <label className="ms-filter">
          <span>{t("teacherMyStudents.group")}</span>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">{t("teacherMyStudents.allStudents")}</option>
            <option value="ungrouped">{t("teacherMyStudents.ungrouped")}</option>
            {data.groups.map((g) => (
              <option key={g} value={g}>
                {t("teacherMyStudents.groupOption", { group: g })}
              </option>
            ))}
          </select>
        </label>
        <label className="ms-filter">
          <span>{t("teacherMyStudents.sort")}</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="name">{t("teacherMyStudents.sortName")}</option>
            <option value="attendance">{t("teacherMyStudents.sortAttendance")}</option>
            <option value="results">{t("teacherMyStudents.sortResults")}</option>
            <option value="classwork">{t("teacherMyStudents.sortClasswork")}</option>
          </select>
        </label>
      </div>

      <div className="ms-layout">
        <section className="ms-list" aria-label={t("teacherMyStudents.listAria")}>
          {filtered.length === 0 ? (
            <div className="ms-empty">
              <DashIcon name="students" />
              <p>{t("teacherMyStudents.noMatch")}</p>
              <span>{t("teacherMyStudents.noMatchHint")}</span>
            </div>
          ) : (
            <ul>
              {filtered.map((s) => {
                const active = selected?.studentProfileId === s.studentProfileId;
                const initial = s.name.slice(0, 1).toUpperCase();
                return (
                  <li key={s.studentProfileId}>
                    <button
                      type="button"
                      className={`ms-row${active ? " ms-row--active" : ""}`}
                      onClick={() => setSelected(s)}
                    >
                      <span className="ms-avatar">
                        {s.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.photoUrl} alt="" />
                        ) : (
                          <span aria-hidden>{initial}</span>
                        )}
                      </span>
                      <span className="ms-row__body">
                        <strong>{s.name}</strong>
                        <span>
                          {s.studentId ?? t("teacherMyStudents.noId")}
                          {s.group
                            ? ` · ${t("teacherMyStudents.rowGroup", { group: s.group })}`
                            : ` · ${t("teacherMyStudents.rowUngrouped")}`}
                        </span>
                      </span>
                      <span className="ms-row__pills">
                        <span className="ms-mini">
                          A {fmtPct(s.attendance.rate)}
                        </span>
                        <span className="ms-mini ms-mini--results">
                          R {fmtPct(s.results.averagePercent)}
                        </span>
                        <span className="ms-mini ms-mini--work">
                          CW {s.classwork.submitted}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="ms-detail">
          {selected ? (
            <StudentDetail
              student={selected}
              busy={busyId === selected.studentProfileId}
              groups={[...new Set([...PRESET_GROUPS, ...data.groups])]}
              onAssign={(group) => void assignGroup(selected, group)}
            />
          ) : (
            <div className="ms-detail-empty">
              <DashIcon name="id-card" />
              <h3>{t("teacherMyStudents.selectStudent")}</h3>
              <p>{t("teacherMyStudents.selectStudentHint")}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StudentDetail({
  student,
  busy,
  groups,
  onAssign,
}: {
  student: HomeroomStudent;
  busy: boolean;
  groups: string[];
  onAssign: (group: string | null) => void;
}) {
  const { t } = useLocale();
  const [custom, setCustom] = useState("");
  const initial = student.name.slice(0, 1).toUpperCase();

  return (
    <article className="ms-card">
      <header className="ms-card__hero">
        <div className="ms-avatar ms-avatar--lg">
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.photoUrl} alt="" />
          ) : (
            <span aria-hidden>{initial}</span>
          )}
        </div>
        <div>
          <h3>{student.name}</h3>
          <p>
            {student.grade}
            {student.section ? ` · ${student.section}` : ""}
            {student.studentId ? ` · ${student.studentId}` : ""}
          </p>
        </div>
      </header>

      <section className="ms-overview">
        <h4>{t("teacherMyStudents.overview")}</h4>
        <div className="ms-overview__grid">
          <div className="ms-tile">
            <span>{t("dash.attendance")}</span>
            <strong>{fmtPct(student.attendance.rate)}</strong>
            <small>
              {student.attendance.presentDays}/{student.attendance.markedDays}{" "}
              {t("teacherMyStudents.days30")}
            </small>
          </div>
          <div className="ms-tile">
            <span>{t("dash.results")}</span>
            <strong>{fmtPct(student.results.averagePercent)}</strong>
            <small>
              {t("teacherMyStudents.publishedScores", {
                count: student.results.publishedScores,
              })}
            </small>
          </div>
          <div className="ms-tile">
            <span>{t("teacherMyStudents.classwork")}</span>
            <strong>{student.classwork.submitted}</strong>
            <small>
              {t("teacherMyStudents.gradedPending", {
                graded: student.classwork.graded,
                pending: student.classwork.pending,
              })}
            </small>
          </div>
          <div className="ms-tile">
            <span>{t("teacherMyStudents.library")}</span>
            <strong>
              {student.library.avgProgress != null
                ? `${student.library.avgProgress}%`
                : "—"}
            </strong>
            <small>
              {t("teacherMyStudents.resourcesOpened", {
                count: student.library.resources,
              })}
            </small>
          </div>
        </div>
      </section>

      <dl className="ms-card__stats">
        <div>
          <dt>{t("teacherMyStudents.phone")}</dt>
          <dd>{student.phone ?? "—"}</dd>
        </div>
        <div>
          <dt>{t("teacherMyStudents.cardCode")}</dt>
          <dd>
            <code>{student.cardCode ?? "—"}</code>
          </dd>
        </div>
        <div>
          <dt>{t("teacherMyStudents.gender")}</dt>
          <dd>{student.gender ?? "—"}</dd>
        </div>
        <div>
          <dt>{t("teacherMyStudents.behaviorNotes")}</dt>
          <dd>{student.behaviorNotes}</dd>
        </div>
      </dl>

      <div className="ms-card__groups">
        <h4>{t("teacherMyStudents.learningGroup")}</h4>
        <div className="ms-group-chips">
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              className={`ms-chip${student.group === g ? " ms-chip--on" : ""}`}
              disabled={busy}
              onClick={() => onAssign(g)}
            >
              {g}
            </button>
          ))}
          {student.group ? (
            <button
              type="button"
              className="ms-chip ms-chip--clear"
              disabled={busy}
              onClick={() => onAssign(null)}
            >
              {t("common.clear")}
            </button>
          ) : null}
        </div>
        <form
          className="ms-custom-group"
          onSubmit={(e) => {
            e.preventDefault();
            if (!custom.trim()) return;
            onAssign(custom.trim());
            setCustom("");
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={t("teacherMyStudents.customGroupPlaceholder")}
            maxLength={40}
          />
          <button
            type="submit"
            className="ms-btn ms-btn--ghost"
            disabled={busy || !custom.trim()}
          >
            {t("teacherMyStudents.set")}
          </button>
        </form>
      </div>

      <div className="ms-card__actions">
        <Link href="/teacher/attendance" className="ms-btn ms-btn--primary">
          {t("dash.attendance")}
        </Link>
        <Link
          href="/teacher/results/by-student"
          className="ms-btn ms-btn--ghost"
        >
          {t("dash.results")}
        </Link>
        <Link href="/teacher/classwork" className="ms-btn ms-btn--ghost">
          {t("teacherMyStudents.classwork")}
        </Link>
        <Link href="/teacher/library" className="ms-btn ms-btn--ghost">
          {t("teacherMyStudents.library")}
        </Link>
        <Link href="/teacher/scan-id" className="ms-btn ms-btn--ghost">
          {t("teacherMyStudents.scanId")}
        </Link>
      </div>
    </article>
  );
}

function average(nums: number[]) {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function fmtPct(n: number | null | undefined) {
  return n != null ? `${n}%` : "—";
}
