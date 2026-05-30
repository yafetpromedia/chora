"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

const BARS = [38, 55, 48, 72, 65, 80, 88];

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="card relative z-10 overflow-hidden"
      style={{ borderRadius: "1.25rem" }}
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={inView || reduce ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--brand-border)", background: "var(--brand-surface)" }}
      >
        <span className="size-2.5 rounded-full" style={{ background: "#f0a0a0" }} />
        <span className="size-2.5 rounded-full" style={{ background: "#f0d080" }} />
        <span className="size-2.5 rounded-full" style={{ background: "var(--brand-cyan)" }} />
        <span
          className="ml-2 flex-1 rounded-lg py-1.5 text-center text-[10px] font-medium c-muted"
          style={{ background: "#fff" }}
        >
          app.schoolos.io / admin
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest c-muted">Today</p>
          <div
            className="mt-2 rounded-xl p-4"
            style={{ background: "var(--brand-surface)", border: "1px solid var(--brand-border)" }}
          >
            <p className="text-xs c-muted">Attendance</p>
            <motion.p
              className="mt-1 text-3xl font-extrabold text-brand-gradient"
              initial={reduce ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
            >
              96.4%
            </motion.p>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--brand-border)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, var(--brand-teal), var(--brand-cyan))" }}
                initial={{ width: 0 }}
                animate={inView ? { width: "96.4%" } : { width: 0 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["Students", "1,240"],
              ["Pending", "42"],
            ].map(([l, v], i) => (
              <motion.div
                key={l}
                className="rounded-xl p-3"
                style={{ border: "1px solid var(--brand-border)", background: "#fff" }}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <p className="text-[10px] c-faint">{l}</p>
                <p className="text-lg font-bold c-ink">{v}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ border: "1px solid var(--brand-border)", background: "#fff" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest c-muted">Weekly</p>
          <div className="mt-3 flex h-28 items-end gap-1">
            {BARS.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  className="w-full rounded-t"
                  style={{ background: "linear-gradient(to top, var(--brand-teal), var(--brand-cyan))" }}
                  initial={{ height: 0 }}
                  animate={inView ? { height: `${h}%` } : { height: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="text-[8px] c-faint">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-4 gap-2 p-3"
        style={{ borderTop: "1px solid var(--brand-border)", background: "var(--brand-surface)" }}
      >
        {["Admin", "Teacher", "Student", "Parent"].map((r, i) => (
          <motion.span
            key={r}
            className="rounded-lg py-2 text-center text-[10px] font-bold"
            style={{ background: "#fff", border: "1px solid var(--brand-border)", color: "var(--brand-teal-dark)" }}
            initial={reduce ? false : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 + i * 0.05 }}
            whileHover={{ scale: 1.04, borderColor: "var(--brand-cyan)" }}
          >
            {r}
          </motion.span>
        ))}
      </div>

      {/* Floating live badge */}
      <motion.div
        className="absolute right-4 top-14 rounded-full px-3 py-1 text-[10px] font-bold text-white"
        style={{ background: "linear-gradient(90deg, var(--brand-teal), var(--brand-cyan))" }}
        animate={reduce ? {} : { y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        ● Live
      </motion.div>
    </motion.div>
  );
}
