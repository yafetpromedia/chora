import { apiFetch, apiPatch, apiPost } from "@/lib/api";

export type TeacherAssignment = {
  id: string;
  gradeId: string;
  gradeName: string;
  sectionId: string | null;
  sectionName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  isHomeroom: boolean;
};

export type TeacherRecord = {
  userId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  portalRole: string;
  roleTemplateSlug: string | null;
  roleTemplateName: string | null;
  homeroom: {
    gradeId: string;
    gradeName: string;
    sectionId: string | null;
    sectionName: string | null;
  } | null;
  assignments: TeacherAssignment[];
  teachingSlots: {
    gradeName: string;
    sectionName: string | null;
    subjectName: string;
  }[];
};

export type RoleTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  portalRole: string;
  isSystem: boolean;
  permissions: string[];
};

export async function listTeachers(group?: "teachers" | "staff") {
  const q = group ? `?group=${group}` : "";
  return apiFetch<TeacherRecord[]>(`/schools/teachers${q}`);
}

export async function listOfficeStaff() {
  return listTeachers("staff");
}

export async function listClassroomTeachers() {
  return listTeachers("teachers");
}

export async function listRoleTemplates() {
  return apiFetch<RoleTemplate[]>("/schools/role-templates");
}

export async function getMyTeacherProfile() {
  return apiFetch<TeacherRecord>("/schools/teachers/me");
}

export type TeacherDashboardOverview = {
  date: string;
  announcements: number;
  classesToday: number;
  attendancePendingCount: number;
  resultsPendingCount: number;
  homeroom: { gradeName: string; sectionName: string | null } | null;
  assignments: {
    gradeName: string;
    sectionName: string | null;
    subjectName: string | null;
    isHomeroom: boolean;
  }[];
  classes: {
    gradeId: string;
    sectionId: string | null;
    label: string;
    studentCount: number;
    isHomeroom: boolean;
  }[];
  attendancePending: {
    gradeId: string;
    sectionId: string | null;
    label: string;
    studentCount: number;
    markedCount: number;
    pendingCount: number;
  }[];
  resultsPending: {
    assessmentId: string;
    name: string;
    classLabel: string;
    totalStudents: number;
    scoredCount: number;
    missingCount: number;
  }[];
  currentTerm: { id: string; name: string } | null;
  academicYear: { id: string; name: string } | null;
  teachingSlots: {
    classSubjectId: string;
    label: string;
    gradeId: string;
    sectionId: string | null;
    subjectName: string;
  }[];
  todaySchedule?: {
    weekday: string;
    weekdayLabel: string;
    slots: {
      id: string;
      period: { label: string; startTime: string | null; endTime: string | null };
      subject: { name: string };
      grade: { name: string };
      section: { name: string } | null;
      teacher: { name: string } | null;
      room: { name: string } | null;
    }[];
  };
};

export async function getTeacherDashboard() {
  return apiFetch<TeacherDashboardOverview>("/schools/teachers/me/dashboard");
}

export async function getMyTeacherClasses() {
  return apiFetch<
    {
      id: string;
      name: string;
      sortOrder: number;
      sections: { id: string; name: string }[];
      _count: { students: number };
    }[]
  >("/schools/teachers/me/classes");
}

export type PermissionCatalogItem = {
  key: string;
  label: string;
  category: string;
  description?: string;
};

export type StaffPermissionsDetail = {
  userId: string;
  name: string;
  roleTemplateSlug: string | null;
  roleTemplateName: string | null;
  templatePermissions: string[];
  grants: { permissionKey: string; granted: boolean }[];
  effectivePermissions: string[];
};

export async function listPermissionCatalog() {
  return apiFetch<PermissionCatalogItem[]>("/schools/permissions/catalog");
}

export async function getStaffPermissions(userId: string) {
  return apiFetch<StaffPermissionsDetail>(`/schools/staff/${userId}/permissions`);
}

export async function setStaffPermissionGrants(
  userId: string,
  grants: { permissionKey: string; granted: boolean }[],
) {
  return apiPatch<{ permissions: string[] }>(
    `/schools/staff/${userId}/permissions`,
    { grants },
  );
}

export async function createTeacher(body: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  roleTemplateSlug: string;
  homeroomGradeId?: string;
  homeroomSectionId?: string;
}) {
  return apiPost<TeacherRecord>("/schools/teachers", body);
}

export async function updateTeacher(
  userId: string,
  body: {
    roleTemplateSlug?: string;
    homeroomGradeId?: string | null;
    homeroomSectionId?: string | null;
    assignments?: {
      gradeId: string;
      sectionId?: string;
      subjectId?: string;
      isHomeroom?: boolean;
    }[];
  },
) {
  return apiPatch<TeacherRecord>(`/schools/teachers/${userId}`, body);
}
