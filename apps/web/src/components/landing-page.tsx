"use client";

import Link from "next/link";
import { BackToTop } from "@/components/back-to-top";
import { Faq } from "@/components/faq";
import { AppStoreBadges } from "@/components/landing/app-store-badges";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingAppSection } from "@/components/landing/landing-app-section";
import { LandingChoraConnect } from "@/components/landing/landing-chora-connect";
import { LandingExploreSection } from "@/components/landing/landing-explore-section";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { BRAND_NAME } from "@/lib/brand";
import {
  IconAdmin,
  IconAnnouncements,
  IconAttendance,
  IconFinance,
  IconGrades,
  IconHr,
  IconIdCard,
  IconLanguage,
  IconLibrary,
  IconSecurity,
  IconTimetable,
  IconYearlyReport,
} from "@/components/feature-icons";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { useLocale } from "@/components/i18n/locale-provider";
import { useMemo, type ReactNode } from "react";

const FEATURE_KEYS: {
  titleKey: string;
  descKey: string;
  icon: ReactNode;
  wide?: boolean;
  tone?: string;
}[] = [
  {
    titleKey: "features.attendanceTitle",
    descKey: "features.attendanceDesc",
    icon: <IconAttendance />,
    wide: true,
    tone: "attendance",
  },
  {
    titleKey: "features.qrTitle",
    descKey: "features.qrDesc",
    icon: <IconIdCard />,
    tone: "grades",
  },
  {
    titleKey: "features.resultsTitle",
    descKey: "features.resultsDesc",
    icon: <IconGrades />,
    tone: "grades",
  },
  {
    titleKey: "features.yearlyTitle",
    descKey: "features.yearlyDesc",
    icon: <IconYearlyReport />,
    tone: "yearly",
  },
  {
    titleKey: "features.chapaTitle",
    descKey: "features.chapaDesc",
    icon: <IconFinance />,
    tone: "finance",
  },
  {
    titleKey: "features.langTitle",
    descKey: "features.langDesc",
    icon: <IconLanguage />,
    tone: "announce",
  },
  {
    titleKey: "features.fayedaTitle",
    descKey: "features.fayedaDesc",
    icon: <IconSecurity />,
    tone: "security",
  },
  {
    titleKey: "features.hrTitle",
    descKey: "features.hrDesc",
    icon: <IconHr />,
    tone: "hr",
  },
  {
    titleKey: "features.libraryTitle",
    descKey: "features.libraryDesc",
    icon: <IconLibrary />,
    tone: "library",
  },
  {
    titleKey: "features.timetableTitle",
    descKey: "features.timetableDesc",
    icon: <IconTimetable />,
    tone: "timetable",
  },
  {
    titleKey: "features.announceTitle",
    descKey: "features.announceDesc",
    icon: <IconAnnouncements />,
    tone: "announce",
  },
  {
    titleKey: "features.staffTitle",
    descKey: "features.staffDesc",
    icon: <IconAdmin />,
    tone: "admin",
  },
];

const PORTAL_KEYS = [
  {
    n: "01",
    role: "Admin",
    glyph: "AD",
    taglineKey: "portals.adminTag",
    highlightKeys: ["portals.adminH1", "portals.adminH2", "portals.adminH3"],
    descKey: "portals.adminDesc",
    href: "/login",
    tone: "admin",
    icon: <IconAdmin />,
  },
  {
    n: "02",
    role: "Teacher",
    glyph: "TC",
    taglineKey: "portals.teacherTag",
    highlightKeys: ["portals.teacherH1", "portals.teacherH2", "portals.teacherH3"],
    descKey: "portals.teacherDesc",
    href: "/login",
    tone: "teacher",
    icon: <IconTimetable />,
  },
  {
    n: "03",
    role: "Student",
    glyph: "ST",
    taglineKey: "portals.studentTag",
    highlightKeys: ["portals.studentH1", "portals.studentH2", "portals.studentH3"],
    descKey: "portals.studentDesc",
    href: "/login",
    tone: "student",
    icon: <IconGrades />,
  },
  {
    n: "04",
    role: "Parent",
    glyph: "PR",
    taglineKey: "portals.parentTag",
    highlightKeys: ["portals.parentH1", "portals.parentH2", "portals.parentH3"],
    descKey: "portals.parentDesc",
    href: "/login",
    tone: "parent",
    icon: <IconAttendance />,
  },
] as const;

export function LandingPage() {
  const { t, tn } = useLocale();
  const heroSrc = useLandingHeroImage();
  const steps = useMemo(
    () => [
      { n: "01", title: t("landing.step1Title"), desc: t("landing.step1Desc") },
      { n: "02", title: t("landing.step2Title"), desc: t("landing.step2Desc") },
      { n: "03", title: t("landing.step3Title"), desc: t("landing.step3Desc") },
    ],
    [t],
  );

  const features = useMemo(
    () =>
      FEATURE_KEYS.map((f) => ({
        ...f,
        title: t(f.titleKey),
        desc: t(f.descKey),
      })),
    [t],
  );

  const portals = useMemo(
    () =>
      PORTAL_KEYS.map((p) => ({
        ...p,
        tagline: t(p.taglineKey),
        desc: t(p.descKey),
        highlights: p.highlightKeys.map((key) => t(key)),
      })),
    [t],
  );

  return (
    <div className="lp3">
      <LandingNav />

      <main>
        <section id="hero" className="lp3-hero lp3-hero--simple">
          <div className="lp3-hero__photo" aria-hidden>
            {heroSrc ? <img src={heroSrc} alt="" /> : null}
          </div>
          <div className="lp3-hero__overlay" aria-hidden />
          <div className="lp3-container lp3-hero__grid">
            <div className="lp3-hero__copy">
              <h1 className="lp3-hero__title">
                {t("landing.heroTitleBefore")}{" "}
                <span className="lp3-hero__title-accent">{t("landing.heroTitleAccent")}</span>
              </h1>
              <p className="lp3-hero__lead">{t("landing.heroLead")}</p>
              <div className="lp3-hero__actions">
                <Link href="/register" className="lp3-btn lp3-btn--primary">
                  {t("landing.startTrial")}
                </Link>
                <Link href="/login" className="lp3-btn lp3-btn--ghost">
                  {t("landing.signIn")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <LandingExploreSection />

        <section className="lp3-section lp3-section--steps">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head lp3-section__head--center">
                <span className="lp3-eyebrow">{t("landing.howEyebrow")}</span>
                <h2 className="lp3-heading">{t("landing.howTitle")}</h2>
                <p className="lp3-lead">{t("landing.howLead")}</p>
              </div>
            </Reveal>
            <Stagger className="lp3-steps">
              {steps.map((step) => (
                <StaggerItem key={step.n}>
                  <article className="lp3-step">
                    <span className="lp3-step__n">{step.n}</span>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section id="features" className="lp3-section lp3-section--surface">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head">
                <span className="lp3-eyebrow">{t("landing.platformEyebrow")}</span>
                <h2 className="lp3-heading">{t("landing.platformTitle")}</h2>
                <p className="lp3-lead">{t("landing.platformLead")}</p>
              </div>
            </Reveal>
            <Stagger className="lp3-bento">
              {features.map((f) => (
                <StaggerItem key={f.titleKey}>
                  <article
                    className={`lp3-bento__card${f.wide ? " lp3-bento__card--wide" : ""}${f.tone ? ` lp3-bento__card--${f.tone}` : ""}`}
                  >
                    <div className="lp3-bento__icon">{f.icon}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <LandingChoraConnect />

        <LandingAppSection />

        <section id="portals" className="lp3-section lp3-section--portals">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head">
                <span className="lp3-eyebrow">{t("landing.portalsEyebrow")}</span>
                <h2 className="lp3-heading">{t("landing.portalsTitle")}</h2>
                <p className="lp3-lead">{t("landing.portalsLead")}</p>
              </div>
            </Reveal>
            <Stagger className="lp3-portals">
              {portals.map((p) => (
                <StaggerItem key={p.role}>
                  <Link href={p.href} className={`lp3-portal lp3-portal--${p.tone}`}>
                    <div className="lp3-portal__glow" aria-hidden />
                    <div className="lp3-portal__top">
                      <div className="lp3-portal__icon">{p.icon}</div>
                      <span className="lp3-portal__arrow" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M7 17L17 7M17 7H9M17 7V15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                    <span className="lp3-portal__n">{p.n}</span>
                    <p className="lp3-portal__tagline">{p.tagline}</p>
                    <h3>{tn(p.role)}</h3>
                    <p className="lp3-portal__desc">{p.desc}</p>
                    <ul className="lp3-portal__highlights">
                      {p.highlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <span className="lp3-portal__link">{t("landing.signInPortal")}</span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section id="pricing" className="lp3-section lp3-section--surface">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head lp3-section__head--center">
                <span className="lp3-eyebrow">{t("landing.pricingEyebrow")}</span>
                <h2 className="lp3-heading">{t("landing.pricingTitle")}</h2>
                <p className="lp3-lead">{t("landing.pricingLead")}</p>
              </div>
            </Reveal>
            <Reveal>
              <LandingPricing />
            </Reveal>
          </div>
        </section>

        <div className="lp3-container">
          <Reveal>
            <Faq />
          </Reveal>
        </div>

        <section className="lp3-cta">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-cta__panel">
                <div className="lp3-cta__copy">
                  <span className="lp3-cta__chip">{t("landing.ctaChip")}</span>
                  <h2>{t("landing.ctaTitle")}</h2>
                  <p>{t("landing.ctaBody")}</p>
                  <div className="lp3-cta__actions">
                    <Link href="/register" className="lp3-btn lp3-btn--primary">
                      {t("landing.startTrial")}
                    </Link>
                    <Link href="/login" className="lp3-btn lp3-btn--ghost lp3-btn--on-dark">
                      {t("landing.signIn")}
                    </Link>
                  </div>
                </div>
                <div className="lp3-cta__app">
                  <p>{t("landing.download", { brand: BRAND_NAME })}</p>
                  <AppStoreBadges variant="dark" layout="stack" />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />

      <BackToTop />
    </div>
  );
}
