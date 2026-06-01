export type BulkPrintLayout = "6" | "8";

/** Full = same layout as preview (1 student per page). Sheet = mini cards, 6–8 per page. */
export type IdCardPrintStyle = "full" | "sheet";

export type StudentIdCardPrintFilters = {
  gradeId?: string;
  sectionId?: string;
  duplex?: boolean;
  style?: IdCardPrintStyle;
  /** Mini cards per A4 sheet (6 or 8) when style is sheet. */
  perPage?: BulkPrintLayout;
  /** Load and print all matching students in one job (chunked on the print page). */
  all?: boolean;
  /** Print one batch when not using `all`. */
  batch?: number;
  batchSize?: number;
};

export type PrintStudentIdCardOptions = {
  studentProfileId?: string;
  duplex?: boolean;
  /** @deprecated Use openBulkIdCardPrint instead. */
  inline?: boolean;
  bulk?: StudentIdCardPrintFilters;
};

export const BULK_PRINT_BATCH_SIZE = 80;
export const BULK_PRINT_WARN_ALL = 400;

function bulkPrintSearchParams(filters: StudentIdCardPrintFilters) {
  const params = new URLSearchParams();
  if (filters.gradeId) params.set("gradeId", filters.gradeId);
  if (filters.sectionId) params.set("sectionId", filters.sectionId);
  params.set("duplex", filters.duplex !== false ? "1" : "0");
  params.set("style", filters.style ?? "full");
  params.set("perPage", filters.perPage ?? "6");
  if (filters.all) {
    params.set("all", "1");
    params.set("batchSize", String(filters.batchSize ?? BULK_PRINT_BATCH_SIZE));
  } else {
    params.set("batch", String(filters.batch ?? 0));
    params.set("batchSize", String(filters.batchSize ?? BULK_PRINT_BATCH_SIZE));
  }
  return params;
}

export function openBulkIdCardPrint(filters: StudentIdCardPrintFilters) {
  const params = bulkPrintSearchParams(filters);
  window.open(`/print/student-id-cards?${params}`, "_blank", "noopener,noreferrer");
}

/** Opens a print-ready view (single student or bulk sheet). */
export function printStudentIdCard(options?: PrintStudentIdCardOptions) {
  const { studentProfileId, duplex = true, bulk } = options ?? {};

  if (bulk) {
    openBulkIdCardPrint(bulk);
    return;
  }

  if (studentProfileId) {
    const params = new URLSearchParams({
      id: studentProfileId,
      duplex: duplex ? "1" : "0",
    });
    window.open(`/print/student-id-card?${params}`, "_blank", "noopener,noreferrer");
    return;
  }

  document.body.classList.add("sid-print-active");
  const cleanup = () => {
    document.body.classList.remove("sid-print-active");
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
