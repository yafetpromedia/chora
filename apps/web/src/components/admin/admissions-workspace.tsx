"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useClientSnapshot } from "@/lib/use-client-snapshot";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { AdmissionRegisterDrawer } from "@/components/admin/admission-register-drawer";
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

const STATUS_LABELS: Record<AdmissionStatus, string> = {
  APPLIED: "Applied",
  SCORED: "Scored",
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  ENROLLED: "Enrolled",
  WITHDRAWN: "Withdrawn",
};

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

function quickSetupLabel(grade: GradeWithSections) {
  return gradeHasStreamSections(grade)
    ? `Quick setup: ${grade.name} Natural/Social`
    : `Quick setup: ${grade.name}`;
}

function placementLabel(a: AdmissionApplication) {
  if (!a.placedGrade) return "—";
  return `${a.placedGrade.name}${a.placedSection ? ` · ${a.placedSection.name}` : ""}`;
}

export function AdmissionsWorkspace() {
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
        setError(err instanceof Error ? err.message : "Could not load admissions");
      } finally {
        setLoading(false);
      }
    },
    [fetchData],
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
          setError(err instanceof Error ? err.message : "Could not load admissions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

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
            ? "Auto-placement on — scores will place applicants instantly"
            : "Auto-placement off — use Run placement manually"
          : key === "autoAcceptOnPlace"
            ? value
              ? "Auto-accept on — placed applicants skip manual Accept"
              : "Auto-accept off"
            : value
              ? "Auto-enroll on — complete records enroll automatically"
              : "Auto-enroll off",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update settings");
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
      setToast(`Placement complete — ${res.placed} placed, ${res.unmatched} unmatched`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Placement failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkEnroll() {
    if (!cycleId || !canManage) return;
    if (!confirm("Enroll all placed/accepted applicants with complete records?")) return;
    setBusy(true);
    try {
      const res = await bulkEnrollAdmissionCycle(cycleId);
      await refreshApps();
      setToast(`Enrolled ${res.enrolled} · ${res.failed} failed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk enroll failed");
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
        `Enrolled ${res.student.student.name} — temp password ${res.student.credentials.studentTempPassword}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!canManage || !confirm("Remove this applicant?")) return;
    setBusy(true);
    try {
      await deleteAdmissionApplication(id);
      await refreshApps();
      setToast("Applicant removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
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
      setError(err instanceof Error ? err.message : "Update failed");
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
        setToast("Placement rule updated");
      } else {
        await createPlacementRule(cycleId, {
          ...payload,
          targetSectionId: ruleSectionId || undefined,
          streamMatch: ruleStream.trim() || undefined,
        });
        setToast("Placement rule added");
      }
      setRules(await listPlacementRules(cycleId));
      resetRuleForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingRuleId
            ? "Could not update rule"
            : "Could not add rule",
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
        setToast("Natural / Social stream rules created (70+ → Natural, below → Social)");
      } else {
        await seedGradePlacementRules(cycleId, gradeId);
        setToast("Placement rule created — scores place into this grade with balanced sections");
      }
      setRules(await listPlacementRules(cycleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seed rules");
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
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-v2">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast("")} />

      <header className="adm-v2__hero">
        <div className="adm-v2__hero-glow" aria-hidden />
        <div className="adm-v2__hero-inner">
          <div className="adm-v2__hero-main">
            <span className="adm-v2__chip">Admissions</span>
            <h2 className="adm-v2__hero-title">Entrance & placement</h2>
            <p className="adm-v2__hero-sub">
              Register applicants for any grade — scores place them into the right class and section. Enroll when ready.
            </p>
          </div>
          <div className="adm-v2__hero-stats">
            <div className="adm-v2__stat">
              <strong>{stats.total}</strong>
              <span>Applicants</span>
            </div>
            <div className="adm-v2__stat">
              <strong>{stats.scored}</strong>
              <span>Scored</span>
            </div>
            <div className="adm-v2__stat">
              <strong>{stats.placed}</strong>
              <span>Placed</span>
            </div>
            <div className="adm-v2__stat adm-v2__stat--accent">
              <strong>{stats.enrolled}</strong>
              <span>Enrolled</span>
            </div>
          </div>
        </div>
      </header>

      {activeCycle && canManage ? (
        <div className="adm-auto">
          <div className="adm-auto__head">
            <strong>Automation</strong>
            <span>
              {activeCycle.autoPlaceOnScore
                ? "Score in → placed instantly"
                : "Manual placement"}
              {activeCycle.autoAcceptOnPlace ? " · auto-accept" : ""}
              {activeCycle.autoEnrollOnPlace ? " · auto-enroll" : ""}
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
                <strong>Auto-place on score</strong>
                <small>Grade and section as soon as exam score is saved</small>
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
                <strong>Auto-accept</strong>
                <small>Skip manual Accept after placement</small>
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
                <strong>Auto-enroll</strong>
                <small>Create student record when ID, gender & DOB are complete</small>
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
            placeholder="Search name, ID, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
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
              {s === "ALL" ? "All statuses" : STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <div className="adm-v2__tabs">
          <button
            type="button"
            className={panel === "applicants" ? "adm-v2__tab adm-v2__tab--active" : "adm-v2__tab"}
            onClick={() => setPanel("applicants")}
          >
            Applicants
          </button>
          <button
            type="button"
            className={panel === "rules" ? "adm-v2__tab adm-v2__tab--active" : "adm-v2__tab"}
            onClick={() => setPanel("rules")}
          >
            Placement rules
          </button>
        </div>
        {canManage ? (
          <div className="adm-v2__toolbar-actions">
            {panel === "applicants" ? (
              <>
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  disabled={busy || !cycleId}
                  onClick={() => void handleRunPlacement()}
                  title="Re-run placement for all scored applicants"
                >
                  Re-run all
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  disabled={busy || !cycleId}
                  onClick={() => void handleBulkEnroll()}
                >
                  Enroll all placed
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--primary"
                  disabled={!activeCycle?.isOpen}
                  onClick={() => setShowRegister(true)}
                >
                  + Register applicant
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="adm-v2__loading">
          <span className="adm-v2__spinner" aria-hidden />
          Loading admissions…
        </div>
      ) : panel === "applicants" ? (
        filtered.length === 0 ? (
          <div className="adm-v2__empty">
            <h3>No applicants yet</h3>
            <p>
              Register with an entrance exam score — placement happens automatically when rules exist.
              Use <strong>Re-run all</strong> only to refresh everyone after rule changes.
            </p>
            {canManage && activeCycle?.isOpen ? (
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                onClick={() => setShowRegister(true)}
              >
                Register first applicant
              </button>
            ) : null}
          </div>
        ) : (
          <div className="adm-v2__table-wrap">
            <table className="adm-v2__table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Score</th>
                  <th>Placement</th>
                  <th>Status</th>
                  {canManage ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="adm-v2__name">{applicantName(a)}</div>
                      <div className="adm-v2__meta">
                        {a.targetGrade?.name ? `Applying: ${a.targetGrade.name}` : "Grade TBD"}
                        {a.idNumber ? ` · ID ${a.idNumber}` : ""}
                      </div>
                    </td>
                    <td>
                      <strong>{a.totalScore ?? "—"}</strong>
                      {a.entranceScore != null ? (
                        <div className="adm-v2__meta">
                          Exam {a.entranceScore}
                          {a.interviewScore != null ? ` · Int ${a.interviewScore}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div>{placementLabel(a)}</div>
                      {a.placementNote ? (
                        <div className="adm-v2__meta">{a.placementNote}</div>
                      ) : null}
                      {a.enrolledProfile ? (
                        <Link
                          href={`/admin/students`}
                          className="adm-v2__link"
                        >
                          → {a.enrolledProfile.user.externalRef ?? "Student"}
                        </Link>
                      ) : null}
                    </td>
                    <td>
                      <span className={`adm-badge adm-badge--${a.status.toLowerCase()}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    {canManage ? (
                      <td>
                        <div className="adm-v2__actions">
                          {a.status === "PLACED" ? (
                            <button
                              type="button"
                              className="adm-v2__action"
                              disabled={busy}
                              onClick={() => void handleAccept(a.id)}
                            >
                              Accept
                            </button>
                          ) : null}
                          {["PLACED", "ACCEPTED"].includes(a.status) ? (
                            <button
                              type="button"
                              className="adm-v2__action adm-v2__action--primary"
                              disabled={busy}
                              onClick={() => void handleEnrollOne(a.id)}
                            >
                              Enroll
                            </button>
                          ) : null}
                          {a.status !== "ENROLLED" ? (
                            <button
                              type="button"
                              className="adm-v2__action adm-v2__action--danger"
                              disabled={busy}
                              onClick={() => void handleDelete(a.id)}
                            >
                              Remove
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
            <h3>Score-based placement rules</h3>
            <p>
              Rules match total score (entrance + interview) to a grade and section. Add one rule per grade you admit into.
              For upper grades with Natural / Social streams, use <strong>stream match</strong> to auto-balance sections.
            </p>
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
                      {quickSetupLabel(g)}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>

          {canManage ? (
            <form className="adm-rules__form" onSubmit={(e) => void handleSaveRule(e)}>
              {editingRuleId ? (
                <p className="adm-rules__editing">
                  Editing rule — change fields below, then save or cancel.
                </p>
              ) : null}
              <label>
                Label
                <input value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} placeholder="Grade 5 (80+)" />
              </label>
              <label>
                Min
                <input type="number" value={ruleMin} onChange={(e) => setRuleMin(e.target.value)} />
              </label>
              <label>
                Max
                <input type="number" value={ruleMax} onChange={(e) => setRuleMax(e.target.value)} />
              </label>
              <label>
                Grade
                <select
                  value={ruleGradeId}
                  onChange={(e) => {
                    setRuleGradeId(e.target.value);
                    setRuleSectionId("");
                  }}
                >
                  <option value="">Select grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Section (fixed)
                <select value={ruleSectionId} onChange={(e) => setRuleSectionId(e.target.value)}>
                  <option value="">Auto / stream</option>
                  {ruleGrade?.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stream match
                <input
                  value={ruleStream}
                  onChange={(e) => setRuleStream(e.target.value)}
                  placeholder="Natural or Social (optional)"
                />
              </label>
              <div className="adm-rules__form-actions">
                <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || !ruleGradeId}>
                  {editingRuleId ? "Save changes" : "Add rule"}
                </button>
                {editingRuleId ? (
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    disabled={busy}
                    onClick={resetRuleForm}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {rules.length === 0 ? (
            <p className="adm-rules__empty">No rules yet — add rules manually or use quick setup for each grade.</p>
          ) : (
            <div className="adm-v2__table-wrap">
              <table className="adm-v2__table">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Score range</th>
                    <th>Target</th>
                    <th>Stream</th>
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
                      <td>{r.streamMatch ?? "—"}</td>
                      {canManage ? (
                        <td>
                          <div className="adm-v2__actions">
                            <button
                              type="button"
                              className="adm-v2__action"
                              disabled={busy}
                              onClick={() => startEditRule(r)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="adm-v2__action adm-v2__action--danger"
                              disabled={busy}
                              onClick={() => void handleDeleteRule(r.id)}
                            >
                              Remove
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

      {showRegister && activeCycle ? (
        <AdmissionRegisterDrawer
          cycle={activeCycle}
          grades={grades}
          onClose={() => setShowRegister(false)}
          onSuccess={(app) => {
            setShowRegister(false);
            setApplications((prev) => [app, ...prev]);
            setToast(`Registered ${applicantName(app)}`);
          }}
        />
      ) : null}
    </div>
  );
}
