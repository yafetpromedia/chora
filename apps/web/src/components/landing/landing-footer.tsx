import Link from "next/link";
import { AppStoreBadges } from "@/components/landing/app-store-badges";
import { LandingFooterSocial } from "@/components/landing/landing-footer-social";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const PRODUCT_LINKS = [
  { href: "/demo", label: "Demo" },
  { href: "#features", label: "Product" },
  { href: "#connect", label: "Chora Connect" },
  { href: "#app", label: "Mobile app" },
  { href: "#portals", label: "Portals" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

const COMPANY_LINKS = [
  { href: "/register", label: "Register school" },
  { href: "/login", label: "Sign in" },
] as const;

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="lp3-footer">
      <div className="lp3-container">
        <div className="lp3-footer__top">
          <div className="lp3-footer__brand">
            <Link href="/" className="lp3-footer__logo">
              <BrandMark className="lp3-nav__mark" />
              <span>{BRAND_NAME}</span>
            </Link>
            <p>
              {BRAND_TAGLINE}. School management for Ethiopian and international campuses —
              admins, teachers, students &amp; parents.
            </p>
            <LandingFooterSocial />
          </div>

          <div className="lp3-footer__col">
            <h3>Product</h3>
            <nav aria-label="Product">
              {PRODUCT_LINKS.map((link) =>
                link.href.startsWith("/") ? (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.href} href={link.href}>
                    {link.label}
                  </a>
                ),
              )}
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
