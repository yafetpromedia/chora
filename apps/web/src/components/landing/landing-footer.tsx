import Link from "next/link";
import { AppStoreBadges } from "@/components/landing/app-store-badges";
import { BRAND_MARK, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const PRODUCT_LINKS = [
  { href: "#features", label: "Product" },
  { href: "#app", label: "Mobile app" },
  { href: "#portals", label: "Portals" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const COMPANY_LINKS = [
  { href: "/register", label: "Register school" },
  { href: "/login", label: "Sign in" },
  { href: "/platform/login", label: "Platform admin" },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/yafetpromedia/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2.2c2.7 0 3 0 4.1.1 1 .1 1.5.2 1.9.4.5.2.8.4 1.1.7.3.3.6.6.7 1.1.2.4.3.9.4 1.9.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 1-.2 1.5-.4 1.9-.2.5-.4.8-.7 1.1-.3.3-.6.6-1.1.7-.4.2-.9.3-1.9.4-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1-.1-1.5-.2-1.9-.4-.5-.2-.8-.4-1.1-.7-.3-.3-.6-.6-.7-1.1-.2-.4-.3-.9-.4-1.9-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c.1-1 .2-1.5.4-1.9.2-.5.4-.8.7-1.1.3-.3.6-.6 1.1-.7.4-.2.9-.3 1.9-.4 1.1-.1 1.4-.1 4.1-.1zm0 1.8c-2.6 0-2.9 0-4 .1-.9 0-1.4.2-1.7.3-.4.2-.7.4-1 .7-.3.3-.5.6-.7 1-.1.3-.3.8-.3 1.7-.1 1.1-.1 1.4-.1 4s0 2.9.1 4c0 .9.2 1.4.3 1.7.2.4.4.7.7 1 .3.3.6.5 1 .7.3.1.8.3 1.7.3 1.1.1 1.4.1 4 .1s2.9 0 4-.1c.9 0 1.4-.2 1.7-.3.4-.2.7-.4 1-.7.3-.3.5-.6.7-1 .1-.3.3-.8.3-1.7.1-1.1.1-1.4.1-4s0-2.9-.1-4c0-.9-.2-1.4-.3-1.7-.2-.4-.4-.7-.7-1-.3-.3-.6-.5-1-.7-.3-.1-.8-.3-1.7-.3-1.1-.1-1.4-.1-4-.1zm0 3.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6zm0 1.8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm6.4-4.2a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0z"
        />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/yafetpromedia",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M14 8.5V6.8c0-.7.5-1.1 1.2-1.1H16V3h-2.1C12 3 10.8 4.2 10.8 6.2V8.5H9v2.7h1.8V21h3.4v-9.8H17l.4-2.7H14z"
        />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/yafet-promedia",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M6.5 8.8h2.9V21H6.5V8.8zm1.5-4.8a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM10.2 8.8h2.8v1.7h.1c.4-.7 1.3-1.5 2.7-1.5 2.9 0 3.4 1.9 3.4 4.4V21h-3v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-3V8.8z"
        />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@yafetpromedia",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C17.9 5 12 5 12 5s-5.9 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C6.1 19 12 19 12 19s5.9 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z"
        />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@yafetpromedia",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M16.6 5.2h-2.7v9.8c0 1.8-1.5 3.3-3.3 3.3S7.3 16.8 7.3 15s1.5-3.3 3.3-3.3c.3 0 .7.1 1 .2V9.2a5.8 5.8 0 0 0-1-.1 5.9 5.9 0 1 0 5.9 5.9V11h2.7c.2 1.5 1.4 2.7 2.9 2.9V11c-1.6-.2-2.9-1.5-3.1-3.1V5.2z"
        />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/yafetpromedia/campusone",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.4-2.3-.3-4.7-1.1-4.7-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.2 9.2 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 2v3c0 .3.2.6.7.5A10 10 0 0 0 12 2z"
        />
      </svg>
    ),
  },
] as const;

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="lp3-footer">
      <div className="lp3-container">
        <div className="lp3-footer__top">
          <div className="lp3-footer__brand">
            <Link href="/" className="lp3-footer__logo">
              <span className="lp3-nav__mark">{BRAND_MARK}</span>
              <span>{BRAND_NAME}</span>
            </Link>
            <p>
              {BRAND_TAGLINE}. School management for Ethiopian and international campuses —
              admins, teachers, students &amp; parents.
            </p>
            <div className="lp3-footer__social" aria-label={`${BRAND_NAME} social media`}>
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="lp3-footer__social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${BRAND_NAME} on ${item.label}`}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="lp3-footer__col">
            <h3>Product</h3>
            <nav aria-label="Product">
              {PRODUCT_LINKS.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="lp3-footer__col">
            <h3>Company</h3>
            <nav aria-label="Company">
              {COMPANY_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="lp3-footer__col lp3-footer__col--apps">
            <h3>Download</h3>
            <p>{BRAND_NAME} for families on iOS &amp; Android.</p>
            <AppStoreBadges variant="dark" layout="stack" />
          </div>
        </div>

        <div className="lp3-footer__bottom">
          <p className="lp3-footer__copy">
            © {year} {BRAND_NAME}. All rights reserved.
          </p>
          <p className="lp3-footer__credit">
            Created by{" "}
            <a
              href="https://awuddigitals.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Awud Digitals
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
