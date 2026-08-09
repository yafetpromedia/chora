"use client";

import { motion, useReducedMotion } from "framer-motion";

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
  { label: "Schools live", value: "120+", top: "18%", left: "8%" },
  { label: "Avg. setup", value: "8 min", top: "62%", left: "6%" },
  { label: "Uptime", value: "99.9%", top: "24%", right: "7%" },
] as const;

export function LoginVisualPanel() {
  const reduce = useReducedMotion();

  return (
    <div className="login-visual">
      <div className="login-visual__wave" aria-hidden>
        <svg viewBox="0 0 80 1000" preserveAspectRatio="none">
          <path
            d="M0 0 L0 1000 L54 1000 C40 820 30 660 44 500 C28 340 38 180 54 0 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="login-visual__bg" aria-hidden>
        <img
          src="/images/login-classroom.png"
          alt=""
          className="login-visual__photo"
        />
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
              <span className="login-visual__logo-mark">C1</span>
            </span>
            <div className="login-visual__brand-text">
              <strong>CampusOne</strong>
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
                {index > 0 ? (
                  <span className="login-visual__feature-divider" aria-hidden />
                ) : null}
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
