import { apiFetch, apiPost } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_SCHOOL"
  | "RESOLVED"
  | "CLOSED";

export type SupportTicketCategory =
  | "BILLING"
  | "TECHNICAL"
  | "ONBOARDING"
  | "ACCOUNT"
  | "OTHER";

export type SupportTicket = {
  id: string;
  schoolId: string;
  subject: string;
  body: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  platformNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  school: {
    id: string;
    name: string;
    slug: string;
    joinCode: string;
    email: string | null;
    phone: string | null;
    status: string;
  };
  reporter: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export const SUPPORT_CATEGORIES: {
  id: SupportTicketCategory;
  label: string;
}[] = [
  { id: "TECHNICAL", label: "Technical" },
  { id: "BILLING", label: "Billing" },
  { id: "ONBOARDING", label: "Onboarding" },
  { id: "ACCOUNT", label: "Account & access" },
  { id: "OTHER", label: "Other" },
];

export const SUPPORT_STATUSES: {
  id: SupportTicketStatus;
  label: string;
}[] = [
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "WAITING_ON_SCHOOL", label: "Waiting on school" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "CLOSED", label: "Closed" },
];

export function supportStatusLabel(status: SupportTicketStatus) {
  return SUPPORT_STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function supportCategoryLabel(category: SupportTicketCategory) {
  return SUPPORT_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export async function listSchoolSupportTickets() {
  return apiFetch<SupportTicket[]>("/schools/support-tickets");
}

export async function createSchoolSupportTicket(body: {
  subject: string;
  body: string;
  category?: SupportTicketCategory;
}) {
  return apiPost<SupportTicket>("/schools/support-tickets", body);
}

export async function listPlatformSupportTickets(filters?: {
  status?: SupportTicketStatus;
  schoolId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.schoolId) params.set("schoolId", filters.schoolId);
  const q = params.toString();
  return platformFetch<SupportTicket[]>(
    `/platform/support-tickets${q ? `?${q}` : ""}`,
  );
}

export async function updatePlatformSupportTicket(
  id: string,
  body: { status?: SupportTicketStatus; platformNote?: string },
) {
  return platformFetch<SupportTicket>(`/platform/support-tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
