/**
 * Pure helpers for resolving API base URLs.
 * Kept separate so production URL behavior can be unit-tested without DOM/Next.
 */

export type ApiBaseUrlOptions = {
  configuredBaseUrl?: string | null;
  nodeEnv?: string | null;
  /** Browser location when available */
  windowLocation?: { hostname: string; origin: string; protocol: string } | null;
  apiPort?: string | null;
};

export function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Resolve the API base used by browser fetches.
 * Production: NEXT_PUBLIC_API_BASE_URL, else same-origin `/backend` (nginx).
 * Never falls back to localhost in a production browser session.
 */
export function resolveApiBaseUrl(opts: ApiBaseUrlOptions = {}): string {
  const configured = opts.configuredBaseUrl?.trim();
  if (configured) return stripTrailingSlash(configured);

  const nodeEnv = opts.nodeEnv ?? "development";
  const loc = opts.windowLocation ?? null;
  const apiPort = opts.apiPort?.trim() || "3001";

  if (loc) {
    if (isLocalDevHost(loc.hostname) && nodeEnv !== "production") {
      return `${loc.origin}/backend`;
    }
    // Public host or production build: same-origin nginx `/backend` proxy.
    return `${loc.origin}/backend`;
  }

  if (nodeEnv === "production") {
    return "/backend";
  }
  return `http://localhost:${apiPort}`;
}

/**
 * Upload base URL.
 * Local dev hits the API port directly (avoids Next rewrite body limits).
 * Production uses the same base as normal API calls (nginx must allow large bodies).
 */
export function resolveUploadApiBaseUrl(opts: ApiBaseUrlOptions = {}): string {
  const nodeEnv = opts.nodeEnv ?? "development";
  const loc = opts.windowLocation ?? null;
  const apiPort = opts.apiPort?.trim() || "3001";

  if (loc && isLocalDevHost(loc.hostname) && nodeEnv !== "production") {
    return `${loc.protocol}//${loc.hostname}:${apiPort}`;
  }
  return resolveApiBaseUrl(opts);
}
