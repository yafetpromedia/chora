import { apiFetch, apiPatch, apiPost } from "@/lib/api";

export type HrOrgUnit = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  sortOrder: number;
};

export type EmployeeListItem = {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  roleName: string;
  roleTemplateSlug: string | null;
  photoUrl: string | null;
  profile: {
    employeeCode: string;
    employmentType: string;
    employmentStatus: string;
    departmentName: string | null;
    positionName: string | null;
    hrDepartmentId: string | null;
    hrPositionId: string | null;
    hireDate: string | null;
    bankAccountMasked: string | null;
  } | null;
};

export async function seedHrOrg() {
  return apiPost("/hr/org/seed", {});
}

export async function listHrDepartments() {
  return apiFetch<HrOrgUnit[]>("/hr/departments");
}

export async function listHrPositions() {
  return apiFetch<HrOrgUnit[]>("/hr/positions");
}

export async function createHrDepartment(body: {
  name: string;
  code: string;
}) {
  return apiPost<HrOrgUnit>("/hr/departments", body);
}

export async function createHrPosition(body: { name: string; code: string }) {
  return apiPost<HrOrgUnit>("/hr/positions", body);
}

export async function listHrEmployees(params?: {
  search?: string;
  departmentId?: string;
  positionId?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.departmentId) q.set("departmentId", params.departmentId);
  if (params?.positionId) q.set("positionId", params.positionId);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<EmployeeListItem[]>(`/hr/employees${suffix}`);
}

export async function getHrEmployee(userId: string) {
  return apiFetch<EmployeeListItem>(`/hr/employees/${userId}`);
}

export async function updateHrEmployee(
  userId: string,
  body: Record<string, unknown>,
) {
  return apiPatch(`/hr/employees/${userId}`, body);
}
