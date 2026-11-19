"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveResultWorkflow,
  approveResultWorkflowBulk,
  listPendingWorkflow,
  publishResultWorkflow,
  publishResultWorkflowBulk,
  type AcademicTerm,
  type PendingWorkflowItem,
} from "@/lib/results";
import { AppToast } from "@/components/ui/app-toast";

const PAGE_SIZE = 40;

type Props = {
  terms: AcademicTerm[];
  defaultTermId?: string;
  onError?: (message: string) => void;
  onCountChange?: (count: number) => void;
};

function sheetLabel(p: PendingWorkflowItem) {
  const cs = p.classSubject;
  return `${cs.grade.name}${cs.section ? ` ${cs.section.name}` : ""} — ${cs.subject.name}`;
}

export function PendingApprovalsPanel({
  terms,
  defaultTermId,
  onError,
  onCountChange,
}: Props) {
  const [termIdState, setTermId] = useState(defaultTermId ?? "");
  const termId = termIdState || defaultTermId || "";
  const [pending, setPending] = useState<PendingWorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [flash, setFlash] = useState("");

  const termName = terms.find((t) => t.id === termId)?.name ?? "All terms";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPendingWorkflow(
        termId ? { termId, status: "SUBMITTED" } : { status: "SUBMITTED" },
      );
      setPending(rows);
      onCountChange?.(rows.length);
      setSelected(new Set());
      setPage(0);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Could not load approvals");
    } finally {
      setLoading(false);
    }
  }, [termId, onError, onCountChange]);

  const [prevTermId, setPrevTermId] = useState(termId);
  if (termId !== prevTermId) {
    setPrevTermId(termId);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listPendingWorkflow(
          termId ? { termId, status: "SUBMITTED" } : { status: "SUBMITTED" },
        );
        if (cancelled) return;
        setPending(rows);
        onCountChange?.(rows.length);
        setSelected(new Set());
        setPage(0);
      } catch (err) {
        if (cancelled) return;
        onError?.(err instanceof Error ? err.message : "Could not load approvals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [termId, onError, onCountChange]);

  const pageCount = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => pending.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [pending, page],
  );
  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const selectedCount = selected.size;

  async function runBulk(
    action: "approve" | "publish",
    scope: "all" | "selected",
  ) {
    const count = scope === "all" ? pending.length : selectedCount;
    if (count === 0) return;

    const verb = action === "approve" ? "Approve" : "Publish";
    const scopeLabel =
      scope === "all"
        ? `all ${count} submitted sheets${termId ? ` in ${termName}` : ""}`
        : `${count} selected sheet${count === 1 ? "" : "s"}`;

    if (!window.confirm(`${verb} ${scopeLabel}?`)) return;

    setBusy(true);
    setFlash("");
    try {
      const body =
        scope === "selected"
          ? { sheetIds: [...selected], ...(termId ? { termId } : {}) }
          : { ...(termId ? { termId } : {}) };

      if (action === "approve") {
        const { approved } = await approveResultWorkflowBulk(body);
        setFlash(`Approved ${approved} score sheet${approved === 1 ? "" : "s"}.`);
      } else {
        const { published, skipped } = await publishResultWorkflowBulk(body);
        const skippedNote =
          skipped && skipped > 0
            ? ` Skipped ${skipped} empty sheet${skipped === 1 ? "" : "s"}.`
            : "";
        setFlash(
          `Published ${published} score sheet${published === 1 ? "" : "s"} to parents.${skippedNote}`,
        );
      }
      await load();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : `${verb} failed`);
    } finally {
      setBusy(false);
    }
  }

  async function onApproveOne(item: PendingWorkflowItem) {
    setBusy(true);
    setFlash("");
    try {
      await approveResultWorkflow(item.termId, item.classSubjectId);
      setFlash(`Approved ${sheetLabel(item)}.`);
      await load();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublishOne(item: PendingWorkflowItem) {
    setBusy(true);
    setFlash("");
    try {
      await publishResultWorkflow(item.termId, item.classSubjectId);
      setFlash(`Published ${sheetLabel(item)}.`);
      await load();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const p of pageItems) next.delete(p.id);
      } else {
        for (const p of pageItems) next.add(p.id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!loading && pending.length === 0) {
    return null;
  }

  return (
    <section className="res-approvals res-approvals--queue">
      <div className="res-approvals__banner">
        <div className="res-approvals__banner-icon" aria-hidden>
          ✓
        </div>
        <div className="res-approvals__banner-copy">
          <h2 className="res-approvals__title">Pending approvals</h2>
          <p className="res-approvals__sub">
            {loading
              ? "Loading submitted sheets…"
              : `${pending.length} score sheet${pending.length === 1 ? "" : "s"} waiting for academic office review`}
          </p>
        </div>
        <span className="res-approvals__count">{loading ? "…" : pending.length}</span>
      </div>

      <AppToast message={flash} tone="success" onDismiss={() => setFlash("")} />

      <div className="res-approvals__toolbar">
        <label className="res-approvals__filter">
          <span>Term</span>
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            disabled={busy}
          >
            <option value="">All terms</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.academicYear.name})
              </option>
            ))}
          </select>
        </label>

        <div className="res-approvals__bulk">
          <button
            type="button"
            className="res-approvals__btn res-approvals__btn--primary"
            disabled={busy || pending.length === 0}
            onClick={() => void runBulk("approve", "all")}
          >
            Approve all ({pending.length})
          </button>
          <button
            type="button"
            className="res-approvals__btn"
            disabled={busy || pending.length === 0}
            onClick={() => void runBulk("publish", "all")}
          >
            Publish all ({pending.length})
          </button>
          {selectedCount > 0 ? (
            <>
              <button
                type="button"
                className="res-approvals__btn res-approvals__btn--primary"
                disabled={busy}
                onClick={() => void runBulk("approve", "selected")}
              >
                Approve selected ({selectedCount})
              </button>
              <button
                type="button"
                className="res-approvals__btn"
                disabled={busy}
                onClick={() => void runBulk("publish", "selected")}
              >
                Publish selected ({selectedCount})
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="res-approvals__table-wrap">
        <table className="res-approvals__table">
          <thead>
            <tr>
              <th className="res-approvals__check-col">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  disabled={busy || pageItems.length === 0}
                  aria-label="Select all on this page"
                />
              </th>
              <th>Class</th>
              <th>Term</th>
              <th>Submitted by</th>
              <th className="res-approvals__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="res-approvals__empty">
                  Loading pending sheets…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="res-approvals__empty">
                  No submitted sheets for this term.
                </td>
              </tr>
            ) : (
              pageItems.map((p) => (
                <tr key={p.id}>
                  <td className="res-approvals__check-col">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      disabled={busy}
                      aria-label={`Select ${sheetLabel(p)}`}
                    />
                  </td>
                  <td>
                    <strong>{sheetLabel(p)}</strong>
                  </td>
                  <td>{p.term.name}</td>
                  <td>
                    {p.submitter
                      ? `${p.submitter.firstName} ${p.submitter.lastName}`
                      : "—"}
                  </td>
                  <td className="res-approvals__actions-col">
                    <button
                      type="button"
                      className="res-approvals__btn res-approvals__btn--sm res-approvals__btn--primary"
                      disabled={busy}
                      onClick={() => void onApproveOne(p)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="res-approvals__btn res-approvals__btn--sm"
                      disabled={busy}
                      onClick={() => void onPublishOne(p)}
                    >
                      Publish
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="res-approvals__pager">
          <button
            type="button"
            className="res-approvals__btn res-approvals__btn--sm"
            disabled={busy || page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="res-approvals__btn res-approvals__btn--sm"
            disabled={busy || page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
