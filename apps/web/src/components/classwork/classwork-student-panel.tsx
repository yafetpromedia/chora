"use client";



import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {

  getStudentAssignment,

  listStudentAssignments,

  submitStudentAssignment,

  type ClassworkAssignment,

  type ClassworkType,

} from "@/lib/classwork";

import { openClassworkFile } from "@/lib/teacher-cards";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  classworkStatusLabel,
  cwField,
  studentPrefix,
} from "@/components/classwork/classwork-i18n";

type Props = {

  mode: ClassworkType;

};

function CwAssignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function CwSheetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h3" />
    </svg>
  );
}

function formatDue(dueAt: string | null | undefined): string | null {

  if (!dueAt) return null;

  return new Date(dueAt).toLocaleString(undefined, {

    month: "short",

    day: "numeric",

    year: "numeric",

    hour: "numeric",

    minute: "2-digit",

  });

}



export function ClassworkStudentPanel({ mode }: Props) {
  const { t } = useLocale();
  const prefix = studentPrefix(mode);
  const copy = {
    modeLabel: cwField(t, prefix, "modeLabel"),
    heroTitle: cwField(t, prefix, "heroTitle"),
    heroSub: cwField(t, prefix, "heroSub"),
    listTitle: cwField(t, prefix, "listTitle"),
    listSub: cwField(t, prefix, "listSub"),
    empty: cwField(t, prefix, "empty"),
    emptyHint: cwField(t, prefix, "emptyHint"),
    loading: cwField(t, prefix, "loading"),
    plural: cwField(t, prefix, "plural"),
    notePlaceholder: cwField(t, prefix, "notePlaceholder"),
    fileHint: cwField(t, prefix, "fileHint"),
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ClassworkAssignment[]>([]);

  const [selectedIdState, setSelectedId] = useState("");

  const [detailState, setDetail] = useState<ClassworkAssignment | null>(null);
  const selectedId = items.some((i) => i.id === selectedIdState)
    ? selectedIdState
    : (items[0]?.id ?? "");
  const detail = selectedId ? detailState : null;

  const [note, setNote] = useState("");

  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [saved, setSaved] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  const stats = useMemo(() => {

    const submitted = items.filter(

      (i) =>

        i.mySubmission?.status === "SUBMITTED" ||

        i.mySubmission?.status === "LATE" ||

        i.mySubmission?.status === "GRADED",

    ).length;

    const pending = items.length - submitted;

    return { total: items.length, submitted, pending };

  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "done") {
      return items.filter(
        (i) =>
          i.mySubmission?.status === "SUBMITTED" ||
          i.mySubmission?.status === "LATE" ||
          i.mySubmission?.status === "GRADED",
      );
    }
    return items.filter(
      (i) =>
        !i.mySubmission ||
        (i.mySubmission.status !== "SUBMITTED" &&
          i.mySubmission.status !== "LATE" &&
          i.mySubmission.status !== "GRADED"),
    );
  }, [items, filter]);

  useEffect(() => {
    void listStudentAssignments(mode)
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("classworkUi.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [mode]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void getStudentAssignment(selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t("classworkUi.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);



  async function onSubmit(e: FormEvent) {

    e.preventDefault();

    if (!selectedId) return;

    setBusy(true);

    setError("");

    setSaved("");

    try {

      await submitStudentAssignment(

        selectedId,

        note.trim() || undefined,

        file ?? undefined,

      );

      setSaved(t("classworkUi.submitSuccess"));

      setNote("");

      setFile(null);

      if (fileInputRef.current) fileInputRef.current.value = "";

      const fresh = await listStudentAssignments(mode);

      setItems(fresh);

      setDetail(await getStudentAssignment(selectedId));

    } catch (err) {

      setError(err instanceof Error ? err.message : t("classworkUi.submitFailed"));

    } finally {

      setBusy(false);

    }

  }



  if (loading) {

    return (

      <div className="cw-loading">

        <div className="cw-loading__spinner" aria-hidden />

        <p>{copy.loading}</p>

      </div>

    );

  }



  const heroIcon =
    mode === "ASSIGNMENT" ? (
      <CwAssignIcon className="cw-mode-icon" />
    ) : (
      <CwSheetIcon className="cw-mode-icon" />
    );

  return (
    <div className={`cw-page cw-page--${mode === "ASSIGNMENT" ? "assignment" : "worksheet"}`}>
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

      <header className="cw-hero">
        <div className="cw-hero__glow" aria-hidden />
        <div className="cw-hero__main">
          <div className="cw-hero__brand">
            <span className="cw-mode-chip">{copy.modeLabel}</span>
            {heroIcon}
          </div>
          <h2 className="cw-hero__title">{copy.heroTitle}</h2>
          <p className="cw-hero__sub">
            {copy.heroSub}
            {stats.total > 0
              ? ` · ${stats.total} ${stats.total === 1 ? copy.plural.slice(0, -1) : copy.plural}`
              : ""}
          </p>
        </div>
        <div className="cw-hero__stats">
          <div className="cw-stat">
            <span className="cw-stat__value">{stats.total}</span>
            <span className="cw-stat__label">{t("classworkUi.statTotal")}</span>
          </div>
          <div className="cw-stat">
            <span className="cw-stat__value">{stats.submitted}</span>
            <span className="cw-stat__label">{t("classworkUi.statDone")}</span>
          </div>
          <div className="cw-stat cw-stat--accent">
            <span className="cw-stat__value">{stats.pending}</span>
            <span className="cw-stat__label">{t("classworkUi.statTodo")}</span>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <section className="cw-empty-v2">
          <div className="cw-empty-v2__card">
            <span className="cw-empty-v2__icon" aria-hidden>
              {mode === "ASSIGNMENT" ? <CwAssignIcon /> : <CwSheetIcon />}
            </span>
            <h3 className="cw-empty-v2__title">{copy.empty}</h3>
            <p className="cw-empty-v2__sub">{copy.emptyHint}</p>
          </div>
          <div className="cw-empty-v2__tips">
            <article className="cw-empty-v2__tip">
              <strong>{t("classworkUi.tipDueTitle")}</strong>
              <p>{t("classworkUi.tipDueBody")}</p>
            </article>
            <article className="cw-empty-v2__tip">
              <strong>{t("classworkUi.tipSubmitTitle")}</strong>
              <p>{t("classworkUi.tipSubmitBody")}</p>
            </article>
            <article className="cw-empty-v2__tip">
              <strong>{t("classworkUi.tipTrackTitle")}</strong>
              <p>{t("classworkUi.tipTrackBody")}</p>
            </article>
          </div>
        </section>
      ) : (
        <div className="cw-layout">
            <section className="cw-card">
              <div className="cw-card__head">
                <div>
                  <h2 className="cw-card__title">{copy.listTitle}</h2>
                  <p className="cw-card__sub">{copy.listSub}</p>
                </div>
                <span className="cw-card__icon" aria-hidden>
                  {mode === "ASSIGNMENT" ? <CwAssignIcon /> : <CwSheetIcon />}
                </span>
              </div>

              <div className="cw-student-filter" role="tablist" aria-label={t("classworkUi.filterAria")}>
                {(
                  [
                    { id: "all" as const, label: t("classworkUi.filterAll"), count: items.length },
                    { id: "todo" as const, label: t("classworkUi.filterTodo"), count: stats.pending },
                    { id: "done" as const, label: t("classworkUi.filterDone"), count: stats.submitted },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === tab.id}
                    className={`cw-student-filter__tab${filter === tab.id ? " cw-student-filter__tab--on" : ""}`}
                    onClick={() => setFilter(tab.id)}
                  >
                    {tab.label}
                    <span className="cw-student-filter__count">{tab.count}</span>
                  </button>
                ))}
              </div>

              <ul className="cw-list cw-list--student">
                {filteredItems.length === 0 ? (
                  <li className="cw-list__empty">
                    <p>
                      {filter === "todo"
                        ? t("classworkUi.noTodoInView")
                        : t("classworkUi.noDoneInView")}
                    </p>
                  </li>
                ) : null}
                {filteredItems.map((row) => {

                  const sub = row.mySubmission?.status;

                  return (

                    <li key={row.id}>

                      <button

                        type="button"

                        className={`cw-list__item${selectedId === row.id ? " cw-list__item--active" : ""}`}

                        onClick={() => setSelectedId(row.id)}

                      >

                        <div className="cw-inbox__top">

                          <strong>{row.title}</strong>

                          {sub ? (

                            <span className={`cw-status cw-status--${sub.toLowerCase()}`}>
                              {classworkStatusLabel(t, sub)}
                            </span>
                          ) : (
                            <span className="cw-status cw-status--pending">
                              {t("classworkUi.statusPending")}
                            </span>

                          )}

                        </div>

                        <span className="cw-list__meta">{row.classLabel}</span>

                      </button>

                    </li>

                  );

                })}

              </ul>

            </section>



            {detail ? (

              <section className="cw-card cw-detail">

                <header className="cw-detail__head">

                  <div>

                    <h2 className="cw-detail__title">{detail.title}</h2>

                    <p className="cw-detail__class">{detail.classLabel}</p>

                    {detail.dueAt ? (

                      <p className="cw-detail__due">

                        {t("classworkUi.duePrefix", {
                          date: formatDue(detail.dueAt) ?? "",
                        })}

                      </p>

                    ) : null}

                  </div>

                  {detail.fileUrl ? (

                    <button

                      type="button"

                      className="cw-btn cw-btn--ghost"

                      onClick={() => void openClassworkFile(detail.fileUrl!)}

                    >

                      {t("classworkUi.download")} {detail.fileName ?? t("classworkUi.attachment")}

                    </button>

                  ) : null}

                </header>



                {detail.description ? (

                  <p className="cw-detail__desc">{detail.description}</p>

                ) : null}



                {detail.mySubmission?.status === "GRADED" &&
                detail.mySubmission.score != null ? (
                  <div className="cw-grade-result">
                    <p className="cw-grade-result__score">
                      {t("classworkUi.yourScore")} <strong>{detail.mySubmission.score}</strong>
                      {detail.maxScore ? ` / ${detail.maxScore}` : ""}
                    </p>
                    {detail.mySubmission.feedback ? (
                      <p className="cw-grade-result__feedback">{detail.mySubmission.feedback}</p>
                    ) : null}
                  </div>
                ) : detail.mySubmission?.status === "SUBMITTED" ||
                  detail.mySubmission?.status === "LATE" ? (
                  <p className="cw-alert cw-alert--ok">
                    {t("classworkUi.youSubmitted")}
                    {detail.mySubmission.submittedAt
                      ? t("classworkUi.submittedOnDate", {
                          date: formatDue(detail.mySubmission.submittedAt) ?? "",
                        })
                      : ""}
                    {t("classworkUi.teacherWillGrade")}
                  </p>
                ) : (

                  <form className="cw-form" onSubmit={(e) => void onSubmit(e)}>

                    <label className="cw-field">

                      <span>{t("classworkUi.yourNote")}</span>

                      <textarea

                        rows={4}

                        value={note}

                        onChange={(e) => setNote(e.target.value)}

                        placeholder={copy.notePlaceholder}

                      />

                    </label>

                    <div className="cw-file">

                      <span className="cw-file__label">{copy.fileHint}</span>

                      <label className="cw-file__zone">

                        <span className="cw-file__icon" aria-hidden>
                          {mode === "ASSIGNMENT" ? <CwAssignIcon /> : <CwSheetIcon />}
                        </span>

                        <span className="cw-file__text">

                          <strong>{file ? file.name : t("classworkUi.chooseFile")}</strong>
                          {file
                            ? `${(file.size / 1024).toFixed(0)} KB`
                            : t("classworkUi.fileTypesHint")}

                        </span>

                        <input

                          ref={fileInputRef}

                          type="file"

                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}

                        />

                      </label>

                    </div>

                    <button

                      type="submit"

                      className="cw-btn cw-btn--primary"

                      disabled={busy}

                    >

                      {busy ? t("classworkUi.submitting") : t("classworkUi.submit")}

                    </button>

                  </form>

                )}

              </section>

            ) : (

              <section className="cw-card">

                <div className="cw-empty" style={{ padding: "2rem 1rem" }}>

                  <p className="cw-empty__title">
                    {t("classworkUi.selectItemTitle", {
                      item: copy.plural.replace(/s$/, ""),
                    })}
                  </p>
                  <p className="cw-empty__sub">{t("classworkUi.selectItemSub")}</p>

                </div>

              </section>

            )}
          </div>
      )}
    </div>
  );
}

