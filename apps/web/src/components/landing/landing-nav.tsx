"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#features", label: "Product" },
  { href: "#app", label: "Mobile app" },
  { href: "#portals", label: "Portals" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "/join", label: "Join school", external: true },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className={`lp3-nav${scrolled ? " lp3-nav--scrolled" : ""}`}>
        <div className="lp3-container lp3-nav__inner">
          <Link href="/" className="lp3-nav__brand" onClick={() => setOpen(false)}>
            <span className="lp3-nav__mark">C1</span>
            <span>CampusOne</span>
          </Link>

          <nav className="lp3-nav__links" aria-label="Main">
            {LINKS.map((l) =>
              l.external ? (
                <Link key={l.href} href={l.href} className="lp3-nav__link">
                  {l.label}
                </Link>
              ) : (
                <a key={l.href} href={l.href} className="lp3-nav__link">
                  {l.label}
                </a>
              ),
            )}
          </nav>

          <div className="lp3-nav__actions">
            <Link href="/login" className="lp3-nav__signin">
              Sign in
            </Link>
            <Link href="/register" className="lp3-btn lp3-btn--primary lp3-btn--sm">
              Start free trial
            </Link>
            <button
              type="button"
              className="lp3-nav__menu-btn"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <>
          <button
            type="button"
            className="lp3-nav__mobile-backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="lp3-nav__mobile" role="dialog" aria-label="Menu">
            <div className="lp3-nav__mobile-links">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="lp3-nav__mobile-link" onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}
              <Link href="/login" className="lp3-nav__mobile-link" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link href="/join" className="lp3-nav__mobile-link" onClick={() => setOpen(false)}>
                Join with school code
              </Link>
            </div>
            <Link href="/register" className="lp3-btn lp3-btn--primary lp3-btn--block" onClick={() => setOpen(false)}>
              Start free trial
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}
