"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { useLocale } from "@/components/i18n/locale-provider";

type StepNum = 1 | 2 | 3 | 4;

const PRESET_ICONS: Record<GradePresetKey, string> = {
  GRADES_1_8: "📚",
  GRADES_9_12: "🎓",
  KG_12: "🌱",
};

const SECTION_PRESETS = [
  { labelKey: "presetAb" as const, names: ["A", "B"] },
  { labelKey: "presetAbc" as const, names: ["A", "B", "C"] },
  { labelKey: "presetAbcd" as const, names: ["A", "B", "C", "D"] },
  { labelKey: "presetAbcgh" as const, names: ["A", "B", "C", "G", "H"] },
] as const;

const QUICK_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const STREAM_PRESETS = [
  { labelKey: "streamNatural" as const, names: ["Natural"] },
  { labelKey: "streamSocial" as const, names: ["Social"] },
  { labelKey: "streamNatAb" as const, names: ["Natural A", "Natural B"] },
  { labelKey: "streamSocAb" as const, names: ["Social A", "Social B"] },
  { labelKey: "streamAll" as const, names: ["Natural A", "Natural B", "Social A", "Social B"] },
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
  steps,
  progressAria,
}: {
  step: StepNum;
  maxStep: StepNum;
  gradesReady?: boolean;
  onGoToStep: (s: StepNum) => void;
  steps: { num: StepNum; label: string }[];
  progressAria: string;
}) {
  function canGoTo(target: StepNum) {
    if (target <= maxStep) return true;
    if (target === 2 && gradesReady) return true;
    return false;
  }

  return (
    <nav className="sw__steps" aria-label={progressAria}>
      {steps.map((s) => {
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
  const { t } = useLocale();
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

  const setupSteps = useMemo(
    () => [
      { num: 1 as const, label: t("adminSetupUi.stepGrades") },
      { num: 2 as const, label: t("adminSetupUi.stepSections") },
      { num: 3 as const, label: t("adminSetupUi.stepAttendance") },
      { num: 4 as const, label: t("adminSetupUi.stepStudents") },
    ],
    [t],
  );

  const stepCopy = useMemo(
    (): Record<StepNum, { title: string; lead: string }> => ({
      1: { title: t("adminSetupUi.step1Title"), lead: t("adminSetupUi.step1Lead") },
      2: { title: t("adminSetupUi.step2Title"), lead: t("adminSetupUi.step2Lead") },
      3: { title: t("adminSetupUi.step3Title"), lead: t("adminSetupUi.step3Lead") },
      4: { title: t("adminSetupUi.step4Title"), lead: t("adminSetupUi.step4Lead") },
    }),
    [t],
  );

  const attendanceModes = useMemo(
    () => [
      {
        value: "DAILY" as AttendanceMode,
        label: t("adminSetupUi.modeDaily"),
        desc: t("adminSetupUi.modeDailyDesc"),
        icon: "☀️",
      },
      {
        value: "PERIOD" as AttendanceMode,
        label: t("adminSetupUi.modePeriod"),
        desc: t("adminSetupUi.modePeriodDesc"),
        icon: "🕐",
      },
      {
        value: "BOTH" as AttendanceMode,
        label: t("adminSetupUi.modeBoth"),
        desc: t("adminSetupUi.modeBothDesc"),
        icon: "⚡",
      },
    ],
    [t],
  );

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
      setError(err instanceof Error ? err.message : t("adminSetupUi.errAddGrade"));
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
      setError(err instanceof Error ? err.message : t("adminSetupUi.errAddSections"));
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
      setError(err instanceof Error ? err.message : t("adminSetupUi.errRemoveSection"));
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
      setError(err instanceof Error ? err.message : t("adminSetupUi.errAttendance"));
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
      setError(err instanceof Error ? err.message : t("adminSetupUi.errFinish"));
    } finally {
      setLoading(false);
    }
  }

  const customChanged =
    selected === "CUSTOM" &&
    customPreview.join("|") !== grades.map((g) => g.name).join("|");
  const presetChanging =
    gradesReady && (selected !== activePreset || customChanged);
  const copy = stepCopy[step];

  if (bootstrapping) {
    return (
      <div className="sw">
        <div className="sw__loading">
          <span className="dash-loading-spinner" aria-hidden />
          {t("adminSetupUi.loading")}
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
        title={t("adminSetupUi.removeSectionTitle", {
          name: removeSectionTarget?.sectionName ?? "",
        })}
        message={t("adminSetupUi.removeSectionMsg")}
        confirmLabel={t("adminSetupUi.removeSectionConfirm")}
        cancelLabel={t("adminSetupUi.keepSection")}
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
        title={t("adminSetupUi.replaceTitle")}
        message={t("adminSetupUi.replaceMsg")}
        confirmLabel={t("adminSetupUi.replaceConfirm")}
        cancelLabel={t("common.cancel")}
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
              {revisiting ? t("adminSetupUi.editGradesSections") : t("adminSetupUi.schoolSetup")}
            </span>
          </div>
          {revisiting ? (
            <Link href="/admin/settings" className="sw__header-back">
              {t("adminSetupUi.backSettings")}
            </Link>
          ) : null}
        </header>

        <div className="sw__card">
          <StepNav
            step={step}
            maxStep={maxStep}
            gradesReady={gradesReady}
            onGoToStep={goToStep}
            steps={setupSteps}
            progressAria={t("adminSetupUi.setupProgressAria")}
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
                  <span className="sw__toolbar-label">
                    {t("adminSetupUi.gradesCount", { count: grades.length })}
                  </span>
                  <div className="sw__toolbar-pills">
                    {SECTION_PRESETS.map((preset) => (
                      <button
                        key={preset.labelKey}
                        type="button"
                        className="sw__pill"
                        disabled={sectionBusy}
                        onClick={() => void applySections([...preset.names])}
                      >
                        {t("adminSetupUi.allPreset", {
                          label: t(`adminSetupUi.${preset.labelKey}`),
                        })}
                      </button>
                    ))}
                  </div>
                  <input
                    className="sw__toolbar-input"
                    placeholder={t("adminSetupUi.bulkPlaceholder")}
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
                    {sectionBusy ? "…" : t("adminSetupUi.applyAll")}
                  </button>
                </div>
                {upperGrades.length > 0 ? (
                  <div className="sw__toolbar sw__toolbar--streams">
                    <span className="sw__toolbar-label">{t("adminSetupUi.upperGrades")}</span>
                    <div className="sw__toolbar-pills">
                      {STREAM_PRESETS.map((preset) => (
                        <button
                          key={preset.labelKey}
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
                          {t(`adminSetupUi.${preset.labelKey}`)}
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
                            <span className="sw__option-tag">{t("adminSetupUi.currentTag")}</span>
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
                        <span className="sw__option-title">{t("adminSetupUi.customRange")}</span>
                        <span className="sw__option-desc">{t("adminSetupUi.customRangeDesc")}</span>
                        {activePreset === "CUSTOM" ? (
                          <span className="sw__option-tag">{t("adminSetupUi.currentTag")}</span>
                        ) : selected === "CUSTOM" ? (
                          <span className="sw__option-check" aria-hidden>
                            ✓
                          </span>
                        ) : null}
                      </button>
                      <div className="sw__range-row">
                        <label className="sw__range-field">
                          <span>{t("adminSetupUi.from")}</span>
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
                                {t("adminSetupUi.gradeN", { n })}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="sw__range-field">
                          <span>{t("adminSetupUi.to")}</span>
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
                                {t("adminSetupUi.gradeN", { n })}
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
                          {t("adminSetupUi.includeEarlyChildhood")}
                        </label>
                      </div>
                      <div className="sw__range-row">
                        <label className="sw__range-field sw__range-field--grow">
                          <span>{t("adminSetupUi.extraGrades")}</span>
                          <input
                            value={extraGradeNames}
                            onChange={(e) => {
                              setExtraGradeNames(e.target.value);
                              setSelected("CUSTOM");
                            }}
                            placeholder={t("adminSetupUi.extraPlaceholder")}
                          />
                        </label>
                        <label className="sw__range-field sw__range-field--grow">
                          <span>{t("adminSetupUi.defaultSections")}</span>
                          <input
                            value={defaultSections}
                            onChange={(e) => setDefaultSections(e.target.value)}
                            placeholder="A, B, C"
                          />
                        </label>
                      </div>
                      <p className="sw__range-preview">
                        {t("adminSetupUi.levelsPreview", {
                          count: customPreview.length,
                          list: customPreview.join(" · "),
                        })}
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
                                title={t("adminSetupUi.removeSectionTitleAttr", { name: s.name })}
                                onClick={() => requestRemoveSection(g.id, s.id, s.name)}
                              >
                                {s.name} ×
                              </button>
                            ))
                          ) : (
                            <span className="sw__grade-empty">{t("adminSetupUi.noSections")}</span>
                          )}
                        </div>
                        <div
                          className="sw__grade-add"
                          aria-label={t("adminSetupUi.addSectionAria", { grade: g.name })}
                        >
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
                                title={
                                  taken
                                    ? t("adminSetupUi.letterAdded", { letter })
                                    : t("adminSetupUi.addLetter", { letter })
                                }
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
                                  key={preset.labelKey}
                                  type="button"
                                  className="sw__stream"
                                  disabled={sectionBusy}
                                  onClick={() => void applySections([...preset.names], [g.id])}
                                >
                                  {t(`adminSetupUi.${preset.labelKey}`)}
                                </button>
                              ))}
                          </div>
                        ) : null}
                        <div className="sw__grade-custom">
                          <input
                            className="sw__grade-custom-input"
                            placeholder={t("adminSetupUi.customSectionPh")}
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
                            {t("adminSetupUi.add")}
                          </button>
                        </div>
                      </article>
                    ))}
                    <article className="sw__grade-card sw__grade-card--add">
                      <h3 className="sw__grade-name">{t("adminSetupUi.addAnotherGrade")}</h3>
                      <p className="sw__grade-empty">{t("adminSetupUi.addAnotherGradeHint")}</p>
                      <div className="sw__grade-custom">
                        <input
                          className="sw__grade-custom-input"
                          placeholder={t("adminSetupUi.newGradePh")}
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
                          {t("adminSetupUi.addGrade")}
                        </button>
                      </div>
                    </article>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="sw__options">
                    {attendanceModes.map((m) => (
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
                      <span className="sw__finish-title">{t("adminSetupUi.finishAddStudents")}</span>
                      <span className="sw__finish-desc">{t("adminSetupUi.finishAddStudentsDesc")}</span>
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
                        {loading ? t("common.saving") : t("adminSetupUi.skipForNow")}
                      </span>
                      <span className="sw__finish-desc">{t("adminSetupUi.goDashboard")}</span>
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
                  {t("adminSetupUi.back")}
                </button>
              ) : (
                <span />
              )}

              <div className="sw__footer-right">
                {step === 2 ? (
                  <button type="button" className="sw__skip" onClick={() => goToStep(3)}>
                    {t("adminSetupUi.skipSections")}
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
                      ? t("common.saving")
                      : presetChanging
                        ? t("adminSetupUi.replaceContinue")
                        : gradesReady
                          ? t("adminSetupUi.continue")
                          : t("adminSetupUi.createContinue")}
                  </button>
                ) : null}

                {step === 2 ? (
                  revisiting ? (
                    <button
                      type="button"
                      className="sw__btn"
                      onClick={() => router.replace("/admin/settings")}
                    >
                      {t("adminSetupUi.done")}
                    </button>
                  ) : (
                    <button type="button" className="sw__btn" onClick={() => goToStep(3)}>
                      {t("adminSetupUi.continue")}
                    </button>
                  )
                ) : null}

                {step === 3 ? (
                  <button type="button" className="sw__btn" onClick={() => void onSaveAttendanceMode()}>
                    {t("adminSetupUi.continue")}
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
