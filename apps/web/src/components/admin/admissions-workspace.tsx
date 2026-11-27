"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useClientSnapshot } from "@/lib/use-client-snapshot";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AdmissionRegisterDrawer } from "@/components/admin/admission-register-drawer";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppToast } from "@/components/ui/app-toast";
import { hasPermission, Permission } from "@/lib/permissions";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import {
  bulkEnrollAdmissionCycle,
  createPlacementRule,
  updatePlacementRule,
  deleteAdmissionApplication,
  deletePlacementRule,
  enrollAdmissionApplication,
  ensureDefaultAdmissionCycle,
  listAdmissionApplications,
  listAdmissionCycles,
  listPlacementRules,
  runAdmissionPlacement,
  seedStreamPlacementRules,
  seedGradePlacementRules,
  updateAdmissionApplication,
  updateAdmissionCycle,
  type AdmissionApplication,
  type AdmissionCycle,
  type AdmissionStatus,
  type PlacementRule,
} from "@/lib/admissions";
import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";

const STATUS_FILTERS: Array<AdmissionStatus | "ALL"> = [
  "ALL",
  "APPLIED",
  "SCORED",
  "PLACED",
  "ACCEPTED",
  "ENROLLED",
  "REJECTED",
];

function applicantName(a: AdmissionApplication) {
  return [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
}

function gradeHasStreamSections(grade: GradeWithSections) {
  return grade.sections.some((s) => /^(natural|social)/i.test(s.name.trim()));
}

function quickSetupLabel(
  grade: GradeWithSections,
  t: (key: MessageKey | string, vars?: Record<string, string | number>) => string,
) {
  return gradeHasStreamSections(grade)
    ? t("admissionsUi.quickSetupStream", { grade: grade.name })
    : t("admissionsUi.quickSetupGrade", { grade: grade.name });
}

function placementLabel(
  a: AdmissionApplication,
  t: (key: MessageKey | string) => string,
) {
  if (!a.placedGrade) return t("admissionsUi.emptyDash");
  return `${a.placedGrade.name}${a.placedSection ? ` · ${a.placedSection.name}` : ""}`;
}

export function AdmissionsWorkspace() {
  const { t, tp } = useLocale();
  const statusLabels = useMemo(
    (): Record<AdmissionStatus, string> => ({
      APPLIED: t("admissionsUi.applied"),
      SCORED: t("admissionsUi.statusScored"),
      PLACED: t("admissionsUi.statusPlaced"),
      ACCEPTED: t("admissionsUi.accepted"),
      REJECTED: t("admissionsUi.rejected"),
      ENROLLED: t("admissionsUi.statusEnrolled"),
      WITHDRAWN: t("admissionsUi.withdrawn"),
    }),
    [t],
  );
  const canManage = useClientSnapshot(
    () => hasPermission(Permission.ADMISSIONS_MANAGE),
    false,
  );
  const [cycles, setCycles] = useState<AdmissionCycle[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [rules, setRules] = useState<PlacementRule[]>([]);
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<"applicants" | "rules">("applicants");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  const [ruleLabel, setRuleLabel] = useState("");
  const [ruleMin, setRuleMin] = useState("70");
  const [ruleMax, setRuleMax] = useState("100");
  const [ruleGradeId, setRuleGradeId] = useState("");
  const [ruleSectionId, setRuleSectionId] = useState("");
  const [ruleStream, setRuleStream] = useState("");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [removeAppId, setRemoveAppId] = useState<string | null>(null);

  const activeCycle = cycles.find((c) => c.id === cycleId) ?? null;

  const fetchData = useCallback(
    async (selectedCycleId?: string) => {
      const [cycleList, gradeList] = await Promise.all([
        listAdmissionCycles(),
        listGrades(),
      ]);
      let list = cycleList;
      if (list.length === 0 && canManage) {
        const created = await ensureDefaultAdmissionCycle();
        list = [created];
      }
      const cid = selectedCycleId ?? list[0]?.id ?? "";
      let apps: AdmissionApplication[] | null = null;
      let ruleList: PlacementRule[] | null = null;
      if (cid) {
        [apps, ruleList] = await Promise.all([
          listAdmissionApplications({ cycleId: cid }),
          listPlacementRules(cid),
        ]);
      }
      return { gradeList, list, cid, apps, ruleList };
    },
    [canManage],
  );

  const loadData = useCallback(
    async (selectedCycleId?: string) => {
      setLoading(true);
      setError("");
      try {
        const { gradeList, list, cid, apps, ruleList } = await fetchData(selectedCycleId);
        setGrades(gradeList);
        setCycles(list);
        setCycleId(cid);
        if (apps && ruleList) {
          setApplications(apps);
          setRules(ruleList);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("admissionsUi.loadFailed"),
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchData, t],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const { gradeList, list, cid, apps, ruleList } = await fetchData();
        if (cancelled) return;
        setGrades(gradeList);
        setCycles(list);
        setCycleId(cid);
        if (apps && ruleList) {
          setApplications(apps);
          setRules(ruleList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("admissionsUi.loadFailed"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        applicantName(a).toLowerCase().includes(q) ||
        (a.idNumber ?? "").toLowerCase().includes(q) ||
        a.fatherPhone.includes(q)
      );
    });
  }, [applications, search, statusFilter]);

  const stats = useMemo(() => {
    const scored = applications.filter((a) => a.totalScore != null).length;
    const placed = applications.filter((a) =>
      ["PLACED", "ACCEPTED", "ENROLLED"].includes(a.status),
    ).length;
    const enrolled = applications.filter((a) => a.status === "ENROLLED").length;
    return { total: applications.length, scored, placed, enrolled };
  }, [applications]);

  const ruleGrade = grades.find((g) => g.id === ruleGradeId);

  async function refreshApps() {
    if (!cycleId) return;
    setApplications(await listAdmissionApplications({ cycleId }));
  }

  async function handleToggleAutomation(
    key: "autoPlaceOnScore" | "autoAcceptOnPlace" | "autoEnrollOnPlace",
    value: boolean,
  ) {
    if (!cycleId || !canManage || !activeCycle) return;
    setBusy(true);
    try {
      const updated = await updateAdmissionCycle(cycleId, { [key]: value });
      setCycles((prev) => prev.map((c) => (c.id === cycleId ? updated : c)));
      setToast(
        key === "autoPlaceOnScore"
          ? value
            ? t("admissionsUi.autoPlaceOn")
            : t("admissionsUi.autoPlaceOff")
          : key === "autoAcceptOnPlace"
            ? value
              ? t("admissionsUi.autoAcceptOn")
              : t("admissionsUi.autoAcceptOff")
            : value
              ? t("admissionsUi.autoEnrollOn")
              : t("admissionsUi.autoEnrollOff"),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admissionsUi.updateSettingsFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRunPlacement() {
    if (!cycleId || !canManage) return;
    setBusy(true);
    setError("");
    try {
      const res = await runAdmissionPlacement(cycleId, { includePlaced: true });
      await refreshApps();
      setToast(
        t("admissionsUi.placementComplete", {
          placed: res.placed,
          unmatched: res.unmatched,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admissionsUi.placementFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkEnroll() {
    if (!cycleId || !canManage) return;
    if (!confirm(t("admissionsUi.confirmBulkEnroll"))) return;
    setBusy(true);
    try {
      const res = await bulkEnrollAdmissionCycle(cycleId);
      await refreshApps();
      setToast(
        t("admissionsUi.bulkEnrollResult", {
          enrolled: res.enrolled,
          failed: res.failed,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admissionsUi.bulkEnrollFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnrollOne(id: string) {
    if (!canManage) return;
    setBusy(true);
    try {
      const res = await enrollAdmissionApplication(id);
      await refreshApps();
      setToast(
        t("admissionsUi.enrollOneResult", {
          name: res.student.student.name,
          password: res.student.credentials.studentTempPassword,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admissionsUi.enrollmentFailed"));
    } finally {
      setBusy(false);
    }
  }

  function requestDelete(id: string) {
    if (!canManage) return;
    setRemoveAppId(id);
  }

  async function confirmDeleteApplicant() {
    if (!canManage || !removeAppId) return;
    const id = removeAppId;
    setBusy(true);
    try {
      await deleteAdmissionApplication(id);
      setRemoveAppId(null);
      await refreshApps();
      setToast(t("admissionsUi.applicantRemoved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admissionsUi.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(id: string) {
    if (!canManage) return;
    setBusy(true);
    try {
      await updateAdmissionApplication(id, { status: "ACCEPTED" });
      await refreshApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admissionsUi.updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  function resetRuleForm() {
    setEditingRuleId(null);
    setRuleLabel("");
    setRuleMin("70");
    setRuleMax("100");
    setRuleGradeId("");
    setRuleSectionId("");
    setRuleStream("");
  }

  function startEditRule(rule: PlacementRule) {
    setEditingRuleId(rule.id);
    setRuleLabel(rule.label);
    setRuleMin(String(rule.minScore));
    setRuleMax(String(rule.maxScore));
    setRuleGradeId(rule.targetGradeId);
    setRuleSectionId(rule.targetSectionId ?? "");
    setRuleStream(rule.streamMatch ?? "");
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!cycleId || !canManage || !ruleGradeId || !ruleLabel.trim()) return;
    setBusy(true);
    try {
      const payload = {
        label: ruleLabel.trim(),
        minScore: Number(ruleMin),
        maxScore: Number(ruleMax),
        targetGradeId: ruleGradeId,
        targetSectionId: ruleSectionId || null,
        streamMatch: ruleStream.trim() || null,
      };
      if (editingRuleId) {
        await updatePlacementRule(cycleId, editingRuleId, payload);
        setToast(t("admissionsUi.placementRuleUpdated"));
      } else {
        await createPlacementRule(cycleId, {
          ...payload,
          targetSectionId: ruleSectionId || undefined,
          streamMatch: ruleStream.trim() || undefined,
        });
        setToast(t("admissionsUi.placementRuleAdded"));
      }
      setRules(await listPlacementRules(cycleId));
      resetRuleForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingRuleId
            ? t("admissionsUi.couldNotUpdateRule")
            : t("admissionsUi.couldNotAddRule"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSeedGradeRules(gradeId: string) {
    if (!cycleId || !canManage) return;
    const grade = grades.find((g) => g.id === gradeId);
    setBusy(true);
    try {
      if (grade && gradeHasStreamSections(grade)) {
        await seedStreamPlacementRules(cycleId, gradeId);
        setToast(t("admissionsUi.streamRulesCreated"));
      } else {
        await seedGradePlacementRules(cycleId, gradeId);
        setToast(t("admissionsUi.gradeRuleCreated"));
      }
      setRules(await listPlacementRules(cycleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admissionsUi.couldNotSeedRules"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!cycleId || !canManage) return;
    setBusy(true);
    try {
      await deletePlacementRule(cycleId, ruleId);
      setRules(await listPlacementRules(cycleId));
      if (editingRuleId === ruleId) resetRuleForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admissionsUi.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  const showMobileRegister =
    canManage && panel === "applicants" && !!activeCycle?.isOpen && !showRegister;

  const removeApp = removeAppId
    ? applications.find((a) => a.id === removeAppId) ?? null
    : null;

  return (
    <div className={showMobileRegister ? "adm-v2 adm-v2--with-mobile-cta" : "adm-v2"}>
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />
      <AppConfirmDialog
        open={Boolean(removeAppId)}
        tone="danger"
        title={t("admissionsUi.remove")}
        message={
          removeApp
            ? `${t("admissionsUi.confirmRemoveApplicant")} (${applicantName(removeApp)})`
            : t("admissionsUi.confirmRemoveApplicant")
        }
        confirmLabel={t("admissionsUi.remove")}
        cancelLabel={t("common.cancel")}
        busy={busy && Boolean(removeAppId)}
        onCancel={() => {
          if (!busy) setRemoveAppId(null);
        }}
        onConfirm={() => void confirmDeleteApplicant()}
      />

      <header className="adm-v2__hero">
        <div className="adm-v2__hero-glow" aria-hidden />
        <div className="adm-v2__hero-inner">
          <div className="adm-v2__hero-main">
            <span className="adm-v2__chip">{tp("Admissions")}</span>
            <h2 className="adm-v2__hero-title">{t("admissionsUi.hero")}</h2>
            <p className="adm-v2__hero-sub">{t("admissionsUi.heroSub")}</p>
          </div>
          <div className="adm-v2__hero-stats">
            <div className="adm-v2__stat">
              <strong>{stats.total}</strong>
              <span>{t("admissionsUi.applicants")}</span>
            </div>
            <div className="adm-v2__stat">
              <strong>{stats.scored}</strong>
              <span>{t("admissionsUi.scored")}</span>
            </div>
            <div className="adm-v2__stat">
              <strong>{stats.placed}</strong>
              <span>{t("admissionsUi.placed")}</span>
            </div>
            <div className="adm-v2__stat adm-v2__stat--accent">
              <strong>{stats.enrolled}</strong>
              <span>{t("admissionsUi.enrolled")}</span>
            </div>
          </div>
        </div>
      </header>

      {activeCycle && canManage ? (
        <div className="adm-auto">
          <div className="adm-auto__head">
            <strong>{t("admissionsUi.automation")}</strong>
            <span>
              {activeCycle.autoPlaceOnScore
                ? t("admissionsUi.scoreInPlaced")
                : t("admissionsUi.manualPlacement")}
              {activeCycle.autoAcceptOnPlace ? t("admissionsUi.suffixAutoAccept") : ""}
              {activeCycle.autoEnrollOnPlace ? t("admissionsUi.suffixAutoEnroll") : ""}
            </span>
          </div>
          <div className="adm-auto__toggles">
            <label className="adm-auto__toggle">
              <input
                type="checkbox"
                checked={activeCycle.autoPlaceOnScore}
                disabled={busy}
                onChange={(e) =>
                  void handleToggleAutomation("autoPlaceOnScore", e.target.checked)
                }
              />
              <span>
                <strong>{t("admissionsUi.autoPlaceOnScore")}</strong>
                <small>{t("admissionsUi.autoPlaceOnScoreHint")}</small>
              </span>
            </label>
            <label className="adm-auto__toggle">
              <input
                type="checkbox"
                checked={activeCycle.autoAcceptOnPlace}
                disabled={busy}
                onChange={(e) =>
                  void handleToggleAutomation("autoAcceptOnPlace", e.target.checked)
                }
              />
              <span>
                <strong>{t("admissionsUi.autoAcceptLabel")}</strong>
                <small>{t("admissionsUi.autoAcceptHint")}</small>
              </span>
            </label>
            <label className="adm-auto__toggle">
              <input
                type="checkbox"
                checked={activeCycle.autoEnrollOnPlace}
                disabled={busy}
                onChange={(e) =>
                  void handleToggleAutomation("autoEnrollOnPlace", e.target.checked)
                }
              />
              <span>
                <strong>{t("admissionsUi.autoEnrollLabel")}</strong>
                <small>{t("admissionsUi.autoEnrollHint")}</small>
              </span>
            </label>
          </div>
        </div>
      ) : null}

      <div className="adm-v2__toolbar">
        <label className="adm-v2__search">
          <DashIcon name="students" className="adm-v2__search-icon" />
          <input
            type="search"
            placeholder={t("admissionsUi.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="adm-v2__filters">
          <select
            className="adm-v2__filter"
            value={cycleId}
            onChange={(e) => void loadData(e.target.value)}
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear.name})
              </option>
            ))}
          </select>
          <select
            className="adm-v2__filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AdmissionStatus | "ALL")}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? t("admissionsUi.allStatuses") : statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-v2__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={panel === "applicants"}
            className={panel === "applicants" ? "adm-v2__tab adm-v2__tab--active" : "adm-v2__tab"}
            onClick={() => setPanel("applicants")}
          >
            {t("admissionsUi.applicants")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === "rules"}
            className={panel === "rules" ? "adm-v2__tab adm-v2__tab--active" : "adm-v2__tab"}
            onClick={() => setPanel("rules")}
          >
            {t("admissionsUi.tabPlacementRules")}
          </button>
        </div>
        {canManage && panel === "applicants" ? (
          <div className="adm-v2__toolbar-actions">
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={busy || !cycleId}
              onClick={() => void handleRunPlacement()}
              title={t("admissionsUi.rerunAllTitle")}
            >
              {t("admissionsUi.rerunAll")}
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={busy || !cycleId}
              onClick={() => void handleBulkEnroll()}
            >
              {t("admissionsUi.enrollAllPlaced")}
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--primary adm-v2__register-desktop"
              disabled={!activeCycle?.isOpen}
              onClick={() => setShowRegister(true)}
            >
              + {t("admissionsUi.registerApplicant")}
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="adm-v2__loading">
          <span className="adm-v2__spinner" aria-hidden />
          {t("admissionsUi.loadingAdmissions")}
        </div>
      ) : panel === "applicants" ? (
        filtered.length === 0 ? (
          <div className="adm-v2__empty">
            <h3>{t("admissionsUi.noApplicants")}</h3>
            <p>{t("admissionsUi.noApplicantsHint")}</p>
            {canManage && activeCycle?.isOpen ? (
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                onClick={() => setShowRegister(true)}
              >
                {t("admissionsUi.registerFirstApplicant")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="adm-v2__table-wrap">
            <table className="adm-v2__table">
              <thead>
                <tr>
                  <th>{t("admissionsUi.colApplicant")}</th>
                  <th>{t("admissionsUi.colScore")}</th>
                  <th>{t("admissionsUi.colPlacement")}</th>
                  <th>{t("admissionsUi.colStatus")}</th>
                  {canManage ? <th>{t("common.actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td data-label={t("admissionsUi.colApplicant")}>
                      <div className="adm-v2__name">{applicantName(a)}</div>
                      <div className="adm-v2__meta">
                        {a.targetGrade?.name
                          ? t("admissionsUi.applyingGrade", { grade: a.targetGrade.name })
                          : t("admissionsUi.gradeTbd")}
                        {a.idNumber
                          ? ` · ${t("admissionsUi.idNumberPrefix", { id: a.idNumber })}`
                          : ""}
                      </div>
                    </td>
                    <td data-label={t("admissionsUi.colScore")}>
                      <strong>{a.totalScore ?? t("admissionsUi.emptyDash")}</strong>
                      {a.entranceScore != null ? (
                        <div className="adm-v2__meta">
                          {t("admissionsUi.examShort", { score: a.entranceScore })}
                          {a.interviewScore != null
                            ? ` · ${t("admissionsUi.interviewShort", { score: a.interviewScore })}`
                            : ""}
                        </div>
                      ) : null}
                    </td>
                    <td data-label={t("admissionsUi.colPlacement")}>
                      <div>{placementLabel(a, t)}</div>
                      {a.placementNote ? (
                        <div className="adm-v2__meta">{a.placementNote}</div>
                      ) : null}
                      {a.enrolledProfile ? (
                        <Link
                          href={`/admin/students`}
                          className="adm-v2__link"
                        >
                          → {a.enrolledProfile.user.externalRef ?? t("studentsUi.student")}
                        </Link>
                      ) : null}
                    </td>
                    <td data-label={t("admissionsUi.colStatus")}>
                      <span className={`adm-badge adm-badge--${a.status.toLowerCase()}`}>
                        {statusLabels[a.status]}
                      </span>
                    </td>
                    {canManage ? (
                      <td data-label={t("common.actions")}>
                        <div className="adm-v2__actions">
                          {a.status === "PLACED" ? (
                            <button
                              type="button"
                              className="adm-v2__action"
                              disabled={busy}
                              onClick={() => void handleAccept(a.id)}
                            >
                              {t("admissionsUi.accept")}
                            </button>
                          ) : null}
                          {["PLACED", "ACCEPTED"].includes(a.status) ? (
                            <button
                              type="button"
                              className="adm-v2__action adm-v2__action--primary"
                              disabled={busy}
                              onClick={() => void handleEnrollOne(a.id)}
                            >
                              {t("admissionsUi.enroll")}
                            </button>
                          ) : null}
                          {a.status !== "ENROLLED" ? (
                            <button
                              type="button"
                              className="adm-v2__action adm-v2__action--danger"
                              disabled={busy}
                              onClick={() => requestDelete(a.id)}
                            >
                              {t("admissionsUi.remove")}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="adm-rules">
          <div className="adm-rules__intro">
            <h3>{t("admissionsUi.rulesTitle")}</h3>
            <p>{t("admissionsUi.rulesIntro")}</p>
            {canManage && grades.length > 0 ? (
              <div className="adm-rules__presets">
                {grades.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      disabled={busy}
                      onClick={() => void handleSeedGradeRules(g.id)}
                    >
                      {quickSetupLabel(g, t)}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>

          {canManage ? (
            <form className="adm-rules__form" onSubmit={(e) => void handleSaveRule(e)}>
              {editingRuleId ? (
                <p className="adm-rules__editing">{t("admissionsUi.editingRuleHint")}</p>
              ) : null}
              <label>
                {t("admissionsUi.fieldLabel")}
                <input
                  value={ruleLabel}
                  onChange={(e) => setRuleLabel(e.target.value)}
                  placeholder={t("admissionsUi.ruleLabelPlaceholder")}
                />
              </label>
              <label>
                {t("admissionsUi.fieldMin")}
                <input type="number" value={ruleMin} onChange={(e) => setRuleMin(e.target.value)} />
              </label>
              <label>
                {t("admissionsUi.fieldMax")}
                <input type="number" value={ruleMax} onChange={(e) => setRuleMax(e.target.value)} />
              </label>
              <label>
                {t("admissionsUi.fieldGrade")}
                <select
                  value={ruleGradeId}
                  onChange={(e) => {
                    setRuleGradeId(e.target.value);
                    setRuleSectionId("");
                  }}
                >
                  <option value="">{t("admissionsUi.selectGrade")}</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("admissionsUi.fieldSectionFixed")}
                <select value={ruleSectionId} onChange={(e) => setRuleSectionId(e.target.value)}>
                  <option value="">{t("admissionsUi.autoStream")}</option>
                  {ruleGrade?.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("admissionsUi.fieldStreamMatch")}
                <input
                  value={ruleStream}
                  onChange={(e) => setRuleStream(e.target.value)}
                  placeholder={t("admissionsUi.streamMatchPlaceholder")}
                />
              </label>
              <div className="adm-rules__form-actions">
                <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || !ruleGradeId}>
                  {editingRuleId ? t("admissionsUi.saveChanges") : t("admissionsUi.addRule")}
                </button>
                {editingRuleId ? (
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    disabled={busy}
                    onClick={resetRuleForm}
                  >
                    {t("common.cancel")}
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {rules.length === 0 ? (
            <p className="adm-rules__empty">{t("admissionsUi.rulesEmpty")}</p>
          ) : (
            <div className="adm-v2__table-wrap">
              <table className="adm-v2__table">
                <thead>
                  <tr>
                    <th>{t("admissionsUi.colRule")}</th>
                    <th>{t("admissionsUi.colScoreRange")}</th>
                    <th>{t("admissionsUi.colTarget")}</th>
                    <th>{t("admissionsUi.colStream")}</th>
                    {canManage ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className={editingRuleId === r.id ? "adm-v2__row--editing" : undefined}>
                      <td>{r.label}</td>
                      <td>
                        {r.minScore} – {r.maxScore}
                      </td>
                      <td>
                        {r.targetGrade.name}
                        {r.targetSection ? ` · ${r.targetSection.name}` : ""}
                      </td>
                      <td>{r.streamMatch ?? t("admissionsUi.emptyDash")}</td>
                      {canManage ? (
                        <td>
                          <div className="adm-v2__actions">
                            <button
                              type="button"
                              className="adm-v2__action"
                              disabled={busy}
                              onClick={() => startEditRule(r)}
                            >
                              {t("admissionsUi.edit")}
                            </button>
                            <button
                              type="button"
                              className="adm-v2__action adm-v2__action--danger"
                              disabled={busy}
                              onClick={() => void handleDeleteRule(r.id)}
                            >
                              {t("admissionsUi.remove")}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showMobileRegister ? (
        <div className="adm-v2__mobile-cta">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={() => setShowRegister(true)}
          >
            + {t("admissionsUi.registerApplicant")}
          </button>
        </div>
      ) : null}

      {showRegister && activeCycle ? (
        <AdmissionRegisterDrawer
          cycle={activeCycle}
          grades={grades}
          onClose={() => setShowRegister(false)}
          onSuccess={(app) => {
            setShowRegister(false);
            setApplications((prev) => [app, ...prev]);
            setToast(t("admissionsUi.registeredApplicant", { name: applicantName(app) }));
          }}
        />
      ) : null}
    </div>
  );
}
