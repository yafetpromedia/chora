"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";

const HOME_LINKS = [
  { href: "#hero", id: "hero", label: "Home" },
  { href: "#explore", id: "explore", label: "Explore" },
  { href: "#features", id: "features", label: "Product" },
  { href: "#connect", id: "connect", label: "Connect" },
  { href: "#app", id: "app", label: "Mobile app" },
  { href: "#portals", id: "portals", label: "Portals" },
  { href: "#pricing", id: "pricing", label: "Pricing" },
  { href: "#faq", id: "faq", label: "FAQ" },
] as const;

const SECTION_IDS = [
  "hero",
  "explore",
  "features",
  "connect",
  "app",
  "portals",
  "pricing",
  "faq",
];

function resolveHref(href: string, onHome: boolean) {
  if (href.startsWith("/") || onHome) return href;
  return `/${href}`;
}

export function LandingNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(onHome);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    if (!onHome) {
      setOverHero(false);
      setActive("");
      return;
    }

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
  }, [onHome]);

  useEffect(() => {
    if (!onHome) return;

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
  }, [onHome]);

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
            <BrandMark className="lp3-nav__mark" />
            <span>{BRAND_NAME}</span>
          </Link>

          <nav className="lp3-nav__links" aria-label="Main">
            {HOME_LINKS.map((l) => {
              const href = resolveHref(l.href, onHome);
              const isActive = onHome && active === l.id;
              const isConnect = l.id === "connect";
              const className = [
                "lp3-nav__link",
                isActive ? "lp3-nav__link--active" : "",
                isConnect ? "lp3-nav__link--connect" : "",
              ]
                .filter(Boolean)
                .join(" ");

              const shared = {
                className,
                "aria-current": isActive ? ("page" as const) : undefined,
              };

              if (href.startsWith("/")) {
                return (
                  <Link key={l.href} href={href} {...shared}>
                    {l.label}
                    {isConnect ? <span className="lp3-nav__link-soon">Soon</span> : null}
                  </Link>
                );
              }

              return (
                <a key={l.href} href={href} {...shared}>
                  {l.label}
                  {isConnect ? <span className="lp3-nav__link-soon">Soon</span> : null}
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
              {HOME_LINKS.map((l) => {
                const href = resolveHref(l.href, onHome);
                const isActive = onHome && active === l.id;
                const isConnect = l.id === "connect";
                const className = `lp3-nav__mobile-link${isActive ? " lp3-nav__mobile-link--active" : ""}`;

                if (href.startsWith("/")) {
                  return (
                    <Link
                      key={l.href}
                      href={href}
                      className={className}
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                      {isConnect ? <span className="lp3-nav__link-soon">Soon</span> : null}
                    </Link>
                  );
                }

                return (
                  <a
                    key={l.href}
                    href={href}
                    className={className}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                    {isConnect ? <span className="lp3-nav__link-soon">Soon</span> : null}
                  </a>
                );
              })}
              <Link href="/login" className="lp3-nav__mobile-link" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </div>
            <Link
              href="/register"
              className="lp3-btn lp3-btn--primary lp3-btn--block"
              onClick={() => setOpen(false)}
            >
              Start free trial
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}
