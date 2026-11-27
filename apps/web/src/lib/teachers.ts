import { apiDelete, apiFetch, apiPatch, apiPost } from "@/lib/api";

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

export type TeacherGender = "MALE" | "FEMALE" | "OTHER";
export type TeacherPhotoReviewStatus = "NONE" | "PENDING" | "REJECTED";

export type TeacherRecord = {
  userId: string;
  teacherId: string | null;
  email: string;
  phone: string | null;
  name: string;
  firstName: string;
  lastName: string;
  portalRole: string;
  roleTemplateSlug: string | null;
  roleTemplateName: string | null;
  photoUrl: string | null;
  pendingPhotoUrl: string | null;
  photoReviewStatus: TeacherPhotoReviewStatus;
  photoSubmittedAt: string | null;
  photoReviewedAt: string | null;
  photoReviewNote: string | null;
  hasPendingPhoto: boolean;
  gender: TeacherGender | null;
  dateOfBirth: string | null;
  bloodType: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  canTakeAttendance: boolean;
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

export type TeacherDashboardAnalytics = {
  totalStudents: number;
  subjectsTeaching: number;
  classesCount: number;
  attendanceToday: {
    marked: number;
    present: number;
    total: number;
    rate: number | null;
    pendingClasses: number;
  };
  attendanceTrend: Array<{
    date: string;
    weekday: string;
    rate: number | null;
    marked: number;
    present: number;
  }>;
  grading: {
    termName: string | null;
    totalAssessments: number;
    completeAssessments: number;
    progressPct: number | null;
    missingScores: number;
  };
  classwork: {
    published: number;
    draft: number;
    submissionsToGrade: number;
  };
  classPerformance: Array<{
    classSubjectId: string;
    label: string;
    averageScore: number | null;
    assessedCount: number;
  }>;
};

export type TeacherDashboardOverview = {
  teacherName: string;
  canTakeAttendance: boolean;
  date: string;
  announcements: number;
  analytics: TeacherDashboardAnalytics;
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

export async function getMyTeacherHomeroomClasses() {
  return apiFetch<
    {
      id: string;
      name: string;
      sortOrder: number;
      sections: { id: string; name: string }[];
      _count: { students: number };
    }[]
  >("/schools/teachers/me/classes?scope=homeroom");
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

export type TeacherPersonalPayload = {
  phone?: string | null;
  gender?: TeacherGender | null;
  dateOfBirth?: string | null;
  bloodType?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export async function createTeacher(body: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  roleTemplateSlug: string;
  homeroomGradeId?: string;
  homeroomSectionId?: string;
} & TeacherPersonalPayload) {
  return apiPost<TeacherRecord>("/schools/teachers", body);
}

export async function updateTeacher(
  userId: string,
  body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    roleTemplateSlug?: string;
    homeroomGradeId?: string | null;
    homeroomSectionId?: string | null;
    assignments?: {
      gradeId: string;
      sectionId?: string;
      subjectId?: string;
      isHomeroom?: boolean;
    }[];
  } & TeacherPersonalPayload,
) {
  return apiPatch<TeacherRecord>(`/schools/teachers/${userId}`, body);
}

export async function deleteTeacher(userId: string) {
  return apiDelete<{ removed: true; userId: string }>(`/schools/teachers/${userId}`);
}

export type TeacherPhotoStatus = {
  photoUrl: string | null;
  pendingPhotoUrl: string | null;
  photoReviewStatus: TeacherPhotoReviewStatus;
  photoSubmittedAt: string | null;
  photoReviewedAt: string | null;
  photoReviewNote: string | null;
  hasPendingPhoto: boolean;
};

export type TeacherPhotoRequest = {
  userId: string;
  teacherId: string | null;
  name: string;
  email: string;
  photoUrl: string | null;
  pendingPhotoUrl: string | null;
  photoSubmittedAt: string | null;
};

export async function submitMyTeacherPhoto(photoUrl: string) {
  return apiPost<TeacherPhotoStatus>("/schools/teachers/me/photo", { photoUrl });
}

export async function cancelMyPendingTeacherPhoto() {
  return apiDelete<TeacherPhotoStatus>("/schools/teachers/me/photo/pending");
}

export async function listTeacherPhotoRequests() {
  return apiFetch<TeacherPhotoRequest[]>("/schools/teachers/photo-requests");
}

export async function reviewTeacherPhoto(
  userId: string,
  body: { action: "approve" | "reject"; note?: string },
) {
  return apiPatch<TeacherRecord>(
    `/schools/teachers/${encodeURIComponent(userId)}/photo/review`,
    body,
  );
}

export async function adminSetTeacherPhoto(userId: string, photoUrl: string) {
  return apiPatch<TeacherRecord>(
    `/schools/teachers/${encodeURIComponent(userId)}/photo`,
    { photoUrl },
  );
}

export async function adminClearTeacherPhoto(userId: string) {
  return apiDelete<TeacherRecord>(
    `/schools/teachers/${encodeURIComponent(userId)}/photo`,
  );
}

export type HomeroomStudent = {
  studentProfileId: string;
  name: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  photoUrl: string | null;
  phone: string | null;
  cardCode: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  grade: string;
  section: string | null;
  group: string | null;
  attendance: {
    presentDays: number;
    markedDays: number;
    rate: number | null;
  };
  results: {
    publishedScores: number;
    averagePercent: number | null;
  };
  classwork: {
    submitted: number;
    graded: number;
    pending: number;
  };
  library: {
    resources: number;
    avgProgress: number | null;
  };
  behaviorNotes: number;
};

export type HomeroomStudentsPayload = {
  homeroom: {
    gradeId: string;
    gradeName: string;
    sectionId: string | null;
    sectionName: string | null;
  };
  groups: string[];
  students: HomeroomStudent[];
};

export async function listMyHomeroomStudents() {
  return apiFetch<HomeroomStudentsPayload>("/schools/teachers/me/students");
}

export async function setHomeroomStudentGroup(
  studentProfileId: string,
  group: string | null,
) {
  return apiPatch<{
    studentProfileId: string;
    name: string;
    group: string | null;
  }>(`/schools/teachers/me/students/${encodeURIComponent(studentProfileId)}/group`, {
    group,
  });
}
