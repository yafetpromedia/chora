"use client";

import { useEffect, useState } from "react";
import { SocialBrandIcon } from "@/components/landing/social-brand-icon";
import { BRAND_NAME } from "@/lib/brand";
import { getPublicPlatformConfig } from "@/lib/public-platform-config";
import { buildPublicSocialLinks } from "@/lib/social-links";

export function LandingFooterSocial() {
  const [links, setLinks] = useState<ReturnType<typeof buildPublicSocialLinks>>([]);

  useEffect(() => {
    let cancelled = false;
    void getPublicPlatformConfig()
      .then((cfg) => {
        if (cancelled) return;
        setLinks(buildPublicSocialLinks(cfg));
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (links.length === 0) return null;

  return (
    <div className="lp3-footer__social" aria-label={`${BRAND_NAME} social media`}>
      {links.map((item) => (
        <a
          key={item.brand}
          href={item.href}
          className="lp3-footer__social-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${BRAND_NAME} on ${item.label}`}
        >
          <SocialBrandIcon brand={item.brand} />
        </a>
      ))}
    </div>
  );
}
