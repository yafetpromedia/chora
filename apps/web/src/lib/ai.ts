import { apiFetch, apiPost } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";

export type StudyAssistAction = "summarize" | "quiz" | "translate";

export type AiStatus = {
  configured: boolean;
  model: string | null;
  provider?: string | null;
  source?: string | null;
};

export type AiTextResult = {
  content: string;
  model: string;
};

export type StudyAssistResult = AiTextResult;

export type AnnouncementDraftResult = {
  title: string;
  body: string;
  model: string;
};

export type ReportCommentKind = "teacher" | "principal";

export type AiChatImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  data: string;
  /** Local preview URL (data URL) — not sent to API if we strip it; we send data separately */
  previewUrl?: string;
};

export type AiChatReaction = "up" | "down";

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
  images?: AiChatImage[];
  /** Local-only feedback; never sent to the API. */
  reaction?: AiChatReaction | null;
};

export function getAiStatus() {
  return apiFetch<AiStatus>("/schools/ai/status");
}

export function runStudyAssist(input: {
  action: StudyAssistAction;
  text: string;
  title?: string;
  subject?: string;
}) {
  return apiPost<StudyAssistResult>("/schools/ai/study", input);
}

export function draftAnnouncement(input: { prompt: string; audience?: string }) {
  return apiPost<AnnouncementDraftResult>("/schools/ai/announcement-draft", input);
}

export function draftReportComment(input: {
  kind: ReportCommentKind;
  context: string;
  studentName?: string;
  termName?: string;
}) {
  return apiPost<AiTextResult>("/schools/ai/report-comment", input);
}

function serializeChatMessages(messages: AiChatMessage[]) {
  return messages.map((m) => {
    const images = (m.images ?? [])
      .map((img) => {
        const data = (img.data || "").replace(/^data:[^;]+;base64,/, "").trim();
        return data.length >= 32
          ? { mimeType: img.mimeType, data }
          : null;
      })
      .filter((img): img is { mimeType: AiChatImage["mimeType"]; data: string } => !!img);

    return {
      role: m.role,
      content: m.content,
      ...(images.length ? { images } : {}),
    };
  });
}

export function sendAiChat(input: {
  messages: AiChatMessage[];
  pageContext?: string;
}) {
  return apiPost<AiTextResult>("/schools/ai/chat", {
    messages: serializeChatMessages(input.messages),
    pageContext: input.pageContext,
  });
}

export function getPlatformAiStatus() {
  return platformFetch<AiStatus>("/platform/ai/status");
}

export function sendPlatformAiChat(input: {
  messages: AiChatMessage[];
  pageContext?: string;
}) {
  return platformFetch<AiTextResult>("/platform/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: serializeChatMessages(input.messages),
      pageContext: input.pageContext,
    }),
  });
}

/** Resize/compress an image file for chat upload. */
export async function prepareChatImage(file: File): Promise<AiChatImage> {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  type Mime = (typeof allowed)[number];
  if (!allowed.includes(file.type as Mime)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image is too large (max 12 MB before compress).");
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const mimeType: Mime =
    file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif"
      ? (file.type as Mime)
      : "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType === "image/png" ? "image/png" : "image/jpeg", 0.82);
  const data = dataUrl.replace(/^data:[^;]+;base64,/, "");
  if (data.length > 5_000_000) {
    throw new Error("Image is still too large after compress. Try a smaller photo.");
  }
  return { mimeType, data, previewUrl: dataUrl };
}
