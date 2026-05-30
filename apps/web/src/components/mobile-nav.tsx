"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#portals", label: "Portals" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Menu"
      >
        <span className={`burger-line ${open ? "open" : ""}`} />
        <span className={`burger-line ${open ? "open" : ""}`} />
        <span className={`burger-line ${open ? "open" : ""}`} />
      </button>

      {open ? (
        <div className="mobile-menu-panel">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="mobile-menu-link"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link href="/login" className="mobile-menu-link" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link href="/join" className="mobile-menu-link" onClick={() => setOpen(false)}>
            Join school
          </Link>
          <Link href="/register" className="btn-brand mt-2 text-center" onClick={() => setOpen(false)}>
            Start your school
          </Link>
        </div>
      ) : null}
    </div>
  );
}
