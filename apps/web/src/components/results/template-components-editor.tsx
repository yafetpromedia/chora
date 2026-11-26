"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export type TemplateComponentDraft = {
  name: string;
  weightPercent: number;
  maxScore: number;
};

type Props = {
  components: TemplateComponentDraft[];
  onChange: (next: TemplateComponentDraft[]) => void;
};

export function TemplateComponentsEditor({ components, onChange }: Props) {
  const { t } = useLocale();

  function updateRow(index: number, patch: Partial<TemplateComponentDraft>) {
    const next = [...components];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([
      ...components,
      { name: t("templateComponentsEditorUi.newComponentDefault"), weightPercent: 0, maxScore: 10 },
    ]);
  }

  function removeRow(index: number) {
    if (components.length <= 1) return;
    onChange(components.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= components.length) return;
    const next = [...components];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    onChange(next);
  }

  return (
    <div className="res-components-editor">
      <p className="res-components-editor__title">{t("templateComponentsEditorUi.title")}</p>

      <div className="res-components-editor__grid" role="table" aria-label={t("templateComponentsEditorUi.tableAria")}>
        <div className="res-components-editor__grid-head" role="row">
          <span role="columnheader">{t("templateComponentsEditorUi.colComponent")}</span>
          <span role="columnheader">{t("templateComponentsEditorUi.colWeight")}</span>
          <span role="columnheader">{t("templateComponentsEditorUi.colMax")}</span>
          <span className="res-components-editor__grid-actions-label" role="columnheader">
            {t("templateComponentsEditorUi.colOrder")}
          </span>
        </div>

        {components.map((c, i) => (
          <div key={i} className="res-components-editor__grid-row" role="row">
            <label className="res-components-editor__cell res-components-editor__cell--name">
              <span className="res-components-editor__sr-only">{t("templateComponentsEditorUi.srComponent")}</span>
              <input
                value={c.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder={t("templateComponentsEditorUi.placeholderName")}
              />
            </label>
            <label className="res-components-editor__cell res-components-editor__cell--num">
              <span className="res-components-editor__sr-only">{t("templateComponentsEditorUi.srWeight")}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={c.weightPercent}
                onChange={(e) =>
                  updateRow(i, { weightPercent: Number(e.target.value) })
                }
              />
            </label>
            <label className="res-components-editor__cell res-components-editor__cell--num">
              <span className="res-components-editor__sr-only">{t("templateComponentsEditorUi.srMax")}</span>
              <input
                type="number"
                min={1}
                value={c.maxScore}
                onChange={(e) => updateRow(i, { maxScore: Number(e.target.value) })}
              />
            </label>
            <div className="res-components-editor__actions" role="cell">
              <button
                type="button"
                className="res-components-editor__icon-btn"
                disabled={i === 0}
                onClick={() => moveRow(i, -1)}
                title={t("templateComponentsEditorUi.moveUp")}
                aria-label={t("templateComponentsEditorUi.moveUp")}
              >
                ↑
              </button>
              <button
                type="button"
                className="res-components-editor__icon-btn"
                disabled={i === components.length - 1}
                onClick={() => moveRow(i, 1)}
                title={t("templateComponentsEditorUi.moveDown")}
                aria-label={t("templateComponentsEditorUi.moveDown")}
              >
                ↓
              </button>
              <button
                type="button"
                className="res-components-editor__remove-btn"
                disabled={components.length <= 1}
                onClick={() => removeRow(i)}
              >
                {t("common.remove")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="res-components-editor__add" onClick={addRow}>
        {t("templateComponentsEditorUi.addComponent")}
      </button>
    </div>
  );
}