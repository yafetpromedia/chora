"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type CSSProperties } from "react";
import { DashIcon, type DashIconName } from "@/components/dashboard/dash-icons";
import { BrandMark } from "@/components/brand-mark";
import { BirrSymbol } from "@/components/billing/birr-symbol";

const NAV: { label: string; icon: DashIconName; active?: boolean }[] = [
  { label: "Overview", icon: "overview", active: true },
  { label: "Students", icon: "students" },
  { label: "Attendance", icon: "attendance" },
  { label: "Results", icon: "results" },
  { label: "Finance", icon: "finance" },
];

const COMMUNITY = [
  { label: "Students", value: 486, tone: "teal" },
  { label: "Parents", value: 412, tone: "blue" },
  { label: "Teachers", value: 38, tone: "amber" },
];

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="lp3-preview lp3-preview--real"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={inView || reduce ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="lp3-preview__chrome">
        <div className="lp3-preview__dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <span className="lp3-preview__url">everest-youth.chora.app/admin</span>
        <span className="lp3-preview__notify" aria-hidden>
          2
        </span>
      </div>

      <div className="lp3-preview__body">
        <aside className="lp3-preview__side" aria-hidden>
          <div className="lp3-preview__side-brand">
            <BrandMark />
            <div>
              <strong>Everest Youth</strong>
              <em>Admin workspace</em>
            </div>
          </div>
          <ul>
            {NAV.map((item) => (
              <li key={item.label} className={item.active ? "is-active" : ""}>
                <DashIcon name={item.icon} className="lp3-preview__nav-icon" />
                {item.label}
              </li>
            ))}
          </ul>
        </aside>

        <div className="lp3-preview__main">
          <div className="lp3-preview__dash-hero">
            <div>
              <p>Thursday, July 10</p>
              <h3>Everest Youth Academy</h3>
            </div>
            <div className="lp3-preview__hero-chips">
              <span>2025/26 · Term 2</span>
              <span className="lp3-preview__live">Live</span>
            </div>
          </div>

          <div className="lp3-preview__kpis">
            <article>
              <span className="lp3-preview__kpi-icon lp3-preview__kpi-icon--att">
                <DashIcon name="attendance" className="lp3-preview__kpi-svg" />
              </span>
              <div>
                <span>Attendance today</span>
                <strong>94%</strong>
                <em>412 marked · 28 absent</em>
              </div>
            </article>
            <article>
              <span className="lp3-preview__kpi-icon lp3-preview__kpi-icon--fin">
                <DashIcon name="finance" className="lp3-preview__kpi-svg" />
              </span>
              <div>
                <span>Collected</span>
                <strong>
                  1.2M <BirrSymbol size={12} />
                </strong>
                <em>78% of expected</em>
              </div>
            </article>
            <article>
              <span className="lp3-preview__kpi-icon lp3-preview__kpi-icon--stu">
                <DashIcon name="students" className="lp3-preview__kpi-svg" />
              </span>
              <div>
                <span>Enrolled</span>
                <strong>486</strong>
                <em>Across 24 sections</em>
              </div>
            </article>
          </div>

          <div className="lp3-preview__widgets">
            <article className="lp3-preview__widget">
              <div className="lp3-preview__widget-head">
                <strong>Fee collection</strong>
                <span>Finance →</span>
              </div>
              <div className="lp3-preview__ring-wrap">
                <div className="lp3-preview__ring" style={{ "--pct": "78" } as CSSProperties}>
                  <span>78%</span>
                </div>
                <ul>
                  <li>
                    <span>Collected</span>
                    <strong>
                      940K <BirrSymbol size={11} />
                    </strong>
                  </li>
                  <li>
                    <span>Outstanding</span>
                    <strong>
                      260K <BirrSymbol size={11} />
                    </strong>
                  </li>
                </ul>
              </div>
            </article>

            <article className="lp3-preview__widget">
              <div className="lp3-preview__widget-head">
                <strong>Community</strong>
                <span>Parents →</span>
              </div>
              <ul className="lp3-preview__community">
                {COMMUNITY.map((row) => (
                  <li key={row.label} className={`lp3-preview__community-row--${row.tone}`}>
                    <span>{row.label}</span>
                    <div className="lp3-preview__community-bar">
                      <motion.i
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${Math.min(100, (row.value / 486) * 100)}%` } : { width: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                      />
                    </div>
                    <strong>{row.value}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
