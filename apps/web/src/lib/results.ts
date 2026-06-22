import { apiFetch, apiPatch, apiPost, getApiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export type AcademicTerm = {
  id: string;
  name: string;
  sortOrder: number;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  academicYear: { name: string };
};

export type Subject = { id: string; name: string; code: string };

export type ClassSubject = {
  id: string;
  subject: Subject;
  grade: { id: string; name: string };
  section: { id: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
};

export type Assessment = {
  id: string;
  name: string;
  maxScore: number;
  weightPercent: number;
  classSubject: { subject: Subject };
};

export type ScoreGrid = {
  assessment: Assessment & {
    classSubject: ClassSubject;
    term: { name: string };
  };
  students: Array<{
    studentProfileId: string;
    name: string;
    score: number | null;
  }>;
};

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  _count?: { academicTerms: number; classSubjects: number };
};

export type ResultWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PUBLISHED";

export type WorkflowSheet = {
  id: string;
  status: ResultWorkflowStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  reviewerNotes: string | null;
  submittedByName: string | null;
  approvedByName: string | null;
};

export type PendingWorkflowItem = {
  id: string;
  termId: string;
  classSubjectId: string;
  status: ResultWorkflowStatus;
  submittedAt: string | null;
  term: { name: string };
  classSubject: {
    subject: { name: string };
    grade: { name: string };
    section: { name: string } | null;
    teacher: { firstName: string; lastName: string } | null;
  };
  submitter: { firstName: string; lastName: string } | null;
};

export type ClassSubjectAssignment = ClassSubject & {
  assessmentTemplate: { id: string; name: string } | null;
};

export type ReportCard = {
  school: { name: string; logoUrl?: string | null };
  student: {
    profileId: string;
    name: string;
    grade: string;
    section: string | null;
    studentId: string | null;
  };
  term: { id: string; name: string; academicYear: string };
  subjects: Array<{
    subject: string;
    assessments: Array<{
      name: string;
      score: number;
      maxScore: number;
      weightPercent: number;
    }>;
    average: number;
    letter: string;
  }>;
  overallAverage: number | null;
  overallLetter: string | null;
  rank: number | null;
  classSize: number;
  attendance: { rate: number | null; present: number; total: number };
  teacherComment: string | null;
  principalComment: string | null;
};

export async function listAcademicYears() {
  return apiFetch<AcademicYear[]>("/results/academic-years");
}

export async function getCurrentAcademicYear() {
  const res = await apiFetch<{ year: AcademicYear | null }>(
    "/results/academic-years/current",
  );
  return res?.year ?? null;
}

/** Returns current year, creating a default one if the school has none. */
export async function getOrEnsureCurrentAcademicYear() {
  const existing = await getCurrentAcademicYear();
  if (existing) return existing;
  const res = await apiPost<{ year: AcademicYear }>(
    "/results/academic-years/ensure-current",
    {},
  );
  return res.year;
}

export async function createAcademicYear(body: {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}) {
  return apiPost<AcademicYear>("/results/academic-years", body);
}

export async function setCurrentAcademicYear(yearId: string) {
  return apiPost<AcademicYear>(`/results/academic-years/${yearId}/set-current`, {});
}

export async function listTerms(academicYearId?: string) {
  const q = academicYearId ? `?academicYearId=${academicYearId}` : "";
  return apiFetch<AcademicTerm[]>(`/results/terms${q}`);
}

export async function createTerm(body: {
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  sortOrder?: number;
  isCurrent?: boolean;
}) {
  return apiPost<AcademicTerm>("/results/terms", body);
}

export async function listSubjects() {
  return apiFetch<Subject[]>("/results/subjects");
}

export async function createSubject(body: { name: string; code: string }) {
  return apiPost<Subject>("/results/subjects", body);
}

export async function listClassSubjects(academicYearId?: string) {
  const q = academicYearId ? `?academicYearId=${academicYearId}` : "";
  return apiFetch<ClassSubject[]>(`/results/class-subjects${q}`);
}

export async function listClassSubjectsByGrade(gradeId: string, sectionId?: string) {
  const params = new URLSearchParams({ gradeId });
  if (sectionId) params.set("sectionId", sectionId);
  return apiFetch<ClassSubjectAssignment[]>(
    `/results/class-subjects/by-grade?${params}`,
  );
}

export async function createClassSubject(body: {
  subjectId: string;
  academicYearId: string;
  gradeId: string;
  sectionId?: string;
  teacherId?: string;
  assessmentTemplateId?: string;
}) {
  return apiPost<ClassSubjectAssignment>("/results/class-subjects", body);
}

export async function updateClassSubject(
  classSubjectId: string,
  body: { teacherId?: string | null; assessmentTemplateId?: string | null },
) {
  return apiPatch<ClassSubjectAssignment>(
    `/results/class-subjects/${classSubjectId}`,
    body,
  );
}

export async function listAssessments(termId: string, classSubjectId?: string) {
  const params = new URLSearchParams({ termId });
  if (classSubjectId) params.set("classSubjectId", classSubjectId);
  return apiFetch<Assessment[]>(`/results/assessments?${params}`);
}

export async function createAssessment(body: {
  termId: string;
  classSubjectId: string;
  name: string;
  maxScore?: number;
  weightPercent?: number;
}) {
  return apiPost<Assessment>("/results/assessments", body);
}

export async function getScoreGrid(assessmentId: string) {
  return apiFetch<ScoreGrid>(`/results/assessments/${assessmentId}/grid`);
}

export async function saveBulkScores(
  assessmentId: string,
  scores: Array<{ studentProfileId: string; score: number }>,
) {
  return apiPost("/results/scores/bulk", { assessmentId, scores });
}

export async function getReportCard(studentProfileId: string, termId: string) {
  const q = new URLSearchParams({ studentProfileId, termId });
  return apiFetch<ReportCard>(`/results/report-card?${q}`);
}

export async function upsertTermReport(
  studentProfileId: string,
  termId: string,
  data: { teacherComment?: string; principalComment?: string },
) {
  const q = new URLSearchParams({ studentProfileId, termId });
  return apiPatch(`/results/student-term-reports?${q}`, data);
}

export async function getMyReportCard(termId: string) {
  const q = new URLSearchParams({ termId });
  return apiFetch<ReportCard>(`/results/report-card?${q}`);
}

export type StudentScoreUpdate = {
  id: string;
  assessmentId: string;
  assessmentName: string;
  subject: string;
  classLabel: string;
  score: number;
  maxScore: number;
  weightPercent: number;
  percentage: number;
  termId: string;
  termName: string;
  academicYear: string;
  releasedAt: string;
};

export async function listMyScoreUpdates(termId?: string) {
  const q = termId ? `?termId=${encodeURIComponent(termId)}` : "";
  return apiFetch<StudentScoreUpdate[]>(`/results/student/scores${q}`);
}

export async function getMyReportCardStatus(termId: string) {
  const q = new URLSearchParams({ termId });
  return apiFetch<{ published: boolean; termId: string }>(
    `/results/student/report-card-status?${q}`,
  );
}

export function reportCardPrintUrl(studentProfileId: string, termId: string) {
  const q = new URLSearchParams({ studentProfileId, termId });
  return `${getApiBaseUrl()}/results/report-card/html?${q}`;
}

export function openReportCardPrint(studentProfileId: string, termId: string) {
  const q = new URLSearchParams({ studentProfileId, termId });
  window.open(`/admin/results/print?${q}`, "_blank");
}

export function openMyReportCardPrint(termId: string) {
  const q = new URLSearchParams({ termId });
  window.open(`/student/report-card/print?${q}`, "_blank");
}

export type AssessmentTemplate = {
  id: string;
  name: string;
  description: string | null;
  weightTotal: number;
  components: {
    id: string;
    name: string;
    weightPercent: number;
    maxScore: number;
    sortOrder: number;
  }[];
  gradeAssignments: {
    id: string;
    gradeId: string;
    gradeName: string;
    subjectId: string | null;
    subjectName: string | null;
    scope: string;
  }[];
  classSubjectCount: number;
};

export type ScoreMatrix = {
  workflow: WorkflowSheet;
  canEditScores?: boolean;
  classSubject: {
    id: string;
    subject: string;
    grade: string;
    section: string | null;
  };
  template: {
    id: string;
    name: string;
    components: { name: string; weightPercent: number; maxScore: number }[];
  } | null;
  assessments: {
    id: string;
    name: string;
    maxScore: number;
    weightPercent: number;
    sortOrder: number;
    entryLocked: boolean;
  }[];
  students: {
    studentProfileId: string;
    name: string;
    scores: { assessmentId: string; score: number | null }[];
  }[];
};

export async function listAssessmentTemplates() {
  return apiFetch<AssessmentTemplate[]>("/results/assessment-templates");
}

export async function createAssessmentTemplate(body: {
  name: string;
  description?: string;
  components: {
    name: string;
    weightPercent: number;
    maxScore?: number;
    sortOrder?: number;
  }[];
}) {
  return apiPost<AssessmentTemplate>("/results/assessment-templates", body);
}

export async function updateAssessmentTemplate(
  templateId: string,
  body: {
    name?: string;
    description?: string;
    components?: {
      name: string;
      weightPercent: number;
      maxScore?: number;
      sortOrder?: number;
    }[];
  },
) {
  return apiPatch<AssessmentTemplate>(`/results/assessment-templates/${templateId}`, body);
}

export async function deleteAssessmentTemplate(templateId: string) {
  return apiPost<{ deleted: boolean; id: string }>(
    `/results/assessment-templates/${templateId}/delete`,
    {},
  );
}

export async function assignTemplateToGrade(
  templateId: string,
  body: { gradeId: string; subjectId?: string },
) {
  return apiPost<AssessmentTemplate>(
    `/results/assessment-templates/${templateId}/assign-grade`,
    body,
  );
}

export async function assignTemplateToClassSubject(
  classSubjectId: string,
  body: { templateId: string },
) {
  return apiPost<{ classSubjectId: string; templateId: string }>(
    `/results/class-subjects/${classSubjectId}/template`,
    body,
  );
}

export async function getScoreMatrix(termId: string, classSubjectId: string) {
  const q = new URLSearchParams({ termId, classSubjectId });
  return apiFetch<ScoreMatrix>(`/results/score-matrix?${q}`);
}

export async function saveScoreMatrix(body: {
  termId: string;
  classSubjectId: string;
  entries: { studentProfileId: string; assessmentId: string; score: number }[];
}) {
  return apiPost("/results/score-matrix", body);
}

export async function setAssessmentEntryLock(
  assessmentId: string,
  entryLocked: boolean,
) {
  return apiPatch<{
    id: string;
    name: string;
    entryLocked: boolean;
    termId: string;
    classSubjectId: string;
  }>(`/results/assessments/${assessmentId}/entry-lock`, { entryLocked });
}

export async function listPendingWorkflow(params?: {
  status?: ResultWorkflowStatus;
  termId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.termId) q.set("termId", params.termId);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<PendingWorkflowItem[]>(`/results/workflow/pending${suffix}`);
}

export async function approveResultWorkflowBulk(body?: {
  termId?: string;
  sheetIds?: string[];
}) {
  return apiPost<{ approved: number }>("/results/workflow/approve-bulk", body ?? {});
}

export async function publishResultWorkflowBulk(body?: {
  termId?: string;
  sheetIds?: string[];
}) {
  return apiPost<{ published: number; skipped?: number }>(
    "/results/workflow/publish-bulk",
    body ?? {},
  );
}

function workflowQuery(termId: string, classSubjectId: string) {
  return new URLSearchParams({ termId, classSubjectId }).toString();
}

export async function submitResultWorkflow(termId: string, classSubjectId: string) {
  return apiPost<WorkflowSheet>(
    `/results/workflow/submit?${workflowQuery(termId, classSubjectId)}`,
    {},
  );
}

export async function approveResultWorkflow(
  termId: string,
  classSubjectId: string,
  notes?: string,
) {
  return apiPost<WorkflowSheet>(
    `/results/workflow/approve?${workflowQuery(termId, classSubjectId)}`,
    { notes },
  );
}

export async function publishResultWorkflow(termId: string, classSubjectId: string) {
  return apiPost<WorkflowSheet>(
    `/results/workflow/publish?${workflowQuery(termId, classSubjectId)}`,
    {},
  );
}

export async function reopenResultWorkflow(termId: string, classSubjectId: string) {
  return apiPost<WorkflowSheet>(
    `/results/workflow/reopen?${workflowQuery(termId, classSubjectId)}`,
    {},
  );
}
