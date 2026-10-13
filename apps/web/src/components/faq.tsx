"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most schools create their tenant in one session, set grades and sections, then import students via CSV. Teachers and parents can be invited the same week.",
  },
  {
    q: "Can we pay in Ethiopian birr?",
    a: `Yes. Plans are listed in USD and ETB. When you are on a paid plan, ${BRAND_NAME} can invoice your school in the currency you choose.`,
  },
  {
    q: "Do parents need to download an app?",
    a: `They can use the ${BRAND_NAME} app on Google Play or the App Store, or sign in through the mobile-friendly web portal. Same school code and login either way.`,
  },
  {
    q: "What happens when the trial ends?",
    a: "You choose a school size, then keep the modules you need — including attendance, results, yearly report cards, and HR & payroll. Until then, every module stays available for 14 days, up to 50 students.",
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
    <section id="faq" className="lp3-section lp3-faq">
      <div className="lp3-faq__panel">
        <div className="lp3-section__head lp3-section__head--center">
          <span className="lp3-eyebrow">FAQ</span>
          <h2 className="lp3-heading">Questions school leaders ask</h2>
        </div>
        <div className="lp3-faq__list">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="lp3-faq__item">
              <button
                type="button"
                className="lp3-faq__trigger"
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
                    <p className="lp3-faq__answer">{item.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
