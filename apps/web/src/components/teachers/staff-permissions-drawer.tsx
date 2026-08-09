"use client";

import { useMemo, useState } from "react";
import type { PermissionCatalogItem, StaffPermissionsDetail } from "@/lib/teachers";
import {
  PERMISSION_MODULES,
  PERMISSION_MODULE_KEY_SET,
  type PermissionModule,
} from "@/lib/permissions";

const CATEGORY_LABELS: Record<string, string> = {
  school: "School",
  students: "Students",
  admissions: "Admissions",
  teachers: "Staff",
  attendance: "Attendance",
  results: "Results",
  finance: "Finance",
  comms: "Communications",
};

const CATEGORY_ORDER = [
  "school",
  "students",
  "admissions",
  "teachers",
  "attendance",
  "results",
  "finance",
  "comms",
];

type Props = {
  detail: StaffPermissionsDetail;
  catalog: PermissionCatalogItem[];
  draft: Record<string, boolean>;
  busy: boolean;
  onChange: (key: string, granted: boolean) => void;
  onClose: () => void;
  onSave: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function StaffPermissionsDrawer({
  detail,
  catalog,
  draft,
  busy,
  onChange,
  onClose,
  onSave,
}: Props) {
  const [query, setQuery] = useState("");

  function moduleEnabled(module: PermissionModule) {
    return module.keys.some((key) => draft[key] === true);
  }

  function moduleFromTemplate(module: PermissionModule) {
    return module.keys.some((key) => detail.templatePermissions.includes(key));
  }

  function moduleIsCustom(module: PermissionModule) {
    return moduleFromTemplate(module) !== moduleEnabled(module);
  }

  function setModuleEnabled(module: PermissionModule, enabled: boolean) {
    for (const key of module.keys) {
      onChange(key, enabled);
    }
  }

  const visibleModules = useMemo(
    () =>
      PERMISSION_MODULES.filter((module) =>
        module.keys.some((key) => catalog.some((item) => item.key === key)),
      ),
    [catalog],
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter((item) => {
      if (!q && PERMISSION_MODULE_KEY_SET.has(item.key)) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q)
      );
    });

    const map = new Map<string, PermissionCatalogItem[]>();
    for (const item of filtered) {
      const cat = item.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }

    return CATEGORY_ORDER.filter((c) => map.has(c)).map((cat) => ({
      id: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      items: map.get(cat)!,
    }));
  }, [catalog, query]);

  const enabledCount = useMemo(
    () => catalog.filter((item) => draft[item.key] === true).length,
    [catalog, draft],
  );

  const templateCount = detail.templatePermissions.length;
  const customCount = useMemo(() => {
    let n = 0;
    for (const item of catalog) {
      const fromTemplate = detail.templatePermissions.includes(item.key);
      const checked = draft[item.key] === true;
      if (fromTemplate !== checked) n += 1;
    }
    return n;
  }, [catalog, draft, detail.templatePermissions]);

  const roleLabel =
    detail.roleTemplateName ?? detail.roleTemplateSlug?.replace(/_/g, " ") ?? "Staff";

  return (
    <>
      <div className="stu-drawer-backdrop" onClick={onClose} aria-hidden />
      <aside
        className="stu-drawer stu-drawer--wide perm-drawer"
        role="dialog"
        aria-labelledby="perm-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="stu-drawer__head perm-drawer__head">
          <div className="perm-drawer__hero">
            <span className="perm-drawer__avatar" aria-hidden>
              {initials(detail.name)}
            </span>
            <div>
              <h2 id="perm-drawer-title" className="stu-drawer__title">
                Permissions
              </h2>
              <p className="stu-drawer__sub">{detail.name}</p>
              <span className="perm-drawer__role">{roleLabel}</span>
            </div>
          </div>
          <button type="button" className="stu-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="stu-drawer__body perm-drawer__body">
          <div className="perm-drawer__stats">
            <div className="perm-stat">
              <span className="perm-stat__value">{enabledCount}</span>
              <span className="perm-stat__label">Enabled</span>
            </div>
            <div className="perm-stat">
              <span className="perm-stat__value">{templateCount}</span>
              <span className="perm-stat__label">From role</span>
            </div>
            <div className="perm-stat">
              <span className="perm-stat__value">{customCount}</span>
              <span className="perm-stat__label">Custom</span>
            </div>
          </div>

          <p className="perm-drawer__hint">
            Toggle access beyond the role template. Changes apply when you save.
          </p>

          {visibleModules.length > 0 ? (
            <section className="perm-modules" aria-label="Module access">
              <h3 className="perm-modules__title">Module access</h3>
              <ul className="perm-modules__list">
                {visibleModules.map((module) => {
                  const checked = moduleEnabled(module);
                  const fromTemplate = moduleFromTemplate(module);
                  const isCustom = moduleIsCustom(module);

                  return (
                    <li
                      key={module.id}
                      className={`perm-module${checked ? " perm-module--on" : ""}`}
                    >
                      <div className="perm-module__text">
                        <span className="perm-module__label">{module.label}</span>
                        <span className="perm-module__desc">{module.description}</span>
                        <div className="perm-module__meta">
                          {fromTemplate ? (
                            <span className="perm-badge perm-badge--template">Role</span>
                          ) : null}
                          {isCustom ? (
                            <span className="perm-badge perm-badge--custom">Custom</span>
                          ) : null}
                          <span className="perm-module__state">
                            {checked ? "On" : "Off"}
                          </span>
                        </div>
                      </div>
                      <label className="perm-toggle perm-toggle--module">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={checked}
                          aria-label={`${module.label} access`}
                          onChange={(e) => setModuleEnabled(module, e.target.checked)}
                        />
                        <span className="perm-toggle__track" aria-hidden />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="perm-drawer__search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search permissions…"
              aria-label="Search permissions"
            />
          </div>

          <div className="perm-drawer__groups">
            {grouped.length === 0 ? (
              <p className="perm-drawer__empty">No permissions match your search.</p>
            ) : (
              grouped.map((group) => (
                <section key={group.id} className="perm-group">
                  <h3 className="perm-group__title">{group.label}</h3>
                  <ul className="perm-group__list">
                    {group.items.map((item) => {
                      const fromTemplate = detail.templatePermissions.includes(item.key);
                      const checked = draft[item.key] === true;
                      const isCustom = fromTemplate !== checked;

                      return (
                        <li key={item.key} className="perm-item">
                          <div className="perm-item__text">
                            <span className="perm-item__label">{item.label}</span>
                            {item.description ? (
                              <span className="perm-item__desc">{item.description}</span>
                            ) : null}
                            <span className="perm-item__key">{item.key}</span>
                          </div>
                          <div className="perm-item__aside">
                            {fromTemplate ? (
                              <span className="perm-badge perm-badge--template">Role</span>
                            ) : null}
                            {isCustom ? (
                              <span className="perm-badge perm-badge--custom">Custom</span>
                            ) : null}
                            <label className="perm-toggle">
                              <input
                                type="checkbox"
                                role="switch"
                                checked={checked}
                                onChange={(e) => onChange(item.key, e.target.checked)}
                              />
                              <span className="perm-toggle__track" aria-hidden />
                            </label>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>

        <footer className="stu-drawer__foot perm-drawer__foot">
          <button type="button" className="stu-btn stu-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="stu-btn stu-btn--primary"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? "Saving…" : "Save permissions"}
          </button>
        </footer>
      </aside>
    </>
  );
}
