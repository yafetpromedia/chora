"use client";

import { Suspense } from "react";
import { ReportCardPrintInner } from "./print-inner";

export default function ReportCardPrintPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Preparing report card…</p>}>
      <ReportCardPrintInner />
    </Suspense>
  );
}
