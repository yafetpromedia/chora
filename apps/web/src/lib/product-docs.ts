import { getApiBaseUrl } from "@/lib/api";

/**
 * Fallback public path when platform settings have no uploaded PDF.
 * Place a file at apps/web/public/documents/chora-product-documentation.pdf
 * or override with NEXT_PUBLIC_CHORA_PRODUCT_DOCS_URL.
 */
export const PRODUCT_DOCS_FALLBACK_PATH =
  process.env.NEXT_PUBLIC_CHORA_PRODUCT_DOCS_URL?.trim() ||
  "/documents/chora-product-documentation.pdf";

export const PRODUCT_DOCS_FILENAME = "Chora-Product-Documentation.pdf";

export const PRODUCT_DOCS_META = {
  pages: "24+ pages",
  kind: "Product Guide",
  audience: "For Schools",
} as const;

export const PRODUCT_DOCS_BENEFITS = [
  "Platform overview",
  "Features & workflows",
  "Implementation & support",
] as const;

/** Resolve platform-uploaded or static docs URL for the marketing site. */
export function resolveProductDocsUrl(url: string | null | undefined) {
  const trimmed = url?.trim();
  if (!trimmed) return PRODUCT_DOCS_FALLBACK_PATH;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/platform/")) {
    return `${getApiBaseUrl()}${trimmed}`;
  }
  return trimmed;
}

export function productDocsDownloadUrl(resolvedUrl: string) {
  if (!resolvedUrl.includes("/platform/docs/files/")) {
    return resolvedUrl;
  }
  return `${resolvedUrl}${resolvedUrl.includes("?") ? "&" : "?"}download=1`;
}
