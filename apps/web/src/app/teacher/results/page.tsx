"use client";

import { Suspense } from "react";
import { TeacherResultsInner } from "./results-inner";

export default function TeacherResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="res-scores-loading" style={{ padding: "2rem" }}>
          <span className="res-scores-loading__spinner" aria-hidden />
          <p>Loading score entry…</p>
        </div>
      }
    >
      <TeacherResultsInner />
    </Suspense>
  );
}
