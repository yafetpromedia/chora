"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DashIcon } from "@/components/dashboard/dash-icons";

export type ResultsStudentOption = {
  id: string;
  name: string;
  grade?: string;
  gradeId?: string;
  section?: string | null;
  sectionId?: string | null;
  studentId?: string | null;
  photoUrl?: string | null;
};

type Props = {
  students: ResultsStudentOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function classMeta(s: ResultsStudentOption) {
  return [s.grade, s.section].filter(Boolean).join(" · ") || null;
}

function Face({
  student,
  size = "md",
}: {
  student: ResultsStudentOption;
  size?: "sm" | "md";
}) {
  const cls = `res-stu-pick__face res-stu-pick__face--${size}${
    student.photoUrl ? " res-stu-pick__face--photo" : ""
  }`;
  if (student.photoUrl) {
    return <img className={cls} src={student.photoUrl} alt="" />;
  }
  return (
    <span className={cls} aria-hidden>
      {initials(student.name)}
    </span>
  );
}

export function ResultsStudentPicker({
  students,
  value,
  onChange,
  disabled = false,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const selected = students.find((s) => s.id === value) ?? null;

  const grades = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      if (s.gradeId && s.grade) map.set(s.gradeId, s.grade);
      else if (s.grade) map.set(s.grade, s.grade);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const sections = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      if (gradeFilter) {
        const gKey = s.gradeId ?? s.grade ?? "";
        if (gKey !== gradeFilter) continue;
      }
      if (s.sectionId && s.section) map.set(s.sectionId, s.section);
      else if (s.section) map.set(s.section, s.section);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, gradeFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => {
        if (gradeFilter) {
          const gKey = s.gradeId ?? s.grade ?? "";
          if (gKey !== gradeFilter) return false;
        }
        if (sectionFilter) {
          const sKey = s.sectionId ?? s.section ?? "";
          if (sKey !== sectionFilter) return false;
        }
        if (!q) return true;
        const hay = [s.name, s.studentId, s.grade, s.section]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, query, gradeFilter, sectionFilter]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (sectionFilter && !sections.some((s) => s.id === sectionFilter)) {
      setSectionFilter("");
    }
  }, [sections, sectionFilter]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function pick(id: string) {
    onChange(id);
    close();
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="res-stu-pick__overlay" onClick={close}>
            <div
              className="res-stu-pick__modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="res-stu-pick-title"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="res-stu-pick__head">
                <div>
                  <h2 id="res-stu-pick-title" className="res-stu-pick__title">
                    Find student
                  </h2>
                  <p className="res-stu-pick__sub">
                    Search by name or ID, then pick a student.
                  </p>
                </div>
                <button
                  type="button"
                  className="res-stu-pick__close"
                  onClick={close}
                  aria-label="Close"
                >
                  ×
                </button>
              </header>

              <div className="res-stu-pick__search-wrap">
                <DashIcon name="students" className="dash-icon--sm" />
                <input
                  ref={searchRef}
                  type="search"
                  className="res-stu-pick__search"
                  placeholder="Type a name or student ID…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {grades.length > 1 || sections.length > 0 ? (
                <div className="res-stu-pick__chips" role="group" aria-label="Filters">
                  <button
                    type="button"
                    className={`res-stu-pick__chip${gradeFilter === "" ? " is-on" : ""}`}
                    onClick={() => {
                      setGradeFilter("");
                      setSectionFilter("");
                    }}
                  >
                    All
                  </button>
                  {grades.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`res-stu-pick__chip${gradeFilter === g.id ? " is-on" : ""}`}
                      onClick={() => {
                        setGradeFilter(g.id);
                        setSectionFilter("");
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
                  {gradeFilter && sections.length > 0
                    ? sections.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`res-stu-pick__chip res-stu-pick__chip--section${
                            sectionFilter === s.id ? " is-on" : ""
                          }`}
                          onClick={() =>
                            setSectionFilter((prev) => (prev === s.id ? "" : s.id))
                          }
                        >
                          Sec {s.name}
                        </button>
                      ))
                    : null}
                </div>
              ) : null}

              <p className="res-stu-pick__count">
                {filtered.length === students.length
                  ? `${students.length} students`
                  : `${filtered.length} match${filtered.length === 1 ? "" : "es"}`}
              </p>

              <ul className="res-stu-pick__list" role="listbox">
                {filtered.length === 0 ? (
                  <li className="res-stu-pick__empty">No students found.</li>
                ) : (
                  filtered.map((s) => {
                    const active = s.id === value;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`res-stu-pick__row${active ? " is-active" : ""}`}
                          onClick={() => pick(s.id)}
                        >
                          <Face student={s} />
                          <span className="res-stu-pick__row-main">
                            <strong>{s.name}</strong>
                            <span>{classMeta(s) ?? "—"}</span>
                          </span>
                          {s.studentId ? (
                            <span className="res-stu-pick__id">{s.studentId}</span>
                          ) : null}
                          {active ? (
                            <span className="res-stu-pick__check" aria-hidden>
                              ✓
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="res-stu-pick">
      <span className="res-stu-pick__label">Student</span>
      <button
        type="button"
        className="res-stu-pick__trigger"
        disabled={Boolean(disabled || students.length === 0)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {selected ? (
          <>
            <Face student={selected} size="sm" />
            <span className="res-stu-pick__trigger-text">
              <strong>{selected.name}</strong>
              <span>
                {[classMeta(selected), selected.studentId].filter(Boolean).join(" · ")}
              </span>
            </span>
          </>
        ) : (
          <span className="res-stu-pick__trigger-empty">Choose a student…</span>
        )}
        <span className="res-stu-pick__change">Change</span>
      </button>
      {modal}
    </div>
  );
}
