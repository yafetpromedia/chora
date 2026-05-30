"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most schools go live in under a week. Import your data, configure roles, and roll out portals to staff and families.",
  },
  {
    q: "Can we use our existing student data?",
    a: "Yes. Import via CSV or connect your SIS. We support bulk student, staff, and class imports on day one.",
  },
  {
    q: "Is there a separate app for parents?",
    a: "Parents use the Parent Portal — web-based, mobile-friendly, with grades, attendance, fees, and announcements.",
  },
  {
    q: "What about security and privacy?",
    a: "Role-based access, JWT authentication, encrypted connections, and tenant isolation. Built for FERPA-aware workflows.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section id="faq" className="pb-20">
      <p className="section-label">FAQ</p>
      <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
        <span className="c-black">Common </span>
        <span className="text-brand-gradient">questions</span>
      </h2>
      <div className="mt-8 space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="card overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="font-bold c-black">{item.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.2 }}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-lg font-light"
                  style={{ background: "var(--brand-surface)", color: "var(--brand-teal)" }}
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="border-t px-5 pb-5 pt-3 text-sm leading-relaxed c-muted" style={{ borderColor: "var(--brand-border)" }}>
                      {item.a}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
