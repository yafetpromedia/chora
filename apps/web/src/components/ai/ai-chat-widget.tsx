"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth";
import { AiChatContent } from "@/components/ai/ai-chat-content";
import { BrandMark } from "@/components/brand-mark";
import {
  getAiStatus,
  getPlatformAiStatus,
  prepareChatImage,
  sendAiChat,
  sendPlatformAiChat,
  type AiChatImage,
  type AiChatMessage,
} from "@/lib/ai";
import { BRAND_NAME } from "@/lib/brand";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";

type Props =
  | { variant?: "school"; role: UserRole; pageContext?: string }
  | { variant: "platform"; role?: never; pageContext?: string };

type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: AiChatMessage[];
};

const MAX_API_MESSAGES = 18;
const MAX_STORED_THREADS = 25;

type TranslateFn = (key: MessageKey | string, vars?: Record<string, string | number>) => string;

function schoolStarters(t: TranslateFn, role: UserRole): string[] {
  return [0, 1, 2].map((i) => t(`aiChatWidgetUi.starter_${role}_${i}`));
}

function platformStarters(t: TranslateFn): string[] {
  return [0, 1, 2].map((i) => t(`aiChatWidgetUi.starter_platform_${i}`));
}

function storageKey(variant: "school" | "platform") {
  return `chora-ai-threads:${variant}`;
}

function newThreadId() {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function threadTitleFromMessages(messages: AiChatMessage[], newChatLabel: string): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return newChatLabel;
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

function persistableMessages(messages: AiChatMessage[]): AiChatMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.reaction ? { reaction: m.reaction } : {}),
    ...(m.images?.length
      ? {
          images: m.images.map((img) => ({
            mimeType: img.mimeType,
            // Keep preview for history/lightbox; drop heavy raw payload if preview exists
            data: img.previewUrl ? "" : img.data,
            previewUrl:
              img.previewUrl ||
              (img.data ? `data:${img.mimeType};base64,${img.data}` : undefined),
          })),
        }
      : {}),
  }));
}

function formatChatPlainText(
  messages: AiChatMessage[],
  brand: string,
  t: TranslateFn,
): string {
  const body = messages
    .map((m) => {
      const who = m.role === "user" ? t("aiChatWidgetUi.copyYou") : brand;
      const imgNote = m.images?.length
        ? `\n${t("aiChatWidgetUi.imagesAttached", { count: m.images.length })}`
        : "";
      return `${who}:\n${m.content.trim()}${imgNote}`;
    })
    .join("\n\n");
  return `${t("aiChatWidgetUi.exportHeader", { brand })}\n\n${body}`.trim();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function loadThreads(variant: "school" | "platform"): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(variant));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveThreads(variant: "school" | "platform", threads: ChatThread[]) {
  try {
    localStorage.setItem(
      storageKey(variant),
      JSON.stringify(threads.slice(0, MAX_STORED_THREADS)),
    );
  } catch {
    // Quota exceeded — drop oldest image-heavy threads
    try {
      const slim = threads.slice(0, 10).map((t) => ({
        ...t,
        messages: t.messages.map((m) => ({
          role: m.role,
          content: m.images?.length
            ? `${m.content || ""}${m.content ? "\n" : ""}[image attached]`.trim()
            : m.content,
        })),
      }));
      localStorage.setItem(storageKey(variant), JSON.stringify(slim));
    } catch {
      /* ignore */
    }
  }
}

function imageSrc(img: AiChatImage): string {
  return img.previewUrl || (img.data ? `data:${img.mimeType};base64,${img.data}` : "");
}

export function AiChatWidget(props: Props) {
  const { t } = useLocale();
  const variant = props.variant ?? "school";
  const role: UserRole =
    variant === "school" ? (props.role ?? "student") : "admin";
  const pathname = usePathname();
  const pageContext = props.pageContext ?? pathname;
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [threadId, setThreadId] = useState(() => newThreadId());
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<AiChatImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const load = variant === "platform" ? getPlatformAiStatus : getAiStatus;
    void load()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, [variant]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setThreads(loadThreads(variant));
    });
    return () => {
      cancelled = true;
    };
  }, [variant]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy, pendingImages, historyOpen]);

  useEffect(() => {
    if (!open || historyOpen) return;
    inputRef.current?.focus();
  }, [open, historyOpen]);

  useEffect(() => {
    if (!lightboxSrc) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxSrc(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  // Autosave current thread when it has messages
  useEffect(() => {
    if (!messages.length) return;
    const next: ChatThread = {
      id: threadId,
      title: threadTitleFromMessages(messages, t("aiChatWidgetUi.newChatTitle")),
      updatedAt: new Date().toISOString(),
      messages: persistableMessages(messages),
    };
    queueMicrotask(() => {
      setThreads((prev) => {
        const others = prev.filter((t) => t.id !== threadId);
        const merged = [next, ...others].slice(0, MAX_STORED_THREADS);
        saveThreads(variant, merged);
        return merged;
      });
    });
  }, [messages, threadId, variant, t]);

  const sortedHistory = useMemo(
    () =>
      [...threads].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [threads],
  );

  function startNewChat() {
    if (busy) return;
    setThreadId(newThreadId());
    setMessages([]);
    setPendingImages([]);
    setError("");
    setInput("");
    setHistoryOpen(false);
  }

  function openThread(thread: ChatThread) {
    if (busy) return;
    setThreadId(thread.id);
    setMessages(thread.messages ?? []);
    setPendingImages([]);
    setError("");
    setInput("");
    setHistoryOpen(false);
  }

  function deleteThread(id: string) {
    const target = threads.find((th) => th.id === id);
    const label = target?.title || t("aiChatWidgetUi.confirmDeleteFallback");
    if (!window.confirm(t("aiChatWidgetUi.confirmDelete", { label }))) return;
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveThreads(variant, next);
      return next;
    });
    if (id === threadId) {
      setThreadId(newThreadId());
      setMessages([]);
      setPendingImages([]);
      setError("");
      setInput("");
    }
    showToast(t("aiChatWidgetUi.chatDeleted"));
  }

  function clearAllHistory() {
    if (!threads.length) {
      showToast(t("aiChatWidgetUi.noHistory"));
      return;
    }
    if (!window.confirm(t("aiChatWidgetUi.confirmClearAll", { count: threads.length }))) {
      return;
    }
    saveThreads(variant, []);
    setThreads([]);
    setThreadId(newThreadId());
    setMessages([]);
    setPendingImages([]);
    setError("");
    setInput("");
    setHistoryOpen(false);
    showToast(t("aiChatWidgetUi.historyCleared"));
  }

  async function copyMessage(content: string) {
    const ok = await copyText(content.trim());
    showToast(ok ? t("aiChatWidgetUi.copied") : t("aiChatWidgetUi.copyFailed"));
  }

  async function copyChat() {
    if (!messages.length) {
      showToast(t("aiChatWidgetUi.nothingToCopy"));
      return;
    }
    const ok = await copyText(formatChatPlainText(messages, BRAND_NAME, t));
    showToast(ok ? t("aiChatWidgetUi.chatCopied") : t("aiChatWidgetUi.copyFailed"));
  }

  async function shareChat() {
    if (!messages.length) {
      showToast(t("aiChatWidgetUi.nothingToShare"));
      return;
    }
    const text = formatChatPlainText(messages, BRAND_NAME, t);
    const title = `${t("aiChatWidgetUi.assistant", { brand: BRAND_NAME })} — ${threadTitleFromMessages(messages, t("aiChatWidgetUi.newChatTitle"))}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text });
        showToast(t("aiChatWidgetUi.shared"));
        return;
      }
    } catch (err) {
      // User cancelled share sheet — don't fall through as an error toast.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    const ok = await copyText(text);
    showToast(ok ? t("aiChatWidgetUi.chatCopiedToShare") : t("aiChatWidgetUi.shareFailed"));
  }

  function setReaction(index: number, reaction: "up" | "down") {
    setMessages((prev) => {
      const current = prev[index];
      const nextReaction =
        current?.role === "assistant" && current.reaction === reaction
          ? null
          : reaction;
      if (nextReaction === "up") showToast(t("aiChatWidgetUi.markedAsHelpful"));
      else if (nextReaction === "down") showToast(t("aiChatWidgetUi.markedAsNotHelpful"));
      else showToast(t("aiChatWidgetUi.reactionRemoved"));
      return prev.map((m, i) => {
        if (i !== index || m.role !== "assistant") return m;
        return { ...m, reaction: nextReaction };
      });
    });
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const next = [...pendingImages];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= 3) break;
        next.push(await prepareChatImage(file));
      }
      setPendingImages(next.slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiChatWidgetUi.attachFailed"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePending(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSend(e?: FormEvent, text?: string) {
    e?.preventDefault();
    const content = (text ?? input).trim();
    const images = pendingImages;
    if ((!content && images.length === 0) || busy) return;

    setInput("");
    setPendingImages([]);
    setError("");
    setHistoryOpen(false);
    const userMsg: AiChatMessage = {
      role: "user",
      content: content || (images.length ? t("aiChatWidgetUi.imagePrompt") : ""),
      ...(images.length ? { images } : {}),
    };
    const nextMessages: AiChatMessage[] = [...messages, userMsg];
    setMessages(nextMessages);
    setBusy(true);
    try {
      const send = variant === "platform" ? sendPlatformAiChat : sendAiChat;
      // Keep UI history full; only send a recent window to the API.
      const apiMessages = nextMessages.slice(-MAX_API_MESSAGES);
      const res = await send({
        messages: apiMessages,
        pageContext,
      });
      setMessages([...nextMessages, { role: "assistant", content: res.content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiChatWidgetUi.reachAiFailed"));
      setMessages(messages);
      setInput(content);
      setPendingImages(images);
    } finally {
      setBusy(false);
    }
  }

  if (configured === false) return null;

  const starters =
    variant === "platform" ? platformStarters(t) : schoolStarters(t, role);
  const canSend =
    configured === true && !busy && (Boolean(input.trim()) || pendingImages.length > 0);

  return (
    <div className={`ai-chat${open ? " ai-chat--open" : ""}`}>
      {open ? (
        <section
          className="ai-chat__panel"
          aria-label={t("aiChatWidgetUi.assistantAria", { brand: BRAND_NAME })}
        >
          <header className="ai-chat__head">
            <div className="ai-chat__brand">
              <BrandMark className="ai-chat__logo" />
            <div>
              <strong>{t("aiChatWidgetUi.assistant", { brand: BRAND_NAME })}</strong>
                <span>{t("aiChatWidgetUi.tagline")}</span>
              </div>
            </div>
            <div className="ai-chat__head-actions">
              <button
                type="button"
                className="ai-chat__icon-btn"
                aria-label={t("aiChatWidgetUi.historyAria")}
                title={t("aiChatWidgetUi.history")}
                onClick={() => setHistoryOpen((v) => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 8v5l3 2M4.5 12a7.5 7.5 0 111.6 4.6L4 20l1.2-3.2A7.5 7.5 0 014.5 12z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="ai-chat__icon-btn"
                aria-label={t("aiChatWidgetUi.newChatAria")}
                title={t("aiChatWidgetUi.newChat")}
                disabled={busy}
                onClick={startNewChat}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            <button
              type="button"
              className="ai-chat__close"
              aria-label={t("aiChatWidgetUi.closeAssistant")}
                onClick={() => {
                  setOpen(false);
                  setHistoryOpen(false);
                }}
            >
              ×
            </button>
            </div>
          </header>

          {historyOpen ? (
            <div className="ai-chat__history" aria-label={t("aiChatWidgetUi.chatHistory")}>
              <div className="ai-chat__history-head">
                <strong>{t("aiChatWidgetUi.chatHistory")}</strong>
              </div>
              <div className="ai-chat__history-toolbar">
                <button
                  type="button"
                  className="ai-chat__history-chip"
                  disabled={!messages.length}
                  onClick={() => void copyChat()}
                >
                  {t("common.copy")}
                </button>
                <button
                  type="button"
                  className="ai-chat__history-chip"
                  disabled={!messages.length}
                  onClick={() => void shareChat()}
                >
                  {t("aiChatWidgetUi.share")}
                </button>
                <button
                  type="button"
                  className="ai-chat__history-chip"
                  onClick={startNewChat}
                  disabled={busy}
                >
                  {t("aiChatWidgetUi.newChat")}
                </button>
                <button
                  type="button"
                  className="ai-chat__history-chip ai-chat__history-chip--danger"
                  disabled={!sortedHistory.length}
                  onClick={clearAllHistory}
                >
                  {t("aiChatWidgetUi.clearAll")}
                </button>
              </div>
              {sortedHistory.length === 0 ? (
                <p className="ai-chat__history-empty">{t("aiChatWidgetUi.historyEmpty")}</p>
              ) : (
                <ul className="ai-chat__history-list">
                  {sortedHistory.map((thread) => (
                    <li key={thread.id}>
                      <button
                        type="button"
                        className={`ai-chat__history-item${thread.id === threadId ? " ai-chat__history-item--active" : ""}`}
                        onClick={() => openThread(thread)}
                      >
                        <span className="ai-chat__history-title">{thread.title}</span>
                        <span className="ai-chat__history-meta">
                          {new Date(thread.updatedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="ai-chat__history-delete"
                        aria-label={t("aiChatWidgetUi.deleteChatAria", { title: thread.title })}
                        title={t("aiChatWidgetUi.deleteChat")}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteThread(thread.id);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="ai-chat__messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="ai-chat__empty">
                <div className="ai-chat__empty-hero" aria-hidden>
                  <span>
                    <DashIcon name="sparkle" />
                  </span>
                </div>
                <h3>{t("aiChatWidgetUi.helpTitle")}</h3>
                <p>
                  {variant === "platform"
                    ? t("aiChatWidgetUi.emptyPlatform")
                    : t("aiChatWidgetUi.emptySchool")}
                </p>
                <div className="ai-chat__starters">
                  {starters.map((q) => (
                    <button key={q} type="button" onClick={() => void onSend(undefined, q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`ai-chat__row ai-chat__row--${m.role}`}
                >
                  {m.role === "assistant" ? (
                    <span className="ai-chat__msg-avatar" aria-hidden>
                      <DashIcon name="sparkle" className="dash-icon--sm" />
                    </span>
                  ) : null}
                  <div className="ai-chat__msg">
                    <div className={`ai-chat__bubble ai-chat__bubble--${m.role}`}>
                      {m.images?.length ? (
                        <div className="ai-chat__thumbs">
                          {m.images.map((img, ji) => {
                            const src = imageSrc(img);
                            if (!src) return null;
                            return (
                              <button
                                key={ji}
                                type="button"
                                className="ai-chat__thumb-btn"
                                aria-label={t("aiChatWidgetUi.viewImage")}
                                onClick={() => setLightboxSrc(src)}
                              >
                                <img src={src} alt="" className="ai-chat__thumb" />
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {m.content ? <AiChatContent text={m.content} /> : null}
                    </div>
                    <div className={`ai-chat__msg-actions ai-chat__msg-actions--${m.role}`}>
                      <button
                        type="button"
                        className="ai-chat__msg-action"
                        title={t("common.copy")}
                        aria-label={t("aiChatWidgetUi.copyMessage")}
                        onClick={() => void copyMessage(m.content)}
                      >
                        {t("common.copy")}
                      </button>
                      {m.role === "assistant" ? (
                        <>
                          <button
                            type="button"
                            className={`ai-chat__msg-action ai-chat__msg-action--react${m.reaction === "up" ? " ai-chat__msg-action--on ai-chat__msg-action--up" : ""}`}
                            title={t("aiChatWidgetUi.helpful")}
                            aria-label={t("aiChatWidgetUi.markHelpful")}
                            aria-pressed={m.reaction === "up"}
                            onClick={() => setReaction(i, "up")}
                          >
                            <span aria-hidden>👍</span>
                            <span className="ai-chat__react-label">{t("aiChatWidgetUi.helpful")}</span>
                          </button>
                          <button
                            type="button"
                            className={`ai-chat__msg-action ai-chat__msg-action--react${m.reaction === "down" ? " ai-chat__msg-action--on ai-chat__msg-action--down" : ""}`}
                            title={t("aiChatWidgetUi.notHelpful")}
                            aria-label={t("aiChatWidgetUi.markNotHelpful")}
                            aria-pressed={m.reaction === "down"}
                            onClick={() => setReaction(i, "down")}
                          >
                            <span aria-hidden>👎</span>
                            <span className="ai-chat__react-label">{t("aiChatWidgetUi.notHelpful")}</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                    {m.role === "assistant" && m.reaction ? (
                      <p
                        className={`ai-chat__react-status ai-chat__react-status--${m.reaction}`}
                        role="status"
                      >
                        {m.reaction === "up"
                          ? t("aiChatWidgetUi.markedHelpful")
                          : t("aiChatWidgetUi.markedNotHelpful")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {busy ? (
              <div className="ai-chat__row ai-chat__row--assistant">
                <span className="ai-chat__msg-avatar" aria-hidden>
                  <DashIcon name="sparkle" className="dash-icon--sm" />
                </span>
                <div className="ai-chat__typing" aria-live="polite">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
          </div>

          {toast ? (
            <p className="ai-chat__toast" role="status" aria-live="polite">
              {toast}
            </p>
          ) : null}
          {error ? <p className="ai-chat__error">{error}</p> : null}

          {pendingImages.length > 0 ? (
            <div className="ai-chat__pending">
              {pendingImages.map((img, i) => {
                const src = imageSrc(img);
                return (
                  <div key={i} className="ai-chat__pending-item">
                    <button
                      type="button"
                      className="ai-chat__pending-preview"
                      aria-label={t("aiChatWidgetUi.viewImage")}
                      onClick={() => src && setLightboxSrc(src)}
                    >
                      {src ? (
                        <img src={src} alt="" />
                      ) : (
                        <span className="ai-chat__pending-fallback">{t("aiChatWidgetUi.pendingImg")}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="ai-chat__pending-remove"
                      aria-label={t("aiChatWidgetUi.removeImage")}
                      onClick={() => removePending(i)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <form className="ai-chat__form" onSubmit={(e) => void onSend(e)}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <div className="ai-chat__composer">
              <button
                type="button"
                className="ai-chat__attach"
                aria-label={t("aiChatWidgetUi.attachImage")}
                title={t("aiChatWidgetUi.attachImage")}
                disabled={busy || configured !== true || pendingImages.length >= 3}
                onClick={() => fileRef.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 01-7.78-7.78l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.49"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <input
                ref={inputRef}
                type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
                placeholder={
                  pendingImages.length
                    ? t("aiChatWidgetUi.placeholderCaption")
                    : t("aiChatWidgetUi.placeholderAsk")
                }
              disabled={busy || configured !== true}
            />
            </div>
            <button type="submit" className="ai-chat__send" disabled={!canSend}>
              {t("aiChatWidgetUi.send")}
            </button>
          </form>
        </section>
      ) : null}

      {lightboxSrc ? (
        <div
          className="ai-chat__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("aiChatWidgetUi.lightboxAria")}
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="ai-chat__lightbox-close"
            aria-label={t("aiChatWidgetUi.closeImage")}
            onClick={() => setLightboxSrc(null)}
          >
            ×
          </button>
          <img
            src={lightboxSrc}
            alt={t("aiChatWidgetUi.attachedAlt")}
            className="ai-chat__lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <button
        type="button"
        className="ai-chat__fab"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={t("aiChatWidgetUi.assistantAria", { brand: BRAND_NAME })}
      >
        <span className="ai-chat__fab-icon" aria-hidden>
          <DashIcon name="sparkle" className="dash-icon--sm" />
        </span>
        <span className="ai-chat__fab-label">{t("aiChatWidgetUi.fabLabel")}</span>
      </button>
    </div>
  );
}
