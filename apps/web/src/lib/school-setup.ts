import {
  apiDelete,
  apiFetch,
  apiPatch,
  apiPost,
  apiUpload,
  type CreateStudentPayload,
  type CreateStudentResult,
  type GradePresetKey,
  type GradeWithSections,
  type ImportStudentsResult,
  type SetupStatus,
  type StudentRecord,
} from "@/lib/api";

export async function getSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>("/schools/setup-status");
}

export async function listGradePresets() {
  return apiFetch<{ key: GradePresetKey; label: string; description: string }[]>(
    "/schools/grade-presets",
  );
}

export async function setupGrades(preset: GradePresetKey) {
  return apiPost<GradeWithSections[]>("/schools/grades/setup", { preset });
}

export async function resetGrades(preset: GradePresetKey) {
  return apiPost<{ replaced: boolean; grades: GradeWithSections[] }>(
    "/schools/grades/reset",
    { preset },
  );
}

export async function listGrades() {
  return apiFetch<GradeWithSections[]>("/schools/grades");
}

export async function addSection(gradeId: string, name: string) {
  return apiPost(`/schools/grades/${gradeId}/sections`, { name });
}

export async function removeSection(gradeId: string, sectionId: string) {
  return apiDelete<{ removed: boolean; sectionId: string }>(
    `/schools/grades/${gradeId}/sections/${sectionId}`,
  );
}

export async function fixEarlyChildhoodGrades() {
  return apiPost<{ updated: boolean; grades: GradeWithSections[] }>(
    '/schools/grades/fix-early-childhood',
    {},
  );
}

export async function completeSchoolSetup() {
  return apiPost<{ setupComplete: boolean }>("/schools/setup/complete", {});
}

export async function listStudents() {
  return apiFetch<StudentRecord[]>("/schools/students");
}

export async function updateStudent(
  id: string,
  body: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    studentId?: string;
    idNumber?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    dateOfBirth?: string;
    phone?: string;
    address?: string | null;
    photoUrl?: string | null;
    gradeId?: string;
    sectionId?: string | null;
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
    parentName?: string;
    parentPhone?: string;
  },
) {
  return apiPatch<StudentRecord>(`/schools/students/${id}`, body);
}

export async function deleteStudent(id: string) {
  return apiDelete<{ removed: boolean; id: string }>(`/schools/students/${id}`);
}

export async function resetStudentPortalPassword(studentProfileId: string) {
  return apiPost<{ portalUsername: string; tempPassword: string }>(
    `/schools/students/${studentProfileId}/reset-portal-password`,
    {},
  );
}

export async function createStudent(body: CreateStudentPayload) {
  return apiPost<CreateStudentResult>("/schools/students", body);
}

export async function importStudentsCsv(file: File) {
  return apiUpload<ImportStudentsResult>("/schools/students/import", file);
}

/** CSV headers accepted by POST /schools/students/import (required + optional). */
const STUDENTS_IMPORT_TEMPLATE_CSV = [
  "First Name,Last Name,Grade,Section,Gender,Date of Birth,Age,FAN,Parent Name,Phone",
  "Abebe,Kebede,Grade 1,A,Male,2015-03-12,,FAN1234567890,Tigist Hailu,0911234567",
].join("\n");

export function downloadStudentsImportTemplate() {
  const blob = new Blob([STUDENTS_IMPORT_TEMPLATE_CSV], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "students-import-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
