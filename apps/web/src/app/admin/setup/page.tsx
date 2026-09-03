"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addSection,
  completeSchoolSetup,
  getSetupStatus,
  fixEarlyChildhoodGrades,
  listGradePresets,
  listGrades,
  removeSection,
  resetGrades,
  setupGrades,
  addGrade,
} from "@/lib/school-setup";
import {
  getAttendanceSettings,
  updateAttendanceSettings,
  type AttendanceMode,
} from "@/lib/attendance";
import type { GradePresetKey, GradeWithSections } from "@/lib/api";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY } from "@/lib/auth";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { SchoolWelcomeGate } from "@/components/auth/school-welcome-gate";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";

const STEPS = [
  { num: 1 as const, label: "Grades" },
  { num: 2 as const, label: "Sections" },
  { num: 3 as const, label: "Attendance" },
  { num: 4 as const, label: "Students" },
];

type StepNum = 1 | 2 | 3 | 4;

const STEP_COPY: Record<StepNum, { title: string; lead: string }> = {
  1: {
    title: "Grade structure",
    lead: "Pick a preset or set your own range — for example Grade 1 to 6, or 9 to 12 with Nursery and KG.",
  },
  2: {
    title: "Class sections",
    lead: "Add A–H for every grade, or Natural / Social streams on Grades 11 & 12. Type any name you use.",
  },
  3: {
    title: "Attendance mode",
    lead: "Pick how teachers mark attendance. You can change this later in settings.",
  },
  4: {
    title: "Ready to go",
    lead: "Add students now or finish setup and come back from the dashboard.",
  },
};

const PRESET_ICONS: Record<GradePresetKey, string> = {
  GRADES_1_8: "📚",
  GRADES_9_12: "🎓",
  KG_12: "🌱",
};

const ATTENDANCE_MODES: {
  value: AttendanceMode;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { value: "DAILY", label: "Daily", desc: "Once per day — primary schools", icon: "☀️" },
  { value: "PERIOD", label: "Period", desc: "Each class period", icon: "🕐" },
  { value: "BOTH", label: "Both", desc: "Daily + period tracking", icon: "⚡" },
];

const SECTION_PRESETS = [
  { label: "A·B", names: ["A", "B"] },
  { label: "A·B·C", names: ["A", "B", "C"] },
  { label: "A·B·C·D", names: ["A", "B", "C", "D"] },
  { label: "A·B·C·G·H", names: ["A", "B", "C", "G", "H"] },
] as const;

const QUICK_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const STREAM_PRESETS = [
  { label: "Natural", names: ["Natural"] },
  { label: "Social", names: ["Social"] },
  { label: "Nat A·B", names: ["Natural A", "Natural B"] },
  { label: "Soc A·B", names: ["Social A", "Social B"] },
  { label: "All streams", names: ["Natural A", "Natural B", "Social A", "Social B"] },
] as const;

const GRADE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function parseNames(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function previewGradeNames(
  fromGrade: number,
  toGrade: number,
  includeEarlyChildhood: boolean,
  extraRaw: string,
): string[] {
  const numbered = GRADE_NUMBERS.filter((n) => n >= fromGrade && n <= toGrade).map(
    (n) => `Grade ${n}`,
  );
  return [
    ...(includeEarlyChildhood ? ["Nursery", "KG 1", "KG 2"] : []),
    ...numbered,
    ...parseNames(extraRaw),
  ];
}

function inferCustomRange(names: string[]) {
  const early = new Set(["Nursery", "KG 1", "KG 2"]);
  const nums: number[] = [];
  const extras: string[] = [];
  let includeEarlyChildhood = false;
  for (const name of names) {
    if (early.has(name)) {
      includeEarlyChildhood = true;
      continue;
    }
    const match = /^Grade (\d+)$/.exec(name);
    if (match) {
      nums.push(Number(match[1]));
      continue;
    }
    extras.push(name);
  }
  return {
    fromGrade: nums.length ? Math.min(...nums) : 1,
    toGrade: nums.length ? Math.max(...nums) : 8,
    includeEarlyChildhood,
    extraGradeNames: extras.join(", "),
  };
}

function isUpperSecondaryGrade(gradeName: string): boolean {
  const n = gradeName.trim();
  return /\b(11|12)\b/.test(n) || /^g\s*(11|12)$/i.test(n);
}

function upperSecondaryGrades(grades: GradeWithSections[]): GradeWithSections[] {
  return grades.filter((g) => isUpperSecondaryGrade(g.name));
}

function StepNav({
  step,
  maxStep,
  gradesReady,
  onGoToStep,
}: {
  step: StepNum;
  maxStep: StepNum;
  gradesReady?: boolean;
  onGoToStep: (s: StepNum) => void;
}) {
  function canGoTo(target: StepNum) {
    if (target <= maxStep) return true;
    if (target === 2 && gradesReady) return true;
    return false;
  }

  return (
    <nav className="sw__steps" aria-label="Setup progress">
      {STEPS.map((s) => {
        const done = step > s.num;
        const active = step === s.num;
        const clickable = canGoTo(s.num);
        const cls = [
          "sw__step",
          active ? "sw__step--active" : "",
          done ? "sw__step--done" : "",
          clickable ? "sw__step--clickable" : "",
        ]
          .filter(Boolean)
          .join(" ");

        if (clickable) {
          return (
            <button
              key={s.num}
              type="button"
              className={cls}
              onClick={() => onGoToStep(s.num)}
            >
              <span className="sw__step-dot">{done ? "✓" : s.num}</span>
              <span className="sw__step-label">{s.label}</span>
            </button>
          );
        }

        return (
          <div key={s.num} className={cls} aria-current={active ? "step" : undefined}>
            <span className="sw__step-dot">{done ? "✓" : s.num}</span>
            <span className="sw__step-label">{s.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

export default function SchoolSetupPage() {
  const [step, setStep] = useState<StepNum>(1);
  const [maxStep, setMaxStep] = useState<StepNum>(1);
  const [presets, setPresets] = useState<
    { key: GradePresetKey; label: string; description: string }[]
  >([]);
  const [selected, setSelected] = useState<GradePresetKey | "CUSTOM" | null>(null);
  const [activePreset, setActivePreset] = useState<GradePresetKey | "CUSTOM" | null>(null);
  const [fromGrade, setFromGrade] = useState(1);
  const [toGrade, setToGrade] = useState(8);
  const [includeEarlyChildhood, setIncludeEarlyChildhood] = useState(false);
  const [extraGradeNames, setExtraGradeNames] = useState("");
  const [defaultSections, setDefaultSections] = useState("A, B");
  const [newGradeName, setNewGradeName] = useState("");
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [bulkSections, setBulkSections] = useState("A, B, C");
  const [customByGrade, setCustomByGrade] = useState<Record<string, string>>({});
  const [sectionBusy, setSectionBusy] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>("DAILY");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [gradesReady, setGradesReady] = useState(false);
  const [revisiting, setRevisiting] = useState(false);
  const [error, setError] = useState("");
  const [removeSectionTarget, setRemoveSectionTarget] = useState<{
    gradeId: string;
    sectionId: string;
    sectionName: string;
  } | null>(null);
  const [replaceStructureOpen, setReplaceStructureOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_ROLE_KEY) !== "admin") {
      router.replace("/login");
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    void (async () => {
      try {
        const [status, presetsList, settings, existingGrades] = await Promise.all([
          getSetupStatus(),
          listGradePresets(),
          getAttendanceSettings(),
          listGrades(),
        ]);

        setPresets(presetsList);
        setAttendanceMode(settings.mode);

        // Allow editing grades/sections after initial setup is done
        if (status.setupComplete) {
          setRevisiting(true);
        }

        if (existingGrades.length > 0) {
          let gradesList = existingGrades;
          const hasLegacyKg = existingGrades.some((g) => g.name === "KG");
          const hasEarlyChildhood = ["Nursery", "KG 1", "KG 2"].every((name) =>
            existingGrades.some((g) => g.name === name),
          );
          if (hasLegacyKg && !hasEarlyChildhood) {
            const fixed = await fixEarlyChildhoodGrades();
            if (fixed.updated) gradesList = fixed.grades;
          }
          setGrades(gradesList);
          setGradesReady(true);
          setMaxStep(status.setupComplete ? 4 : 2);
          if (status.gradePreset) {
            setSelected(status.gradePreset);
            setActivePreset(status.gradePreset);
          } else {
            const inferred = inferCustomRange(gradesList.map((g) => g.name));
            setSelected("CUSTOM");
            setActivePreset("CUSTOM");
            setFromGrade(inferred.fromGrade);
            setToGrade(inferred.toGrade);
            setIncludeEarlyChildhood(inferred.includeEarlyChildhood);
            setExtraGradeNames(inferred.extraGradeNames);
          }
          // When revisiting from Settings, land on sections (most common edit)
          if (status.setupComplete) {
            setStep(2);
          }
        }
      } catch {
        /* allow retry */
      } finally {
        setBootstrapping(false);
      }
    })();

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [router]);

  function goToStep(next: StepNum) {
    setError("");
    setStep(next);
    setMaxStep((prev) => (next > prev ? next : prev));
  }

  async function refreshGrades() {
    setGrades(await listGrades());
  }

  function structurePayload() {
    if (selected === "CUSTOM") {
      return {
        fromGrade,
        toGrade,
        includeEarlyChildhood,
        extraNames: parseNames(extraGradeNames),
        defaultSections: parseNames(defaultSections),
      };
    }
    if (!selected) return null;
    return {
      preset: selected,
      defaultSections: parseNames(defaultSections),
    };
  }

  const customPreview = previewGradeNames(
    fromGrade,
    toGrade,
    includeEarlyChildhood,
    extraGradeNames,
  );
  const customReady = selected === "CUSTOM" && fromGrade <= toGrade && customPreview.length > 0;

  async function onApplyGradeStructure() {
    if (!selected && !customReady) return;

    if (gradesReady && selected === activePreset && selected !== "CUSTOM") {
      goToStep(2);
      return;
    }
    if (
      gradesReady &&
      selected === "CUSTOM" &&
      activePreset === "CUSTOM" &&
      customPreview.join("|") === grades.map((g) => g.name).join("|")
    ) {
      goToStep(2);
      return;
    }

    if (gradesReady) {
      setReplaceStructureOpen(true);
      return;
    }

    await applyGradeStructure();
  }

  async function applyGradeStructure() {
    const payload = structurePayload();
    if (!payload) return;

    setLoading(true);
    setError("");
    try {
      if (gradesReady) {
        const result = await resetGrades(payload);
        setGrades(result.grades);
        setActivePreset(selected);
        goToStep(2);
      } else {
        const created = await setupGrades(payload);
        setGrades(created);
        setActivePreset(selected);
        setGradesReady(true);
        goToStep(2);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save grades";
      if (message.toLowerCase().includes("grades already exist")) {
        const existing = await listGrades();
        setGrades(existing);
        setGradesReady(true);
        setActivePreset(selected);
        goToStep(2);
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
      setReplaceStructureOpen(false);
    }
  }

  async function onAddExtraGrade() {
    const name = newGradeName.trim();
    if (!name) return;
    setSectionBusy(true);
    setError("");
    try {
      setGrades(await addGrade(name, parseNames(defaultSections)));
      setNewGradeName("");
      setActivePreset("CUSTOM");
      setSelected("CUSTOM");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add grade");
    } finally {
      setSectionBusy(false);
    }
  }

  async function applySections(names: string[], gradeIds?: string[]) {
    const targets = gradeIds ?? grades.map((g) => g.id);
    if (targets.length === 0) return;

    setSectionBusy(true);
    setError("");
    try {
      const snapshot = grades.length ? grades : await listGrades();
      for (const gradeId of targets) {
        const grade = snapshot.find((g) => g.id === gradeId);
        const existing = new Set(
          grade?.sections.map((s) => s.name.trim().toLowerCase()) ?? [],
        );
        for (const raw of names) {
          const name = raw.trim();
          if (!name || existing.has(name.toLowerCase())) continue;
          await addSection(gradeId, name);
          existing.add(name.toLowerCase());
        }
      }
      await refreshGrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add sections");
    } finally {
      setSectionBusy(false);
    }
  }

  async function onApplyBulkAll() {
    const names = parseNames(bulkSections);
    if (names.length === 0) return;
    await applySections(names);
  }

  async function onApplyGradeCustom(gradeId: string) {
    const names = parseNames(customByGrade[gradeId] ?? "");
    if (names.length === 0) return;
    await applySections(names, [gradeId]);
    setCustomByGrade((prev) => ({ ...prev, [gradeId]: "" }));
  }

  const upperGrades = upperSecondaryGrades(grades);

  function requestRemoveSection(gradeId: string, sectionId: string, sectionName: string) {
    setRemoveSectionTarget({ gradeId, sectionId, sectionName });
  }

  async function confirmRemoveSection() {
    if (!removeSectionTarget) return;
    const { gradeId, sectionId } = removeSectionTarget;
    setSectionBusy(true);
    setError("");
    try {
      await removeSection(gradeId, sectionId);
      await refreshGrades();
      setRemoveSectionTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove section");
    } finally {
      setSectionBusy(false);
    }
  }

  async function onSaveAttendanceMode() {
    setError("");
    try {
      await updateAttendanceSettings(attendanceMode);
      goToStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save attendance mode");
    }
  }

  async function onFinish() {
    setLoading(true);
    setError("");
    try {
      if (!revisiting) {
        await completeSchoolSetup();
      }
      router.replace(revisiting ? "/admin/settings" : "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup");
    } finally {
      setLoading(false);
    }
  }

  const customChanged =
    selected === "CUSTOM" &&
    customPreview.join("|") !== grades.map((g) => g.name).join("|");
  const presetChanging =
    gradesReady && (selected !== activePreset || customChanged);
  const copy = STEP_COPY[step];

  if (bootstrapping) {
    return (
      <div className="sw">
        <div className="sw__loading">
          <span className="dash-loading-spinner" aria-hidden />
          Loading setup…
        </div>
      </div>
    );
  }

  return (
    <>
      <SchoolWelcomeGate />
    <div className="sw">
      <AppConfirmDialog
        open={Boolean(removeSectionTarget)}
        tone="danger"
        title={`Remove section “${removeSectionTarget?.sectionName ?? ""}”?`}
        message="This section will be removed from the grade. Students still assigned to it may need to be moved first."
        confirmLabel="Remove section"
        cancelLabel="Keep section"
        busy={sectionBusy}
        onCancel={() => {
          if (sectionBusy) return;
          setRemoveSectionTarget(null);
        }}
        onConfirm={() => void confirmRemoveSection()}
      />
      <AppConfirmDialog
        open={replaceStructureOpen}
        tone="warning"
        title="Replace grade structure?"
        message="All sections will be cleared. Remove enrolled students first if you already have classes set up."
        confirmLabel="Replace structure"
        cancelLabel="Cancel"
        busy={loading}
        onCancel={() => {
          if (loading) return;
          setReplaceStructureOpen(false);
        }}
        onConfirm={() => void applyGradeStructure()}
      />
      <div className="sw__frame">
        <header className="sw__header">
          <BrandMark className="sw__header-mark" />
          <div className="sw__header-text">
            <span className="sw__header-title">{BRAND_NAME}</span>
            <span className="sw__header-sub">
              {revisiting ? "Edit grades & sections" : "School setup"}
            </span>
          </div>
          {revisiting ? (
            <Link href="/admin/settings" className="sw__header-back">
              ← Settings
            </Link>
          ) : null}
        </header>

        <div className="sw__card">
          <StepNav
            step={step}
            maxStep={maxStep}
            gradesReady={gradesReady}
            onGoToStep={goToStep}
          />

          <div className="sw__body">
            <div className="sw__intro">
              <h2>{copy.title}</h2>
              <p>{copy.lead}</p>
            </div>

            {error ? (
              <p className="auth-alert auth-alert--error sw__alert">{error}</p>
            ) : null}

            {step === 2 ? (
              <div className="sw__toolbar-wrap">
                <div className="sw__toolbar">
                  <span className="sw__toolbar-label">{grades.length} grades</span>
                  <div className="sw__toolbar-pills">
                    {SECTION_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        className="sw__pill"
                        disabled={sectionBusy}
                        onClick={() => void applySections([...preset.names])}
                      >
                        All {preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="sw__toolbar-input"
                    placeholder="A, B, C, G, H"
                    value={bulkSections}
                    onChange={(e) => setBulkSections(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void onApplyBulkAll();
                    }}
                  />
                  <button
                    type="button"
                    className="sw__btn sw__btn--ghost"
                    disabled={sectionBusy}
                    onClick={() => void onApplyBulkAll()}
                  >
                    {sectionBusy ? "…" : "Apply all"}
                  </button>
                </div>
                {upperGrades.length > 0 ? (
                  <div className="sw__toolbar sw__toolbar--streams">
                    <span className="sw__toolbar-label">Gr 11–12</span>
                    <div className="sw__toolbar-pills">
                      {STREAM_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="sw__pill sw__pill--stream"
                          disabled={sectionBusy}
                          onClick={() =>
                            void applySections(
                              [...preset.names],
                              upperGrades.map((g) => g.id),
                            )
                          }
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="sw__scroll">
              <div className="sw__scroll-inner">
                {step === 1 ? (
                  <div className="sw__options-wrap">
                    <div className="sw__options">
                      {presets.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          className={[
                            "sw__option",
                            selected === p.key ? "sw__option--selected" : "",
                            activePreset === p.key ? "sw__option--current" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setSelected(p.key)}
                        >
                          <span className="sw__option-icon" aria-hidden>
                            {PRESET_ICONS[p.key]}
                          </span>
                          <span className="sw__option-title">{p.label}</span>
                          <span className="sw__option-desc">{p.description}</span>
                          {activePreset === p.key ? (
                            <span className="sw__option-tag">Current</span>
                          ) : selected === p.key ? (
                            <span className="sw__option-check" aria-hidden>
                              ✓
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    <div
                      className={[
                        "sw__range",
                        selected === "CUSTOM" ? "sw__range--selected" : "",
                        activePreset === "CUSTOM" ? "sw__range--current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        type="button"
                        className="sw__range-head"
                        onClick={() => setSelected("CUSTOM")}
                      >
                        <span className="sw__option-title">Custom range</span>
                        <span className="sw__option-desc">
                          Choose start and end grades. Add Nursery/KG or extra named levels if you need them.
                        </span>
                        {activePreset === "CUSTOM" ? (
                          <span className="sw__option-tag">Current</span>
                        ) : selected === "CUSTOM" ? (
                          <span className="sw__option-check" aria-hidden>
                            ✓
                          </span>
                        ) : null}
                      </button>
                      <div className="sw__range-row">
                        <label className="sw__range-field">
                          <span>From</span>
                          <select
                            value={fromGrade}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              setFromGrade(next);
                              setSelected("CUSTOM");
                              if (next > toGrade) setToGrade(next);
                            }}
                          >
                            {GRADE_NUMBERS.map((n) => (
                              <option key={n} value={n}>
                                Grade {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="sw__range-field">
                          <span>To</span>
                          <select
                            value={toGrade}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              setToGrade(next);
                              setSelected("CUSTOM");
                              if (next < fromGrade) setFromGrade(next);
                            }}
                          >
                            {GRADE_NUMBERS.map((n) => (
                              <option key={n} value={n}>
                                Grade {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="sw__range-check">
                          <input
                            type="checkbox"
                            checked={includeEarlyChildhood}
                            onChange={(e) => {
                              setIncludeEarlyChildhood(e.target.checked);
                              setSelected("CUSTOM");
                            }}
                          />
                          Include Nursery, KG 1, KG 2
                        </label>
                      </div>
                      <div className="sw__range-row">
                        <label className="sw__range-field sw__range-field--grow">
                          <span>Extra grades (optional)</span>
                          <input
                            value={extraGradeNames}
                            onChange={(e) => {
                              setExtraGradeNames(e.target.value);
                              setSelected("CUSTOM");
                            }}
                            placeholder="Remedial, Bridging…"
                          />
                        </label>
                        <label className="sw__range-field sw__range-field--grow">
                          <span>Default sections</span>
                          <input
                            value={defaultSections}
                            onChange={(e) => setDefaultSections(e.target.value)}
                            placeholder="A, B, C"
                          />
                        </label>
                      </div>
                      <p className="sw__range-preview">
                        {customPreview.length} levels: {customPreview.join(" · ")}
                      </p>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="sw__grid">
                    {grades.map((g) => (
                      <article key={g.id} className="sw__grade-card">
                        <h3 className="sw__grade-name">{g.name}</h3>
                        <div className="sw__grade-sections">
                          {g.sections.length > 0 ? (
                            g.sections.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className="sw__tag"
                                disabled={sectionBusy}
                                title={`Remove ${s.name}`}
                                onClick={() => requestRemoveSection(g.id, s.id, s.name)}
                              >
                                {s.name} ×
                              </button>
                            ))
                          ) : (
                            <span className="sw__grade-empty">No sections</span>
                          )}
                        </div>
                        <div className="sw__grade-add" aria-label={`Add section to ${g.name}`}>
                          {QUICK_LETTERS.map((letter) => {
                            const taken = g.sections.some(
                              (s) => s.name.toLowerCase() === letter.toLowerCase(),
                            );
                            return (
                              <button
                                key={letter}
                                type="button"
                                className="sw__letter"
                                disabled={sectionBusy || taken}
                                title={taken ? `${letter} added` : `Add ${letter}`}
                                onClick={() => void applySections([letter], [g.id])}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                        {isUpperSecondaryGrade(g.name) ? (
                          <div className="sw__grade-streams">
                            {STREAM_PRESETS.map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                className="sw__stream"
                                disabled={sectionBusy}
                                onClick={() => void applySections([...preset.names], [g.id])}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="sw__grade-custom">
                          <input
                            className="sw__grade-custom-input"
                            placeholder="Custom, e.g. Natural A"
                            value={customByGrade[g.id] ?? ""}
                            disabled={sectionBusy}
                            onChange={(e) =>
                              setCustomByGrade((prev) => ({
                                ...prev,
                                [g.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void onApplyGradeCustom(g.id);
                            }}
                          />
                          <button
                            type="button"
                            className="sw__grade-custom-btn"
                            disabled={sectionBusy || !parseNames(customByGrade[g.id] ?? "").length}
                            onClick={() => void onApplyGradeCustom(g.id)}
                          >
                            Add
                          </button>
                        </div>
                      </article>
                    ))}
                    <article className="sw__grade-card sw__grade-card--add">
                      <h3 className="sw__grade-name">Add another grade</h3>
                      <p className="sw__grade-empty">
                        Use this for a level that is not in the numbered range.
                      </p>
                      <div className="sw__grade-custom">
                        <input
                          className="sw__grade-custom-input"
                          placeholder="e.g. Preparatory, Bridging"
                          value={newGradeName}
                          disabled={sectionBusy}
                          onChange={(e) => setNewGradeName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void onAddExtraGrade();
                          }}
                        />
                        <button
                          type="button"
                          className="sw__grade-custom-btn"
                          disabled={sectionBusy || !newGradeName.trim()}
                          onClick={() => void onAddExtraGrade()}
                        >
                          Add grade
                        </button>
                      </div>
                    </article>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="sw__options">
                    {ATTENDANCE_MODES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={`sw__option${attendanceMode === m.value ? " sw__option--selected" : ""}`}
                        onClick={() => setAttendanceMode(m.value)}
                      >
                        <span className="sw__option-icon" aria-hidden>
                          {m.icon}
                        </span>
                        <span className="sw__option-title">{m.label}</span>
                        <span className="sw__option-desc">{m.desc}</span>
                        {attendanceMode === m.value ? (
                          <span className="sw__option-check" aria-hidden>
                            ✓
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="sw__finish">
                    <Link href="/admin/students" className="sw__finish-card sw__finish-card--primary">
                      <span className="sw__finish-icon" aria-hidden>
                        👨‍🎓
                      </span>
                      <span className="sw__finish-title">Add students</span>
                      <span className="sw__finish-desc">Manual entry or CSV import</span>
                    </Link>
                    <button
                      type="button"
                      className="sw__finish-card"
                      disabled={loading}
                      onClick={() => void onFinish()}
                    >
                      <span className="sw__finish-icon" aria-hidden>
                        🏠
                      </span>
                      <span className="sw__finish-title">
                        {loading ? "Saving…" : "Skip for now"}
                      </span>
                      <span className="sw__finish-desc">Go to dashboard</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="sw__footer">
              {step > 1 ? (
                <button
                  type="button"
                  className="sw__back"
                  onClick={() => goToStep((step - 1) as StepNum)}
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}

              <div className="sw__footer-right">
                {step === 2 ? (
                  <button type="button" className="sw__skip" onClick={() => goToStep(3)}>
                    Skip sections
                  </button>
                ) : null}

                {step === 1 ? (
                  <button
                    type="button"
                    className="sw__btn"
                    disabled={!selected || loading || (selected === "CUSTOM" && fromGrade > toGrade)}
                    onClick={() => void onApplyGradeStructure()}
                  >
                    {loading
                      ? "Saving…"
                      : presetChanging
                        ? "Replace & continue"
                        : gradesReady
                          ? "Continue"
                          : "Create & continue"}
                  </button>
                ) : null}

                {step === 2 ? (
                  revisiting ? (
                    <button
                      type="button"
                      className="sw__btn"
                      onClick={() => router.replace("/admin/settings")}
                    >
                      Done
                    </button>
                  ) : (
                    <button type="button" className="sw__btn" onClick={() => goToStep(3)}>
                      Continue
                    </button>
                  )
                ) : null}

                {step === 3 ? (
                  <button type="button" className="sw__btn" onClick={() => void onSaveAttendanceMode()}>
                    Continue
                  </button>
                ) : null}
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
