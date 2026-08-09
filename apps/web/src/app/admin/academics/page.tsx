"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function AcademicsSetupPage() {
  const router = useRouter();
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
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load academics"))
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
        title: "Academic years",
        detail: "Define the school year window and mark which year is active.",
        icon: "calendar",
        status: status(hasYears, true),
        meta: hasYears
          ? `${years.length} year${years.length === 1 ? "" : "s"}${currentYear ? ` · ${currentYear.name}` : ""}`
          : "Start here — no years yet",
      },
      {
        step: 2,
        href: "/admin/results/terms",
        title: "Terms & semesters",
        detail: "Split the year into terms with start and end dates.",
        icon: "results",
        status: status(hasTerms, hasYears),
        meta: hasTerms ? `${termCount} term${termCount === 1 ? "" : "s"}` : "Add terms after a year",
      },
      {
        step: 3,
        href: "/admin/teachers",
        title: "Teachers",
        detail: "Onboard staff, homeroom classes, and portal accounts.",
        icon: "teachers",
        status: status(hasTeachers, hasTerms),
        meta: hasTeachers ? `${teacherCount} on roster` : "No teachers yet",
      },
      {
        step: 4,
        href: "/admin/subjects",
        title: "Subject catalog",
        detail: "Maintain codes and names used across the school.",
        icon: "library",
        status: status(hasSubjects, hasTeachers),
        meta: hasSubjects ? `${subjectCount} subjects` : "Add your subject list",
      },
      {
        step: 5,
        href: "/admin/subjects/assign",
        title: "Class assignments",
        detail: "Link grade, section, subject, and teacher for the year.",
        icon: "users",
        status: status(hasAssign, hasSubjects),
        meta: hasAssign ? `${assignmentCount} assignments` : "Assign teachers to classes",
      },
      {
        step: 6,
        href: "/admin/timetable",
        title: "Timetable",
        detail: "Build weekly periods once class subjects are in place.",
        icon: "calendar",
        status: status(hasAssign, hasAssign),
        meta: "Weekly schedule builder",
      },
    ];
  }, [years, termCount, teacherCount, subjectCount, assignmentCount, currentYear]);

  const nextStep = steps.find((s) => s.status === "active") ?? steps.find((s) => s.status === "pending");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <DashboardPage role="admin" title="Academics">
      <div className="acad-page acad-page--hub acad-v2">
        <AcademicsHero
          chip="Academics"
          compact
          title="Academic structure"
          subtitle="Configure your year, terms, teachers, and class subjects. Each step opens its own workspace so registrar, academics, and HR can work independently."
          badges={
            loading ? null : (
              <>
                {currentYear ? (
                  <AcademicsBadge variant="live">Year: {currentYear.name}</AcademicsBadge>
                ) : (
                  <AcademicsBadge variant="muted">No current year</AcademicsBadge>
                )}
                {nextStep ? (
                  <AcademicsBadge variant="default">Next: {nextStep.title}</AcademicsBadge>
                ) : (
                  <AcademicsBadge variant="live">Setup complete</AcademicsBadge>
                )}
              </>
            )
          }
          stats={
            loading
              ? undefined
              : [
                  { label: "Years", value: years.length, hint: currentYear?.name },
                  { label: "Terms", value: termCount },
                  { label: "Teachers", value: teacherCount },
                  { label: "Assignments", value: assignmentCount, accent: true },
                ]
          }
        />

        <AppToast message={error} tone="error" onDismiss={() => setError("")} />

        {loading ? (
          <div className="acad-v2__loading">
            <span className="acad-v2__spinner" aria-hidden />
            <p>Loading academics overview…</p>
          </div>
        ) : (
          <>
            <div className="acad-v2__progress">
              <div className="acad-v2__progress-copy">
                <strong>
                  {doneCount} of {steps.length} steps ready
                </strong>
                <span>{progressPct}% complete</span>
              </div>
              <div className="acad-v2__progress-bar" aria-hidden>
                <span style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <section className="acad-v2__section">
              <header className="acad-v2__section-head">
                <h3>Setup pipeline</h3>
                <p>Work through each step in order — open any workspace when you are ready.</p>
              </header>
              <AcademicsPipeline steps={steps} />
            </section>

            <nav className="acad-v2__quick" aria-label="Related workspaces">
              <a href="/admin/results">Results</a>
              <a href="/admin/report-cards">Report cards</a>
              <a href="/admin/results/templates">Assessment templates</a>
              <a href="/admin/students">Students</a>
              <a href="/admin/timetable">Timetable</a>
            </nav>
          </>
        )}
      </div>
    </DashboardPage>
  );
}
