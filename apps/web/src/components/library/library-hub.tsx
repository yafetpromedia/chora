"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { UserRole } from "@/lib/auth";
import { listGrades } from "@/lib/school-setup";
import type { GradeWithSections } from "@/lib/api";
import { LibCategoryIcon, LibHubIcon } from "@/components/library/library-icons";
import { LibraryAiAssistant } from "@/components/library/library-ai-assistant";
import { StudentSectionBanner } from "@/components/student/student-section-banner";
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
  type LibraryHub,
  type LibraryAudience,
  type LibraryResource,
  type LibraryResourceType,
} from "@/lib/library";
import { AppToast } from "@/components/ui/app-toast";
import { subjectCompactLabel } from "@/lib/subject-label";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  role: UserRole;
  canManage?: boolean;
  canUpload?: boolean;
  /** Portal section — driven by sidebar navigation routes. */
  librarySection?: LibrarySection;
  /** @deprecated Use librarySection */
  studentSection?: LibrarySection;
};

export type LibrarySection = "main" | "progress" | "ai";
export type StudentLibrarySection = LibrarySection;

function ResourceCard({
  resource,
  role,
  onOpen,
  onSave,
  isNew,
}: {
  resource: LibraryResource;
  role: UserRole;
  onOpen: (r: LibraryResource) => void;
  onSave: (r: LibraryResource) => void;
  isNew?: boolean;
}) {
  const { t } = useLocale();
  const [coverSrc, setCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let alive = true;
    if (!resource.coverUrl) return;
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
        {isNew ? (
          <span className="lib-resource__badge lib-badge lib-badge--new">
            {t("libraryUi.badgeNew")}
          </span>
        ) : null}
        {resource.coverUrl && coverSrc ? (
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
              ? t("libraryUi.audienceStudents")
              : resource.audience === "TEACHERS"
                ? t("libraryUi.audienceTeachers")
                : t("libraryUi.audienceAll")}
          </span>
        </div>
        <h3 className="lib-resource__title">{resource.title}</h3>
        {resource.subject ? (
          <p className="lib-resource__meta">
            {subjectCompactLabel({ name: resource.subject })}
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
              {t("libraryUi.open")}
            </button>
          ) : null}
          {role === "student" ? (
            <button
              type="button"
              className="lib-btn lib-btn--ghost lib-btn--sm"
              onClick={() => void onSave(resource)}
            >
              {resource.favorited ? t("libraryUi.saved") : t("common.save")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function LibraryHubView({
  role,
  canManage,
  canUpload,
  librarySection,
  studentSection = "main",
}: Props) {
  const { t } = useLocale();
  const section = librarySection ?? studentSection;
  const [hub, setHub] = useState<LibraryHub | null>(null);
  const [results, setResults] = useState<LibraryResource[] | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    resource: LibraryResource;
    objectUrl: string;
  } | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
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

  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const useSectionNav = isStudent || isTeacher;
  const browsePath = isTeacher ? "/teacher/library" : "/student/library";
  const showMain = !useSectionNav || section === "main";
  const showProgress = useSectionNav && section === "progress";
  const showAi = useSectionNav && section === "ai";

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
      setError(err instanceof Error ? err.message : t("libraryUi.errLoad"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setHub(await getLibraryHub());
      } catch (err) {
        setError(err instanceof Error ? err.message : t("libraryUi.errLoad"));
      } finally {
        setLoading(false);
      }
    })();
  }, [canManage, canUpload]);

  useEffect(() => {
    if (canManage || canUpload) {
      void listGrades().then(setGrades).catch(() => undefined);
    }
  }, [canManage, canUpload]);

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
      setError(err instanceof Error ? err.message : t("libraryUi.errSearch"));
    }
  }

  async function handleSave(resource: LibraryResource) {
    try {
      const res = await toggleLibraryFavorite(resource.id);
      setSaved(
        res.favorited
          ? t("libraryUi.toastAddedSaved")
          : t("libraryUi.toastRemovedSaved"),
      );
      await loadHub();
      if (results) await runSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("libraryUi.errSavedList"));
    }
  }

  function closeViewer() {
    if (viewer?.objectUrl) URL.revokeObjectURL(viewer.objectUrl);
    setViewer(null);
  }

  useEffect(() => {
    if (!viewer && !viewerLoading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewer, viewerLoading]);

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
        setViewerLoading(true);
        try {
          const objectUrl = await fetchLibraryAssetObjectUrl(resource.fileUrl);
          setViewer((prev) => {
            if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
            return { resource, objectUrl };
          });
          void recordLibraryDownload(resource.id).catch(() => undefined);
        } finally {
          setViewerLoading(false);
        }
        return;
      }

      if (resource.externalUrl) {
        window.open(resource.externalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("libraryUi.errOpen"));
      setViewerLoading(false);
    }
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadCategoryId || !title.trim()) {
      setError(t("libraryUi.errTitleCategory"));
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
          ? t("libraryUi.toastUploadedPending")
          : t("libraryUi.toastPublished"),
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
      setError(err instanceof Error ? err.message : t("libraryUi.errUpload"));
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(id: string) {
    setBusy(true);
    try {
      await publishLibraryResource(id);
      setSaved(t("libraryUi.toastApproved"));
      await loadHub();
      if (results) await runSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("libraryUi.errApprove"));
    } finally {
      setBusy(false);
    }
  }

  const newResourceIds = useMemo(
    () => new Set(hub?.recent.map((r) => r.id) ?? []),
    [hub?.recent],
  );
  const featuredIds = useMemo(
    () => new Set(hub?.featured.map((r) => r.id) ?? []),
    [hub?.featured],
  );
  const recentWithoutFeatured = useMemo(
    () => (hub?.recent ?? []).filter((r) => !featuredIds.has(r.id)),
    [hub?.recent, featuredIds],
  );
  const isAdminLibrary = !useSectionNav;
  const display =
    results ?? (isAdminLibrary ? recentWithoutFeatured : hub?.recent) ?? [];
  const sectionBrowseItems = useMemo(() => {
    if (!hub || results || !useSectionNav || section !== "main") return [];
    const map = new Map<string, LibraryResource>();
    for (const r of hub.recent) map.set(r.id, r);
    for (const r of hub.featured) {
      if (!map.has(r.id)) map.set(r.id, r);
    }
    return [...map.values()];
  }, [hub, results, useSectionNav, section]);
  const showBrowseList = showMain && useSectionNav && !results;
  const showResourceList =
    showMain && (useSectionNav ? !!results : !!results || display.length > 0);
  const showHero = canManage || !useSectionNav || section === "main";
  const totalResources =
    hub?.stats?.totalResources ??
    hub?.categories.reduce((sum, c) => sum + c.resourceCount, 0) ??
    0;
  const publishedCount = hub?.stats?.published ?? totalResources;
  const categoryCount = hub?.categories.length ?? 0;

  if (loading && !hub) {
    return isTeacher ? (
      <div className="tch-day tch-lib">
        <p className="tch-day__loading">{t("libraryUi.loadingLibrary")}</p>
      </div>
    ) : (
      <div className="lib-loading">
        <div className="lib-loading__spinner" aria-hidden />
        <p>{t("libraryUi.loadingLibrary")}</p>
      </div>
    );
  }

  const teacherHeroStats = (
    <>
      <div className="tch-day__stat">
        <strong>{totalResources}</strong>
        <span>{t("libraryUi.statResources")}</span>
      </div>
      <div className="tch-day__stat">
        <strong>{publishedCount}</strong>
        <span>{t("libraryUi.statPublished")}</span>
      </div>
      <div className="tch-day__stat">
        <strong>{categoryCount}</strong>
        <span>{t("libraryUi.statCategories")}</span>
      </div>
      {hub?.contributions ? (
        <div
          className={`tch-day__stat${(hub.contributions.pending.length ?? 0) > 0 ? " tch-day__stat--warn" : ""}`}
        >
          <strong>{hub.contributions.pending.length}</strong>
          <span>{t("libraryUi.statMyPending")}</span>
        </div>
      ) : null}
    </>
  );

  const uploadHeroBtn =
    (canUpload || canManage) && showHero ? (
      <button
        type="button"
        className="lib-btn lib-btn--hero tch-lib__upload"
        onClick={() => {
          setUploadOpen(true);
          if (hub?.categories[0]) setUploadCategoryId(hub.categories[0].id);
        }}
      >
        {t("libraryUi.addResource")}
      </button>
    ) : null;

  return (
    <div
      className={`lib-page${isTeacher ? " tch-day tch-lib" : ""}${useSectionNav && section === "ai" ? " lib-page--ai" : ""}${useSectionNav && section === "progress" ? " lib-page--progress" : ""}`}
    >
      {showHero ? (
        isTeacher ? (
          <header className="tch-day__hero tch-lib__hero">
            <div className="tch-day__hero-main">
              <div className="tch-day__brand">
                <span className="tch-day__chip">{t("libraryUi.chipDigitalHub")}</span>
                <span className="tch-day__icon" aria-hidden>
                  <LibHubIcon />
                </span>
              </div>
              <h2 className="tch-day__title">{t("libraryUi.hubTitle")}</h2>
              <p className="tch-day__sub">
                {hub?.tagline ?? t("libraryUi.taglineTeacher")}
              </p>
              {uploadHeroBtn}
            </div>
            <div className="tch-day__stats" aria-label={t("libraryUi.ariaLibrarySummary")}>
              {teacherHeroStats}
            </div>
          </header>
        ) : (
          <header className="lib-hero lib-hero--day">
            <div className="lib-hero__main">
              <div className="lib-hero__brand">
                <span className="lib-hero__chip">{t("libraryUi.chipDigitalHub")}</span>
                <span className="lib-hero__icon" aria-hidden>
                  <LibHubIcon />
                </span>
              </div>
              <h2 className="lib-hero__title">{t("libraryUi.hubTitle")}</h2>
              <p className="lib-hero__sub">
                {hub?.tagline ?? t("libraryUi.taglineStudent")}
              </p>
            </div>
            <div className="lib-hero__aside">
              <div className="lib-hero__stats">
                <div className="lib-stat">
                  <span className="lib-stat__value">{totalResources}</span>
                  <span className="lib-stat__label">{t("libraryUi.statResources")}</span>
                </div>
                <div className="lib-stat">
                  <span className="lib-stat__value">{publishedCount}</span>
                  <span className="lib-stat__label">{t("libraryUi.statPublished")}</span>
                </div>
                <div className="lib-stat">
                  <span className="lib-stat__value">{categoryCount}</span>
                  <span className="lib-stat__label">{t("libraryUi.statCategories")}</span>
                </div>
                {canManage && hub?.stats ? (
                  <>
                    <div className="lib-stat">
                      <span className="lib-stat__value">{hub.stats.pending}</span>
                      <span className="lib-stat__label">{t("libraryUi.statPending")}</span>
                    </div>
                    <div className="lib-stat">
                      <span className="lib-stat__value">{hub.stats.activeReaders}</span>
                      <span className="lib-stat__label">{t("libraryUi.statReaders")}</span>
                    </div>
                  </>
                ) : null}
              </div>
              {uploadHeroBtn}
            </div>
          </header>
        )
      ) : null}

      {showProgress && isStudent ? (
        <StudentSectionBanner
          tone="progress"
          eyebrow={t("libraryUi.eyebrowYourShelf")}
          title={t("libraryUi.progressTitle")}
          subtitle={t("libraryUi.progressSub")}
          icon={<DashIcon name="library" className="dash-icon--sm" />}
          stats={[
            {
              value: hub?.shelf?.continueReading.length ?? 0,
              label: t("libraryUi.statInProgress"),
            },
            {
              value: hub?.shelf?.favorites.length ?? 0,
              label: t("libraryUi.saved"),
            },
          ]}
        />
      ) : null}

      {showProgress && isTeacher ? (
        <header className="tch-day__hero tch-lib__hero">
          <div className="tch-day__hero-main">
            <div className="tch-day__brand">
              <span className="tch-day__chip">{t("libraryUi.chipMyUploads")}</span>
              <span className="tch-day__icon" aria-hidden>
                <DashIcon name="upload" className="dash-icon--sm" />
              </span>
            </div>
            <h2 className="tch-day__title">{t("libraryUi.uploadProgressTitle")}</h2>
            <p className="tch-day__sub">{t("libraryUi.uploadProgressSub")}</p>
            {canUpload ? (
              <button
                type="button"
                className="lib-btn lib-btn--hero tch-lib__upload"
                onClick={() => {
                  setUploadOpen(true);
                  if (hub?.categories[0]) setUploadCategoryId(hub.categories[0].id);
                }}
              >
                {t("libraryUi.addResource")}
              </button>
            ) : null}
          </div>
          <div className="tch-day__stats" aria-label={t("libraryUi.ariaUploadSummary")}>
            <div
              className={`tch-day__stat${(hub?.contributions?.pending.length ?? 0) > 0 ? " tch-day__stat--warn" : ""}`}
            >
              <strong>{hub?.contributions?.pending.length ?? 0}</strong>
              <span>{t("libraryUi.statPending")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>{hub?.contributions?.published.length ?? 0}</strong>
              <span>{t("libraryUi.statPublished")}</span>
            </div>
          </div>
        </header>
      ) : null}

      {showAi && isStudent ? (
        <StudentSectionBanner
          tone="ai"
          eyebrow={t("libraryUi.eyebrowStudyTools")}
          title={t("libraryUi.aiTitle")}
          subtitle={t("libraryUi.aiSubStudent")}
          icon={<DashIcon name="sparkle" className="dash-icon--sm" />}
          stats={[
            { value: aiResources.length, label: t("libraryUi.statResources") },
            { value: 3, label: t("libraryUi.statTools") },
          ]}
        />
      ) : null}

      {showAi && isTeacher ? (
        <header className="tch-day__hero tch-lib__hero">
          <div className="tch-day__hero-main">
            <div className="tch-day__brand">
              <span className="tch-day__chip">{t("libraryUi.chipTeachingTools")}</span>
              <span className="tch-day__icon" aria-hidden>
                <DashIcon name="sparkle" className="dash-icon--sm" />
              </span>
            </div>
            <h2 className="tch-day__title">{t("libraryUi.aiTitle")}</h2>
            <p className="tch-day__sub">{t("libraryUi.aiSubTeacher")}</p>
          </div>
          <div className="tch-day__stats" aria-label={t("libraryUi.ariaAiSummary")}>
            <div className="tch-day__stat">
              <strong>{aiResources.length}</strong>
              <span>{t("libraryUi.statResources")}</span>
            </div>
            <div className="tch-day__stat">
              <strong>3</strong>
              <span>{t("libraryUi.statTools")}</span>
            </div>
          </div>
        </header>
      ) : null}

      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={saved} tone="success" onDismiss={() => setSaved("")} />

      {showMain ? (
      <section className="lib-card lib-card--search">
        <div className="lib-card__head">
          <div>
            <h3 className="lib-card__title">{t("libraryUi.searchTitle")}</h3>
            <p className="lib-card__sub">{t("libraryUi.searchSub")}</p>
          </div>
        </div>
        <form className="lib-search" onSubmit={(e) => void runSearch(e)}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("libraryUi.searchPlaceholder")}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label={t("libraryUi.ariaCategory")}
          >
            <option value="">{t("libraryUi.allCategories")}</option>
            {hub?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="lib-btn lib-btn--primary">
            {t("common.search")}
          </button>
        </form>
      </section>
      ) : null}

      {showMain && hub?.categories.length ? (
        <section className="lib-card">
          <div className="lib-card__head">
            <div>
              <h3 className="lib-card__title">{t("libraryUi.categoriesTitle")}</h3>
              <p className="lib-card__sub">{t("libraryUi.categoriesSub")}</p>
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

      {showProgress && isStudent && hub?.shelf ? (
        <>
          <section className="lib-card">
            <div className="lib-card__head">
              <div>
                <h3 className="lib-card__title">{t("libraryUi.continueReadingTitle")}</h3>
                <p className="lib-card__sub">{t("libraryUi.continueReadingSub")}</p>
              </div>
            </div>
            {hub.shelf.continueReading.length > 0 ? (
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
            ) : (
              <div className="lib-empty lib-empty--compact">
                <p className="lib-empty__title">{t("libraryUi.nothingInProgressTitle")}</p>
                <p className="lib-empty__sub">{t("libraryUi.nothingInProgressSub")}</p>
                <Link href={browsePath} className="lib-btn lib-btn--primary">
                  {t("libraryUi.browseLibrary")}
                </Link>
              </div>
            )}
          </section>

          <section className="lib-card">
            <div className="lib-card__head">
              <div>
                <h3 className="lib-card__title">{t("libraryUi.savedBooksTitle")}</h3>
                <p className="lib-card__sub">{t("libraryUi.savedBooksSub")}</p>
              </div>
            </div>
            {hub.shelf.favorites.length > 0 ? (
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
            ) : (
              <div className="lib-empty lib-empty--compact">
                <p className="lib-empty__title">{t("libraryUi.noSavedTitle")}</p>
                <p className="lib-empty__sub">{t("libraryUi.noSavedSub")}</p>
              </div>
            )}
          </section>
        </>
      ) : null}

      {showProgress && isTeacher ? (
        <>
          <section className="lib-card">
            <div className="lib-card__head">
              <div>
                <h3 className="lib-card__title">{t("libraryUi.awaitingTitle")}</h3>
                <p className="lib-card__sub">{t("libraryUi.awaitingSub")}</p>
              </div>
            </div>
            {(hub?.contributions?.pending.length ?? 0) > 0 ? (
              <div className="lib-grid">
                {hub!.contributions!.pending.map((r) => (
                  <div key={r.id} className="lib-card-wrap">
                    <ResourceCard
                      resource={r}
                      role={role}
                      onOpen={handleOpen}
                      onSave={handleSave}
                    />
                    <div className="lib-resource__admin">
                      <span className="lib-badge lib-badge--pending">
                        {t("libraryUi.statPending")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : isTeacher ? (
              <div className="tch-day__empty tch-day__empty--inline">
                <div className="tch-day__empty-icon" aria-hidden>
                  <DashIcon name="upload" />
                </div>
                <h2>{t("libraryUi.nothingWaitingTitle")}</h2>
                <p>{t("libraryUi.nothingWaitingSub")}</p>
                {canUpload ? (
                  <Link href={browsePath} className="tch-day__empty-btn">
                    {t("libraryUi.addResourceLink")}
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="lib-empty lib-empty--compact">
                <p className="lib-empty__title">{t("libraryUi.nothingWaitingTitle")}</p>
                <p className="lib-empty__sub">{t("libraryUi.nothingWaitingSub")}</p>
                {canUpload ? (
                  <Link href={browsePath} className="lib-btn lib-btn--primary">
                    {t("libraryUi.addResourceLink")}
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          <section className="lib-card">
            <div className="lib-card__head">
              <div>
                <h3 className="lib-card__title">{t("libraryUi.publishedByYouTitle")}</h3>
                <p className="lib-card__sub">{t("libraryUi.publishedByYouSub")}</p>
              </div>
            </div>
            {(hub?.contributions?.published.length ?? 0) > 0 ? (
              <div className="lib-grid">
                {hub!.contributions!.published.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    role={role}
                    onOpen={handleOpen}
                    onSave={handleSave}
                  />
                ))}
              </div>
            ) : (
              <div className="lib-empty lib-empty--compact">
                <p className="lib-empty__title">{t("libraryUi.noPublishedUploadsTitle")}</p>
                <p className="lib-empty__sub">{t("libraryUi.noPublishedUploadsSub")}</p>
              </div>
            )}
          </section>
        </>
      ) : null}

      {showMain && !useSectionNav && hub?.featured.length && !results ? (
        <section className="lib-section">
          <h2 className="lib-section-title">{t("libraryUi.featured")}</h2>
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

      {showBrowseList ? (
        sectionBrowseItems.length > 0 ? (
          <section className="lib-section">
            <div className="lib-grid">
              {sectionBrowseItems.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  role={role}
                  onOpen={handleOpen}
                  onSave={handleSave}
                  isNew={newResourceIds.has(r.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="lib-empty">
            <div className="lib-empty__icon" aria-hidden>
              <LibHubIcon />
            </div>
            <p className="lib-empty__title">{t("libraryUi.noResourcesTitle")}</p>
            <p className="lib-empty__sub">
              {isTeacher && canUpload
                ? t("libraryUi.emptyTeacherUpload")
                : isTeacher
                  ? t("libraryUi.emptyTeacherWait")
                  : t("libraryUi.emptyStudentWait")}
            </p>
            {isTeacher && canUpload ? (
              <button
                type="button"
                className="lib-btn lib-btn--primary"
                onClick={() => setUploadOpen(true)}
              >
                {t("libraryUi.uploadFirst")}
              </button>
            ) : null}
          </div>
        )
      ) : null}

      {showResourceList ? (
      <section className="lib-card">
        <div className="lib-card__head">
          <div>
            <h3 className="lib-card__title">
              {results ? t("libraryUi.searchResults") : t("libraryUi.recentlyAdded")}
            </h3>
            <p className="lib-card__sub">
              {results
                ? display.length === 1
                  ? t("libraryUi.matches", { count: display.length })
                  : t("libraryUi.matchesPlural", { count: display.length })
                : t("libraryUi.latestUploads")}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="lib-loading" style={{ padding: "2rem 1rem" }}>
            <div className="lib-loading__spinner" aria-hidden />
            <p>{t("libraryUi.loadingResources")}</p>
          </div>
        ) : display.length === 0 ? (
          <div className="lib-empty">
            <div className="lib-empty__icon" aria-hidden>
              <LibHubIcon />
            </div>
            <p className="lib-empty__title">{t("libraryUi.noResourcesTitle")}</p>
            <p className="lib-empty__sub">
              {canUpload
                ? t("libraryUi.emptyTeacherUpload")
                : t("libraryUi.emptyStudentWait")}
            </p>
            {canUpload ? (
              <button
                type="button"
                className="lib-btn lib-btn--primary"
                onClick={() => setUploadOpen(true)}
              >
                {t("libraryUi.uploadFirst")}
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
                    <span className="lib-badge lib-badge--pending">
                      {t("libraryUi.statPending")}
                    </span>
                    <button
                      type="button"
                      className="lib-btn lib-btn--ghost lib-btn--sm"
                      disabled={busy}
                      onClick={() => void onApprove(r.id)}
                    >
                      {t("libraryUi.approve")}
                    </button>
                    <button
                      type="button"
                      className="lib-btn lib-btn--ghost lib-btn--sm"
                      disabled={busy}
                      onClick={() =>
                        void deleteLibraryResource(r.id).then(() => loadHub())
                      }
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
      ) : null}

      {showAi ? (
        <LibraryAiAssistant resources={aiResources} focus={useSectionNav} hideHead={useSectionNav} />
      ) : null}

      {typeof document !== "undefined" && viewerLoading
        ? createPortal(
            <div className="lib-viewer-loading" role="status">
              <span className="lib-viewer-loading__spinner" aria-hidden />
              <p>{t("libraryUi.opening")}</p>
            </div>,
            document.body,
          )
        : null}

      {typeof document !== "undefined" && viewer
        ? createPortal(
            <div
              className="lib-viewer"
              role="dialog"
              aria-modal="true"
              aria-label={viewer.resource.title}
            >
              <header className="lib-viewer__bar">
                <div className="lib-viewer__meta">
                  <h2 className="lib-viewer__title">{viewer.resource.title}</h2>
                  <p className="lib-viewer__sub">
                    {[viewer.resource.subject, viewer.resource.grade?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="lib-viewer__actions">
                  <a className="lib-btn lib-btn--ghost" href={viewer.objectUrl} download>
                    {t("libraryUi.download")}
                  </a>
                  <button
                    type="button"
                    className="lib-btn lib-btn--primary"
                    onClick={closeViewer}
                  >
                    {t("common.close")}
                  </button>
                </div>
              </header>
              <div className="lib-viewer__body">
                {viewer.resource.resourceType === "VIDEO" ? (
                  <video
                    className="lib-viewer__media"
                    src={viewer.objectUrl}
                    controls
                    autoPlay
                  />
                ) : viewer.resource.resourceType === "AUDIO" ? (
                  <audio
                    className="lib-viewer__media lib-viewer__media--audio"
                    src={viewer.objectUrl}
                    controls
                    autoPlay
                  />
                ) : (
                  <iframe
                    className="lib-viewer__frame"
                    title={viewer.resource.title}
                    src={`${viewer.objectUrl}#view=FitH`}
                  />
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

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
            aria-label={t("libraryUi.ariaAddResource")}
          >
            <header className="stu-drawer__head">
              <h2 className="stu-drawer__title">{t("libraryUi.drawerTitle")}</h2>
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
                {t("libraryUi.labelTitle")}
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>
              <label>
                {t("libraryUi.labelCategory")}
                <select
                  value={uploadCategoryId}
                  onChange={(e) => setUploadCategoryId(e.target.value)}
                  required
                >
                  <option value="">{t("libraryUi.select")}</option>
                  {hub?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("libraryUi.labelType")}
                <select
                  value={resourceType}
                  onChange={(e) =>
                    setResourceType(e.target.value as LibraryResourceType)
                  }
                >
                  {LIBRARY_RESOURCE_TYPES.map((typeOpt) => (
                    <option key={typeOpt.value} value={typeOpt.value}>
                      {typeOpt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("libraryUi.labelAvailability")}
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
                {t("libraryUi.labelSubject")}
                <input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <label>
                {t("libraryUi.labelGrade")}
                <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">{t("libraryUi.allGrades")}</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("libraryUi.labelAuthor")}
                <input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </label>
              <label>
                {t("libraryUi.labelExternal")}
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label>
                {t("libraryUi.labelFile")}
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label>
                {t("libraryUi.labelCover")}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label>
                {t("libraryUi.labelDescription")}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </label>
              <footer className="tch-drawer__foot">
                <button type="submit" className="lib-btn lib-btn--primary" disabled={busy}>
                  {busy ? t("common.saving") : t("libraryUi.publish")}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
