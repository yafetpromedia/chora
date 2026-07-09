"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ProductPreview } from "@/components/product-preview";

const STEP_COPY = [
  {
    eyebrow: "Step 1 · School",
    title: "Your campus, digitized in minutes",
    body: "Grades, sections, and an Ethiopian curriculum package — provisioned automatically when you sign up.",
  },
  {
    eyebrow: "Step 2 · Team",
    title: "Invite teachers & parents with one code",
    body: "Each role gets the right portal — admin, teacher, student, and parent — no shared passwords.",
  },
  {
    eyebrow: "Step 3 · Launch",
    title: "Go live with real school operations",
    body: "Attendance, report cards, fees, announcements, and AI study tools — ready on day one.",
  },
] as const;

const FLOAT_STATS: {
  label: string;
  value: string;
  top: string;
  left?: string;
  right?: string;
}[] = [
  { label: "Schools live", value: "120+", top: "6%", left: "6%" },
  { label: "Avg. setup", value: "8 min", top: "40%", left: "4%" },
  { label: "Attendance today", value: "94%", top: "10%", right: "8%" },
];

type Props = {
  activeStep: number;
  schoolName?: string;
};

export function RegisterVisualPanel({ activeStep, schoolName }: Props) {
  const reduce = useReducedMotion();
  const copy = STEP_COPY[activeStep] ?? STEP_COPY[0];
  const displaySchool = schoolName?.trim() || "Your school";

  return (
    <div className="reg-visual">
      <div className="reg-visual__bg" aria-hidden>
        <div className="reg-visual__orb reg-visual__orb--1" />
        <div className="reg-visual__orb reg-visual__orb--2" />
        <div className="reg-visual__grid" />
      </div>

      <div className="reg-visual__content">
        <motion.div
          key={activeStep}
          className="reg-visual__copy"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="reg-visual__eyebrow">{copy.eyebrow}</p>
          <h2 className="reg-visual__title">{copy.title}</h2>
          <p className="reg-visual__body">{copy.body}</p>
        </motion.div>

        <div className="reg-visual__preview-wrap">
          {!reduce
            ? FLOAT_STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="reg-visual__float"
                  style={{ top: stat.top, left: stat.left, right: stat.right }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                >
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </motion.div>
              ))
            : null}

          <div className="reg-visual__preview">
            <ProductPreview />
          </div>

          <motion.div
            className="reg-visual__school-chip"
            key={displaySchool}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="reg-visual__school-mark">C1</span>
            <div>
              <strong>{displaySchool}</strong>
              <em>Provisioning workspace…</em>
            </div>
          </motion.div>
        </div>

        <blockquote className="reg-visual__quote">
          <p>
            &ldquo;Parents see attendance the same day. Report cards went from
            weeks of paperwork to one publish click.&rdquo;
          </p>
          <footer>
            <strong>Selam T.</strong>
            <span>Registrar · private school, Addis Ababa</span>
          </footer>
        </blockquote>

        <ul className="reg-visual__logos" aria-label="Trusted by schools">
          <li>KG–12</li>
          <li>ETB & USD</li>
          <li>Chapa ready</li>
          <li>AI assistant</li>
        </ul>
      </div>
    </div>
  );
}
