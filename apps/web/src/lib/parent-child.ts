import { apiFetch } from "@/lib/api";
import type { ParentDayChild, ParentDayOverview } from "@/lib/dashboard-day";

export const PARENT_CHILD_STORAGE_KEY = "campusone.parent.selectedChildId";

export type ParentChildOption = {
  profileId: string;
  name: string;
  grade: string;
  section: string | null;
};

export function readStoredChildId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(PARENT_CHILD_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeStoredChildId(profileId: string) {
  if (typeof window === "undefined") return;
  try {
    if (profileId) localStorage.setItem(PARENT_CHILD_STORAGE_KEY, profileId);
    else localStorage.removeItem(PARENT_CHILD_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function pickChildId(
  children: Array<{ profileId: string }>,
  preferred?: string | null,
): string {
  if (!children.length) return "";
  const stored = preferred?.trim() || readStoredChildId();
  if (stored && children.some((c) => c.profileId === stored)) return stored;
  return children[0].profileId;
}

export async function fetchParentChildren(): Promise<ParentChildOption[]> {
  const data = await apiFetch<{ day?: ParentDayOverview }>("/dashboards/me");
  if (data.day?.kind !== "parent_day") return [];
  return data.day.children.map((c: ParentDayChild) => ({
    profileId: c.profileId,
    name: c.name,
    grade: c.grade,
    section: c.section,
  }));
}

export function childClassLabel(child: {
  grade: string;
  section?: string | null;
}) {
  return `${child.grade}${child.section ? ` · ${child.section}` : ""}`;
}
