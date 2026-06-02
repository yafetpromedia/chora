import { apiFetch, apiPatch, apiPost, apiDelete, getApiBaseUrl, apiUpload } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

export type LibraryResourceType =
  | "BOOK_PDF"
  | "EPUB"
  | "DOCUMENT"
  | "NOTES"
  | "ASSIGNMENT"
  | "LAB_MANUAL"
  | "EXAM"
  | "VIDEO"
  | "AUDIO"
  | "RESEARCH"
  | "OTHER";

export type LibraryResourceStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
export type LibraryAudience = "STUDENTS" | "TEACHERS" | "BOTH";

export type LibraryCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  resourceCount: number;
};

export type LibraryResource = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  coverUrl: string | null;
  resourceType: LibraryResourceType;
  resourceTypeLabel: string;
  audience: LibraryAudience;
  subject: string | null;
  author: string | null;
  status: LibraryResourceStatus;
  downloadCount: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  category: { id: string; name: string; slug: string; icon: string | null };
  grade: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string } | null;
  progressPercent?: number;
  favorited?: boolean;
};

export type LibraryHub = {
  tagline: string;
  categories: LibraryCategory[];
  featured: LibraryResource[];
  recent: LibraryResource[];
  stats: {
    totalResources: number;
    published: number;
    pending: number;
    totalDownloads: number;
    activeReaders: number;
  } | null;
  shelf: {
    favorites: LibraryResource[];
    continueReading: LibraryResource[];
  } | null;
  studentGrade: { id: string; name: string } | null;
};

export function resolveLibraryAssetUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${getApiBaseUrl()}${url}`;
}

export async function fetchLibraryAssetObjectUrl(url: string) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("Not authenticated");
  const resolved = resolveLibraryAssetUrl(url);
  if (!resolved) throw new Error("Missing file URL");
  const res = await fetch(resolved, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Session expired");
    throw new Error("Could not load file");
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function openLibraryAsset(url: string) {
  const objectUrl = await fetchLibraryAssetObjectUrl(url);
  const tab = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!tab) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Popup blocked. Allow popups and try again.");
  }
  // Keep blob URL alive briefly for browser viewers, then clean up.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export async function getLibraryHub() {
  return apiFetch<LibraryHub>("/schools/library/hub");
}

export async function listLibraryResources(params: {
  q?: string;
  categoryId?: string;
  resourceType?: LibraryResourceType;
  gradeId?: string;
  status?: LibraryResourceStatus;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params.q) q.set("q", params.q);
  if (params.categoryId) q.set("categoryId", params.categoryId);
  if (params.resourceType) q.set("resourceType", params.resourceType);
  if (params.gradeId) q.set("gradeId", params.gradeId);
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiFetch<LibraryResource[]>(
    `/schools/library/resources${qs ? `?${qs}` : ""}`,
  );
}

export async function getLibraryResource(id: string) {
  return apiFetch<LibraryResource>(`/schools/library/resources/${id}`);
}

export async function createLibraryResource(body: {
  title: string;
  description?: string;
  categoryId: string;
  resourceType: LibraryResourceType;
  audience?: LibraryAudience;
  subject?: string;
  gradeId?: string;
  author?: string;
  fileUrl?: string;
  externalUrl?: string;
  coverUrl?: string;
}) {
  return apiPost<LibraryResource>("/schools/library/resources", body);
}

export async function publishLibraryResource(id: string) {
  return apiPost<LibraryResource>(`/schools/library/resources/${id}/publish`, {});
}

export async function deleteLibraryResource(id: string) {
  return apiDelete<{ ok: boolean }>(`/schools/library/resources/${id}`);
}

export async function uploadLibraryFile(file: File) {
  return apiUpload<{ fileUrl: string; mimeType: string; ext: string }>(
    "/schools/library/upload",
    file,
  );
}

export async function toggleLibraryFavorite(id: string) {
  return apiPost<{ favorited: boolean }>(
    `/schools/library/resources/${id}/favorite`,
    {},
  );
}

export async function updateLibraryProgress(
  id: string,
  body: { progressPercent: number; lastReadPage?: number },
) {
  return apiPatch<{ progressPercent: number }>(
    `/schools/library/resources/${id}/progress`,
    body,
  );
}

export async function recordLibraryDownload(id: string) {
  return apiPost<{ ok: boolean }>(
    `/schools/library/resources/${id}/download`,
    {},
  );
}

export const LIBRARY_RESOURCE_TYPES: { value: LibraryResourceType; label: string }[] =
  [
    { value: "BOOK_PDF", label: "PDF book" },
    { value: "EPUB", label: "EPUB" },
    { value: "DOCUMENT", label: "Document" },
    { value: "NOTES", label: "Teacher notes" },
    { value: "ASSIGNMENT", label: "Assignment" },
    { value: "LAB_MANUAL", label: "Lab manual" },
    { value: "EXAM", label: "Exam paper" },
    { value: "VIDEO", label: "Video lesson" },
    { value: "AUDIO", label: "Audio / podcast" },
    { value: "RESEARCH", label: "Research paper" },
    { value: "OTHER", label: "Other" },
  ];

export const LIBRARY_AUDIENCE_OPTIONS: {
  value: LibraryAudience;
  label: string;
}[] = [
  { value: "BOTH", label: "Students and teachers" },
  { value: "STUDENTS", label: "Students only" },
  { value: "TEACHERS", label: "Teachers only" },
];
