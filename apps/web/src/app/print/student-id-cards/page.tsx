"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentIdCardBulkSheet } from "@/components/students/student-id-card-bulk-sheet";
import { StudentIdCardFullPrintList } from "@/components/students/student-id-card-full-print-list";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { buildCardQrMap } from "@/lib/student-card-qr";
import {
  BULK_PRINT_BATCH_SIZE,
  type BulkPrintLayout,
  type IdCardPrintStyle,
} from "@/lib/student-card-print";
import { countStudentIdCards, listStudentIdCards, type StudentIdCard } from "@/lib/student-cards";

function parseFilters(params: URLSearchParams) {
  const gradeId = params.get("gradeId") ?? undefined;
  const sectionId = params.get("sectionId") ?? undefined;
  const duplex = params.get("duplex") !== "0";
  const perPage = (params.get("perPage") === "8" ? "8" : "6") as BulkPrintLayout;
  const style: IdCardPrintStyle = params.get("style") === "sheet" ? "sheet" : "full";
  const all = params.get("all") === "1";
  const batch = Math.max(0, Number(params.get("batch") ?? "0") || 0);
  const batchSize = Math.min(
    200,
    Math.max(20, Number(params.get("batchSize") ?? String(BULK_PRINT_BATCH_SIZE)) || BULK_PRINT_BATCH_SIZE),
  );
  return { gradeId, sectionId, duplex, perPage, style, all, batch, batchSize };
}

function BulkPrintPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState<StudentIdCard[]>([]);
  const [qrMap, setQrMap] = useState<Map<string, string>>(new Map());
  const [phase, setPhase] = useState<"auth" | "loading" | "qr" | "ready" | "error">("auth");
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [error, setError] = useState("");

  const batchCount = total > 0 ? Math.ceil(total / filters.batchSize) : 0;
  const batchStart = filters.all ? 0 : filters.batch * filters.batchSize;
  const batchEnd = filters.all ? total : Math.min(total, batchStart + filters.batchSize);
  const pageOffset = filters.all
    ? 0
    : Math.floor(batchStart / (filters.perPage === "8" ? 8 : 6));

  const loadAllCards = useCallback(async () => {
    const all: StudentIdCard[] = [];
    let skip = 0;
    const take = filters.batchSize;
    while (skip < total) {
      setProgress({
        done: skip,
        total,
        label: `Loading students ${skip + 1}–${Math.min(skip + take, total)} of ${total}…`,
      });
      const chunk = await listStudentIdCards({
        gradeId: filters.gradeId,
        sectionId: filters.sectionId,
        skip,
        take,
      });
      all.push(...chunk);
      skip += take;
      if (chunk.length < take) break;
    }
    return all;
  }, [filters, total]);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function run() {
      setPhase("loading");
      setError("");
      try {
        const { count } = await countStudentIdCards({
          gradeId: filters.gradeId,
          sectionId: filters.sectionId,
        });
        if (cancelled) return;
        setTotal(count);
        if (count === 0) {
          setPhase("ready");
          return;
        }

        let loaded: StudentIdCard[];
        if (filters.all) {
          loaded = await loadAllCards();
        } else {
          setProgress({
            done: 0,
            total: count,
            label: `Loading batch ${filters.batch + 1}…`,
          });
          loaded = await listStudentIdCards({
            gradeId: filters.gradeId,
            sectionId: filters.sectionId,
            skip: filters.batch * filters.batchSize,
            take: filters.batchSize,
          });
        }
        if (cancelled) return;
        setCards(loaded);

        if (filters.duplex && loaded.length > 0) {
          setPhase("qr");
          const map = await buildCardQrMap(loaded, 100, (done, qrTotal) => {
            if (!cancelled) {
              setProgress({
                done,
                total: qrTotal,
                label: `Generating QR codes ${done} / ${qrTotal}…`,
              });
            }
          });
          if (cancelled) return;
          setQrMap(map);
        }

        setPhase("ready");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not prepare print");
          setPhase("error");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [filters, router, loadAllCards]);

  useEffect(() => {
    if (phase !== "ready" || cards.length === 0) return;
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, [phase, cards.length]);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (filters.gradeId) parts.push("Filtered by grade");
    if (filters.sectionId) parts.push("section");
    return parts.length ? parts.join(" · ") : "All students";
  }, [filters]);

  if (phase === "error") {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>{error}</p>
      </div>
    );
  }

  if (phase === "ready" && total === 0) {
    return (
      <div className="sid-print-page sid-print-page--error">
        <p>No students match this filter.</p>
      </div>
    );
  }

  if (phase !== "ready") {
    const pct =
      progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="sid-print-page">
        <div className="sid-print-progress">
          <p className="sid-print-progress__brand">CampusOne · Bulk ID cards</p>
          <h1>Preparing print job</h1>
          <p className="sid-print-progress__label">{progress.label || "Starting…"}</p>
          <div className="sid-print-progress__bar" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="sid-print-progress__pct">{pct}%</p>
          {total > 0 ? (
            <p className="sid-print-progress__meta">
              {total.toLocaleString()} students · {filterLabel}
              {filters.all
                ? " · full run"
                : ` · batch ${filters.batch + 1} of ${batchCount}`}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const schoolName = cards[0]?.schoolName ?? "School";
  const printedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="sid-print-page sid-print-page--bulk">
      <header className="sid-print-meta sid-print-meta--page">
        <div className="sid-print-meta__row">
          {cards[0]?.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cards[0].schoolLogoUrl} alt="" className="sid-print-meta__logo" />
          ) : null}
          <div className="sid-print-meta__copy">
            <p className="sid-print-meta__brand">CampusOne · Bulk student IDs</p>
            <h1 className="sid-print-meta__title">{schoolName}</h1>
            <p className="sid-print-meta__sub">
              {cards.length.toLocaleString()} of {total.toLocaleString()} students · {filterLabel}
              {!filters.all && batchCount > 1
                ? ` · batch ${filters.batch + 1} / ${batchCount} (rows ${batchStart + 1}–${batchEnd})`
                : null}
            </p>
          </div>
        </div>
        <ul className="sid-print-checklist">
          {filters.style === "full" ? (
            <li>
              <strong>Full card</strong> — same layout as on screen (Sex, Address, all fields)
            </li>
          ) : (
            <li>
              <strong>{filters.perPage === "8" ? "8" : "6"}</strong> mini cards per sheet ·{" "}
              {filters.duplex ? "front + back per group" : "fronts only"}
            </li>
          )}
          <li>
            Enable <strong>Print backgrounds</strong> / <strong>Background graphics</strong> in the
            print dialog
          </li>
          {filters.duplex ? (
            <li>Double-sided · <strong>Flip on long edge</strong></li>
          ) : null}
          <li>Save as PDF for print shops or copy centers</li>
        </ul>
        <p className="sid-print-meta__date">Generated {printedAt}</p>
      </header>

      {filters.style === "full" ? (
        <StudentIdCardFullPrintList cards={cards} duplex={filters.duplex} qrMap={qrMap} />
      ) : (
        <StudentIdCardBulkSheet
          cards={cards}
          perPage={filters.perPage}
          duplex={filters.duplex}
          qrMap={qrMap}
          pageOffset={pageOffset}
        />
      )}

      {!filters.all && batchCount > 1 && filters.batch + 1 < batchCount ? (
        <p className="sid-print-batch-nav no-print">
          After this batch, open batch {filters.batch + 2}: add{" "}
          <code>?batch={filters.batch + 1}</code> to the URL or re-run print from the app.
        </p>
      ) : null}

      <footer className="sid-print-foot">
        {schoolName} · {cards.length} cards on this document
      </footer>
    </div>
  );
}

export default function BulkStudentIdCardsPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="sid-print-page">
          <p className="sid-print-page__loading">Loading…</p>
        </div>
      }
    >
      <BulkPrintPageInner />
    </Suspense>
  );
}
