"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

const BARS = [38, 52, 48, 61, 68, 74, 82];
const NAV = ["Overview", "Students", "Parents", "Attendance", "Results"];

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="lp3-preview"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={inView || reduce ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="lp3-preview__chrome">
        <div className="lp3-preview__dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <span className="lp3-preview__url">admin.campusone.app</span>
      </div>

      <div className="lp3-preview__body">
        <aside className="lp3-preview__side" aria-hidden>
          <div className="lp3-preview__side-brand">
            <span>C1</span>
            <div>
              <strong>Everest Youth</strong>
              <em>Admin</em>
            </div>
          </div>
          <ul>
            {NAV.map((item, i) => (
              <li key={item} className={i === 1 ? "is-active" : ""}>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="lp3-preview__main">
          <header className="lp3-preview__head">
            <div>
              <p>Students</p>
              <h3>Admission roster</h3>
            </div>
            <span className="lp3-preview__pill">486 enrolled</span>
          </header>

          <div className="lp3-preview__metrics">
            <article>
              <span>Present today</span>
              <strong>94%</strong>
              <div className="lp3-preview__bar">
                <motion.div
                  className="lp3-preview__bar-fill"
                  initial={{ width: 0 }}
                  animate={inView ? { width: "94%" } : { width: 0 }}
                  transition={{ duration: 0.9, delay: 0.15 }}
                />
              </div>
            </article>
            <article>
              <span>Fees collected</span>
              <strong>78%</strong>
            </article>
            <article>
              <span>Report cards</span>
              <strong>Term 2</strong>
            </article>
          </div>

          <div className="lp3-preview__chart" aria-hidden>
            {BARS.map((h, i) => (
              <motion.div
                key={i}
                className="lp3-preview__chart-bar"
                style={{ height: `${h}%` }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.35 }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
