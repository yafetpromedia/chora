"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

export function AnimatedNav({ children }: { children: ReactNode }) {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const shadow = useTransform(
    scrollY,
    [0, 80],
    ["0 0 0 rgba(0,0,0,0)", "0 4px 24px rgba(42, 111, 111, 0.1)"],
  );

  if (reduce) {
    return <header className="nav-bar sticky top-0 z-50">{children}</header>;
  }

  return (
    <motion.header className="nav-bar sticky top-0 z-50" style={{ boxShadow: shadow }}>
      {children}
    </motion.header>
  );
}

export function NavLinks() {
  const { t } = useLocale();
  return (
    <nav className="hidden gap-8 text-sm font-semibold md:flex">
      <Link href="/demo" className="nav-link">
        {t("landing.demo")}
      </Link>
      <a href="#features" className="nav-link">
        {t("landing.product")}
      </a>
      <a href="#app" className="nav-link">
        {t("landing.mobileApp")}
      </a>
      <a href="#portals" className="nav-link">
        {t("landing.portals")}
      </a>
      <a href="#pricing" className="nav-link">
        {t("landing.pricing")}
      </a>
      <a href="#faq" className="nav-link">
        {t("landing.faq")}
      </a>
    </nav>
  );
}

export function NavBrand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <motion.div
        className="logo-mark"
        whileHover={{ scale: 1.05, rotate: 3 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <img src={BRAND_LOGO_SRC} alt="" className="brand-mark" />
      </motion.div>
      <span className="text-lg font-bold c-black">{BRAND_NAME}</span>
    </Link>
  );
}
