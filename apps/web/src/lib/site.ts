import { BRAND_FULL, BRAND_NAME, BRAND_NAME_AM, BRAND_TAGLINE } from "@/lib/brand";

/** Canonical production host for Chora. */
export const SITE_HOST = "chora.awuddigitals.com";
export const SITE_ORIGIN_DEFAULT = `https://${SITE_HOST}`;

export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEB_APP_URL?.trim() ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return SITE_ORIGIN_DEFAULT;
}

export const SITE_NAME = BRAND_NAME;
export const SITE_NAME_FULL = BRAND_FULL;
export const SITE_TAGLINE = BRAND_TAGLINE;

export const SITE_TITLE_DEFAULT =
  "Chora (ጮራ) — School management for Ethiopian schools";

export const SITE_DESCRIPTION_DEFAULT =
  "One clear place for your whole school. Attendance, results, fees, admissions, and parent access — built for Ethiopian schools with English & አማርኛ, Chapa payments, and Fayeda Connect.";

export const SITE_KEYWORDS = [
  "Chora",
  "ጮራ",
  "school management system",
  "Ethiopian schools",
  "school software Ethiopia",
  "attendance",
  "report cards",
  "Chapa school fees",
  "Fayeda Connect",
  "Amharic school portal",
  "Awud Digitals",
  SITE_HOST,
] as const;

export const SITE_OG_IMAGE = "/brand/chora-demo-poster.png";

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    alternateName: BRAND_NAME_AM,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url,
    description: SITE_DESCRIPTION_DEFAULT,
    image: absoluteUrl(SITE_OG_IMAGE),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ETB",
      description: "14-day free trial",
    },
    publisher: {
      "@type": "Organization",
      name: "Awud Digitals",
      url: "https://awuddigitals.com",
    },
  };
}
