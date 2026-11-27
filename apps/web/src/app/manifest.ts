import type { MetadataRoute } from "next";
import { BRAND_NAME, BRAND_NAME_AM, BRAND_TAGLINE } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} (${BRAND_NAME_AM})`,
    short_name: BRAND_NAME,
    description: BRAND_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#042f2e",
    theme_color: "#0f766e",
    lang: "en",
    icons: [
      {
        src: "/brand/chora-favicon.png",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/brand/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
