import assert from "node:assert/strict";
import test from "node:test";

/**
 * Mirror of api-base-url.ts for Node's built-in test runner without a TS loader.
 * Keep in sync with src/lib/api-base-url.ts.
 */
function isLocalDevHost(hostname) {
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

function stripTrailingSlash(url) {
  return url.replace(/\/$/, "");
}

function resolveApiBaseUrl(opts = {}) {
  const configured = opts.configuredBaseUrl?.trim();
  if (configured) return stripTrailingSlash(configured);
  const nodeEnv = opts.nodeEnv ?? "development";
  const loc = opts.windowLocation ?? null;
  const apiPort = opts.apiPort?.trim() || "3001";
  if (loc) {
    if (isLocalDevHost(loc.hostname) && nodeEnv !== "production") {
      return `${loc.origin}/backend`;
    }
    return `${loc.origin}/backend`;
  }
  if (nodeEnv === "production") return "/backend";
  return `http://localhost:${apiPort}`;
}

function resolveUploadApiBaseUrl(opts = {}) {
  const nodeEnv = opts.nodeEnv ?? "development";
  const loc = opts.windowLocation ?? null;
  const apiPort = opts.apiPort?.trim() || "3001";
  if (loc && isLocalDevHost(loc.hostname) && nodeEnv !== "production") {
    return `${loc.protocol}//${loc.hostname}:${apiPort}`;
  }
  return resolveApiBaseUrl(opts);
}

test("production configured base URL wins and strips trailing slash", () => {
  const url = resolveApiBaseUrl({
    configuredBaseUrl: "https://chora.awuddigitals.com/backend/",
    nodeEnv: "production",
    windowLocation: {
      hostname: "chora.awuddigitals.com",
      origin: "https://chora.awuddigitals.com",
      protocol: "https:",
    },
  });
  assert.equal(url, "https://chora.awuddigitals.com/backend");
});

test("production browser never falls back to localhost", () => {
  const url = resolveApiBaseUrl({
    configuredBaseUrl: "",
    nodeEnv: "production",
    windowLocation: {
      hostname: "chora.awuddigitals.com",
      origin: "https://chora.awuddigitals.com",
      protocol: "https:",
    },
  });
  assert.equal(url, "https://chora.awuddigitals.com/backend");
  assert.equal(url.includes("localhost"), false);
});

test("production uploads use same-origin backend base", () => {
  const opts = {
    configuredBaseUrl: "https://chora.awuddigitals.com/backend",
    nodeEnv: "production",
    windowLocation: {
      hostname: "chora.awuddigitals.com",
      origin: "https://chora.awuddigitals.com",
      protocol: "https:",
    },
  };
  assert.equal(resolveUploadApiBaseUrl(opts), "https://chora.awuddigitals.com/backend");
});

test("local development uses Next /backend rewrite for API", () => {
  const url = resolveApiBaseUrl({
    configuredBaseUrl: "",
    nodeEnv: "development",
    windowLocation: {
      hostname: "localhost",
      origin: "http://localhost:3000",
      protocol: "http:",
    },
    apiPort: "3001",
  });
  assert.equal(url, "http://localhost:3000/backend");
});

test("local development uploads hit the API port directly", () => {
  const url = resolveUploadApiBaseUrl({
    configuredBaseUrl: "",
    nodeEnv: "development",
    windowLocation: {
      hostname: "localhost",
      origin: "http://localhost:3000",
      protocol: "http:",
    },
    apiPort: "3001",
  });
  assert.equal(url, "http://localhost:3001");
});
