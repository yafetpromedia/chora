"use client";

import { Suspense } from "react";
import { TeacherResultsPage } from "../teacher-results-page";

export default function TeacherResultsByStudentPage() {
  return (
    <Suspense
      fallback={
        <div className="res-scores-loading" style={{ padding: "2rem" }}>
          <span className="res-scores-loading__spinner" aria-hidden />
          <p>Loading score entry…</p>
        </div>
      }
    >
      <TeacherResultsPage section="by-student" />
    </Suspense>
  );
}
