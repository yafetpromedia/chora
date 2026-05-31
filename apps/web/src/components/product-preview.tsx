"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

const BARS = [42, 58, 51, 68, 72, 79, 84];

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="card lp-preview relative z-10 overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={inView || reduce ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="lp-preview__chrome">
        <span className="lp-preview__dot lp-preview__dot--r" />
        <span className="lp-preview__dot lp-preview__dot--y" />
        <span className="lp-preview__dot lp-preview__dot--g" />
        <span className="lp-preview__url">campusone · Admin dashboard</span>
      </div>

      <div className="lp-preview__body">
        <aside className="lp-preview__sidebar" aria-hidden>
          <div className="lp-preview__nav-item lp-preview__nav-item--on" />
          <div className="lp-preview__nav-item" />
          <div className="lp-preview__nav-item" />
          <div className="lp-preview__nav-item" />
          <div className="lp-preview__nav-item" />
        </aside>
        <div className="lp-preview__main">
          <p className="lp-preview__eyebrow">Today · Grade 8</p>
          <div className="lp-preview__stat-row">
            <div className="lp-preview__stat">
              <span className="lp-preview__stat-label">Present</span>
              <strong className="lp-preview__stat-value text-brand-gradient">94%</strong>
              <div className="lp-preview__bar">
                <motion.div
                  className="lp-preview__bar-fill"
                  initial={{ width: 0 }}
                  animate={inView ? { width: "94%" } : { width: 0 }}
                  transition={{ duration: 0.9, delay: 0.2 }}
                />
              </div>
            </div>
            <div className="lp-preview__mini-stats">
              <div>
                <span>Students</span>
                <strong>486</strong>
              </div>
              <div>
                <span>Absent</span>
                <strong>29</strong>
              </div>
            </div>
          </div>
          <div className="lp-preview__chart" aria-hidden>
            {BARS.map((h, i) => (
              <motion.div
                key={i}
                className="lp-preview__chart-bar"
                style={{ height: `${h}%` }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
              />
            ))}
          </div>
          <p className="lp-preview__caption">Attendance trend · last 7 days</p>
        </div>
      </div>
    </motion.div>
  );
}
