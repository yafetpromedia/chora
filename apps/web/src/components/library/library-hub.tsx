"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { UserRole } from "@/lib/auth";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { LibCategoryIcon, LibHubIcon } from "@/components/library/library-icons";
import { LibraryAiAssistant } from "@/components/library/library-ai-assistant";
import {
  createLibraryResource,
  deleteLibraryResource,
  getLibraryHub,
  LIBRARY_AUDIENCE_OPTIONS,
  listLibraryResources,
  LIBRARY_RESOURCE_TYPES,
  publishLibraryResource,
  recordLibraryDownload,
  resolveLibraryAssetUrl,
  toggleLibraryFavorite,
  updateLibraryProgress,
  uploadLibraryFile,
  fetchLibraryAssetObjectUrl,
  openLibraryAsset,
  type LibraryHub,
  type LibraryAudience,
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
  const [coverSrc, setCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let alive = true;
    if (!resource.coverUrl) {
      setCoverSrc(null);
      return;
    }
    void fetchLibraryAssetObjectUrl(resource.coverUrl)
      .then((url) => {
        if (!alive) {
          URL.revokeObjectURL(url);
          return;
        }
        revokedUrl = url;
        setCoverSrc(url);
      })
      .catch(() => setCoverSrc(null));
    return () => {
      alive = false;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [resource.coverUrl]);

  return (
    <article className="lib-resource">
      <div className="lib-resource__cover" aria-hidden>
        {coverSrc ? (
          <img src={coverSrc} alt="" />
        ) : (
          <LibCategoryIcon slug={resource.category.slug} className="lib-resource__placeholder-icon" />
        )}
      </div>
      <div className="lib-resource__body">
        <div className="lib-resource__tags">
          <span className="lib-resource__type">{resource.resourceTypeLabel}</span>
          <span className="lib-resource__audience">
            {resource.audience === "STUDENTS"
              ? "Students"
              : resource.audience === "TEACHERS"
                ? "Teachers"
                : "All"}
          </span>
        </div>
        <h3 className="lib-resource__title">{resource.title}</h3>
        {resource.subject ? (
          <p className="lib-resource__meta">
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
        <div className="lib-resource__actions">
          {resource.fileUrl || resource.externalUrl ? (
            <button
              type="button"
              className="lib-btn lib-btn--primary lib-btn--sm"
              onClick={() => onOpen(resource)}
            >
              Open
            </button>
          ) : null}
          {role === "student" ? (
            <button
              type="button"
              className="lib-btn lib-btn--ghost lib-btn--sm"
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
  const [audience, setAudience] = useState<LibraryAudience>("BOTH");
  const [subject, setSubject] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [author, setAuthor] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const aiResources = useMemo(() => {
    const map = new Map<string, LibraryResource>();
    for (const r of results ?? []) map.set(r.id, r);
    if (hub) {
      for (const r of [...hub.featured, ...hub.recent]) map.set(r.id, r);
      if (hub.shelf) {
        for (const r of [...hub.shelf.favorites, ...hub.shelf.continueReading]) {
          map.set(r.id, r);
        }
      }
    }
    return [...map.values()];
  }, [hub, results]);

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
    setError("");
    try {
      if (role === "student") {
        void updateLibraryProgress(resource.id, {
          progressPercent: Math.min(
            100,
            Math.max(resource.progressPercent ?? 0, 10) + 10,
          ),
        }).catch(() => undefined);
      }

      if (resource.fileUrl) {
        await openLibraryAsset(resource.fileUrl);
        void recordLibraryDownload(resource.id).catch(() => undefined);
        return;
      }

      if (resource.externalUrl) {
        window.open(resource.externalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open resource");
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
      let coverUrl: string | undefined;
      if (file) {
        const up = await uploadLibraryFile(file);
        fileUrl = up.fileUrl;
      }
      if (coverFile) {
        const up = await uploadLibraryFile(coverFile);
        coverUrl = up.fileUrl;
      }
      await createLibraryResource({
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: uploadCategoryId,
        resourceType,
        audience,
        subject: subject.trim() || undefined,
        gradeId: gradeId || undefined,
        author: author.trim() || undefined,
        fileUrl,
        externalUrl: externalUrl.trim() || undefined,
        coverUrl,
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
      setCoverFile(null);
      setAudience("BOTH");
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
  const totalResources =
    hub?.stats?.totalResources ??
    hub?.categories.reduce((sum, c) => sum + c.resourceCount, 0) ??
    0;
  const publishedCount = hub?.stats?.published ?? totalResources;
  const categoryCount = hub?.categories.length ?? 0;

  if (loading && !hub) {
    return (
      <div className="lib-loading">
        <div className="lib-loading__spinner" aria-hidden />
        <p>Loading your library…</p>
      </div>
    );
  }

  return (
    <div className="lib-page">
      <header className="lib-hero">
        <div className="lib-hero__main">
          <div className="lib-hero__brand">
            <span className="lib-hero__chip">Digital hub</span>
            <span className="lib-hero__icon" aria-hidden>
              <LibHubIcon />
            </span>
          </div>
          <h2 className="lib-hero__title">Digital Learning Hub</h2>
          <p className="lib-hero__sub">
            {hub?.tagline ?? "Learn anywhere. Read anytime."}
          </p>
        </div>
        <div className="lib-hero__aside">
          <div className="lib-hero__stats">
            <div className="lib-stat">
              <span className="lib-stat__value">{totalResources}</span>
              <span className="lib-stat__label">Resources</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat__value">{publishedCount}</span>
              <span className="lib-stat__label">Published</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat__value">{categoryCount}</span>
              <span className="lib-stat__label">Categories</span>
            </div>
            {canManage && hub?.stats ? (
              <>
                <div className="lib-stat">
                  <span className="lib-stat__value">{hub.stats.pending}</span>
                  <span className="lib-stat__label">Pending</span>
                </div>
                <div className="lib-stat">
                  <span className="lib-stat__value">{hub.stats.activeReaders}</span>
                  <span className="lib-stat__label">Readers</span>
                </div>
              </>
            ) : null}
          </div>
          {(canUpload || canManage) && (
            <button
              type="button"
              className="lib-btn lib-btn--hero"
              onClick={() => {
                setUploadOpen(true);
                if (hub?.categories[0]) setUploadCategoryId(hub.categories[0].id);
              }}
            >
              + Add resource
            </button>
          )}
        </div>
      </header>

      {error ? <p className="lib-alert lib-alert--error">{error}</p> : null}
      {saved ? <p className="lib-alert lib-alert--ok">{saved}</p> : null}

      <section className="lib-card lib-card--search">
        <div className="lib-card__head">
          <div>
            <h3 className="lib-card__title">Search library</h3>
            <p className="lib-card__sub">Books, notes, exams, videos, and more</p>
          </div>
        </div>
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
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="lib-btn lib-btn--primary">
            Search
          </button>
        </form>
      </section>

      {hub?.categories.length ? (
        <section className="lib-card">
          <div className="lib-card__head">
            <div>
              <h3 className="lib-card__title">Categories</h3>
              <p className="lib-card__sub">Browse by material type</p>
            </div>
          </div>
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
                <span className="lib-cat__icon" aria-hidden>
                  <LibCategoryIcon slug={c.slug} />
                </span>
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
            <section className="lib-card">
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
            <section className="lib-card">
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

      <section className="lib-card">
        <div className="lib-card__head">
          <div>
            <h3 className="lib-card__title">
              {results ? "Search results" : "Recently added"}
            </h3>
            <p className="lib-card__sub">
              {results
                ? `${display.length} match${display.length === 1 ? "" : "es"}`
                : "Latest uploads from your school"}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="lib-loading" style={{ padding: "2rem 1rem" }}>
            <div className="lib-loading__spinner" aria-hidden />
            <p>Loading resources…</p>
          </div>
        ) : display.length === 0 ? (
          <div className="lib-empty">
            <div className="lib-empty__icon" aria-hidden>
              <LibHubIcon />
            </div>
            <p className="lib-empty__title">No resources yet</p>
            <p className="lib-empty__sub">
              {canUpload
                ? "Upload the first book, note, or video for your school."
                : "Check back when your teachers add materials."}
            </p>
            {canUpload ? (
              <button
                type="button"
                className="lib-btn lib-btn--primary"
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
                  <div className="lib-resource__admin">
                    <span className="lib-badge lib-badge--pending">Pending</span>
                    <button
                      type="button"
                      className="lib-btn lib-btn--ghost lib-btn--sm"
                      disabled={busy}
                      onClick={() => void onApprove(r.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="lib-btn lib-btn--ghost lib-btn--sm"
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

      <LibraryAiAssistant resources={aiResources} />

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
                Availability
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as LibraryAudience)}
                >
                  {LIBRARY_AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
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
                Cover image (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
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
                <button type="submit" className="lib-btn lib-btn--primary" disabled={busy}>
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
