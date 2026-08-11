"use client";

import { Suspense } from "react";
import { ParentReportCardPrintInner } from "./print-inner";

export default function ParentReportCardPrintPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Preparing report card…</p>}>
      <ParentReportCardPrintInner />
    </Suspense>
  );
}
