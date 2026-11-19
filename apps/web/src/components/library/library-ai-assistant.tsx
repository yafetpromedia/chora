"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LibraryResource } from "@/lib/library";
import {
  getAiStatus,
  runStudyAssist,
  type StudyAssistAction,
} from "@/lib/ai";

type Props = {
  resources: LibraryResource[];
  /** Full-width student workspace without duplicate page chrome. */
  focus?: boolean;
  /** Hide panel header when a section banner is shown above. */
  hideHead?: boolean;
};

const ACTIONS: { id: StudyAssistAction; label: string; hint: string }[] = [
  {
    id: "summarize",
    label: "Summarize",
    hint: "Key points and definitions",
  },
  {
    id: "quiz",
    label: "Quiz me",
    hint: "5 practice questions + answers",
  },
  {
    id: "translate",
    label: "Amharic",
    hint: "Translate lesson text",
  },
];

function resourceText(resource: LibraryResource): string {
  const parts = [resource.title];
  if (resource.subject) parts.push(`Subject: ${resource.subject}`);
  if (resource.description?.trim()) parts.push(resource.description.trim());
  return parts.join("\n\n");
}

export function LibraryAiAssistant({ resources, focus, hideHead }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState("");
  const [text, setText] = useState("");
  const [action, setAction] = useState<StudyAssistAction>("summarize");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pickable = useMemo(
    () =>
      resources.filter(
        (r) =>
          r.status === "PUBLISHED" &&
          (r.description?.trim() || r.title.trim().length > 0),
      ),
    [resources],
  );

  const selected = pickable.find((r) => r.id === resourceId) ?? null;

  useEffect(() => {
    void getAiStatus()
      .then((status) => {
        setConfigured(status.configured);
        setModel(status.model);
      })
      .catch(() => setConfigured(false));
  }, []);

  const [syncedSelected, setSyncedSelected] = useState<LibraryResource | null>(
    null,
  );
  if (selected !== syncedSelected) {
    setSyncedSelected(selected);
    if (selected) setText(resourceText(selected));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult("");
    const body = text.trim();
    if (body.length < 10) {
      setError("Add at least a few sentences of lesson text to analyze.");
      return;
    }
    setBusy(true);
    try {
      const res = await runStudyAssist({
        action,
        text: body,
        title: selected?.title,
        subject: selected?.subject ?? undefined,
      });
      setResult(res.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`lib-ai-panel${focus ? " lib-ai-panel--focus" : ""}`}
      aria-labelledby="lib-ai-title"
    >
      {!hideHead ? (
      <div className="lib-ai-panel__head">
        <div className="lib-ai-panel__intro">
          <span className="lib-ai-panel__icon" aria-hidden>
            ✦
          </span>
          <div>
            <h2 id="lib-ai-title" className="lib-ai-panel__title">
              AI study assistant
            </h2>
            <p className="lib-ai-panel__sub">
              Summarize chapters, generate quizzes, and translate lessons from your
              library materials.
            </p>
          </div>
        </div>
        <span className="lib-ai-badge">Powered by AI</span>
      </div>
      ) : (
        <div className="lib-ai-panel__head lib-ai-panel__head--compact">
          <span className="lib-ai-badge">Powered by AI</span>
        </div>
      )}

      {configured === false ? (
        <p className="lib-ai-panel__notice">
          AI is not configured on this server yet. Ask your school admin to add
          API keys on the API host.
        </p>
      ) : (
        <form className="lib-ai-form" onSubmit={(e) => void onSubmit(e)}>
          {pickable.length > 0 ? (
            <label className="lib-ai-field">
              <span>From library</span>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
              >
                <option value="">Paste your own text below</option>
                {pickable.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                    {r.subject ? ` · ${r.subject}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="lib-ai-field">
            <span>Lesson text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Paste a chapter, notes, or assignment text here…"
              required
            />
          </label>

          <div className="lib-ai-actions" role="group" aria-label="AI actions">
            {ACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`lib-ai-action${action === item.id ? " lib-ai-action--active" : ""}`}
                onClick={() => setAction(item.id)}
                disabled={busy}
              >
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>

          <div className="lib-ai-form__footer">
            <button
              type="submit"
              className="lib-btn lib-btn--primary"
              disabled={busy || configured !== true}
            >
              {busy ? "Thinking…" : "Run"}
            </button>
            {model ? (
              <span className="lib-ai-model">Model: {model}</span>
            ) : null}
          </div>

          {error ? <p className="lib-ai-error">{error}</p> : null}
          {result ? (
            <div className="lib-ai-result">
              <h3>Result</h3>
              <div className="lib-ai-result__body">{result}</div>
            </div>
          ) : null}
        </form>
      )}
    </section>
  );
}
