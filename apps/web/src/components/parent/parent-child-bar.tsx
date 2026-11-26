"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { childClassLabel, type ParentChildOption } from "@/lib/parent-child";

type Props = {
  /** Preferred: list of linked children. */
  options?: ParentChildOption[];
  /** @deprecated Use `options` (passing children as a prop trips react/no-children-prop). */
  children?: ParentChildOption[];
  selectedId: string;
  onChange: (profileId: string) => void;
  label?: string;
  loading?: boolean;
  className?: string;
};

export function ParentChildBar({
  options,
  children,
  selectedId,
  onChange,
  label,
  loading = false,
  className = "",
}: Props) {
  const { t } = useLocale();
  const barLabel = label ?? t("common.child");
  const kids = options ?? children ?? [];
  if (loading) {
    return (
      <div className={`par-child-bar par-child-bar--loading ${className}`.trim()}>
        <span className="par-child-bar__spinner" aria-hidden />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  if (kids.length === 0) {
    return (
      <div className={`par-child-bar par-child-bar--empty ${className}`.trim()}>
        {t("parentAttendance.noLinkedHint")}
      </div>
    );
  }

  if (kids.length === 1) {
    const only = kids[0];
    return (
      <div className={`par-child-bar par-child-bar--single ${className}`.trim()}>
        <span className="par-child-bar__label">{barLabel}</span>
        <strong className="par-child-bar__name">{only.name}</strong>
        <span className="par-child-bar__meta">{childClassLabel(only)}</span>
      </div>
    );
  }

  return (
    <label className={`par-child-bar ${className}`.trim()}>
      <span className="par-child-bar__label">{barLabel}</span>
      <select
        className="par-child-bar__select"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
      >
        {kids.map((child) => (
          <option key={child.profileId} value={child.profileId}>
            {child.name} · {childClassLabel(child)}
          </option>
        ))}
      </select>
    </label>
  );
}
