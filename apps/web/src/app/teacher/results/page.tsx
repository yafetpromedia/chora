"use client";

import { Suspense } from "react";
import { TeacherResultsInner } from "./results-inner";

export default function TeacherResultsPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading…</p>}>
      <TeacherResultsInner />
    </Suspense>
  );
}
