import { apiDelete, apiFetch, apiPatch, apiPost } from "@/lib/api";

export type StaffNotification = {
  id: string;
  schoolId: string;
  userId: string;
  title: string;
  body: string;
  link: string | null;
  kind: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listStaffNotifications() {
  return apiFetch<StaffNotification[]>("/notifications");
}

export async function staffNotificationsUnreadCount() {
  return apiFetch<{ count: number }>("/notifications/unread-count");
}

export async function markStaffNotificationRead(id: string) {
  return apiPatch<{ ok: boolean }>(`/notifications/${id}/read`, {});
}

export async function markAllStaffNotificationsRead() {
  return apiPost<{ updated: number }>("/notifications/read-all", {});
}

export async function deleteStaffNotification(id: string) {
  return apiDelete<{ ok: boolean; deleted: boolean }>(
    `/notifications/${encodeURIComponent(id)}`,
  );
}
