"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  AcademicsBadge,
  AcademicsEmpty,
  AcademicsHero,
  AcademicsPanel,
  formatAcadDate,
  yearProgress,
} from "@/components/academics/academics-ui";
import {
  createAcademicYear,
  listAcademicYears,
  setCurrentAcademicYear,
  type AcademicCalendarSystem,
  type AcademicYear,
} from "@/lib/results";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

export default function AcademicYearsPage() {
  const router = useRouter();
  const { t, tp } = useLocale();

  const calendarLabel = (system?: AcademicCalendarSystem) =>
    system === "GREGORIAN"
      ? t("adminAcademicYearsUi.gcCode")
      : t("adminAcademicYearsUi.ecCode");

  const calendarHint = (system: AcademicCalendarSystem) =>
    system === "ETHIOPIAN"
      ? t("adminAcademicYearsUi.ethHint")
      : t("adminAcademicYearsUi.gregHint");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [calendarSystem, setCalendarSystem] =
    useState<AcademicCalendarSystem>("ETHIOPIAN");
  const [isCurrent, setIsCurrent] = useState(true);

  async function load() {
    setYears(await listAcademicYears());
  }

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void listAcademicYears()
      .then((list) => {
        if (!cancelled) setYears(list);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t("adminAcademicYearsUi.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createAcademicYear({
        name,
        startDate,
        endDate,
        calendarSystem,
        isCurrent,
      });
      setName("");
      setStartDate("");
      setEndDate("");
      setCalendarSystem("ETHIOPIAN");
      setSuccess(t("adminAcademicYearsUi.created"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminAcademicYearsUi.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onSetCurrent(id: string) {
    setError("");
    setSuccess("");
    try {
      await setCurrentAcademicYear(id);
      setSuccess(t("adminAcademicYearsUi.currentUpdated"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminAcademicYearsUi.updateFailed"));
    }
  }

  const current = years.find((y) => y.isCurrent);
  const totalTerms = years.reduce((sum, y) => sum + (y._count?.academicTerms ?? 0), 0);
  const totalSubjects = years.reduce((sum, y) => sum + (y._count?.classSubjects ?? 0), 0);
  const currentProgress = current
    ? yearProgress(current.startDate, current.endDate)
    : 0;

  return (
    <DashboardPage role="admin" title={tp("Academic years")}>
      <div className="acad-page acad-page--years">
        <AcademicsHero
          chip={t("adminAcademicYearsUi.chip")}
          compact
          backHref="/admin/academics"
          title={t("adminAcademicYearsUi.heroTitle")}
          subtitle={t("adminAcademicYearsUi.heroSub")}
          badges={
            current ? (
              <AcademicsBadge variant="live">
                {t("adminAcademicYearsUi.currentBadge", { name: current.name })}
              </AcademicsBadge>
            ) : null
          }
          stats={[
            { label: t("adminAcademicYearsUi.statYears"), value: years.length },
            { label: t("adminAcademicYearsUi.statTerms"), value: totalTerms },
            { label: t("adminAcademicYearsUi.statClassSubjects"), value: totalSubjects },
            {
              label: t("adminAcademicYearsUi.statProgress"),
              value: current ? `${currentProgress}%` : "—",
              hint: current?.name,
              accent: true,
            },
          ]}
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />
        <AppToast message={success} tone="success" onDismiss={() => setSuccess("")} />

        <AcademicsPanel
          title={t("adminAcademicYearsUi.panelTitle")}
          subtitle={t("adminAcademicYearsUi.panelSub")}
          aside={
            <form className="acad-form acad-form-card" onSubmit={(e) => void onCreate(e)}>
              <div className="acad-form-card__head">
                <h3 className="acad-form-card__title">{t("adminAcademicYearsUi.formTitle")}</h3>
                <p className="acad-form-card__sub">{calendarHint(calendarSystem)}</p>
              </div>
              <fieldset className="acad-calendar-pick">
                <legend>{t("adminAcademicYearsUi.calendarLegend")}</legend>
                <div
                  className="acad-calendar-pick__options"
                  role="radiogroup"
                  aria-label={t("adminAcademicYearsUi.calendarAria")}
                >
                  <label
                    className={`acad-calendar-pick__option${
                      calendarSystem === "ETHIOPIAN" ? " acad-calendar-pick__option--active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="calendarSystem"
                      value="ETHIOPIAN"
                      checked={calendarSystem === "ETHIOPIAN"}
                      onChange={() => setCalendarSystem("ETHIOPIAN")}
                    />
                    <span className="acad-calendar-pick__code">{t("adminAcademicYearsUi.ecCode")}</span>
                    <span className="acad-calendar-pick__name">{t("adminAcademicYearsUi.ethiopian")}</span>
                  </label>
                  <label
                    className={`acad-calendar-pick__option${
                      calendarSystem === "GREGORIAN" ? " acad-calendar-pick__option--active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="calendarSystem"
                      value="GREGORIAN"
                      checked={calendarSystem === "GREGORIAN"}
                      onChange={() => setCalendarSystem("GREGORIAN")}
                    />
                    <span className="acad-calendar-pick__code">{t("adminAcademicYearsUi.gcCode")}</span>
                    <span className="acad-calendar-pick__name">{t("adminAcademicYearsUi.gregorian")}</span>
                  </label>
                </div>
              </fieldset>
              <label>
                {t("adminAcademicYearsUi.yearLabel")}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={calendarSystem === "ETHIOPIAN" ? "2018/2019" : "2026/2027"}
                  required
                />
              </label>
              <div className="acad-form__row">
                <label>
                  {t("adminAcademicYearsUi.starts")}
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  {t("adminAcademicYearsUi.ends")}
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </label>
              </div>
              <p className="acad-form__hint">
                {t("adminAcademicYearsUi.datesHint", {
                  cal: calendarLabel(calendarSystem),
                })}
              </p>
              <label className="acad-form__check">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                />
                {t("adminAcademicYearsUi.setCurrent")}
              </label>
              <button type="submit" className="acad-btn acad-btn--primary acad-btn--block" disabled={saving}>
                {saving ? t("adminAcademicYearsUi.creating") : t("adminAcademicYearsUi.createYear")}
              </button>
            </form>
          }
        >
          {loading ? (
            <p className="acad-loading">{t("adminAcademicYearsUi.loadingYears")}</p>
          ) : years.length === 0 ? (
            <AcademicsEmpty message={t("adminAcademicYearsUi.emptyYears")} />
          ) : (
            <ul className="acad-year-list acad-year-list--grid">
              {years.map((y) => {
                const progress = yearProgress(y.startDate, y.endDate);
                return (
                  <li
                    key={y.id}
                    className={`acad-year-card${y.isCurrent ? " acad-year-card--current" : ""}`}
                  >
                    <div className="acad-year-card__top">
                      <div className="acad-year-card__identity">
                        <span className="acad-year-card__name">
                          {y.name}{" "}
                          <span className="acad-year-card__cal">
                            {calendarLabel(y.calendarSystem)}
                          </span>
                        </span>
                        <p className="acad-year-card__meta">
                          {formatAcadDate(y.startDate)} – {formatAcadDate(y.endDate)}
                        </p>
                      </div>
                      <div className="acad-year-card__actions">
                        <AcademicsBadge variant="muted">
                          {y.calendarSystem === "GREGORIAN"
                            ? t("adminAcademicYearsUi.gregBadge")
                            : t("adminAcademicYearsUi.ethBadge")}
                        </AcademicsBadge>
                        {y.isCurrent ? (
                          <AcademicsBadge variant="live">{t("adminAcademicYearsUi.current")}</AcademicsBadge>
                        ) : (
                          <button
                            type="button"
                            className="acad-btn acad-btn--ghost acad-btn--sm"
                            onClick={() => void onSetCurrent(y.id)}
                          >
                            {t("adminAcademicYearsUi.setCurrentBtn")}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="acad-year-card__stats">
                      <span className="acad-year-card__pill">
                        <strong>{y._count?.academicTerms ?? 0}</strong> {t("adminAcademicYearsUi.termsCount")}
                      </span>
                      <span className="acad-year-card__pill">
                        <strong>{y._count?.classSubjects ?? 0}</strong>{" "}
                        {t("adminAcademicYearsUi.classSubjectsCount")}
                      </span>
                      <span className="acad-year-card__pill acad-year-card__pill--muted">
                        <strong>{progress}%</strong> {t("adminAcademicYearsUi.elapsed")}
                      </span>
                    </div>
                    <div className="acad-year-card__foot">
                      <div
                        className="acad-year-card__bar"
                        title={t("adminAcademicYearsUi.yearProgressTitle")}
                      >
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <Link href="/admin/results/terms" className="acad-year-card__cta">
                        {t("adminAcademicYearsUi.manageTerms")}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AcademicsPanel>
      </div>
    </DashboardPage>
  );
}
