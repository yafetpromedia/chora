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

const SCHOOL_STARTERS: Record<UserRole, string[]> = {
  admin: [
    "How do I publish report cards?",
    "Where do I set up fee schedules?",
    "How does student promotion work?",
  ],
  staff: [
    "How do I approve teacher score sheets?",
    "Where is the finance module?",
    "How do I print student ID cards?",
  ],
  teacher: [
    "How do I submit grades for approval?",
    "Where do I mark attendance?",
    "How do I create classwork?",
  ],
  student: [
    "When will my report card be visible?",
    "How do I view my timetable?",
    "Where is the eLibrary AI assistant?",
  ],
  parent: [
    "How do I check my child's fees?",
    "Where do I see attendance?",
    "How do I view published results?",
  ],
};

const PLATFORM_STARTERS = [
  "How many schools are on trial?",
  "Where do I suspend a tenant?",
  "How do I issue an invoice?",
];

function storageKey(variant: "school" | "platform") {
  return `chora-ai-threads:${variant}`;
}

function newThreadId() {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function threadTitleFromMessages(messages: AiChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return "New chat";
  const t = firstUser.content.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
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

function formatChatPlainText(messages: AiChatMessage[], brand: string): string {
  const body = messages
    .map((m) => {
      const who = m.role === "user" ? "You" : brand;
      const imgNote = m.images?.length ? `\n[${m.images.length} image(s) attached]` : "";
      return `${who}:\n${m.content.trim()}${imgNote}`;
    })
    .join("\n\n");
  return `${brand} Assistant chat\n\n${body}`.trim();
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
      title: threadTitleFromMessages(messages),
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
  }, [messages, threadId, variant]);

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
    const target = threads.find((t) => t.id === id);
    const label = target?.title || "this chat";
    if (!window.confirm(`Delete “${label}” from history?`)) return;
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
    showToast("Chat deleted");
  }

  function clearAllHistory() {
    if (!threads.length) {
      showToast("No history to clear");
      return;
    }
    if (
      !window.confirm(
        `Delete all ${threads.length} saved chat${threads.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
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
    showToast("History cleared");
  }

  async function copyMessage(content: string) {
    const ok = await copyText(content.trim());
    showToast(ok ? "Copied" : "Could not copy");
  }

  async function copyChat() {
    if (!messages.length) {
      showToast("Nothing to copy");
      return;
    }
    const ok = await copyText(formatChatPlainText(messages, BRAND_NAME));
    showToast(ok ? "Chat copied" : "Could not copy");
  }

  async function shareChat() {
    if (!messages.length) {
      showToast("Nothing to share");
      return;
    }
    const text = formatChatPlainText(messages, BRAND_NAME);
    const title = `${BRAND_NAME} Assistant — ${threadTitleFromMessages(messages)}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text });
        showToast("Shared");
        return;
      }
    } catch (err) {
      // User cancelled share sheet — don't fall through as an error toast.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    const ok = await copyText(text);
    showToast(ok ? "Chat copied to share" : "Could not share");
  }

  function setReaction(index: number, reaction: "up" | "down") {
    setMessages((prev) => {
      const current = prev[index];
      const nextReaction =
        current?.role === "assistant" && current.reaction === reaction
          ? null
          : reaction;
      if (nextReaction === "up") showToast("Marked as helpful");
      else if (nextReaction === "down") showToast("Marked as not helpful");
      else showToast("Reaction removed");
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
      setError(err instanceof Error ? err.message : "Could not attach image");
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
      content: content || (images.length ? "What's in this image?" : ""),
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
      setError(err instanceof Error ? err.message : "Could not reach AI");
      setMessages(messages);
      setInput(content);
      setPendingImages(images);
    } finally {
      setBusy(false);
    }
  }

  if (configured === false) return null;

  const starters =
    variant === "platform"
      ? PLATFORM_STARTERS
      : SCHOOL_STARTERS[role] ?? SCHOOL_STARTERS.student;
  const canSend =
    configured === true && !busy && (Boolean(input.trim()) || pendingImages.length > 0);

  return (
    <div className={`ai-chat${open ? " ai-chat--open" : ""}`}>
      {open ? (
        <section className="ai-chat__panel" aria-label={`${BRAND_NAME} AI assistant`}>
          <header className="ai-chat__head">
            <div className="ai-chat__brand">
              <BrandMark className="ai-chat__logo" />
            <div>
              <strong>{BRAND_NAME} Assistant</strong>
                <span>Ask anything · attach screenshots</span>
              </div>
            </div>
            <div className="ai-chat__head-actions">
              <button
                type="button"
                className="ai-chat__icon-btn"
                aria-label="Chat history"
                title="History"
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
                aria-label="New chat"
                title="New chat"
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
              aria-label="Close assistant"
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
            <div className="ai-chat__history" aria-label="Chat history">
              <div className="ai-chat__history-head">
                <strong>Chat history</strong>
              </div>
              <div className="ai-chat__history-toolbar">
                <button
                  type="button"
                  className="ai-chat__history-chip"
                  disabled={!messages.length}
                  onClick={() => void copyChat()}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="ai-chat__history-chip"
                  disabled={!messages.length}
                  onClick={() => void shareChat()}
                >
                  Share
                </button>
                <button
                  type="button"
                  className="ai-chat__history-chip"
                  onClick={startNewChat}
                  disabled={busy}
                >
                  New chat
                </button>
                <button
                  type="button"
                  className="ai-chat__history-chip ai-chat__history-chip--danger"
                  disabled={!sortedHistory.length}
                  onClick={clearAllHistory}
                >
                  Clear all
                </button>
              </div>
              {sortedHistory.length === 0 ? (
                <p className="ai-chat__history-empty">No saved chats yet.</p>
              ) : (
                <ul className="ai-chat__history-list">
                  {sortedHistory.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`ai-chat__history-item${t.id === threadId ? " ai-chat__history-item--active" : ""}`}
                        onClick={() => openThread(t)}
                      >
                        <span className="ai-chat__history-title">{t.title}</span>
                        <span className="ai-chat__history-meta">
                          {new Date(t.updatedAt).toLocaleString(undefined, {
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
                        aria-label={`Delete ${t.title}`}
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteThread(t.id);
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
                  <span>✦</span>
                </div>
                <h3>How can I help?</h3>
                <p>
                  {variant === "platform"
                    ? "Ask about tenants, billing, support, plans, or drop a screenshot and I'll walk you through it."
                    : "Ask about attendance, results, fees, or drop a screenshot and I'll walk you through it."}
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
                      ✦
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
                                aria-label="View attached image"
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
                        title="Copy"
                        aria-label="Copy message"
                        onClick={() => void copyMessage(m.content)}
                      >
                        Copy
                      </button>
                      {m.role === "assistant" ? (
                        <>
                          <button
                            type="button"
                            className={`ai-chat__msg-action ai-chat__msg-action--react${m.reaction === "up" ? " ai-chat__msg-action--on ai-chat__msg-action--up" : ""}`}
                            title="Helpful"
                            aria-label="Mark helpful"
                            aria-pressed={m.reaction === "up"}
                            onClick={() => setReaction(i, "up")}
                          >
                            <span aria-hidden>👍</span>
                            <span className="ai-chat__react-label">Helpful</span>
                          </button>
                          <button
                            type="button"
                            className={`ai-chat__msg-action ai-chat__msg-action--react${m.reaction === "down" ? " ai-chat__msg-action--on ai-chat__msg-action--down" : ""}`}
                            title="Not helpful"
                            aria-label="Mark not helpful"
                            aria-pressed={m.reaction === "down"}
                            onClick={() => setReaction(i, "down")}
                          >
                            <span aria-hidden>👎</span>
                            <span className="ai-chat__react-label">Not helpful</span>
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
                          ? "You marked this helpful"
                          : "You marked this not helpful"}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {busy ? (
              <div className="ai-chat__row ai-chat__row--assistant">
                <span className="ai-chat__msg-avatar" aria-hidden>
                  ✦
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
                      aria-label="View attached image"
                      onClick={() => src && setLightboxSrc(src)}
                    >
                      {src ? <img src={src} alt="" /> : <span className="ai-chat__pending-fallback">Img</span>}
                    </button>
                    <button
                      type="button"
                      className="ai-chat__pending-remove"
                      aria-label="Remove image"
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
                aria-label="Attach image"
                title="Attach image"
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
                    ? "Add a caption (optional)…"
                    : "Ask a question or attach a screenshot…"
                }
              disabled={busy || configured !== true}
            />
            </div>
            <button type="submit" className="ai-chat__send" disabled={!canSend}>
              Send
            </button>
          </form>
        </section>
      ) : null}

      {lightboxSrc ? (
        <div
          className="ai-chat__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Attached image"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="ai-chat__lightbox-close"
            aria-label="Close image"
            onClick={() => setLightboxSrc(null)}
          >
            ×
          </button>
          <img
            src={lightboxSrc}
            alt="Attached"
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
        title={`${BRAND_NAME} AI assistant`}
      >
        <span className="ai-chat__fab-icon" aria-hidden>
          ✦
        </span>
        <span className="ai-chat__fab-label">AI</span>
      </button>
    </div>
  );
}
