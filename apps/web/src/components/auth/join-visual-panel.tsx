"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ProductPreview } from "@/components/product-preview";

const FLOAT_STATS = [
  { label: "Term average", value: "87%", top: "6%", left: "5%" },
  { label: "Fees balance", value: "ETB 0", top: "38%", left: "3%" },
  { label: "Next class", value: "Math", top: "10%", right: "6%" },
];

type Props = {
  schoolCode?: string;
  schoolName?: string;
  activeStep: number;
};

export function JoinVisualPanel({ schoolCode, schoolName, activeStep }: Props) {
  const reduce = useReducedMotion();
  const code = schoolCode?.trim().toUpperCase() || "—";

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
          <p className="reg-visual__eyebrow">Student portal</p>
          <h2 className="reg-visual__title">Your campus life, in your pocket</h2>
          <p className="reg-visual__body">
            Only students enrolled by your school can access the portal. Teachers
            and parents join through secure invite links from admin.
          </p>
          <ul className="join-visual__perks">
            <li>Campus ID</li>
            <li>Report cards</li>
            <li>eLibrary AI</li>
            <li>Timetable</li>
          </ul>
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
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
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
            className="reg-visual__school-chip join-visual__code-chip"
            key={code}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="reg-visual__school-mark">#</span>
            <div>
              <strong>{code}</strong>
              <em>{schoolName ?? "School join code"}</em>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
