"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#hero", label: "Home" },
  { href: "#features", label: "Product" },
  { href: "#app", label: "Mobile app" },
  { href: "#portals", label: "Portals" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const SECTION_IDS = ["hero", "features", "app", "portals", "pricing", "faq"];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      const hero = document.getElementById("hero");
      if (hero) {
        const heroEnd = hero.offsetTop + hero.offsetHeight - 72;
        setOverHero(y < heroEnd);
      } else {
        setOverHero(y < 400);
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.2, 0.5] },
    );

    sections.forEach((section) => sectionObserver.observe(section!));

    return () => {
      sectionObserver.disconnect();
    };
  }, []);

  const navClass = [
    "lp3-nav",
    overHero ? "lp3-nav--over-hero" : "lp3-nav--solid",
    scrolled ? "lp3-nav--scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={navClass}>
        <div className="lp3-container lp3-nav__inner">
          <Link href="/" className="lp3-nav__brand" onClick={() => setOpen(false)}>
            <span className="lp3-nav__mark">C1</span>
            <span>CampusOne</span>
          </Link>

          <nav className="lp3-nav__links" aria-label="Main">
            {LINKS.map((l) => {
              const isActive = l.href === `#${active}`;
              const className = `lp3-nav__link${isActive ? " lp3-nav__link--active" : ""}`;

              return (
                <a
                  key={l.href}
                  href={l.href}
                  className={className}
                  aria-current={isActive ? "page" : undefined}
                >
                  {l.label}
                </a>
              );
            })}
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
              {LINKS.map((l) => {
                const isActive = l.href === `#${active}`;
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    className={`lp3-nav__mobile-link${isActive ? " lp3-nav__mobile-link--active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                );
              })}
              <Link href="/login" className="lp3-nav__mobile-link" onClick={() => setOpen(false)}>
                Sign in
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
