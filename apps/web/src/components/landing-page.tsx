"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNav, NavBrand, NavLinks } from "@/components/animated-nav";
import { BackToTop } from "@/components/back-to-top";
import { Faq } from "@/components/faq";
import { Counter } from "@/components/motion/counter";
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
  { title: "Attendance", desc: "Real-time roll call synced to parents and admins.", icon: <IconAttendance /> },
  { title: "Grades", desc: "Enter, review, and publish report cards in one flow.", icon: <IconGrades /> },
  { title: "Announcements", desc: "Reach the whole school or a single class instantly.", icon: <IconAnnouncements /> },
  { title: "Parent portal", desc: "Families see grades, attendance, and fees without calling.", icon: <IconParents /> },
  { title: "Admin hub", desc: "Enrollment, staff, fees, and ops in one command center.", icon: <IconAdmin /> },
  { title: "Secure stack", desc: "JWT auth, roles, PostgreSQL, multi-tenant ready.", icon: <IconSecurity /> },
];

const PORTALS = [
  { role: "Admin", desc: "Campus control & analytics", color: "var(--brand-teal-dark)" },
  { role: "Teacher", desc: "Classes, grades & attendance", color: "var(--brand-teal)" },
  { role: "Student", desc: "Schedule, work & results", color: "var(--brand-cyan)" },
  { role: "Parent", desc: "Kids, fees & school news", color: "#4ab8be" },
];

const STEPS = [
  { n: "01", title: "Connect your school", desc: "Import students, staff, and classes in minutes." },
  { n: "02", title: "Go live campus-wide", desc: "Roll out portals for every role on day one." },
  { n: "03", title: "Run daily ops", desc: "Attendance, grades, fees, and comms in one place." },
];

const INTEGRATIONS = ["CSV Import", "REST API", "Email alerts", "Role-based SSO", "PostgreSQL", "Multi-campus"];

function HeroContent() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <div className="badge-pill">
          <span className="badge-dot badge-dot-pulse" />
          Education ERP + LMS + Parent Portal
        </div>
      </motion.div>

      <motion.h1
        variants={item}
        className="mt-8 text-[2.75rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]"
      >
        <span className="c-black">One platform.</span>
        <br />
        <span className="text-brand-gradient">For your whole school.</span>
      </motion.h1>

      <motion.p variants={item} className="mt-6 max-w-md text-lg leading-relaxed">
        <span className="c-black-soft">Attendance, grades, fees &amp; family updates</span>
        <span className="c-muted"> — for admins, teachers, students &amp; parents.</span>
      </motion.p>

      <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Link href="/register" className="btn-brand">
            Start your school
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <a href="mailto:hello@campusone.local?subject=Book%20a%20demo" className="btn-ghost">
            Book demo
          </a>
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="mt-10 grid grid-cols-3 gap-3 max-[380px]:grid-cols-1">
        <div className="stat-pill">
          <p className="stat-value">
            <Counter value={99.95} decimals={2} suffix="%" />
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider c-muted">Uptime</p>
        </div>
        <div className="stat-pill">
          <p className="stat-value">
            <Counter value={120} prefix="<" suffix="ms" />
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider c-muted">Latency</p>
        </div>
        <div className="stat-pill">
          <p className="stat-value">
            <Counter value={4} />
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider c-muted">Portals</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <div className="page-shell">
      <AnimatedNav>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <NavBrand />
          <NavLinks />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="nav-link hidden text-sm font-semibold sm:block">
              Login
            </Link>
            <Link href="/join" className="nav-link hidden text-sm font-semibold lg:block">
              Join school
            </Link>
            <motion.div className="hidden md:block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href="/register" className="btn-brand" style={{ padding: "0.55rem 1.25rem" }}>
                Start your school
              </Link>
            </motion.div>
            <MobileNav />
          </div>
        </div>
      </AnimatedNav>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="grid items-center gap-10 pb-8 pt-8 sm:gap-12 sm:pt-12 lg:grid-cols-2 lg:gap-14">
          <HeroContent />
          <div id="preview" className="relative">
            <motion.div
              className="preview-glow"
              aria-hidden
              animate={reduce ? {} : { scale: [1, 1.05, 1], opacity: [0.6, 0.85, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <ProductPreview />
          </div>
        </section>

        <TrustMarquee />

        <Reveal>
          <section className="pb-20">
            <p className="section-label">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              <span className="c-black">Live in </span>
              <span className="text-brand-gradient">three steps</span>
            </h2>
            <Stagger className="steps-grid mt-10">
              {STEPS.map((s) => (
                <StaggerItem key={s.n}>
                  <motion.div className="card h-full p-6" whileHover={{ y: -4 }}>
                    <span className="text-4xl font-extrabold text-brand-gradient" style={{ lineHeight: 1 }}>
                      {s.n}
                    </span>
                    <h3 className="mt-4 text-lg font-bold c-black">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed c-muted">{s.desc}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        </Reveal>

        <Reveal>
          <section className="integrations-strip pb-20">
            <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] c-faint">
              Built with modern tools
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {INTEGRATIONS.map((tag) => (
                <span key={tag} className="integration-tag">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </Reveal>

        <section id="features" className="pb-20">
          <Reveal>
            <p className="section-label">Platform</p>
            <h2 className="mt-2 max-w-lg text-3xl font-extrabold sm:text-4xl">
              <span className="c-black">Every tool </span>
              <span className="text-brand-gradient">your school needs</span>
            </h2>
            <p className="mt-3">
              <span className="c-black-soft">Modular and focused</span>
              <span className="c-muted"> — built for daily use.</span>
            </p>
          </Reveal>
          <Stagger className="features-grid mt-8 sm:mt-10">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <motion.article
                  className="feature-card card h-full"
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className="feature-icon-box">{f.icon}</div>
                  <h3 className="feature-card-title">{f.title}</h3>
                  <p className="feature-card-desc">{f.desc}</p>
                </motion.article>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="portals" className="pb-20">
          <Reveal>
            <p className="section-label">Portals</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              <span className="c-black">Built for </span>
              <span className="text-brand-gradient">every role</span>
            </h2>
            <p className="mt-3 c-muted">One database. Four experiences tailored to who&apos;s logging in.</p>
          </Reveal>
          <Stagger className="portals-grid mt-8 sm:mt-10">
            {PORTALS.map((p) => (
              <StaggerItem key={p.role}>
                <motion.div whileHover={{ y: -6 }}>
                  <Link href="/login" className="card block h-full p-6 no-underline">
                    <div
                      className="portal-stripe"
                      style={{ background: `linear-gradient(90deg, ${p.color}, var(--brand-cyan))` }}
                    />
                    <p className="text-xl font-bold c-black">{p.role}</p>
                    <p className="mt-2 text-sm c-muted">{p.desc}</p>
                    <span className="mt-5 inline-block text-sm font-bold c-teal">Enter portal →</span>
                  </Link>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="pricing" className="pb-20">
          <Reveal>
            <p className="section-label">Pricing</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              <span className="c-black">Simple, </span>
              <span className="text-brand-gradient">transparent plans</span>
            </h2>
          </Reveal>
          <Stagger className="pricing-grid mt-8 sm:mt-10">
            {[
              { name: "Starter", price: "$59", sub: "/mo · up to 800 students", hot: false },
              { name: "Growth", price: "$179", sub: "/mo · up to 5,000 students", hot: true },
              { name: "Enterprise", price: "Custom", sub: "Multi-campus · SSO · SLA", hot: false },
            ].map((plan) => (
              <StaggerItem key={plan.name}>
                <motion.article
                  className={`card relative flex h-full flex-col p-7 ${plan.hot ? "card-featured" : ""}`}
                  whileHover={{ y: -4 }}
                >
                  {plan.hot ? (
                    <span
                      className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase text-white"
                      style={{ background: "linear-gradient(90deg, var(--brand-teal), var(--brand-cyan))" }}
                    >
                      Popular
                    </span>
                  ) : null}
                  <p className="text-sm font-semibold c-muted">{plan.name}</p>
                  <p className="mt-2 text-4xl font-extrabold text-brand-gradient">{plan.price}</p>
                  <p className="text-sm c-muted">{plan.sub}</p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm c-muted">
                    <li>✓ All 4 portals</li>
                    <li>✓ Attendance & grades</li>
                    <li>✓ Messaging & alerts</li>
                  </ul>
                  <Link
                    href="/register"
                    className={plan.hot ? "btn-brand mt-6 text-center" : "btn-ghost mt-6 text-center"}
                  >
                    Choose {plan.name}
                  </Link>
                </motion.article>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <Reveal>
          <Faq />
        </Reveal>

        <Reveal>
          <motion.section
            className="cta-band mb-16"
            whileInView={reduce ? {} : { scale: [0.98, 1] }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to modernize your school?</h2>
            <p className="mx-auto mt-4 max-w-md text-base opacity-90">
              Free trial · No credit card · Go live this week
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link href="/register" className="btn-ghost">
                  Start your school
                </Link>
              </motion.div>
              <a
                href="mailto:hello@schoolos.local"
                className="btn-ghost"
                style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}
              >
                Contact sales
              </a>
            </div>
          </motion.section>
        </Reveal>

        <footer className="pb-10 text-center text-xs c-faint">
          © {new Date().getFullYear()} CampusOne · Multi-school education platform
        </footer>
      </main>

      <BackToTop />
    </div>
  );
}
