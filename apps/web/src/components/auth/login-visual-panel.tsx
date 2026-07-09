"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ProductPreview } from "@/components/product-preview";

const FLOAT_STATS: {
  label: string;
  value: string;
  top: string;
  left?: string;
  right?: string;
}[] = [
  { label: "Portals", value: "5 roles", top: "6%", left: "5%" },
  { label: "Avg. sign-in", value: "< 10s", top: "38%", left: "3%" },
  { label: "Uptime", value: "99.9%", top: "10%", right: "6%" },
];

type Props = {
  schoolCode?: string;
  schoolName?: string;
};

export function LoginVisualPanel({ schoolCode, schoolName }: Props) {
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
          className="reg-visual__copy"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="reg-visual__eyebrow">Secure school sign-in</p>
          <h2 className="reg-visual__title">Pick up where you left off</h2>
          <p className="reg-visual__body">
            One login for admin, teacher, student, and parent portals — each
            scoped to your school workspace.
          </p>
          <ul className="join-visual__perks">
            <li>Attendance</li>
            <li>Report cards</li>
            <li>Fees</li>
            <li>Announcements</li>
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
              <em>{schoolName ?? "School workspace code"}</em>
            </div>
          </motion.div>
        </div>

        <blockquote className="reg-visual__quote">
          <p>
            &ldquo;Teachers submit grades from their phones. I approve and publish
            report cards before parents even ask.&rdquo;
          </p>
          <footer>
            <strong>Yonas A.</strong>
            <span>Academic director · Addis Ababa</span>
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
