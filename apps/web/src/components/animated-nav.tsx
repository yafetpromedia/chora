"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

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
  return (
    <nav className="hidden gap-8 text-sm font-semibold md:flex">
      <a href="#features" className="nav-link">Product</a>
      <a href="#app" className="nav-link">Mobile app</a>
      <a href="#portals" className="nav-link">Portals</a>
      <a href="#pricing" className="nav-link">Pricing</a>
      <a href="#faq" className="nav-link">FAQ</a>
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
        C1
      </motion.div>
      <span className="text-lg font-bold c-black">CampusOne</span>
    </Link>
  );
}
