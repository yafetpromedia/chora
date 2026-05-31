"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most schools create their tenant in one session, set grades and sections, then import students via CSV. Teachers and parents can be invited the same week.",
  },
  {
    q: "Can we pay in Ethiopian birr?",
    a: "Yes. Plans are listed in USD and ETB. When you are on a paid plan, CampusOne can invoice your school in the currency you choose.",
  },
  {
    q: "Do parents need a separate app?",
    a: "No app store download required. Parents use a mobile-friendly web portal for attendance, results, fees, and announcements.",
  },
  {
    q: "What happens when the trial ends?",
    a: "You choose Starter, Professional, or talk to us for Enterprise. Until then, core modules stay available during the 14-day trial within trial limits.",
  },
  {
    q: "Is our data isolated from other schools?",
    a: "Every school is a separate tenant in the database. Staff only see their school; platform operators use a separate admin console.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section id="faq" className="lp-section">
      <p className="section-label">FAQ</p>
      <h2 className="lp-section__title">Questions school leaders ask</h2>
      <div className="lp-faq-list">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="lp-faq-item card overflow-hidden">
              <button
                type="button"
                className="lp-faq-item__trigger"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.2 }}
                  className="lp-faq-item__icon"
                  aria-hidden
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
                    transition={{ duration: 0.22 }}
                  >
                    <p className="lp-faq-item__answer">{item.a}</p>
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
