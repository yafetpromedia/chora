import { apiFetch, apiPatch, apiPost } from "@/lib/api";

export type StudyAssistAction = "summarize" | "quiz" | "translate";

export type AiStatus = {
  configured: boolean;
  model: string | null;
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

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
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

export function sendAiChat(input: {
  messages: AiChatMessage[];
  pageContext?: string;
}) {
  return apiPost<AiTextResult>("/schools/ai/chat", input);
}
