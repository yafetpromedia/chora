"use client";

import { Suspense } from "react";
import { StudentReportCardPrintInner } from "./print-inner";

export default function StudentReportCardPrintPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Preparing report card…</p>}>
      <StudentReportCardPrintInner />
    </Suspense>
  );
}
