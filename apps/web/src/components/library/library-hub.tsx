"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import {
  createLibraryResource,
  deleteLibraryResource,
  getLibraryHub,
  listLibraryResources,
  LIBRARY_RESOURCE_TYPES,
  publishLibraryResource,
  recordLibraryDownload,
  resolveLibraryAssetUrl,
  toggleLibraryFavorite,
  updateLibraryProgress,
  uploadLibraryFile,
  type LibraryHub,
  type LibraryResource,
  type LibraryResourceType,
} from "@/lib/library";

type Props = {
  role: UserRole;
  canManage?: boolean;
  canUpload?: boolean;
};

function ResourceCard({
  resource,
  role,
  onOpen,
  onSave,
}: {
  resource: LibraryResource;
  role: UserRole;
  onOpen: (r: LibraryResource) => void;
  onSave: (r: LibraryResource) => void;
}) {
  const href =
    resolveLibraryAssetUrl(resource.fileUrl) ??
    resource.externalUrl ??
    `#resource-${resource.id}`;

  return (
    <article className="lib-card">
      <div className="lib-card__cover" aria-hidden>
        {resource.coverUrl ? (
          <img src={resolveLibraryAssetUrl(resource.coverUrl) ?? ""} alt="" />
        ) : (
          <span>{resource.category.icon ?? "📖"}</span>
        )}
      </div>
      <div className="lib-card__body">
        <span className="lib-card__type">{resource.resourceTypeLabel}</span>
        <h3 className="lib-card__title">{resource.title}</h3>
        {resource.subject ? (
          <p className="lib-card__meta">
            {resource.subject}
            {resource.grade ? ` · ${resource.grade.name}` : ""}
          </p>
        ) : null}
        {resource.progressPercent != null && resource.progressPercent > 0 ? (
          <div className="lib-progress">
            <div
              className="lib-progress__bar"
              style={{ width: `${resource.progressPercent}%` }}
            />
          </div>
        ) : null}
        <div className="lib-card__actions">
          {resource.fileUrl || resource.externalUrl ? (
            <a
              href={href}
              className="att-btn att-btn--primary"
              target={resource.externalUrl ? "_blank" : undefined}
              rel="noreferrer"
              onClick={() => onOpen(resource)}
            >
              Open
            </a>
          ) : null}
          {role === "student" ? (
            <button
              type="button"
              className="att-btn att-btn--ghost"
              onClick={() => void onSave(resource)}
            >
              {resource.favorited ? "Saved" : "Save"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function LibraryHubView({ role, canManage, canUpload }: Props) {
  const [hub, setHub] = useState<LibraryHub | null>(null);
  const [results, setResults] = useState<LibraryResource[] | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState("");
  const [resourceType, setResourceType] = useState<LibraryResourceType>("BOOK_PDF");
  const [subject, setSubject] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [author, setAuthor] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadHub = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setHub(await getLibraryHub());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHub();
    if (canManage || canUpload) {
      void listGrades().then(setGrades).catch(() => undefined);
    }
  }, [loadHub, canManage, canUpload]);

  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    try {
      const rows = await listLibraryResources({
        q: search.trim() || undefined,
        categoryId: categoryId || undefined,
        status: canManage ? undefined : "PUBLISHED",
        limit: 48,
      });
      setResults(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }

  async function handleSave(resource: LibraryResource) {
    try {
      const res = await toggleLibraryFavorite(resource.id);
      setSaved(res.favorited ? "Added to saved books." : "Removed from saved.");
      await loadHub();
      if (results) await runSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update saved list");
    }
  }

  async function handleOpen(resource: LibraryResource) {
    if (role === "student") {
      void updateLibraryProgress(resource.id, {
        progressPercent: Math.min(
          100,
          Math.max(resource.progressPercent ?? 0, 10) + 10,
        ),
      }).catch(() => undefined);
    }
    if (resource.fileUrl) {
      void recordLibraryDownload(resource.id).catch(() => undefined);
    }
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadCategoryId || !title.trim()) {
      setError("Title and category are required.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      let fileUrl: string | undefined;
      if (file) {
        const up = await uploadLibraryFile(file);
        fileUrl = up.fileUrl;
      }
      await createLibraryResource({
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: uploadCategoryId,
        resourceType,
        subject: subject.trim() || undefined,
        gradeId: gradeId || undefined,
        author: author.trim() || undefined,
        fileUrl,
        externalUrl: externalUrl.trim() || undefined,
      });
      setSaved(
        role === "teacher"
          ? "Uploaded — waiting for admin approval."
          : "Resource published to the library.",
      );
      setUploadOpen(false);
      setTitle("");
      setDescription("");
      setFile(null);
      setExternalUrl("");
      await loadHub();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(id: string) {
    setBusy(true);
    try {
      await publishLibraryResource(id);
      setSaved("Resource published.");
      await loadHub();
      if (results) await runSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  const display = results ?? hub?.recent ?? [];

  return (
    <div className="lib-page">
      <header className="lib-hero">
        <div>
          <p className="lib-hero__eyebrow">CampusOne eLibrary</p>
          <h1 className="lib-hero__title">Digital Learning Hub</h1>
          <p className="lib-hero__tagline">
            {hub?.tagline ?? "Learn anywhere. Read anytime."}
          </p>
        </div>
        {(canUpload || canManage) && (
          <button
            type="button"
            className="att-btn att-btn--primary"
            onClick={() => {
              setUploadOpen(true);
              if (hub?.categories[0]) setUploadCategoryId(hub.categories[0].id);
            }}
          >
            + Add resource
          </button>
        )}
      </header>

      {error ? <p className="att-toast att-toast--error">{error}</p> : null}
      {saved ? <p className="att-toast">{saved}</p> : null}

      {canManage && hub?.stats ? (
        <section className="lib-stats">
          <div className="lib-stat">
            <strong>{hub.stats.totalResources}</strong>
            <span>Resources</span>
          </div>
          <div className="lib-stat">
            <strong>{hub.stats.published}</strong>
            <span>Published</span>
          </div>
          <div className="lib-stat">
            <strong>{hub.stats.pending}</strong>
            <span>Pending</span>
          </div>
          <div className="lib-stat">
            <strong>{hub.stats.activeReaders}</strong>
            <span>Active readers</span>
          </div>
        </section>
      ) : null}

      <form className="lib-search" onSubmit={(e) => void runSearch(e)}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books, notes, exams, subjects…"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {hub?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="att-btn att-btn--primary">
          Search
        </button>
      </form>

      {hub?.categories.length ? (
        <section className="lib-categories">
          <h2 className="lib-section-title">Categories</h2>
          <div className="lib-cat-grid">
            {hub.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`lib-cat${categoryId === c.id ? " lib-cat--active" : ""}`}
                onClick={() => {
                  setCategoryId(c.id);
                  void listLibraryResources({
                    categoryId: c.id,
                    status: canManage ? undefined : "PUBLISHED",
                  }).then(setResults);
                }}
              >
                <span className="lib-cat__icon">{c.icon ?? "📁"}</span>
                <span className="lib-cat__name">{c.name}</span>
                <span className="lib-cat__count">{c.resourceCount}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {role === "student" && hub?.shelf ? (
        <>
          {hub.shelf.continueReading.length > 0 ? (
            <section className="lib-section">
              <h2 className="lib-section-title">Continue reading</h2>
              <div className="lib-grid">
                {hub.shelf.continueReading.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    role={role}
                    onOpen={handleOpen}
                    onSave={handleSave}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {hub.shelf.favorites.length > 0 ? (
            <section className="lib-section">
              <h2 className="lib-section-title">Saved books</h2>
              <div className="lib-grid">
                {hub.shelf.favorites.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    role={role}
                    onOpen={handleOpen}
                    onSave={handleSave}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {hub?.featured.length && !results ? (
        <section className="lib-section">
          <h2 className="lib-section-title">Featured</h2>
          <div className="lib-grid">
            {hub.featured.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                role={role}
                onOpen={handleOpen}
                onSave={handleSave}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="lib-section">
        <h2 className="lib-section-title">
          {results ? "Search results" : "Recently added"}
        </h2>
        {loading ? (
          <p className="tch-meta">Loading…</p>
        ) : display.length === 0 ? (
          <div className="tch-empty">
            <p>No resources yet.</p>
            {canUpload ? (
              <button
                type="button"
                className="att-btn att-btn--primary"
                onClick={() => setUploadOpen(true)}
              >
                Upload the first one
              </button>
            ) : null}
          </div>
        ) : (
          <div className="lib-grid">
            {display.map((r) => (
              <div key={r.id} className="lib-card-wrap">
                <ResourceCard
                  resource={r}
                  role={role}
                  onOpen={handleOpen}
                  onSave={handleSave}
                />
                {canManage && r.status === "PENDING" ? (
                  <div className="lib-card__admin">
                    <span className="lib-badge lib-badge--pending">Pending approval</span>
                    <button
                      type="button"
                      className="att-btn att-btn--ghost"
                      disabled={busy}
                      onClick={() => void onApprove(r.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="att-btn att-btn--ghost"
                      disabled={busy}
                      onClick={() =>
                        void deleteLibraryResource(r.id).then(() => loadHub())
                      }
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="lib-ai-teaser">
        <h2 className="lib-section-title">AI study assistant</h2>
        <p className="tch-meta">
          Coming soon — summarize chapters, generate quizzes, and translate lessons to
          Amharic from your school library.
        </p>
      </section>

      {uploadOpen ? (
        <div
          className="stu-drawer-backdrop"
          role="presentation"
          onClick={() => setUploadOpen(false)}
        >
          <aside
            className="stu-drawer stu-drawer--wide"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Add resource"
          >
            <header className="stu-drawer__head">
              <h2 className="stu-drawer__title">Add to eLibrary</h2>
              <button
                type="button"
                className="stu-drawer__close"
                onClick={() => setUploadOpen(false)}
              >
                ×
              </button>
            </header>
            <form className="stu-drawer__body tch-drawer" onSubmit={(e) => void onUpload(e)}>
              <label>
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>
              <label>
                Category
                <select
                  value={uploadCategoryId}
                  onChange={(e) => setUploadCategoryId(e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  {hub?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Type
                <select
                  value={resourceType}
                  onChange={(e) =>
                    setResourceType(e.target.value as LibraryResourceType)
                  }
                >
                  {LIBRARY_RESOURCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Subject
                <input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <label>
                Grade
                <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">All grades</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Author
                <input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </label>
              <label>
                Video / external link
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label>
                File (PDF, DOCX, EPUB…)
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </label>
              <footer className="tch-drawer__foot">
                <button type="submit" className="att-btn att-btn--primary" disabled={busy}>
                  {busy ? "Saving…" : "Publish"}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
