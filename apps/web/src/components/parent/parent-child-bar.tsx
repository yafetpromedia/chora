"use client";

import { childClassLabel, type ParentChildOption } from "@/lib/parent-child";

type Props = {
  children: ParentChildOption[];
  selectedId: string;
  onChange: (profileId: string) => void;
  label?: string;
  loading?: boolean;
  className?: string;
};

export function ParentChildBar({
  children: kids,
  selectedId,
  onChange,
  label = "Viewing",
  loading = false,
  className = "",
}: Props) {
  if (loading) {
    return (
      <div className={`par-child-bar par-child-bar--loading ${className}`.trim()}>
        <span className="par-child-bar__spinner" aria-hidden />
        <span>Loading children…</span>
      </div>
    );
  }

  if (kids.length === 0) {
    return (
      <div className={`par-child-bar par-child-bar--empty ${className}`.trim()}>
        No children linked to your account. Contact the school office to link a student.
      </div>
    );
  }

  if (kids.length === 1) {
    const only = kids[0];
    return (
      <div className={`par-child-bar par-child-bar--single ${className}`.trim()}>
        <span className="par-child-bar__label">{label}</span>
        <strong className="par-child-bar__name">{only.name}</strong>
        <span className="par-child-bar__meta">{childClassLabel(only)}</span>
      </div>
    );
  }

  return (
    <label className={`par-child-bar ${className}`.trim()}>
      <span className="par-child-bar__label">{label}</span>
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
