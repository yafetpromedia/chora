"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth";
import {
  getAiStatus,
  sendAiChat,
  type AiChatMessage,
} from "@/lib/ai";

type Props = {
  role: UserRole;
};

const STARTERS: Record<UserRole, string[]> = {
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

export function AiChatWidget({ role }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void getAiStatus()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open, busy]);

  async function onSend(e?: FormEvent, text?: string) {
    e?.preventDefault();
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    setError("");
    const nextMessages: AiChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setBusy(true);
    try {
      const res = await sendAiChat({
        messages: nextMessages,
        pageContext: pathname,
      });
      setMessages([...nextMessages, { role: "assistant", content: res.content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach AI");
      setMessages(messages);
      setInput(content);
    } finally {
      setBusy(false);
    }
  }

  if (configured === false) return null;

  const starters = STARTERS[role] ?? STARTERS.student;

  return (
    <div className={`ai-chat${open ? " ai-chat--open" : ""}`}>
      {open ? (
        <section className="ai-chat__panel" aria-label="CampusOne AI assistant">
          <header className="ai-chat__head">
            <div>
              <strong>CampusOne Assistant</strong>
              <span>Powered by AI</span>
            </div>
            <button
              type="button"
              className="ai-chat__close"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="ai-chat__messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="ai-chat__empty">
                <p>Ask anything about CampusOne — attendance, results, fees, and more.</p>
                <div className="ai-chat__starters">
                  {starters.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void onSend(undefined, q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`ai-chat__bubble ai-chat__bubble--${m.role}`}
                >
                  {m.content}
                </div>
              ))
            )}
            {busy ? <div className="ai-chat__typing">Thinking…</div> : null}
          </div>
          {error ? <p className="ai-chat__error">{error}</p> : null}
          <form className="ai-chat__form" onSubmit={(e) => void onSend(e)}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={busy || configured !== true}
            />
            <button type="submit" disabled={busy || !input.trim() || configured !== true}>
              Send
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className="ai-chat__fab"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="CampusOne AI assistant"
      >
        <span className="ai-chat__fab-icon" aria-hidden>
          ✦
        </span>
        <span className="ai-chat__fab-label">AI</span>
      </button>
    </div>
  );
}
