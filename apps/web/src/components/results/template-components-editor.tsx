"use client";

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
  function updateRow(index: number, patch: Partial<TemplateComponentDraft>) {
    const next = [...components];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([
      ...components,
      { name: "New component", weightPercent: 0, maxScore: 10 },
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
      <p className="res-components-editor__title">Assessment components</p>

      <div className="res-components-editor__grid" role="table" aria-label="Template components">
        <div className="res-components-editor__grid-head" role="row">
          <span role="columnheader">Component</span>
          <span role="columnheader">Wt %</span>
          <span role="columnheader">Max</span>
          <span className="res-components-editor__grid-actions-label" role="columnheader">
            Order
          </span>
        </div>

        {components.map((c, i) => (
          <div key={i} className="res-components-editor__grid-row" role="row">
            <label className="res-components-editor__cell res-components-editor__cell--name">
              <span className="res-components-editor__sr-only">Component</span>
              <input
                value={c.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder="e.g. Quiz"
              />
            </label>
            <label className="res-components-editor__cell res-components-editor__cell--num">
              <span className="res-components-editor__sr-only">Weight percent</span>
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
              <span className="res-components-editor__sr-only">Max score</span>
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
                title="Move up"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="res-components-editor__icon-btn"
                disabled={i === components.length - 1}
                onClick={() => moveRow(i, 1)}
                title="Move down"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="res-components-editor__remove-btn"
                disabled={components.length <= 1}
                onClick={() => removeRow(i)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="res-components-editor__add" onClick={addRow}>
        + Add component
      </button>
    </div>
  );
}
