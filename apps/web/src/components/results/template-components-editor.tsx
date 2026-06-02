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
  const weightTotal = components.reduce((sum, c) => sum + (c.weightPercent || 0), 0);

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
      <div className="res-components-editor__head">
        <p className="setup-panel-label" style={{ margin: 0 }}>
          Assessment components
        </p>
        <p
          className={`tch-meta res-components-editor__total${
            weightTotal === 100 ? " res-components-editor__total--ok" : ""
          }`}
        >
          Weight total: <strong>{weightTotal}%</strong>
          {weightTotal !== 100 ? " (must equal 100%)" : ""}
        </p>
      </div>

      {components.map((c, i) => (
        <div key={i} className="att-filters res-components-editor__row">
          <label className="att-field">
            <span>Component</span>
            <input
              className="auth-input auth-input--login auth-input--login-plain"
              value={c.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
            />
          </label>
          <label className="att-field">
            <span>Weight %</span>
            <input
              type="number"
              min={0}
              max={100}
              className="auth-input auth-input--login auth-input--login-plain"
              value={c.weightPercent}
              onChange={(e) =>
                updateRow(i, { weightPercent: Number(e.target.value) })
              }
            />
          </label>
          <label className="att-field">
            <span>Max score</span>
            <input
              type="number"
              min={1}
              className="auth-input auth-input--login auth-input--login-plain"
              value={c.maxScore}
              onChange={(e) => updateRow(i, { maxScore: Number(e.target.value) })}
            />
          </label>
          <div className="res-components-editor__actions">
            <button
              type="button"
              className="dash-copy-btn"
              disabled={i === 0}
              onClick={() => moveRow(i, -1)}
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="dash-copy-btn"
              disabled={i === components.length - 1}
              onClick={() => moveRow(i, 1)}
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              className="dash-copy-btn"
              disabled={components.length <= 1}
              onClick={() => removeRow(i)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="dash-copy-btn" onClick={addRow}>
        + Add component
      </button>
    </div>
  );
}
