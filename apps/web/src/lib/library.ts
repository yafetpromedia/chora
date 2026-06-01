import { apiFetch, apiPatch, apiPost, apiDelete, getApiBaseUrl, apiUpload } from "@/lib/api";

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
