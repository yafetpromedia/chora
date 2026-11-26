"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { BRAND_NAME } from "@/lib/brand";

const HOME_LINKS = [
  { href: "#hero", id: "hero", msg: "landing.home" },
  { href: "#explore", id: "explore", msg: "landing.explore" },
  { href: "#features", id: "features", msg: "landing.product" },
  { href: "#connect", id: "connect", msg: "landing.connect" },
  { href: "#app", id: "app", msg: "landing.mobileApp" },
  { href: "#portals", id: "portals", msg: "landing.portals" },
  { href: "#pricing", id: "pricing", msg: "landing.pricing" },
  { href: "#faq", id: "faq", msg: "landing.faq" },
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
  const { t } = useLocale();
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overHeroState, setOverHero] = useState(onHome);
  const overHero = onHome && overHeroState;
  const [active, setActive] = useState("hero");

  useEffect(() => {
    if (!onHome) return;

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
                    {t(l.msg)}
                    {isConnect ? <span className="lp3-nav__link-soon">{t("landing.soon")}</span> : null}
                  </Link>
                );
              }

              return (
                <a key={l.href} href={href} {...shared}>
                  {t(l.msg)}
                  {isConnect ? <span className="lp3-nav__link-soon">{t("landing.soon")}</span> : null}
                </a>
              );
            })}
          </nav>

          <div className="lp3-nav__actions">
            <LanguageSwitcher compact />
            <Link href="/login" className="lp3-nav__signin">
              {t("landing.signIn")}
            </Link>
            <Link href="/register" className="lp3-btn lp3-btn--primary lp3-btn--sm">
              {t("landing.startTrial")}
            </Link>
            <button
              type="button"
              className="lp3-nav__menu-btn"
              aria-expanded={open}
              aria-label={open ? t("common.close") : t("common.openMenu")}
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
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div className="lp3-nav__mobile" role="dialog" aria-label={t("common.openMenu")}>
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
                      {t(l.msg)}
                      {isConnect ? <span className="lp3-nav__link-soon">{t("landing.soon")}</span> : null}
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
                    {t(l.msg)}
                    {isConnect ? <span className="lp3-nav__link-soon">{t("landing.soon")}</span> : null}
                  </a>
                );
              })}
              <Link href="/login" className="lp3-nav__mobile-link" onClick={() => setOpen(false)}>
                {t("landing.signIn")}
              </Link>
            </div>
            <Link
              href="/register"
              className="lp3-btn lp3-btn--primary lp3-btn--block"
              onClick={() => setOpen(false)}
            >
              {t("landing.startTrial")}
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}
