"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNav, NavBrand, NavLinks } from "@/components/animated-nav";
import { BackToTop } from "@/components/back-to-top";
import { Faq } from "@/components/faq";
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
import { MobileNav } from "@/components/mobile-nav";
import { TrustMarquee } from "@/components/trust-marquee";
import type { ReactNode } from "react";

const FEATURES: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: "Attendance",
    desc: "Daily or period roll call, QR campus cards, and instant parent visibility.",
    icon: <IconAttendance />,
  },
  {
    title: "Results & report cards",
    desc: "Templates, approvals, and printable report cards per term.",
    icon: <IconGrades />,
  },
  {
    title: "Fees & finance",
    desc: "Fee schedules, partial payments, and Telebirr-ready collection workflows.",
    icon: <IconParents />,
  },
  {
    title: "Announcements",
    desc: "School-wide or class messages — families see updates without phone trees.",
    icon: <IconAnnouncements />,
  },
  {
    title: "Staff & permissions",
    desc: "Registrar, finance, teachers — each role sees only what they need.",
    icon: <IconAdmin />,
  },
  {
    title: "Secure & multi-tenant",
    desc: "Each school is isolated. JWT auth, role templates, PostgreSQL-backed.",
    icon: <IconSecurity />,
  },
];

const PORTALS = [
  { role: "Admin", desc: "Enrollment, billing, analytics, and school setup", href: "/login" },
  { role: "Teacher", desc: "Attendance, grades, and class communication", href: "/login" },
  { role: "Student", desc: "Timetable, results, and campus ID", href: "/login" },
  { role: "Parent", desc: "Fees, attendance, and announcements for your children", href: "/login" },
];

const PILLARS = [
  {
    title: "Stop juggling spreadsheets",
    desc: "One database for students, staff, grades, and fees — not five WhatsApp groups and a shared Excel file.",
  },
  {
    title: "Parents stay in the loop",
    desc: "Families log in to see attendance and results the same day — fewer “what happened at school?” calls.",
  },
  {
    title: "Built for how you bill",
    desc: "List prices in USD and ETB. Platform invoicing when you move to a paid plan.",
  },
];

function HeroContent() {
  const reduce = useReducedMotion();
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="lp-hero__copy">
      <motion.p variants={item} className="lp-hero__kicker">
        School operations platform
      </motion.p>

      <motion.h1 variants={item} className="lp-hero__title">
        Run your school on one system — from attendance to parent fees.
      </motion.h1>

      <motion.p variants={item} className="lp-hero__lead">
        CampusOne is a multi-tenant platform for Ethiopian and international schools: admins,
        teachers, students, and parents each get a focused portal. Start with a 14-day trial, then
        scale on plans that match your size.
      </motion.p>

      <motion.div variants={item} className="lp-hero__ctas">
        <Link href="/register" className="btn-brand">
          Start your school — free trial
        </Link>
        <a href="#pricing" className="btn-ghost">
          See pricing
        </a>
      </motion.div>

      <motion.ul variants={item} className="lp-hero__checks" aria-label="Highlights">
        <li>14-day trial · no card required</li>
        <li>USD &amp; ETB plan pricing</li>
        <li>Live in days, not months</li>
      </motion.ul>
    </motion.div>
  );
}

export function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <div className="page-shell lp-page">
      <AnimatedNav>
        <div className="lp-nav-inner">
          <NavBrand />
          <NavLinks />
          <div className="lp-nav-actions">
            <Link href="/login" className="nav-link hidden text-sm font-semibold sm:block">
              Sign in
            </Link>
            <Link href="/register" className="btn-brand lp-nav-cta hidden md:inline-flex">
              Start free trial
            </Link>
            <MobileNav />
          </div>
        </div>
      </AnimatedNav>

      <main className="lp-main">
        <section className="lp-hero">
          <div className="lp-hero__grid">
            <HeroContent />
            <div id="preview" className="lp-hero__preview">
              {!reduce ? (
                <motion.div
                  className="preview-glow"
                  aria-hidden
                  animate={{ opacity: [0.5, 0.75, 0.5] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
              <ProductPreview />
            </div>
          </div>
        </section>

        <TrustMarquee />

        <Reveal>
          <section className="lp-section lp-pillars">
            <div className="lp-section__head">
              <p className="section-label">Why CampusOne</p>
              <h2 className="lp-section__title">Software that matches how schools actually work</h2>
            </div>
            <div className="lp-pillars__grid">
              {PILLARS.map((p) => (
                <article key={p.title} className="lp-pillar card">
                  <h3 className="lp-pillar__title">{p.title}</h3>
                  <p className="lp-pillar__desc">{p.desc}</p>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <section id="features" className="lp-section">
          <Reveal>
            <div className="lp-section__head">
              <p className="section-label">Platform</p>
              <h2 className="lp-section__title">Everything on one campus, one login per role</h2>
              <p className="lp-section__sub">
                Modules schools use every day — not a bloated ERP you never finish implementing.
              </p>
            </div>
          </Reveal>
          <Stagger className="features-grid lp-features">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <article className="feature-card card h-full lp-feature-card">
                  <div className="feature-icon-box">{f.icon}</div>
                  <h3 className="feature-card-title">{f.title}</h3>
                  <p className="feature-card-desc">{f.desc}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="portals" className="lp-section">
          <Reveal>
            <div className="lp-section__head">
              <p className="section-label">Portals</p>
              <h2 className="lp-section__title">Four experiences, one source of truth</h2>
              <p className="lp-section__sub">
                Same student record whether a teacher marks attendance or a parent checks fees.
              </p>
            </div>
          </Reveal>
          <Stagger className="portals-grid">
            {PORTALS.map((p) => (
              <StaggerItem key={p.role}>
                <Link href={p.href} className="lp-portal card block h-full no-underline">
                  <span className="lp-portal__role">{p.role}</span>
                  <p className="lp-portal__desc">{p.desc}</p>
                  <span className="lp-portal__link">Sign in →</span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="pricing" className="lp-section">
          <Reveal>
            <div className="lp-section__head lp-section__head--center">
              <p className="section-label">Pricing</p>
              <h2 className="lp-section__title">Clear plans. No surprise modules.</h2>
              <p className="lp-section__sub">
                Try every core feature on trial. Upgrade when you are ready — billed monthly or
                annually.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <LandingPricing />
          </Reveal>
        </section>

        <Reveal>
          <Faq />
        </Reveal>

        <Reveal>
          <section className="lp-cta">
            <div className="lp-cta__inner">
              <h2 className="lp-cta__title">Ready to replace the spreadsheet stack?</h2>
              <p className="lp-cta__sub">
                Create your school in minutes. Invite teachers and import students when you are
                ready.
              </p>
              <div className="lp-cta__actions">
                <Link href="/register" className="btn-brand">
                  Start free trial
                </Link>
                <Link href="/login" className="lp-cta__secondary">
                  I already have an account
                </Link>
              </div>
            </div>
          </section>
        </Reveal>

        <footer className="lp-footer">
          <div className="lp-footer__brand">
            <span className="logo-mark" aria-hidden>
              C1
            </span>
            <div>
              <strong>CampusOne</strong>
              <p>Multi-school education platform</p>
            </div>
          </div>
          <nav className="lp-footer__nav" aria-label="Footer">
            <Link href="/register">Register school</Link>
            <Link href="/login">School sign in</Link>
            <Link href="/join">Join with code</Link>
            <Link href="/platform/login">Platform admin</Link>
          </nav>
          <p className="lp-footer__copy">© {new Date().getFullYear()} CampusOne</p>
        </footer>
      </main>

      <BackToTop />
    </div>
  );
}
