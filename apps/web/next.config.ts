import type { NextConfig } from "next";

/** LAN IP for phone testing — update if your Wi‑Fi IP changes (ipconfig). */
const LAN_DEV_ORIGIN = process.env.NEXT_PUBLIC_LAN_ORIGIN?.trim() || "192.168.1.9";

const nextConfig: NextConfig = {
  // Required in Next 16 when opening dev from http://192.168.x.x:3000 (phone / other PC)
  allowedDevOrigins: [
    LAN_DEV_ORIGIN,
    `${LAN_DEV_ORIGIN}:3000`,
    `http://${LAN_DEV_ORIGIN}`,
    `http://${LAN_DEV_ORIGIN}:3000`,
  ],
};

export default nextConfig;
