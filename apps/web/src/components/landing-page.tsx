"use client";

import Link from "next/link";
import { BackToTop } from "@/components/back-to-top";
import { Faq } from "@/components/faq";
import { AppStoreBadges } from "@/components/landing/app-store-badges";
import { LandingAppSection } from "@/components/landing/landing-app-section";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ProductPreview } from "@/components/product-preview";
import {
  IconAdmin,
  IconAnnouncements,
  IconAttendance,
  IconGrades,
  IconParents,
  IconSecurity,
} from "@/components/feature-icons";
import type { ReactNode } from "react";

const CAPABILITIES = [
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
];

const FEATURES: {
  title: string;
  desc: string;
  icon: ReactNode;
  wide?: boolean;
}[] = [
  {
    title: "Attendance that parents see",
    desc: "Daily or period roll call, QR campus cards, and same-day visibility for families.",
    icon: <IconAttendance />,
    wide: true,
  },
  {
    title: "Results & report cards",
    desc: "Term templates, teacher entry, approvals, and printable report cards.",
    icon: <IconGrades />,
  },
  {
    title: "Fees & finance",
    desc: "Schedules, partial payments, and Telebirr-ready collection workflows.",
    icon: <IconParents />,
  },
  {
    title: "eLibrary & AI study help",
    desc: "Digital shelf plus an AI assistant to summarize, quiz, and translate lessons.",
    icon: <IconGrades />,
  },
  {
    title: "Announcements",
    desc: "School-wide or class messages without phone trees or group chats.",
    icon: <IconAnnouncements />,
  },
  {
    title: "Staff & permissions",
    desc: "Registrar, finance, and teachers each see only what their role needs.",
    icon: <IconAdmin />,
  },
  {
    title: "Secure multi-tenant",
    desc: "Every school is isolated with JWT auth and role-based access.",
    icon: <IconSecurity />,
    wide: true,
  },
];

const PORTALS = [
  { n: "01", role: "Admin", desc: "Enrollment, billing, setup, and analytics", href: "/login" },
  { n: "02", role: "Teacher", desc: "Attendance, grades, classwork, and timetable", href: "/login" },
  { n: "03", role: "Student", desc: "Campus ID, results, assignments, and fees", href: "/login" },
  { n: "04", role: "Parent", desc: "Child attendance, fees, results, and notices", href: "/login" },
];

export function LandingPage() {
  return (
    <div className="lp3">
      <LandingNav />

      <main>
        <section className="lp3-hero">
          <div className="lp3-hero__bg" aria-hidden />
          <div className="lp3-container lp3-hero__grid">
            <div className="lp3-hero__copy">
              <span className="lp3-hero__chip">School operations platform</span>
              <h1 className="lp3-hero__title">
                One platform for your whole campus
              </h1>
              <p className="lp3-hero__lead">
                CampusOne helps Ethiopian and international schools run attendance, results, fees,
                and family communication — with dedicated portals for admins, teachers, students,
                and parents.
              </p>
              <div className="lp3-hero__actions">
                <Link href="/register" className="lp3-btn lp3-btn--primary">
                  Start free trial
                </Link>
                <a href="#pricing" className="lp3-btn lp3-btn--ghost lp3-btn--on-dark">
                  View pricing
                </a>
              </div>
              <p className="lp3-hero__note">14-day trial · No card required · USD &amp; ETB plans</p>
              <div className="lp3-hero__stores">
                <span>For parents &amp; students</span>
                <AppStoreBadges variant="dark" />
              </div>
            </div>

            <div id="preview" className="lp3-hero__visual">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="lp3-strip" aria-label="Platform capabilities">
          <div className="lp3-strip__track">
            {[...CAPABILITIES, ...CAPABILITIES].map((item, i) => (
              <span key={`${item}-${i}`} className="lp3-strip__pill">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section id="features" className="lp3-section">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head">
                <span className="lp3-eyebrow">Platform</span>
                <h2 className="lp3-heading">Built for real school workflows</h2>
                <p className="lp3-lead">
                  Not a bloated ERP — the modules your registrar, teachers, and finance team use
                  every day.
                </p>
              </div>
            </Reveal>
            <Stagger className="lp3-bento">
              {FEATURES.map((f) => (
                <StaggerItem key={f.title}>
                  <article className={`lp3-bento__card${f.wide ? " lp3-bento__card--wide" : ""}`}>
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

        <section id="portals" className="lp3-section lp3-section--muted">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head">
                <span className="lp3-eyebrow">Portals</span>
                <h2 className="lp3-heading">Four roles. One source of truth.</h2>
                <p className="lp3-lead">
                  The same student record whether a teacher marks attendance or a parent checks fees.
                </p>
              </div>
            </Reveal>
            <Stagger className="lp3-portals">
              {PORTALS.map((p) => (
                <StaggerItem key={p.role}>
                  <Link href={p.href} className="lp3-portal">
                    <span className="lp3-portal__n">{p.n}</span>
                    <h3>{p.role}</h3>
                    <p>{p.desc}</p>
                    <span className="lp3-portal__link">Sign in →</span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section id="pricing" className="lp3-section">
          <div className="lp3-container">
            <Reveal>
              <div className="lp3-section__head lp3-section__head--center">
                <span className="lp3-eyebrow">Pricing</span>
                <h2 className="lp3-heading">Simple plans that scale with you</h2>
                <p className="lp3-lead">
                  Try every core feature on trial. Upgrade when you are ready — monthly or annual
                  billing.
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
                  <h2>Ready to modernize your school?</h2>
                  <p>
                    Create your school in minutes, invite staff, import students, and share the app
                    with families.
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

      <footer className="lp3-footer">
        <div className="lp3-container lp3-footer__grid">
          <div className="lp3-footer__brand">
            <span className="lp3-nav__mark">C1</span>
            <div>
              <strong>CampusOne</strong>
              <p>School management for admins, teachers, students &amp; parents.</p>
            </div>
          </div>
          <nav className="lp3-footer__nav" aria-label="Footer">
            <Link href="/register">Register school</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/join">Join with code</Link>
            <a href="#app">Mobile app</a>
            <Link href="/platform/login">Platform admin</Link>
          </nav>
          <div className="lp3-footer__stores">
            <AppStoreBadges />
          </div>
          <p className="lp3-footer__copy">
            © {new Date().getFullYear()} CampusOne. All rights reserved.{" "}
            <span className="lp3-footer__ai">Powered by AI</span>
          </p>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}
