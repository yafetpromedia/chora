"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  AcademicsBadge,
  AcademicsHero,
  AcademicsPipeline,
  type PipelineStep,
} from "@/components/academics/academics-ui";
import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, isSchoolWorkspaceRole } from "@/lib/auth";
import { AppToast } from "@/components/ui/app-toast";
import {
  listAcademicYears,
  listClassSubjects,
  listSubjects,
  listTerms,
  type AcademicYear,
} from "@/lib/results";
import { listTeachers } from "@/lib/teachers";
import { useLocale } from "@/components/i18n/locale-provider";

export default function AcademicsSetupPage() {
  const router = useRouter();
  const { t, tp } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [termCount, setTermCount] = useState(0);
  const [subjectCount, setSubjectCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);

  const currentYear = years.find((y) => y.isCurrent) ?? years[0] ?? null;

  useEffect(() => {
    if (
      !localStorage.getItem(AUTH_TOKEN_KEY) ||
      !isSchoolWorkspaceRole(localStorage.getItem(AUTH_ROLE_KEY))
    ) {
      router.replace("/login");
      return;
    }
    void Promise.all([
      listAcademicYears(),
      listSubjects(),
      listClassSubjects(),
      listTeachers(),
    ])
      .then(async ([y, subjects, assignments, teachers]) => {
        setYears(y);
        setSubjectCount(subjects.length);
        setAssignmentCount(assignments.length);
        setTeacherCount(teachers.length);
        const yearId = y.find((x) => x.isCurrent)?.id ?? y[0]?.id;
        if (yearId) {
          const terms = await listTerms(yearId);
          setTermCount(terms.length);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("adminAcademicsUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [router]);

  const steps: PipelineStep[] = useMemo(() => {
    const hasYears = years.length > 0;
    const hasTerms = termCount > 0;
    const hasTeachers = teacherCount > 0;
    const hasSubjects = subjectCount > 0;
    const hasAssign = assignmentCount > 0;

    const status = (done: boolean, prevDone: boolean): PipelineStep["status"] => {
      if (done) return "done";
      if (prevDone) return "active";
      return "pending";
    };

    return [
      {
        step: 1,
        href: "/admin/results/academic-years",
        title: t("adminAcademicsUi.stepYearsTitle"),
        detail: t("adminAcademicsUi.stepYearsDetail"),
        icon: "calendar",
        status: status(hasYears, true),
        meta: hasYears
          ? t("adminAcademicsUi.stepYearsMetaCount", {
              count: years.length,
              current: currentYear ? ` · ${currentYear.name}` : "",
            })
          : t("adminAcademicsUi.stepYearsMetaEmpty"),
      },
      {
        step: 2,
        href: "/admin/results/terms",
        title: t("adminAcademicsUi.stepTermsTitle"),
        detail: t("adminAcademicsUi.stepTermsDetail"),
        icon: "results",
        status: status(hasTerms, hasYears),
        meta: hasTerms
          ? t("adminAcademicsUi.stepTermsMetaCount", { count: termCount })
          : t("adminAcademicsUi.stepTermsMetaEmpty"),
      },
      {
        step: 3,
        href: "/admin/teachers",
        title: t("adminAcademicsUi.stepTeachersTitle"),
        detail: t("adminAcademicsUi.stepTeachersDetail"),
        icon: "teachers",
        status: status(hasTeachers, hasTerms),
        meta: hasTeachers
          ? t("adminAcademicsUi.stepTeachersMetaCount", { count: teacherCount })
          : t("adminAcademicsUi.stepTeachersMetaEmpty"),
      },
      {
        step: 4,
        href: "/admin/subjects",
        title: t("adminAcademicsUi.stepSubjectsTitle"),
        detail: t("adminAcademicsUi.stepSubjectsDetail"),
        icon: "library",
        status: status(hasSubjects, hasTeachers),
        meta: hasSubjects
          ? t("adminAcademicsUi.stepSubjectsMetaCount", { count: subjectCount })
          : t("adminAcademicsUi.stepSubjectsMetaEmpty"),
      },
      {
        step: 5,
        href: "/admin/subjects/assign",
        title: t("adminAcademicsUi.stepAssignTitle"),
        detail: t("adminAcademicsUi.stepAssignDetail"),
        icon: "users",
        status: status(hasAssign, hasSubjects),
        meta: hasAssign
          ? t("adminAcademicsUi.stepAssignMetaCount", { count: assignmentCount })
          : t("adminAcademicsUi.stepAssignMetaEmpty"),
      },
      {
        step: 6,
        href: "/admin/timetable",
        title: t("adminAcademicsUi.stepTimetableTitle"),
        detail: t("adminAcademicsUi.stepTimetableDetail"),
        icon: "calendar",
        status: status(hasAssign, hasAssign),
        meta: t("adminAcademicsUi.stepTimetableMeta"),
      },
    ];
  }, [years, termCount, teacherCount, subjectCount, assignmentCount, currentYear, t]);

  const nextStep = steps.find((s) => s.status === "active") ?? steps.find((s) => s.status === "pending");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <DashboardPage role="admin" title={tp("Academics")}>
      <div className="acad-page acad-page--hub acad-v2">
        <AcademicsHero
          chip={t("adminAcademicsUi.chip")}
          compact
          title={t("adminAcademicsUi.heroTitle")}
          subtitle={t("adminAcademicsUi.heroSub")}
          badges={
            loading ? null : (
              <>
                {currentYear ? (
                  <AcademicsBadge variant="live">
                    {t("adminAcademicsUi.yearBadge", { name: currentYear.name })}
                  </AcademicsBadge>
                ) : (
                  <AcademicsBadge variant="muted">{t("adminAcademicsUi.noCurrentYear")}</AcademicsBadge>
                )}
                {nextStep ? (
                  <AcademicsBadge variant="default">
                    {t("adminAcademicsUi.nextBadge", { title: nextStep.title })}
                  </AcademicsBadge>
                ) : (
                  <AcademicsBadge variant="live">{t("adminAcademicsUi.setupComplete")}</AcademicsBadge>
                )}
              </>
            )
          }
          stats={
            loading
              ? undefined
              : [
                  {
                    label: t("adminAcademicsUi.statYears"),
                    value: years.length,
                    hint: currentYear?.name,
                  },
                  { label: t("adminAcademicsUi.statTerms"), value: termCount },
                  { label: t("adminAcademicsUi.statTeachers"), value: teacherCount },
                  {
                    label: t("adminAcademicsUi.statAssignments"),
                    value: assignmentCount,
                    accent: true,
                  },
                ]
          }
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />

        {loading ? (
          <div className="acad-v2__loading">
            <span className="acad-v2__spinner" aria-hidden />
            <p>{t("adminAcademicsUi.loadingOverview")}</p>
          </div>
        ) : (
          <>
            <div className="acad-v2__progress">
              <div className="acad-v2__progress-copy">
                <strong>
                  {t("adminAcademicsUi.stepsReady", {
                    done: doneCount,
                    total: steps.length,
                  })}
                </strong>
                <span>{t("adminAcademicsUi.percentComplete", { pct: progressPct })}</span>
              </div>
              <div className="acad-v2__progress-bar" aria-hidden>
                <span style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <section className="acad-v2__section">
              <header className="acad-v2__section-head">
                <h3>{t("adminAcademicsUi.pipelineTitle")}</h3>
                <p>{t("adminAcademicsUi.pipelineSub")}</p>
              </header>
              <AcademicsPipeline steps={steps} />
            </section>

            <nav className="acad-v2__quick" aria-label={t("adminAcademicsUi.relatedWorkspacesAria")}>
              <a href="/admin/results">{t("adminAcademicsUi.quickResults")}</a>
              <a href="/admin/report-cards">{t("adminAcademicsUi.quickReportCards")}</a>
              <a href="/admin/results/templates">{t("adminAcademicsUi.quickTemplates")}</a>
              <Link href="/admin/students">{t("adminAcademicsUi.quickStudents")}</Link>
              <a href="/admin/timetable">{t("adminAcademicsUi.quickTimetable")}</a>
            </nav>
          </>
        )}
      </div>
    </DashboardPage>
  );
}
