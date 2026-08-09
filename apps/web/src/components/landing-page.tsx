"use client";

import Link from "next/link";
import { BackToTop } from "@/components/back-to-top";
import { Faq } from "@/components/faq";
import { AppStoreBadges } from "@/components/landing/app-store-badges";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingAppSection } from "@/components/landing/landing-app-section";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import {
  IconAdmin,
  IconAnnouncements,
  IconAttendance,
  IconFinance,
  IconGrades,
  IconLibrary,
  IconSecurity,
  IconTimetable,
} from "@/components/feature-icons";
import type { ReactNode } from "react";

const STEPS = [
  {
    n: "01",
    title: "Create your school",
    desc: "Register in minutes, pick your grade structure, and upload your logo.",
  },
  {
    n: "02",
    title: "Invite your community",
    desc: "Share join codes or invite links for teachers, students, and parents.",
  },
  {
    n: "03",
    title: "Run daily operations",
    desc: "Mark attendance, enter results, bill fees, and publish announcements.",
  },
];

const FEATURES: {
  title: string;
  desc: string;
  icon: ReactNode;
  wide?: boolean;
  tone?: string;
}[] = [
  {
    title: "Attendance parents trust",
    desc: "Daily or period roll call, QR campus cards, and same-day alerts on web and mobile.",
    icon: <IconAttendance />,
    wide: true,
    tone: "attendance",
  },
  {
    title: "Results & report cards",
    desc: "Assessment templates, teacher score sheets, approvals, and printable report cards.",
    icon: <IconGrades />,
    tone: "grades",
  },
  {
    title: "Fees in ETB",
    desc: "Fee schedules, partial payments, parent submissions, and finance exports.",
    icon: <IconFinance />,
    tone: "finance",
  },
  {
    title: "eLibrary & AI study help",
    desc: "Upload resources, track reading progress, and let students summarize lessons with AI.",
    icon: <IconLibrary />,
    tone: "library",
  },
  {
    title: "Timetable & classwork",
    desc: "Auto-generate timetables, assign subjects, and publish worksheets to classes.",
    icon: <IconTimetable />,
    tone: "timetable",
  },
  {
    title: "Announcements",
    desc: "School-wide updates land on admin, teacher, student, and parent dashboards.",
    icon: <IconAnnouncements />,
    tone: "announce",
  },
  {
    title: "Staff & permissions",
    desc: "Registrar, finance, and teachers each see only what their role needs.",
    icon: <IconAdmin />,
    tone: "admin",
  },
  {
    title: "Secure multi-tenant",
    desc: "Every school is isolated with JWT auth, audit trails, and role templates.",
    icon: <IconSecurity />,
    wide: true,
    tone: "security",
  },
];

const PORTALS = [
  {
    n: "01",
    role: "Admin",
    glyph: "AD",
    tagline: "School operations",
    highlights: ["Enrollment", "Billing", "Reports"],
    desc: "Enrollment, billing, academics setup, and school-wide reports",
    href: "/login",
    tone: "admin",
    icon: <IconAdmin />,
  },
  {
    n: "02",
    role: "Teacher",
    glyph: "TC",
    tagline: "Classroom daily",
    highlights: ["Attendance", "Grades", "Timetable"],
    desc: "Attendance, grade entry, classwork, timetable, and eLibrary",
    href: "/login",
    tone: "teacher",
    icon: <IconTimetable />,
  },
  {
    n: "03",
    role: "Student",
    glyph: "ST",
    tagline: "Campus life",
    highlights: ["Campus ID", "Results", "Fees"],
    desc: "Campus ID, results, assignments, fees, and digital library",
    href: "/login",
    tone: "student",
    icon: <IconGrades />,
  },
  {
    n: "04",
    role: "Parent",
    glyph: "PR",
    tagline: "Family updates",
    highlights: ["Attendance", "Payments", "Notices"],
    desc: "Child attendance, fee payments, results, and school notices",
    href: "/login",
    tone: "parent",
    icon: <IconAttendance />,
  },
];

export function LandingPage() {
  return (
    <div className="lp3">
      <LandingNav />

      <main>
        <section id="hero" className="lp3-hero lp3-hero--simple">
          <div className="lp3-hero__photo" aria-hidden>
            <img src="/images/hero-campus.png" alt="" />
          </div>
          <div className="lp3-hero__overlay" aria-hidden />
          <div className="lp3-container lp3-hero__grid">
            <div className="lp3-hero__copy">
              <h1 className="lp3-hero__title">
                Run your campus in{" "}
                <span className="lp3-hero__title-accent">one place</span>
              </h1>
              <p className="lp3-hero__lead">
                Attendance, results, fees, and parent updates — without spreadsheets or chat
                groups.
              </p>
              <div className="lp3-hero__actions">
                <Link href="/register" className="lp3-btn lp3-btn--primary">
                  Start free trial
                </Link>
                <Link href="/login" className="lp3-btn lp3-btn--ghost">
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          <div className="lp3-strip lp3-strip--hero" aria-label="Platform capabilities">
            <div className="lp3-strip__track">
              {[
                "Attendance",
                "Report cards",
                "Fee collection",
                "Parent portal",
                "Campus ID",
                "Timetable",
                "eLibrary",
                "AI study assistant",
                "Announcements",
                "USD & ETB billing",
                "Staff roles",
              ]
                .concat([
                  "Attendance",
                  "Report cards",
                  "Fee collection",
                  "Parent portal",
                  "Campus ID",
                  "Timetable",
                  "eLibrary",
                  "AI study assistant",
                  "Announcements",
                  "USD & ETB billing",
                  "Staff roles",
                ])
                .map((item, i) => (
                  <span key={`${item}-${i}`} className="lp3-strip__pill">
                    {item}
                  </span>
                ))}
            </div>
          </div>
        </section>

        <section className="lp3-section lp3-section--steps">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head lp3-section__head--center">
                <span className="lp3-eyebrow">How it works</span>
                <h2 className="lp3-heading">Live in days, not months</h2>
                <p className="lp3-lead">
                  Most schools register, import students, and invite staff in the same week they sign
                  up.
                </p>
              </div>
            </Reveal>
            <Stagger className="lp3-steps">
              {STEPS.map((step) => (
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
                <span className="lp3-eyebrow">Platform</span>
                <h2 className="lp3-heading">Everything your registrar already juggles</h2>
                <p className="lp3-lead">
                  Not a bloated ERP — the modules your office, teachers, and finance team open every
                  morning.
                </p>
              </div>
            </Reveal>
            <Stagger className="lp3-bento">
              {FEATURES.map((f) => (
                <StaggerItem key={f.title}>
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

        <LandingAppSection />

        <section id="portals" className="lp3-section lp3-section--portals">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head">
                <span className="lp3-eyebrow">Portals</span>
                <h2 className="lp3-heading">Four roles. One student record.</h2>
                <p className="lp3-lead">
                  When a teacher marks attendance or a parent pays a fee, everyone sees the same
                  source of truth.
                </p>
              </div>
            </Reveal>
            <Stagger className="lp3-portals">
              {PORTALS.map((p) => (
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
                    <h3>{p.role}</h3>
                    <p className="lp3-portal__desc">{p.desc}</p>
                    <ul className="lp3-portal__highlights">
                      {p.highlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <span className="lp3-portal__link">Sign in to portal</span>
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
                <span className="lp3-eyebrow">Pricing</span>
                <h2 className="lp3-heading">Plans that scale from one campus to a chain</h2>
                <p className="lp3-lead">
                  Try every core module on trial. Upgrade when you are ready — pay monthly or annually
                  in USD or ETB.
                </p>
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
                  <span className="lp3-cta__chip">Get started today</span>
                  <h2>Your school deserves software that feels as organized as you are</h2>
                  <p>
                    Create your campus, import students, invite teachers, and share the mobile app
                    with families — all before the next term starts.
                  </p>
                  <div className="lp3-cta__actions">
                    <Link href="/register" className="lp3-btn lp3-btn--primary">
                      Start free trial
                    </Link>
                    <Link href="/login" className="lp3-btn lp3-btn--ghost lp3-btn--on-dark">
                      Sign in
                    </Link>
                  </div>
                </div>
                <div className="lp3-cta__app">
                  <p>Download CampusOne</p>
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
