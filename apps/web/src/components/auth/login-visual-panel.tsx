"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";

const FEATURES = [
  {
    title: "Attendance",
    desc: "Daily tracking & reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7.5 12.5l2.75 2.75 6-6.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Library",
    desc: "Books & borrowing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6.25 5.75h5.25a2 2 0 012 2V18H8.25a2 2 0 01-2-2V5.75z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M11.5 7.75H16.75a2 2 0 012 2V18H11.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Results",
    desc: "Grades & report cards",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 5.75h8a1.75 1.75 0 011.75 1.75v10.5A1.75 1.75 0 0116 19.75H8A1.75 1.75 0 016.25 18V7.5A1.75 1.75 0 018 5.75z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 10h4M10 13.25h4M10 16.5h2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

const FLOATS = [
  { label: "Schools live", value: "120+", top: "18%", left: "58%" },
  { label: "Avg. setup", value: "8 min", top: "62%", left: "56%" },
  { label: "Uptime", value: "99.9%", top: "24%", right: "7%" },
] as const;

function FeatureGraphDivider({ delay = 0 }: { delay?: number }) {
  const gradId = `login-graph-fill-${String(delay).replace(".", "")}`;

  return (
    <span
      className="login-visual__feature-graph"
      aria-hidden
      style={{ animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 24 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path
          className="login-visual__feature-graph-area"
          d="M12 4 C16 14 8 24 12 34 C16 44 8 54 12 64 C16 74 9 84 12 96 L12 96 L12 4 Z"
          fill={`url(#${gradId})`}
        />
        <path
          className="login-visual__feature-graph-line"
          d="M12 4 C16 14 8 24 12 34 C16 44 8 54 12 64 C16 74 9 84 12 96"
          fill="none"
          stroke="rgba(255,255,255,0.88)"
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="login-visual__feature-graph-dot"
          cx="12"
          cy="34"
          r="2.2"
          fill="#fff"
        />
        <circle
          className="login-visual__feature-graph-dot login-visual__feature-graph-dot--b"
          cx="12"
          cy="64"
          r="1.8"
          fill="#b8e8eb"
        />
      </svg>
    </span>
  );
}

export function LoginVisualPanel() {
  const reduce = useReducedMotion();
  const heroSrc = useLandingHeroImage();

  return (
    <div className="login-visual">
      <div className="login-visual__bg" aria-hidden>
        {heroSrc ? (
          <img src={heroSrc} alt="" className="login-visual__photo" />
        ) : null}
        <div className="login-visual__tint" />
        <div className="login-visual__mesh" />
        <div className="login-visual__glow login-visual__glow--1" />
        <div className="login-visual__glow login-visual__glow--2" />
      </div>

      {!reduce
        ? FLOATS.map((chip, i) => (
            <motion.div
              key={chip.label}
              className="login-visual__float"
              style={{
                top: chip.top,
                left: chip.left,
                right: chip.right,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.1, duration: 0.5 }}
            >
              <span>{chip.label}</span>
              <strong>{chip.value}</strong>
            </motion.div>
          ))
        : null}

      <div className="login-visual__content">
        <motion.header
          className="login-visual__brand"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="login-visual__brand-lockup">
            <span className="login-visual__logo-ring" aria-hidden>
              <span className="login-visual__logo-arc" />
              <BrandMark className="login-visual__logo-mark" />
            </span>
            <div className="login-visual__brand-text">
              <strong>{BRAND_NAME}</strong>
              <span>School management</span>
            </div>
          </div>

          <div className="login-visual__trusted">
            <span className="login-visual__trusted-icon" aria-hidden>
              <svg viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 8.25l2.25 2.25L12 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Trusted by schools
          </div>
        </motion.header>

        <motion.div
          className="login-visual__hero"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="login-visual__title">
            Better schools.
            <br />
            <span>Smarter management.</span>
          </h2>
          <p className="login-visual__body">
            Streamline operations, engage stakeholders and improve student
            outcomes.
          </p>
        </motion.div>

        <motion.div
          className="login-visual__features-shell"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        >
          <ul className="login-visual__features">
            {FEATURES.map((feature, index) => (
              <motion.li
                key={feature.title}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
              >
                {index > 0 ? <FeatureGraphDivider delay={index * 0.55} /> : null}
                <span className="login-visual__feature-icon">{feature.icon}</span>
                <strong>{feature.title}</strong>
                <span>{feature.desc}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
