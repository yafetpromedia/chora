"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LibraryResource } from "@/lib/library";
import {
  getAiStatus,
  runStudyAssist,
  type StudyAssistAction,
} from "@/lib/ai";
import { subjectCompactLabel } from "@/lib/subject-label";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  resources: LibraryResource[];
  /** Full-width student workspace without duplicate page chrome. */
  focus?: boolean;
  /** Hide panel header when a section banner is shown above. */
  hideHead?: boolean;
};

function resourceText(
  resource: LibraryResource,
  subjectLine: (subject: string) => string,
): string {
  const parts = [resource.title];
  if (resource.subject) parts.push(subjectLine(resource.subject));
  if (resource.description?.trim()) parts.push(resource.description.trim());
  return parts.join("\n\n");
}

export function LibraryAiAssistant({ resources, focus, hideHead }: Props) {
  const { t } = useLocale();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState("");
  const [text, setText] = useState("");
  const [action, setAction] = useState<StudyAssistAction>("summarize");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const actions = useMemo(
    () =>
      [
        {
          id: "summarize" as const,
          label: t("libraryAiUi.actionSummarize"),
          hint: t("libraryAiUi.actionSummarizeHint"),
        },
        {
          id: "quiz" as const,
          label: t("libraryAiUi.actionQuiz"),
          hint: t("libraryAiUi.actionQuizHint"),
        },
        {
          id: "translate" as const,
          label: t("libraryAiUi.actionTranslate"),
          hint: t("libraryAiUi.actionTranslateHint"),
        },
      ],
    [t],
  );

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
    if (selected) {
      setText(
        resourceText(selected, (subject) =>
          t("libraryAiUi.subjectPrefix", { subject }),
        ),
      );
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult("");
    const body = text.trim();
    if (body.length < 10) {
      setError(t("libraryAiUi.errMinText"));
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
      setError(err instanceof Error ? err.message : t("libraryAiUi.errRequest"));
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
            <DashIcon name="sparkle" className="dash-icon--sm" />
          </span>
          <div>
            <h2 id="lib-ai-title" className="lib-ai-panel__title">
              {t("libraryAiUi.title")}
            </h2>
            <p className="lib-ai-panel__sub">{t("libraryAiUi.sub")}</p>
          </div>
        </div>
        <span className="lib-ai-badge">{t("libraryAiUi.poweredBy")}</span>
      </div>
      ) : (
        <div className="lib-ai-panel__head lib-ai-panel__head--compact">
          <span className="lib-ai-badge">{t("libraryAiUi.poweredBy")}</span>
        </div>
      )}

      {configured === false ? (
        <p className="lib-ai-panel__notice">{t("libraryAiUi.notConfigured")}</p>
      ) : (
        <form className="lib-ai-form" onSubmit={(e) => void onSubmit(e)}>
          {pickable.length > 0 ? (
            <label className="lib-ai-field">
              <span>{t("libraryAiUi.fromLibrary")}</span>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
              >
                <option value="">{t("libraryAiUi.pasteOwn")}</option>
                {pickable.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                    {r.subject
                      ? ` · ${subjectCompactLabel({ name: r.subject })}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="lib-ai-field">
            <span>{t("libraryAiUi.lessonText")}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={t("libraryAiUi.lessonPlaceholder")}
              required
            />
          </label>

          <div
            className="lib-ai-actions lib-ai-actions--pick"
            role="group"
            aria-label={t("libraryAiUi.ariaActions")}
          >
            {actions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`lib-ai-action${action === item.id ? " lib-ai-action--active" : ""}`}
                onClick={() => setAction(item.id)}
                disabled={busy}
                aria-pressed={action === item.id}
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
              {busy ? t("libraryAiUi.thinking") : t("libraryAiUi.run")}
            </button>
            {model ? (
              <span className="lib-ai-model">
                {t("libraryAiUi.model", { model })}
              </span>
            ) : null}
          </div>

          {error ? <p className="lib-ai-error">{error}</p> : null}
          {result ? (
            <div className="lib-ai-result">
              <h3>{t("libraryAiUi.result")}</h3>
              <div className="lib-ai-result__body">{result}</div>
            </div>
          ) : null}
        </form>
      )}
    </section>
  );
}