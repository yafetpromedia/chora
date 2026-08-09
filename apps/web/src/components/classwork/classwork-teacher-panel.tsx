"use client";



import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {

  classworkReviewPath,

  createAssignment,

  listClassSubjects,

  listTeacherAssignments,

  uploadAssignmentFile,

  type ClassSubjectOption,

  type ClassworkAssignment,

  type ClassworkStatus,

  type ClassworkType,

} from "@/lib/classwork";
import { AppToast } from "@/components/ui/app-toast";



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

const MODE_COPY: Record<
  ClassworkType,
  {
    modeLabel: string;
    heroSub: string;
    newTitle: string;
    newSub: string;
    listTitle: string;
    listSub: string;
    empty: string;
    emptyHint: string;
    singular: string;
    plural: string;
    titlePlaceholder: string;
    instructionsPlaceholder: string;
    fileHint: string;
  }
> = {
  ASSIGNMENT: {
    modeLabel: "Homework hub",
    heroSub: "Create, publish, and track graded homework with due dates.",
    newTitle: "New assignment",
    newSub: "Draft first — publish when students should start.",
    listTitle: "Assignment queue",
    listSub: "Open one to publish, close, or review submissions.",
    empty: "No assignments yet",
    emptyHint: "Post homework with instructions and an optional due date.",
    singular: "assignment",
    plural: "assignments",
    titlePlaceholder: "e.g. Chapter 5 homework — cell division",
    instructionsPlaceholder: "What should students submit? Add reading, links, or rubric notes.",
    fileHint: "Attach a PDF brief or question sheet",
  },
  WORKSHEET: {
    modeLabel: "Worksheet hub",
    heroSub: "Create, publish, and track practice sheets for your classes.",
    newTitle: "New worksheet",
    newSub: "Draft first — publish when students should start.",
    listTitle: "Worksheet queue",
    listSub: "Open one to publish, close, or review submissions.",
    empty: "No worksheets yet",
    emptyHint: "Post a practice sheet with instructions and an optional due date.",
    singular: "worksheet",
    plural: "worksheets",
    titlePlaceholder: "e.g. Chapter 5 worksheet — photosynthesis drill",
    instructionsPlaceholder: "What should students complete? Add page numbers, links, or notes.",
    fileHint: "Attach a PDF worksheet or question sheet",
  },
};



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



function StatusBadge({ status }: { status: ClassworkStatus }) {

  return (

    <span className={`cw-status cw-status--${status.toLowerCase()}`}>

      {status}

    </span>

  );

}



export function ClassworkTeacherPanel({ mode }: Props) {

  const router = useRouter();
  const copy = MODE_COPY[mode];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [classes, setClasses] = useState<ClassSubjectOption[]>([]);

  const [classSubjectId, setClassSubjectId] = useState("");

  const [items, setItems] = useState<ClassworkAssignment[]>([]);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [saved, setSaved] = useState("");



  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const type = mode;

  const [dueAt, setDueAt] = useState("");

  const [attachFile, setAttachFile] = useState<File | null>(null);



  const selectedClass = classes.find((c) => c.id === classSubjectId);



  const stats = useMemo(() => {

    const draft = items.filter((i) => i.status === "DRAFT").length;

    const published = items.filter((i) => i.status === "PUBLISHED").length;

    const closed = items.filter((i) => i.status === "CLOSED").length;

    return { total: items.length, draft, published, closed };

  }, [items]);



  const loadItems = useCallback(async () => {

    setItems(

      await listTeacherAssignments({

        classSubjectId: classSubjectId || undefined,

        type: mode,

      }),

    );

  }, [classSubjectId, mode]);



  useEffect(() => {

    void listClassSubjects()

      .then((c) => {

        setClasses(c);

        if (c[0]) setClassSubjectId(c[0].id);

      })

      .catch((err) =>

        setError(err instanceof Error ? err.message : "Load failed"),

      )

      .finally(() => setLoading(false));

  }, []);



  useEffect(() => {

    if (loading) return;

    void loadItems().catch((err) =>

      setError(err instanceof Error ? err.message : "Load failed"),

    );

  }, [loading, loadItems]);



  async function onCreate(e: FormEvent) {

    e.preventDefault();

    if (!classSubjectId || !title.trim()) {

      setError("Select a class and enter a title.");

      return;

    }

    setBusy(true);

    setError("");

    setSaved("");

    try {

      const row = await createAssignment({

        classSubjectId,

        title: title.trim(),

        description: description.trim() || undefined,

        type,

        dueAt: dueAt || undefined,

      });

      if (attachFile) {

        await uploadAssignmentFile(row.id, attachFile);

      }

      setTitle("");

      setDescription("");

      setDueAt("");

      setAttachFile(null);

      if (fileInputRef.current) fileInputRef.current.value = "";

      setSaved("Draft created.");

      await loadItems();

      router.push(classworkReviewPath(mode, row.id));

    } catch (err) {

      setError(err instanceof Error ? err.message : "Create failed");

    } finally {

      setBusy(false);

    }

  }



  if (loading) {

    return (

      <div className="cw-loading">

        <div className="cw-loading__spinner" aria-hidden />

        <p>Loading your classes…</p>

      </div>

    );

  }



  if (classes.length === 0) {

    return (

      <div className="cw-empty">

        <p className="cw-empty__title">No classes assigned yet</p>

        <p className="cw-empty__sub">

          Ask your admin to set homeroom or subject assignments, then return here

          to post {copy.plural}.

        </p>

      </div>

    );

  }



  return (

    <div className={`cw-page cw-page--${mode === "ASSIGNMENT" ? "assignment" : "worksheet"}`}>

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />



      <header className="cw-hero">

        <div className="cw-hero__main">

          <div className="cw-hero__brand">

            <span className="cw-mode-chip">{copy.modeLabel}</span>

            {mode === "ASSIGNMENT" ? (
              <CwAssignIcon className="cw-mode-icon" />
            ) : (
              <CwSheetIcon className="cw-mode-icon" />
            )}

          </div>

          <h2 className="cw-hero__title">

            {selectedClass?.label ?? "Select a class"}

          </h2>

          <p className="cw-hero__sub">

            {copy.heroSub}

            {selectedClass

              ? ` · ${items.length} ${items.length === 1 ? copy.singular : copy.plural}`

              : ""}

          </p>

        </div>

        <div className="cw-hero__stats">

          <div className="cw-stat">

            <span className="cw-stat__value">{stats.total}</span>

            <span className="cw-stat__label">Total</span>

          </div>

          <div className="cw-stat">

            <span className="cw-stat__value">{stats.published}</span>

            <span className="cw-stat__label">Live</span>

          </div>

          <div className="cw-stat">

            <span className="cw-stat__value">{stats.draft}</span>

            <span className="cw-stat__label">Drafts</span>

          </div>

          {stats.closed > 0 ? (

            <div className="cw-stat">

              <span className="cw-stat__value">{stats.closed}</span>

              <span className="cw-stat__label">Closed</span>

            </div>

          ) : null}

        </div>

      </header>



      <section className="cw-filter">

        <label className="cw-field">

          <span>Class</span>

          <select

            value={classSubjectId}

            onChange={(e) => setClassSubjectId(e.target.value)}

          >

            {classes.map((c) => (

              <option key={c.id} value={c.id}>

                {c.label}

              </option>

            ))}

          </select>

        </label>

      </section>



      <div className="cw-grid">

        <section className="cw-card cw-card--compose">

          <div className="cw-card__head">

            <div>

              <h2 className="cw-card__title">{copy.newTitle}</h2>

              <p className="cw-card__sub">{copy.newSub}</p>

            </div>

            <span className="cw-card__icon" aria-hidden>
              {mode === "ASSIGNMENT" ? <CwAssignIcon /> : <CwSheetIcon />}
            </span>

          </div>

          <form className="cw-form" onSubmit={(e) => void onCreate(e)}>

            <label className="cw-field">

              <span>Title</span>

              <input

                value={title}

                onChange={(e) => setTitle(e.target.value)}

                placeholder={copy.titlePlaceholder}

                required

              />

            </label>

            <label className="cw-field">

              <span>Due date (optional)</span>

              <input

                type="datetime-local"

                value={dueAt}

                onChange={(e) => setDueAt(e.target.value)}

              />

            </label>

            <label className="cw-field">

              <span>Instructions</span>

              <textarea

                rows={4}

                value={description}

                onChange={(e) => setDescription(e.target.value)}

                placeholder={copy.instructionsPlaceholder}

              />

            </label>

            <div className="cw-file">

              <span className="cw-file__label">{copy.fileHint}</span>

              <label className="cw-file__zone">

                <span className="cw-file__icon" aria-hidden>
                  {mode === "ASSIGNMENT" ? <CwAssignIcon /> : <CwSheetIcon />}
                </span>

                <span className="cw-file__text">

                  <strong>

                    {attachFile ? attachFile.name : "Choose a file"}

                  </strong>

                  {attachFile

                    ? `${(attachFile.size / 1024).toFixed(0)} KB`

                    : "or drag and drop here"}

                </span>

                <input

                  ref={fileInputRef}

                  type="file"

                  onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}

                />

              </label>

            </div>

            <button

              type="submit"

              className="cw-btn cw-btn--primary"

              disabled={busy}

            >

              {busy ? "Saving…" : "Save as draft"}

            </button>

          </form>

        </section>



        <section className="cw-card cw-card--inbox">

          <div className="cw-card__head">

            <div>

              <h2 className="cw-card__title">{copy.listTitle}</h2>

              <p className="cw-card__sub">{copy.listSub}</p>

            </div>

            <span className="cw-card__icon" aria-hidden>
              {mode === "ASSIGNMENT" ? <CwAssignIcon /> : <CwSheetIcon />}
            </span>

          </div>

          {items.length === 0 ? (

            <div className="cw-empty" style={{ padding: "1.5rem 1rem" }}>

              <p className="cw-empty__title">{copy.empty}</p>

              <p className="cw-empty__sub">{copy.emptyHint}</p>

            </div>

          ) : (
            <>
              <p className="cw-inbox__hint">
                Open a {copy.singular} to review submissions and grade student work.
              </p>

              <div className="cw-inbox">

              {items.map((row) => {

                const due = formatDue(row.dueAt);

                return (

                  <Link

                    key={row.id}

                    href={classworkReviewPath(mode, row.id)}

                    className="cw-inbox__item"

                  >

                    <div className="cw-inbox__top">

                      <span className="cw-inbox__title">{row.title}</span>

                      <StatusBadge status={row.status} />

                    </div>

                    <span className="cw-inbox__meta">

                      {due ? `Due ${due}` : "No due date"}

                      {row.submissionCount > 0
                        ? ` · ${row.submissionCount} submission${row.submissionCount === 1 ? "" : "s"}`
                        : ""}

                    </span>

                  </Link>

                );

              })}

              </div>
            </>
          )}

        </section>

      </div>

    </div>

  );

}

