import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Monorepo root — avoids Next picking C:\Users\hp\ when another lockfile exists. */
const turbopackRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** LAN IPs for phone testing — set NEXT_PUBLIC_LAN_ORIGIN or add your ipconfig IPv4. */
const LAN_DEV_ORIGINS = [
  process.env.NEXT_PUBLIC_LAN_ORIGIN?.trim(),
  "192.168.0.160",
  "192.168.1.9",
].filter((v): v is string => Boolean(v));

function lanOriginVariants(host: string) {
  return [host, `${host}:3000`, `http://${host}`, `http://${host}:3000`];
}

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  // Required in Next 16 when opening dev from http://192.168.x.x:3000 (phone / other PC)
  allowedDevOrigins: LAN_DEV_ORIGINS.flatMap(lanOriginVariants),
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const apiPort = process.env.API_PORT?.trim() || "3001";
    return [
      {
        source: "/backend/:path*",
        destination: `http://127.0.0.1:${apiPort}/:path*`,
      },
    ];
  },
};

export default nextConfig;
