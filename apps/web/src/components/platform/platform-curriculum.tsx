"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { AppToast } from "@/components/ui/app-toast";
import { LIBRARY_RESOURCE_TYPES } from "@/lib/library";
import {
  PLATFORM_TOKEN_KEY,
  handlePlatformAuthFailure,
  platformFetch,
  platformUpload,
} from "@/lib/platform-auth";

type PackageRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  gradePreset: string | null;
  schoolType: string | null;
  isBlank: boolean;
  sortOrder: number;
  _count: {
    subjects: number;
    departments: number;
    libraryItems: number;
    templates: number;
  };
};

type PackageSubject = {
  id: string;
  code: string;
  name: string;
  level: string | null;
  platformSubjectId: string | null;
};

type PlatformSubjectOption = {
  id: string;
  code: string;
  name: string;
  level: string | null;
  isArchived: boolean;
};

type PackageLibraryItem = {
  id: string;
  title: string;
  categorySlug: string;
  resourceType: string;
  subject?: string | null;
  gradeLabel?: string | null;
  platformLibraryResourceId?: string | null;
};

type PlatformLibraryOption = {
  id: string;
  title: string;
  resourceType: string;
  subject: string | null;
  gradeLabel: string | null;
  isArchived: boolean;
  category: { slug: string; name: string };
};

type LibraryCategoryOption = {
  id: string;
  slug: string;
  name: string;
};

type PackageTemplate = {
  id: string;
  key: string;
  name: string;
  channel: string;
  body: string;
  platformMessageTemplateId?: string | null;
};

type PlatformTemplateOption = {
  id: string;
  key: string;
  name: string;
  channel: string;
  body: string;
  isArchived: boolean;
};

type PackageDepartment = {
  id: string;
  name: string;
};

type PackageDetail = PackageRow & {
  subjects: PackageSubject[];
  departments: PackageDepartment[];
  libraryItems: PackageLibraryItem[];
  templates: PackageTemplate[];
};

type DetailTab = "overview" | "subjects" | "structure" | "library" | "templates";

const TEMPLATE_CHANNELS: {
  value: string;
  label: string;
  icon: DashIconName;
}[] = [
  { value: "SMS", label: "Parent SMS", icon: "message" },
  { value: "EMAIL", label: "Email", icon: "mail" },
  { value: "TEACHER", label: "Teacher", icon: "teachers" },
];

const DEFAULT_KEY = "ETHIOPIAN_PRIVATE";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatPreset(value: string | null) {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatOrgType(value: string | null) {
  if (!value) return "—";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function ContentMixChart({ detail }: { detail: PackageDetail }) {
  const items = [
    {
      label: "Subjects",
      value: detail.subjects.length,
      color: "var(--brand-teal-dark)",
      icon: "subjects" as DashIconName,
    },
    {
      label: "Departments",
      value: detail.departments.length,
      color: "var(--brand-teal)",
      icon: "building" as DashIconName,
    },
    {
      label: "eLibrary",
      value: detail.libraryItems.length,
      color: "var(--brand-cyan)",
      icon: "library" as DashIconName,
    },
    {
      label: "Templates",
      value: detail.templates.length,
      color: "#5eead4",
      icon: "templates" as DashIconName,
    },
  ];
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="plat-overview-v2__mix">
      {items.map((item) => (
        <li key={item.label} className="plat-overview-v2__mix-row">
          <div className="plat-overview-v2__mix-icon" aria-hidden>
            <DashIcon name={item.icon} className="dash-icon--sm" />
          </div>
          <div className="plat-overview-v2__mix-body">
            <div className="plat-overview-v2__mix-head">
              <span>{item.label}</span>
              <strong>
                {item.value}
                <span className="plat-overview-v2__mix-pct">
                  {Math.round((item.value / total) * 100)}%
                </span>
              </strong>
            </div>
            <div className="plat-overview-v2__mix-track">
              <div
                className="plat-overview-v2__mix-fill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.color,
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

type OverviewPanelProps = {
  detail: PackageDetail;
  onNavigate: (tab: DetailTab) => void;
};

function PackageOverviewPanel({ detail, onNavigate }: OverviewPanelProps) {
  const accent = packageAccent(detail.key);
  const totalItems =
    detail.subjects.length +
    detail.departments.length +
    detail.libraryItems.length +
    detail.templates.length;

  const kpis: {
    tab: DetailTab;
    label: string;
    value: number;
    icon: DashIconName;
    tone: string;
  }[] = [
    {
      tab: "subjects",
      label: "Subjects",
      value: detail.subjects.length,
      icon: "subjects",
      tone: "teal",
    },
    {
      tab: "structure",
      label: "Departments",
      value: detail.departments.length,
      icon: "building",
      tone: "cyan",
    },
    {
      tab: "library",
      label: "eLibrary",
      value: detail.libraryItems.length,
      icon: "library",
      tone: "mint",
    },
    {
      tab: "templates",
      label: "Templates",
      value: detail.templates.length,
      icon: "templates",
      tone: "slate",
    },
  ];

  const autoItems = [
    { label: "Academic year + semesters", detail: "Auto-created on provision" },
    { label: "Grading scale A–F", detail: "Default letter grades" },
    { label: "Grade levels & sections", detail: "From package preset" },
  ];

  return (
    <div className="plat-overview-v2">
      <div className="plat-overview-v2__hero">
        <div className="plat-overview-v2__hero-main">
          <span className={`plat-overview-v2__accent plat-overview-v2__accent--${accent.tone}`}>
            <DashIcon name="library" className="dash-icon--sm" />
          </span>
          <div>
            <h4>Starter pack snapshot</h4>
            <p>
              {totalItems} catalog items copy into each new tenant when this package
              provisions their workspace.
            </p>
          </div>
        </div>
        <div className="plat-overview-v2__hero-stat">
          <strong>{totalItems}</strong>
          <span>Total items</span>
        </div>
      </div>

      <div className="plat-overview-v2__meta">
        <article className="plat-overview-v2__meta-card">
          <span className="plat-overview-v2__meta-icon" aria-hidden>
            <DashIcon name="calendar" className="dash-icon--sm" />
          </span>
          <div>
            <span className="plat-overview-v2__meta-label">Grade structure</span>
            <strong>{formatPreset(detail.gradePreset)}</strong>
          </div>
        </article>
        <article className="plat-overview-v2__meta-card">
          <span className="plat-overview-v2__meta-icon" aria-hidden>
            <DashIcon name="users" className="dash-icon--sm" />
          </span>
          <div>
            <span className="plat-overview-v2__meta-label">Organization type</span>
            <strong>{formatOrgType(detail.schoolType)}</strong>
          </div>
        </article>
        <article className="plat-overview-v2__meta-card plat-overview-v2__meta-card--mono">
          <span className="plat-overview-v2__meta-icon" aria-hidden>
            <DashIcon name="templates" className="dash-icon--sm" />
          </span>
          <div>
            <span className="plat-overview-v2__meta-label">Package key</span>
            <code>{detail.key}</code>
          </div>
        </article>
      </div>

      <div className="plat-overview-v2__kpis">
        {kpis.map((kpi) => (
          <button
            key={kpi.tab}
            type="button"
            className={`plat-overview-v2__kpi plat-overview-v2__kpi--${kpi.tone}`}
            onClick={() => onNavigate(kpi.tab)}
          >
            <span className="plat-overview-v2__kpi-icon" aria-hidden>
              <DashIcon name={kpi.icon} className="dash-icon--md" />
            </span>
            <span className="plat-overview-v2__kpi-value">{kpi.value}</span>
            <span className="plat-overview-v2__kpi-label">{kpi.label}</span>
            <span className="plat-overview-v2__kpi-link">
              Manage
              <DashIcon name="chevron" className="dash-icon--xs" />
            </span>
          </button>
        ))}
      </div>

      <div className="plat-overview-v2__split">
        <section className="plat-overview-v2__panel">
          <header className="plat-overview-v2__panel-head">
            <div>
              <h4>Content mix</h4>
              <p>Relative share of each starter category in this package.</p>
            </div>
          </header>
          <ContentMixChart detail={detail} />
        </section>

        <section className="plat-overview-v2__panel">
          <header className="plat-overview-v2__panel-head">
            <div>
              <h4>Also provisioned</h4>
              <p>System defaults applied automatically for every new tenant.</p>
            </div>
          </header>
          <ul className="plat-overview-v2__auto">
            {autoItems.map((item) => (
              <li key={item.label}>
                <span className="plat-overview-v2__auto-check" aria-hidden>
                  <DashIcon name="attendance" className="dash-icon--xs" />
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function packageAccent(key: string) {
  switch (key) {
    case "ETHIOPIAN_PRIVATE":
      return { icon: "🇪🇹", tone: "ethiopian" };
    case "CAMBRIDGE":
      return { icon: "🎓", tone: "cambridge" };
    case "AMERICAN":
      return { icon: "🇺🇸", tone: "american" };
    case "BLANK":
      return { icon: "📋", tone: "blank" };
    default:
      return { icon: "📦", tone: "default" };
  }
}

function resourceLabel(type: string) {
  return type.replace(/_/g, " ").toLowerCase();
}

function templateChannelMeta(channel: string) {
  return (
    TEMPLATE_CHANNELS.find((c) => c.value === channel) ?? {
      value: channel,
      label: channel,
      icon: "templates" as DashIconName,
    }
  );
}

function departmentIconName(name: string): DashIconName {
  const n = name.toLowerCase();
  if (n.includes("ict") || n.includes("computer") || n.includes("tech")) return "monitor";
  if (n.includes("language") || n.includes("english") || n.includes("amharic")) return "subjects";
  if (n.includes("social") || n.includes("humanities") || n.includes("civics")) return "globe";
  if (n.includes("science") || n.includes("stem")) return "flask";
  if (n.includes("math")) return "chart";
  if (n.includes("art") || n.includes("music")) return "palette";
  return "building";
}

function templatePreview(body: string, max = 120) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}…`;
}

const DEPARTMENT_SUGGESTIONS = [
  "Natural Science",
  "Social Science",
  "Languages",
  "ICT",
  "Mathematics",
  "Arts",
];

export function PlatformCurriculum() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [query, setQuery] = useState("");
  const [subjectQ, setSubjectQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [platformSubjects, setPlatformSubjects] = useState<PlatformSubjectOption[]>([]);
  const [addSubjectId, setAddSubjectId] = useState("");
  const [subjectBusy, setSubjectBusy] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectLevel, setNewSubjectLevel] = useState("ALL");
  const [platformLibrary, setPlatformLibrary] = useState<PlatformLibraryOption[]>([]);
  const [libraryCategories, setLibraryCategories] = useState<LibraryCategoryOption[]>([]);
  const [addLibraryId, setAddLibraryId] = useState("");
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryQ, setLibraryQ] = useState("");
  const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
  const [newLibraryTitle, setNewLibraryTitle] = useState("");
  const [newLibraryCategoryId, setNewLibraryCategoryId] = useState("");
  const [newLibraryType, setNewLibraryType] = useState("BOOK_PDF");
  const [newLibrarySubject, setNewLibrarySubject] = useState("");
  const [newLibraryGrade, setNewLibraryGrade] = useState("");
  const [newLibraryFile, setNewLibraryFile] = useState<File | null>(null);
  const [newLibraryExternalUrl, setNewLibraryExternalUrl] = useState("");
  const [platformTemplates, setPlatformTemplates] = useState<PlatformTemplateOption[]>([]);
  const [addTemplateId, setAddTemplateId] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateQ, setTemplateQ] = useState("");
  const [templateChannelFilter, setTemplateChannelFilter] = useState("ALL");
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [newTemplateKey, setNewTemplateKey] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateChannel, setNewTemplateChannel] = useState("SMS");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateChannel, setEditTemplateChannel] = useState("SMS");
  const [editTemplateBody, setEditTemplateBody] = useState("");
  const [structureBusy, setStructureBusy] = useState(false);
  const [structureQ, setStructureQ] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editDepartmentName, setEditDepartmentName] = useState("");

  function fail(err: unknown, fallback: string) {
    if (handlePlatformAuthFailure(err, () => router.replace("/platform/login"))) {
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await platformFetch<PackageRow[]>("/platform/curriculum-packages");
      setPackages(rows);
      setSelectedKey((prev) => prev ?? rows[0]?.key ?? null);
    } catch (err) {
      fail(err, "Load failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem(PLATFORM_TOKEN_KEY)) {
      router.replace("/platform/login");
      return;
    }
    queueMicrotask(() => void load());
  }, [load, router]);

  useEffect(() => {
    queueMicrotask(() => {
      if (!selectedKey) {
        setDetail(null);
        return;
      }
      setDetailLoading(true);
      setTab("overview");
      setSubjectQ("");
      setLibraryQ("");
      setTemplateQ("");
      setStructureQ("");
      setEditingTemplateId(null);
      setEditingDepartmentId(null);
      void platformFetch<PackageDetail>(`/platform/curriculum-packages/${selectedKey}`)
        .then(setDetail)
        .catch((err) => fail(err, "Could not load package"))
        .finally(() => setDetailLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const loadPlatformSubjects = useCallback(async () => {
    try {
      const rows = await platformFetch<PlatformSubjectOption[]>("/platform/subjects");
      setPlatformSubjects(rows);
    } catch {
      setPlatformSubjects([]);
    }
  }, []);

  const loadPlatformLibrary = useCallback(async () => {
    try {
      const [resources, categories] = await Promise.all([
        platformFetch<PlatformLibraryOption[]>("/platform/library/resources"),
        platformFetch<LibraryCategoryOption[]>("/platform/library/categories"),
      ]);
      setPlatformLibrary(resources);
      setLibraryCategories(categories);
      setNewLibraryCategoryId((prev) => prev || categories[0]?.id || "");
    } catch {
      setPlatformLibrary([]);
      setLibraryCategories([]);
    }
  }, []);

  useEffect(() => {
    if (tab !== "subjects" || detail?.isBlank) {
      return;
    }
    queueMicrotask(() => void loadPlatformSubjects());
  }, [tab, detail?.isBlank, detail?.key, loadPlatformSubjects]);

  useEffect(() => {
    if (tab !== "library" || detail?.isBlank) {
      return;
    }
    queueMicrotask(() => void loadPlatformLibrary());
  }, [tab, detail?.isBlank, detail?.key, loadPlatformLibrary]);

  const loadPlatformTemplates = useCallback(async () => {
    try {
      const rows = await platformFetch<PlatformTemplateOption[]>(
        "/platform/message-templates",
      );
      setPlatformTemplates(rows);
    } catch {
      setPlatformTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (tab !== "templates" || detail?.isBlank) {
      return;
    }
    queueMicrotask(() => void loadPlatformTemplates());
  }, [tab, detail?.isBlank, detail?.key, loadPlatformTemplates]);

  const availableSubjects = useMemo(() => {
    if (!detail) return [];
    const inPackage = new Set(detail.subjects.map((s) => s.code));
    return platformSubjects.filter(
      (s) => !s.isArchived && !inPackage.has(s.code),
    );
  }, [detail, platformSubjects]);

  const availableLibrary = useMemo(() => {
    if (!detail) return [];
    const inPackage = new Set(
      detail.libraryItems.map(
        (item) =>
          item.platformLibraryResourceId ??
          `${item.categorySlug}:${item.title}`,
      ),
    );
    return platformLibrary.filter((r) => {
      if (r.isArchived) return false;
      if (inPackage.has(r.id)) return false;
      if (inPackage.has(`${r.category.slug}:${r.title}`)) return false;
      return true;
    });
  }, [detail, platformLibrary]);

  const filteredLibraryItems = useMemo(() => {
    if (!detail) return [];
    const q = libraryQ.trim().toLowerCase();
    if (!q) return detail.libraryItems;
    return detail.libraryItems.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.categorySlug.toLowerCase().includes(q) ||
        r.resourceType.toLowerCase().includes(q) ||
        (r.subject ?? "").toLowerCase().includes(q),
    );
  }, [detail, libraryQ]);

  async function reloadDetail() {
    if (!selectedKey) return;
    const [refreshed, rows] = await Promise.all([
      platformFetch<PackageDetail>(`/platform/curriculum-packages/${selectedKey}`),
      platformFetch<PackageRow[]>("/platform/curriculum-packages"),
    ]);
    setDetail(refreshed);
    setPackages(rows);
  }

  async function addSubjectToPackage() {
    if (!detail || !addSubjectId) return;
    setSubjectBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/curriculum-packages/${detail.key}/subjects`, {
        method: "POST",
        body: JSON.stringify({ platformSubjectId: addSubjectId }),
      });
      setAddSubjectId("");
      await loadPlatformSubjects();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not add subject");
    } finally {
      setSubjectBusy(false);
    }
  }

  async function createAndAddSubject() {
    if (!detail || !newSubjectCode.trim() || !newSubjectName.trim()) return;
    setSubjectBusy(true);
    setError("");
    try {
      const created = await platformFetch<{ id: string }>("/platform/subjects", {
        method: "POST",
        body: JSON.stringify({
          code: newSubjectCode.trim(),
          name: newSubjectName.trim(),
          curriculum: detail.key,
          level: newSubjectLevel,
        }),
      });
      await platformFetch(`/platform/curriculum-packages/${detail.key}/subjects`, {
        method: "POST",
        body: JSON.stringify({ platformSubjectId: created.id }),
      });
      setCreateSubjectOpen(false);
      setNewSubjectCode("");
      setNewSubjectName("");
      setNewSubjectLevel("ALL");
      await loadPlatformSubjects();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not create subject");
    } finally {
      setSubjectBusy(false);
    }
  }

  async function removeSubjectFromPackage(subject: PackageSubject) {
    if (!detail) return;
    if (!confirm(`Remove ${subject.name} from this package?`)) return;
    setSubjectBusy(true);
    setError("");
    try {
      await platformFetch(
        `/platform/curriculum-packages/${detail.key}/subjects/${subject.id}/remove`,
        { method: "POST" },
      );
      await loadPlatformSubjects();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not remove subject");
    } finally {
      setSubjectBusy(false);
    }
  }

  async function addLibraryItemToPackage() {
    if (!detail || !addLibraryId) return;
    setLibraryBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/curriculum-packages/${detail.key}/library`, {
        method: "POST",
        body: JSON.stringify({ platformLibraryResourceId: addLibraryId }),
      });
      setAddLibraryId("");
      await loadPlatformLibrary();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not add resource");
    } finally {
      setLibraryBusy(false);
    }
  }

  async function createAndAddLibraryItem() {
    if (!detail || !newLibraryTitle.trim() || !newLibraryCategoryId) return;
    setLibraryBusy(true);
    setError("");
    try {
      let fileUrl: string | undefined;
      if (newLibraryFile) {
        const uploaded = await platformUpload<{ fileUrl: string }>(
          "/platform/library/upload",
          newLibraryFile,
        );
        fileUrl = uploaded.fileUrl;
      }
      const created = await platformFetch<{ id: string }>("/platform/library/resources", {
        method: "POST",
        body: JSON.stringify({
          title: newLibraryTitle.trim(),
          categoryId: newLibraryCategoryId,
          resourceType: newLibraryType,
          subject: newLibrarySubject.trim() || undefined,
          gradeLabel: newLibraryGrade.trim() || undefined,
          fileUrl,
          externalUrl: newLibraryExternalUrl.trim() || undefined,
        }),
      });
      await platformFetch(`/platform/curriculum-packages/${detail.key}/library`, {
        method: "POST",
        body: JSON.stringify({ platformLibraryResourceId: created.id }),
      });
      setCreateLibraryOpen(false);
      setNewLibraryTitle("");
      setNewLibrarySubject("");
      setNewLibraryGrade("");
      setNewLibraryType("BOOK_PDF");
      setNewLibraryFile(null);
      setNewLibraryExternalUrl("");
      await loadPlatformLibrary();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not create resource");
    } finally {
      setLibraryBusy(false);
    }
  }

  async function removeLibraryItemFromPackage(item: PackageLibraryItem) {
    if (!detail) return;
    if (!confirm(`Remove "${item.title}" from this package?`)) return;
    setLibraryBusy(true);
    setError("");
    try {
      await platformFetch(
        `/platform/curriculum-packages/${detail.key}/library/${item.id}/remove`,
        { method: "POST" },
      );
      await loadPlatformLibrary();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not remove resource");
    } finally {
      setLibraryBusy(false);
    }
  }

  async function addTemplateToPackage() {
    if (!detail || !addTemplateId) return;
    setTemplateBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/curriculum-packages/${detail.key}/templates`, {
        method: "POST",
        body: JSON.stringify({ platformMessageTemplateId: addTemplateId }),
      });
      setAddTemplateId("");
      await loadPlatformTemplates();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not add template");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function createAndAddTemplate() {
    if (!detail || !newTemplateKey.trim() || !newTemplateName.trim() || !newTemplateBody.trim()) {
      return;
    }
    setTemplateBusy(true);
    setError("");
    try {
      const created = await platformFetch<{ id: string }>("/platform/message-templates", {
        method: "POST",
        body: JSON.stringify({
          key: newTemplateKey.trim().toLowerCase(),
          name: newTemplateName.trim(),
          channel: newTemplateChannel,
          body: newTemplateBody.trim(),
        }),
      });
      await platformFetch(`/platform/curriculum-packages/${detail.key}/templates`, {
        method: "POST",
        body: JSON.stringify({ platformMessageTemplateId: created.id }),
      });
      setCreateTemplateOpen(false);
      setNewTemplateKey("");
      setNewTemplateName("");
      setNewTemplateChannel("SMS");
      setNewTemplateBody("");
      await loadPlatformTemplates();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not create template");
    } finally {
      setTemplateBusy(false);
    }
  }

  function startEditTemplate(template: PackageTemplate) {
    setEditingTemplateId(template.id);
    setEditTemplateName(template.name);
    setEditTemplateChannel(template.channel);
    setEditTemplateBody(template.body);
  }

  function cancelEditTemplate() {
    setEditingTemplateId(null);
    setEditTemplateName("");
    setEditTemplateChannel("SMS");
    setEditTemplateBody("");
  }

  async function saveEditTemplate() {
    if (!detail || !editingTemplateId) return;
    setTemplateBusy(true);
    setError("");
    try {
      await platformFetch(
        `/platform/curriculum-packages/${detail.key}/templates/${editingTemplateId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editTemplateName.trim(),
            channel: editTemplateChannel,
            body: editTemplateBody.trim(),
          }),
        },
      );
      cancelEditTemplate();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not save template");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function removeTemplateFromPackage(template: PackageTemplate) {
    if (!detail) return;
    if (!confirm(`Remove "${template.name}" from this package?`)) return;
    setTemplateBusy(true);
    setError("");
    try {
      await platformFetch(
        `/platform/curriculum-packages/${detail.key}/templates/${template.id}/remove`,
        { method: "POST" },
      );
      if (editingTemplateId === template.id) cancelEditTemplate();
      await loadPlatformTemplates();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not remove template");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function addDepartment(nameOverride?: string) {
    const name = (nameOverride ?? newDepartmentName).trim();
    if (!detail || !name) return;
    setStructureBusy(true);
    setError("");
    try {
      await platformFetch(`/platform/curriculum-packages/${detail.key}/departments`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewDepartmentName("");
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not add department");
    } finally {
      setStructureBusy(false);
    }
  }

  function startEditDepartment(department: PackageDepartment) {
    setEditingDepartmentId(department.id);
    setEditDepartmentName(department.name);
  }

  function cancelEditDepartment() {
    setEditingDepartmentId(null);
    setEditDepartmentName("");
  }

  async function saveEditDepartment() {
    if (!detail || !editingDepartmentId || !editDepartmentName.trim()) return;
    setStructureBusy(true);
    setError("");
    try {
      await platformFetch(
        `/platform/curriculum-packages/${detail.key}/departments/${editingDepartmentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: editDepartmentName.trim() }),
        },
      );
      cancelEditDepartment();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not save department");
    } finally {
      setStructureBusy(false);
    }
  }

  async function removeDepartment(department: PackageDepartment) {
    if (!detail) return;
    if (!confirm(`Remove "${department.name}" from this package?`)) return;
    setStructureBusy(true);
    setError("");
    try {
      await platformFetch(
        `/platform/curriculum-packages/${detail.key}/departments/${department.id}/remove`,
        { method: "POST" },
      );
      if (editingDepartmentId === department.id) cancelEditDepartment();
      await reloadDetail();
    } catch (err) {
      fail(err, "Could not remove department");
    } finally {
      setStructureBusy(false);
    }
  }

  const filteredPackages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q),
    );
  }, [packages, query]);

  const totals = useMemo(() => {
    return packages.reduce(
      (acc, p) => ({
        subjects: acc.subjects + p._count.subjects,
        library: acc.library + p._count.libraryItems,
        templates: acc.templates + p._count.templates,
      }),
      { subjects: 0, library: 0, templates: 0 },
    );
  }, [packages]);

  const filteredSubjects = useMemo(() => {
    if (!detail) return [];
    const q = subjectQ.trim().toLowerCase();
    if (!q) return detail.subjects;
    return detail.subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q),
    );
  }, [detail, subjectQ]);

  const availableTemplates = useMemo(() => {
    if (!detail) return [];
    const inPackage = new Set(detail.templates.map((t) => t.key));
    return platformTemplates.filter(
      (t) => !t.isArchived && !inPackage.has(t.key),
    );
  }, [detail, platformTemplates]);

  const filteredTemplates = useMemo(() => {
    if (!detail) return [];
    const q = templateQ.trim().toLowerCase();
    return detail.templates.filter((t) => {
      if (templateChannelFilter !== "ALL" && t.channel !== templateChannelFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        t.channel.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q)
      );
    });
  }, [detail, templateQ, templateChannelFilter]);

  const templateChannelCounts = useMemo(() => {
    if (!detail) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const t of detail.templates) {
      map.set(t.channel, (map.get(t.channel) ?? 0) + 1);
    }
    return map;
  }, [detail]);

  const filteredDepartments = useMemo(() => {
    if (!detail) return [];
    const q = structureQ.trim().toLowerCase();
    if (!q) return detail.departments;
    return detail.departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [detail, structureQ]);

  const departmentSuggestions = useMemo(() => {
    if (!detail) return DEPARTMENT_SUGGESTIONS;
    const existing = new Set(detail.departments.map((d) => d.name.toLowerCase()));
    return DEPARTMENT_SUGGESTIONS.filter((s) => !existing.has(s.toLowerCase()));
  }, [detail]);

  useEffect(() => {
    if (!detail) return;
    queueMicrotask(() => {
      setEditLabel(detail.label);
      setEditDescription(detail.description ?? "");
    });
  }, [detail]);

  async function savePackageMeta() {
    if (!detail) return;
    setError("");
    try {
      await platformFetch(`/platform/curriculum-packages/${detail.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: editLabel.trim(),
          description: editDescription.trim() || null,
        }),
      });
      setEditingMeta(false);
      await load();
      const refreshed = await platformFetch<PackageDetail>(
        `/platform/curriculum-packages/${detail.key}`,
      );
      setDetail(refreshed);
    } catch (err) {
      fail(err, "Save failed");
    }
  }

  async function copyKey() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const tabs: { id: DetailTab; label: string; count?: number }[] = detail
    ? [
        { id: "overview", label: "Overview" },
        {
          id: "subjects",
          label: "Subjects",
          count: detail.subjects.length,
        },
        {
          id: "structure",
          label: "Structure",
          count: detail.departments.length,
        },
        {
          id: "library",
          label: "eLibrary",
          count: detail.libraryItems.length,
        },
        {
          id: "templates",
          label: "Templates",
          count: detail.templates.length,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="plat-curriculum-v2 dash-admin dash-admin--modern plat-curriculum plat-curriculum--loading">
        <div className="plat-curriculum__skeleton plat-curriculum__skeleton--hero" />
        <div className="plat-curriculum__skeleton-row">
          <div className="plat-curriculum__skeleton" />
          <div className="plat-curriculum__skeleton" />
          <div className="plat-curriculum__skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="plat-curriculum-v2 dash-admin dash-admin--modern">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />

      <header className="plat-subjects-v2__hero">
        <div className="plat-subjects-v2__hero-main">
          <span className="plat-subjects-v2__hero-icon" aria-hidden>
            <DashIcon name="results" className="dash-icon--md" />
          </span>
          <div>
            <p className="plat-subjects-v2__eyebrow">Content & Curriculum Engine</p>
            <h2 className="plat-subjects-v2__title">Curriculum packages</h2>
            <p className="plat-subjects-v2__sub">
              Packages pick subjects and eLibrary resources from the master
              repositories, then copy them into each new school on provision.
            </p>
          </div>
        </div>
        <div className="plat-subjects-v2__hero-stats">
          <div className="plat-subjects-v2__stat">
            <strong>{packages.length}</strong>
            <span>Packages</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{totals.subjects}</strong>
            <span>Subjects</span>
          </div>
          <div className="plat-subjects-v2__stat">
            <strong>{totals.library}</strong>
            <span>Library</span>
          </div>
        </div>
      </header>

      <div className="plat-tenants-v2__toolbar plat-curriculum-v2__toolbar">
        <div className="plat-tenants-v2__search">
          <DashIcon name="library" className="dash-icon--sm" />
          <input
            type="search"
            placeholder="Search packages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search curriculum packages"
          />
        </div>
        <button
          type="button"
          className="plat-btn plat-btn--ghost plat-tenants-v2__toolbar-btn"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className="plat-curriculum-workspace plat-curriculum-v2__workspace">
        <aside className="plat-curriculum-sidebar plat-curriculum-v2__sidebar" aria-label="Packages">
          {filteredPackages.length === 0 ? (
            <p className="plat-empty">No packages match your search.</p>
          ) : (
            filteredPackages.map((p) => {
              const accent = packageAccent(p.key);
              const active = selectedKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  className={`plat-curriculum-card plat-curriculum-card--${accent.tone}${
                    active ? " plat-curriculum-card--active" : ""
                  }`}
                  onClick={() => setSelectedKey(p.key)}
                >
                  <span className="plat-curriculum-card__icon" aria-hidden>
                    {accent.icon}
                  </span>
                  <span className="plat-curriculum-card__body">
                    <span className="plat-curriculum-card__title">{p.label}</span>
                    <span className="plat-curriculum-card__key">{p.key}</span>
                    {p.key === DEFAULT_KEY ? (
                      <span className="plat-curriculum-badge plat-curriculum-badge--default">
                        Default for signup
                      </span>
                    ) : null}
                    {p.isBlank ? (
                      <span className="plat-curriculum-badge plat-curriculum-badge--muted">
                        Manual setup
                      </span>
                    ) : (
                      <span className="plat-curriculum-card__metrics">
                        <span>{p._count.subjects} subjects</span>
                        <span>{p._count.libraryItems} library</span>
                      </span>
                    )}
                  </span>
                  <DashIcon name="chevron" className="plat-curriculum-card__chev" />
                </button>
              );
            })
          )}
        </aside>

        <main className="plat-curriculum-main plat-curriculum-v2__main">
          {!detail && !detailLoading ? (
            <div className="plat-curriculum-empty">
              <p>Select a package to manage its catalog.</p>
            </div>
          ) : null}

          {detailLoading ? (
            <div className="plat-curriculum-main__loading">
              <div className="plat-curriculum__skeleton plat-curriculum__skeleton--panel" />
            </div>
          ) : null}

          {detail && !detailLoading ? (
            <>
              <header className="plat-curriculum-main__head">
                <div className="plat-curriculum-main__title-row">
                  <span className="plat-curriculum-main__icon" aria-hidden>
                    {packageAccent(detail.key).icon}
                  </span>
                  <div>
                    <h3>{detail.label}</h3>
                    {detail.description ? <p>{detail.description}</p> : null}
                  </div>
                </div>
                <div className="plat-curriculum-main__actions plat-curriculum-v2__actions">
                  <div className="plat-curriculum-v2__action-group">
                    {!detail.isBlank ? (
                      <button
                        type="button"
                        className="plat-btn plat-btn--ghost plat-btn--xs"
                        onClick={() => setEditingMeta((v) => !v)}
                      >
                        {editingMeta ? "Cancel edit" : "Edit package"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="plat-btn plat-btn--ghost plat-btn--xs"
                      onClick={() => void copyKey()}
                    >
                      {copied ? "Copied" : "Copy package key"}
                    </button>
                  </div>
                  {!detail.isBlank ? (
                    <p className="plat-curriculum-v2__action-hint">
                      <strong>Edit</strong> renames this package · use the tabs below to add,
                      edit, or remove starter items
                    </p>
                  ) : null}
                </div>
              </header>

              {editingMeta && !detail.isBlank ? (
                <div className="plat-curriculum-form plat-curriculum-form--meta">
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Package label"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    rows={2}
                  />
                  <button
                    type="button"
                    className="plat-btn plat-btn--primary plat-btn--xs"
                    onClick={() => void savePackageMeta()}
                  >
                    Save package
                  </button>
                </div>
              ) : null}

              {detail.isBlank ? (
                <div className="plat-curriculum-blank">
                  <strong>Blank provisioning</strong>
                  <p>
                    New tenants get no subjects, grades, or library content until
                    the admin completes setup manually.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="plat-filter-tabs plat-curriculum-tabs"
                    role="tablist"
                  >
                    {tabs.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`plat-filter-tab${
                          tab === t.id ? " plat-filter-tab--active" : ""
                        }`}
                        onClick={() => setTab(t.id)}
                      >
                        {t.label}
                        {t.count != null && t.count > 0 ? (
                          <span className="plat-filter-count">{t.count}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>

                  <div className="plat-curriculum-panel">
                    {tab === "overview" ? (
                      <PackageOverviewPanel
                        detail={detail}
                        onNavigate={(next) => setTab(next)}
                      />
                    ) : null}

                    {tab === "subjects" ? (
                      <div className="plat-curriculum-tab-body">
                        {!detail.isBlank ? (
                          <>
                            <div className="plat-curriculum-v2__subject-actions">
                              <select
                                value={addSubjectId}
                                onChange={(e) => setAddSubjectId(e.target.value)}
                                aria-label="Subject to add"
                              >
                                <option value="">
                                  {availableSubjects.length === 0
                                    ? "No more subjects in repository…"
                                    : "Add from subject repository…"}
                                </option>
                                {availableSubjects.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.code} — {s.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="plat-btn plat-btn--primary plat-btn--sm"
                                disabled={!addSubjectId || subjectBusy}
                                title={
                                  addSubjectId
                                    ? "Add selected subject to this package"
                                    : "Choose a subject from the dropdown first"
                                }
                                onClick={() => void addSubjectToPackage()}
                              >
                                {subjectBusy ? "Saving…" : "Add subject"}
                              </button>
                              <span className="plat-curriculum-v2__subject-hint">
                                {availableSubjects.length === 0
                                  ? "Every repository subject is already in this package."
                                  : addSubjectId
                                    ? `${availableSubjects.length} available · pick then Add`
                                    : `Select one of ${availableSubjects.length} available, then Add`}
                              </span>
                            </div>
                            {availableSubjects.length === 0 ? (
                              <p className="plat-curriculum-v2__subject-note">
                                To add subjects like Amharic or Natural Science, create them
                                below — they are not in the repository yet.
                              </p>
                            ) : null}
                            <div className="plat-curriculum-v2__subject-create">
                              <button
                                type="button"
                                className="plat-btn plat-btn--ghost plat-btn--xs"
                                onClick={() => setCreateSubjectOpen((v) => !v)}
                              >
                                {createSubjectOpen ? "Hide create form" : "+ Create new subject"}
                              </button>
                              {createSubjectOpen ? (
                                <div className="plat-curriculum-form plat-curriculum-v2__subject-form">
                                  <input
                                    placeholder="Code (e.g. AMH)"
                                    value={newSubjectCode}
                                    onChange={(e) =>
                                      setNewSubjectCode(e.target.value.toUpperCase())
                                    }
                                  />
                                  <input
                                    placeholder="Name (e.g. Amharic)"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                  />
                                  <select
                                    value={newSubjectLevel}
                                    onChange={(e) => setNewSubjectLevel(e.target.value)}
                                  >
                                    <option value="ALL">All levels</option>
                                    <option value="PRIMARY">Primary</option>
                                    <option value="SECONDARY">Secondary</option>
                                  </select>
                                  <button
                                    type="button"
                                    className="plat-btn plat-btn--primary plat-btn--sm"
                                    disabled={
                                      subjectBusy ||
                                      !newSubjectCode.trim() ||
                                      !newSubjectName.trim()
                                    }
                                    onClick={() => void createAndAddSubject()}
                                  >
                                    {subjectBusy ? "Saving…" : "Create & add to package"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                        <div className="plat-search plat-search--compact">
                          <input
                            type="search"
                            placeholder="Filter subjects…"
                            value={subjectQ}
                            onChange={(e) => setSubjectQ(e.target.value)}
                            aria-label="Filter subjects"
                          />
                        </div>
                        <div className="plat-curriculum-table-wrap">
                          <table className="plat-curriculum-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Subject</th>
                                <th>Level</th>
                                {!detail.isBlank ? <th aria-label="Actions" /> : null}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSubjects.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={detail.isBlank ? 3 : 4}
                                    className="plat-curriculum-table__empty"
                                  >
                                    No subjects match.
                                  </td>
                                </tr>
                              ) : (
                                filteredSubjects.map((s) => (
                                  <tr key={s.id ?? s.code}>
                                    <td>
                                      <code>{s.code}</code>
                                    </td>
                                    <td>{s.name}</td>
                                    <td>
                                      {s.level ? (
                                        <span className="plat-curriculum-level">
                                          {s.level}
                                        </span>
                                      ) : (
                                        "All"
                                      )}
                                    </td>
                                    {!detail.isBlank ? (
                                      <td>
                                        <button
                                          type="button"
                                          className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                                          disabled={subjectBusy}
                                          onClick={() => void removeSubjectFromPackage(s)}
                                        >
                                          Remove
                                        </button>
                                      </td>
                                    ) : null}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {tab === "structure" ? (
                      <div className="plat-curriculum-tab-body plat-structure-v2">
                        <p className="plat-curriculum-tab-hint">
                          Academic departments created for each provisioned tenant — used to
                          organize teachers and subjects.
                        </p>

                        {!detail.isBlank ? (
                          <div className="plat-structure-v2__add">
                            <div className="plat-curriculum-v2__subject-actions">
                              <input
                                type="text"
                                placeholder="Department name (e.g. Natural Science)"
                                value={newDepartmentName}
                                onChange={(e) => setNewDepartmentName(e.target.value)}
                                aria-label="New department name"
                              />
                              <button
                                type="button"
                                className="plat-btn plat-btn--primary plat-btn--sm"
                                disabled={structureBusy || !newDepartmentName.trim()}
                                onClick={() => void addDepartment()}
                              >
                                {structureBusy ? "Saving…" : "Add department"}
                              </button>
                            </div>
                            {departmentSuggestions.length > 0 ? (
                              <div className="plat-structure-v2__suggestions">
                                <span>Quick add:</span>
                                {departmentSuggestions.map((name) => (
                                  <button
                                    key={name}
                                    type="button"
                                    className="plat-btn plat-btn--ghost plat-btn--xs"
                                    disabled={structureBusy}
                                    onClick={() => void addDepartment(name)}
                                  >
                                    <DashIcon
                                      name={departmentIconName(name)}
                                      className="dash-icon--xs plat-structure-v2__chip-icon"
                                    />
                                    {name}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="plat-search plat-search--compact">
                          <input
                            type="search"
                            placeholder="Filter departments…"
                            value={structureQ}
                            onChange={(e) => setStructureQ(e.target.value)}
                            aria-label="Filter departments"
                          />
                        </div>

                        {filteredDepartments.length === 0 ? (
                          <p className="plat-curriculum-table__empty plat-structure-v2__empty">
                            No departments match.
                          </p>
                        ) : (
                          <div className="plat-structure-v2__grid">
                            {filteredDepartments.map((d) => {
                              const editing = editingDepartmentId === d.id;
                              return (
                                <article
                                  key={d.id}
                                  className={`plat-structure-v2__card${
                                    editing ? " plat-structure-v2__card--editing" : ""
                                  }`}
                                >
                                  <span className="plat-structure-v2__icon" aria-hidden>
                                    <DashIcon
                                      name={departmentIconName(d.name)}
                                      className="dash-icon--md plat-structure-v2__flat-icon"
                                    />
                                  </span>
                                  {editing ? (
                                    <div className="plat-structure-v2__edit">
                                      <input
                                        value={editDepartmentName}
                                        onChange={(e) =>
                                          setEditDepartmentName(e.target.value)
                                        }
                                        placeholder="Department name"
                                      />
                                      <div className="plat-structure-v2__edit-actions">
                                        <button
                                          type="button"
                                          className="plat-btn plat-btn--primary plat-btn--xs"
                                          disabled={
                                            structureBusy || !editDepartmentName.trim()
                                          }
                                          onClick={() => void saveEditDepartment()}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          className="plat-btn plat-btn--ghost plat-btn--xs"
                                          disabled={structureBusy}
                                          onClick={cancelEditDepartment}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <h4 className="plat-structure-v2__name">{d.name}</h4>
                                      {!detail.isBlank ? (
                                        <div className="plat-structure-v2__actions">
                                          <button
                                            type="button"
                                            className="plat-btn plat-btn--ghost plat-btn--xs"
                                            disabled={structureBusy}
                                            onClick={() => startEditDepartment(d)}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                                            disabled={structureBusy}
                                            onClick={() => void removeDepartment(d)}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {tab === "library" ? (
                      <div className="plat-curriculum-tab-body">
                        {!detail.isBlank ? (
                          <>
                            <p className="plat-curriculum-tab-hint">
                              Resources come from the master eLibrary repository.
                              Add them here, then schools receive a copy on provision.
                            </p>
                            <div className="plat-curriculum-v2__subject-actions">
                              <select
                                value={addLibraryId}
                                onChange={(e) => setAddLibraryId(e.target.value)}
                                aria-label="Resource to add"
                              >
                                <option value="">
                                  {availableLibrary.length === 0
                                    ? "No more resources in repository…"
                                    : "Add from eLibrary repository…"}
                                </option>
                                {availableLibrary.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.title} ({r.category.name})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="plat-btn plat-btn--primary plat-btn--sm"
                                disabled={!addLibraryId || libraryBusy}
                                title={
                                  addLibraryId
                                    ? "Add selected resource to this package"
                                    : "Choose a resource from the dropdown first"
                                }
                                onClick={() => void addLibraryItemToPackage()}
                              >
                                {libraryBusy ? "Saving…" : "Add resource"}
                              </button>
                              <span className="plat-curriculum-v2__subject-hint">
                                {availableLibrary.length === 0
                                  ? "Every repository resource is already in this package."
                                  : addLibraryId
                                    ? `${availableLibrary.length} available · pick then Add`
                                    : `Select one of ${availableLibrary.length} available, then Add`}
                              </span>
                            </div>
                            <div className="plat-curriculum-v2__subject-create">
                              <button
                                type="button"
                                className="plat-btn plat-btn--ghost plat-btn--xs"
                                onClick={() => setCreateLibraryOpen((v) => !v)}
                              >
                                {createLibraryOpen
                                  ? "Hide create form"
                                  : "+ Create new starter resource"}
                              </button>
                              {createLibraryOpen ? (
                                <div className="plat-curriculum-form plat-curriculum-v2__subject-form">
                                  <input
                                    placeholder="Title (e.g. Amharic Reader — Grade 3)"
                                    value={newLibraryTitle}
                                    onChange={(e) => setNewLibraryTitle(e.target.value)}
                                  />
                                  <select
                                    value={newLibraryCategoryId}
                                    onChange={(e) => setNewLibraryCategoryId(e.target.value)}
                                  >
                                    <option value="">Category</option>
                                    {libraryCategories.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={newLibraryType}
                                    onChange={(e) => setNewLibraryType(e.target.value)}
                                  >
                                    {LIBRARY_RESOURCE_TYPES.map((t) => (
                                      <option key={t.value} value={t.value}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    placeholder="Subject (optional)"
                                    value={newLibrarySubject}
                                    onChange={(e) => setNewLibrarySubject(e.target.value)}
                                  />
                                  <input
                                    placeholder="Grade label (optional)"
                                    value={newLibraryGrade}
                                    onChange={(e) => setNewLibraryGrade(e.target.value)}
                                  />
                                  <label className="plat-curriculum-v2__file-field">
                                    <span>Main file (PDF, EPUB, etc.)</span>
                                    <input
                                      type="file"
                                      accept=".pdf,.epub,.doc,.docx,.ppt,.pptx,.mp4,.mp3"
                                      onChange={(e) =>
                                        setNewLibraryFile(e.target.files?.[0] ?? null)
                                      }
                                    />
                                    {newLibraryFile ? (
                                      <span className="plat-curriculum-v2__file-name">
                                        {newLibraryFile.name}
                                      </span>
                                    ) : (
                                      <span className="plat-curriculum-v2__file-hint">
                                        Upload the book or document tenants will open
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    placeholder="Or external link (Google Drive, YouTube…)"
                                    value={newLibraryExternalUrl}
                                    onChange={(e) => setNewLibraryExternalUrl(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="plat-btn plat-btn--primary plat-btn--sm"
                                    disabled={
                                      libraryBusy ||
                                      !newLibraryTitle.trim() ||
                                      !newLibraryCategoryId
                                    }
                                    onClick={() => void createAndAddLibraryItem()}
                                  >
                                    {libraryBusy ? "Saving…" : "Create & add to package"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                        <div className="plat-search plat-search--compact">
                          <input
                            type="search"
                            placeholder="Filter resources…"
                            value={libraryQ}
                            onChange={(e) => setLibraryQ(e.target.value)}
                            aria-label="Filter library resources"
                          />
                        </div>
                        <div className="plat-curriculum-table-wrap">
                          <table className="plat-curriculum-table">
                            <thead>
                              <tr>
                                <th>Resource</th>
                                <th>Category</th>
                                <th>Type</th>
                                <th>Subject</th>
                                {!detail.isBlank ? <th aria-label="Actions" /> : null}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLibraryItems.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={detail.isBlank ? 4 : 5}
                                    className="plat-curriculum-table__empty"
                                  >
                                    No resources match.
                                  </td>
                                </tr>
                              ) : (
                                filteredLibraryItems.map((r) => (
                                  <tr key={r.id}>
                                    <td>{r.title}</td>
                                    <td>
                                      <span className="plat-curriculum-pill">
                                        {r.categorySlug}
                                      </span>
                                    </td>
                                    <td className="plat-curriculum-table__muted">
                                      {resourceLabel(r.resourceType)}
                                    </td>
                                    <td>{r.subject ?? "—"}</td>
                                    {!detail.isBlank ? (
                                      <td>
                                        <button
                                          type="button"
                                          className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                                          disabled={libraryBusy}
                                          onClick={() =>
                                            void removeLibraryItemFromPackage(r)
                                          }
                                        >
                                          Remove
                                        </button>
                                      </td>
                                    ) : null}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {tab === "templates" ? (
                      <div className="plat-curriculum-tab-body plat-templates-v2">
                        {!detail.isBlank ? (
                          <>
                            <p className="plat-curriculum-tab-hint">
                              SMS, email, and teacher message starters copied to each new tenant.
                            </p>
                            <div className="plat-curriculum-v2__subject-actions">
                              <select
                                value={addTemplateId}
                                onChange={(e) => setAddTemplateId(e.target.value)}
                                aria-label="Template to add"
                              >
                                <option value="">
                                  {availableTemplates.length === 0
                                    ? "No more templates in repository…"
                                    : "Add from template repository…"}
                                </option>
                                {availableTemplates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({templateChannelMeta(t.channel).label})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="plat-btn plat-btn--primary plat-btn--sm"
                                disabled={!addTemplateId || templateBusy}
                                onClick={() => void addTemplateToPackage()}
                              >
                                {templateBusy ? "Saving…" : "Add template"}
                              </button>
                              <button
                                type="button"
                                className="plat-btn plat-btn--ghost plat-btn--xs"
                                onClick={() => setCreateTemplateOpen((v) => !v)}
                              >
                                {createTemplateOpen ? "Hide create form" : "+ Create new"}
                              </button>
                            </div>
                            {createTemplateOpen ? (
                              <div className="plat-curriculum-form plat-templates-v2__create">
                                <input
                                  placeholder="Key (e.g. fee_reminder)"
                                  value={newTemplateKey}
                                  onChange={(e) =>
                                    setNewTemplateKey(
                                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                                    )
                                  }
                                />
                                <input
                                  placeholder="Display name"
                                  value={newTemplateName}
                                  onChange={(e) => setNewTemplateName(e.target.value)}
                                />
                                <select
                                  value={newTemplateChannel}
                                  onChange={(e) => setNewTemplateChannel(e.target.value)}
                                >
                                  {TEMPLATE_CHANNELS.map((c) => (
                                    <option key={c.value} value={c.value}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                                <textarea
                                  placeholder="Message body…"
                                  rows={6}
                                  value={newTemplateBody}
                                  onChange={(e) => setNewTemplateBody(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="plat-btn plat-btn--primary plat-btn--sm"
                                  disabled={
                                    templateBusy ||
                                    !newTemplateKey.trim() ||
                                    !newTemplateName.trim() ||
                                    !newTemplateBody.trim()
                                  }
                                  onClick={() => void createAndAddTemplate()}
                                >
                                  {templateBusy ? "Saving…" : "Create & add to package"}
                                </button>
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        <div className="plat-templates-v2__filters">
                          <div className="plat-search plat-search--compact">
                            <input
                              type="search"
                              placeholder="Filter templates…"
                              value={templateQ}
                              onChange={(e) => setTemplateQ(e.target.value)}
                              aria-label="Filter templates"
                            />
                          </div>
                          <div
                            className="plat-filter-tabs plat-templates-v2__channels"
                            role="tablist"
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={templateChannelFilter === "ALL"}
                              className={`plat-filter-tab${
                                templateChannelFilter === "ALL"
                                  ? " plat-filter-tab--active"
                                  : ""
                              }`}
                              onClick={() => setTemplateChannelFilter("ALL")}
                            >
                              All
                              <span className="plat-filter-count">
                                {detail.templates.length}
                              </span>
                            </button>
                            {TEMPLATE_CHANNELS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                role="tab"
                                aria-selected={templateChannelFilter === c.value}
                                className={`plat-filter-tab${
                                  templateChannelFilter === c.value
                                    ? " plat-filter-tab--active"
                                    : ""
                                }`}
                                onClick={() => setTemplateChannelFilter(c.value)}
                              >
                                <DashIcon
                                  name={c.icon}
                                  className="dash-icon--xs plat-templates-v2__tab-icon"
                                />
                                {c.label}
                                {(templateChannelCounts.get(c.value) ?? 0) > 0 ? (
                                  <span className="plat-filter-count">
                                    {templateChannelCounts.get(c.value)}
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>

                        {filteredTemplates.length === 0 ? (
                          <p className="plat-curriculum-table__empty plat-templates-v2__empty">
                            No templates match.
                          </p>
                        ) : (
                          <div className="plat-templates-v2__grid">
                            {filteredTemplates.map((t) => {
                              const meta = templateChannelMeta(t.channel);
                              const editing = editingTemplateId === t.id;
                              return (
                                <article
                                  key={t.id}
                                  className={`plat-templates-v2__card${
                                    editing ? " plat-templates-v2__card--editing" : ""
                                  }`}
                                >
                                  <header className="plat-templates-v2__card-head">
                                    <span
                                      className={`plat-templates-v2__badge plat-templates-v2__badge--${t.channel.toLowerCase()}`}
                                    >
                                      <DashIcon
                                        name={meta.icon}
                                        className="dash-icon--xs plat-templates-v2__badge-icon"
                                      />
                                      {meta.label}
                                    </span>
                                    {!detail.isBlank ? (
                                      <div className="plat-templates-v2__card-actions">
                                        {editing ? (
                                          <>
                                            <button
                                              type="button"
                                              className="plat-btn plat-btn--primary plat-btn--xs"
                                              disabled={templateBusy}
                                              onClick={() => void saveEditTemplate()}
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              className="plat-btn plat-btn--ghost plat-btn--xs"
                                              disabled={templateBusy}
                                              onClick={cancelEditTemplate}
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              className="plat-btn plat-btn--ghost plat-btn--xs"
                                              disabled={templateBusy}
                                              onClick={() => startEditTemplate(t)}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              type="button"
                                              className="plat-btn plat-btn--ghost plat-btn--xs plat-btn--danger"
                                              disabled={templateBusy}
                                              onClick={() =>
                                                void removeTemplateFromPackage(t)
                                              }
                                            >
                                              Remove
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    ) : null}
                                  </header>

                                  {editing ? (
                                    <div className="plat-templates-v2__edit">
                                      <input
                                        value={editTemplateName}
                                        onChange={(e) => setEditTemplateName(e.target.value)}
                                        placeholder="Name"
                                      />
                                      <select
                                        value={editTemplateChannel}
                                        onChange={(e) =>
                                          setEditTemplateChannel(e.target.value)
                                        }
                                      >
                                        {TEMPLATE_CHANNELS.map((c) => (
                                          <option key={c.value} value={c.value}>
                                            {c.label}
                                          </option>
                                        ))}
                                      </select>
                                      <textarea
                                        rows={8}
                                        value={editTemplateBody}
                                        onChange={(e) => setEditTemplateBody(e.target.value)}
                                        placeholder="Message body"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <h4 className="plat-templates-v2__title">{t.name}</h4>
                                      <code className="plat-templates-v2__key">{t.key}</code>
                                      <p className="plat-templates-v2__preview">
                                        {templatePreview(t.body)}
                                      </p>
                                      <details className="plat-templates-v2__body">
                                        <summary>View full message</summary>
                                        <pre>{t.body}</pre>
                                      </details>
                                    </>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
