"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LANDING_HERO,
  getPublicPlatformConfig,
  resolveLandingHeroUrl,
} from "@/lib/public-platform-config";

export function useLandingHeroImage() {
  const [src, setSrc] = useState(DEFAULT_LANDING_HERO);

  useEffect(() => {
    let cancelled = false;
    void getPublicPlatformConfig()
      .then((cfg) => {
        if (!cancelled) setSrc(resolveLandingHeroUrl(cfg.landingHeroImageUrl));
      })
      .catch(() => {
        if (!cancelled) setSrc(DEFAULT_LANDING_HERO);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return src;
}
