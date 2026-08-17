"use client";

import { useEffect, useState } from "react";
import {
  getPublicPlatformConfig,
  resolveLandingHeroUrl,
} from "@/lib/public-platform-config";

export function useLandingHeroImage() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicPlatformConfig()
      .then((cfg) => {
        if (!cancelled) setSrc(resolveLandingHeroUrl(cfg.landingHeroImageUrl));
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return src;
}
