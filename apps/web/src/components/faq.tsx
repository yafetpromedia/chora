"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

const FAQ_KEYS = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
  { q: "faq.q6", a: "faq.a6" },
  { q: "faq.q7", a: "faq.a7" },
  { q: "faq.q8", a: "faq.a8" },
] as const;

export function Faq() {
  const { t } = useLocale();
  const faqs = useMemo(
    () => FAQ_KEYS.map((item) => ({ q: t(item.q), a: t(item.a) })),
    [t],
  );
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section id="faq" className="lp3-section lp3-faq">
      <div className="lp3-faq__panel">
        <div className="lp3-section__head lp3-section__head--center">
          <span className="lp3-eyebrow">{t("faq.eyebrow")}</span>
          <h2 className="lp3-heading">{t("faq.title")}</h2>
        </div>
        <div className="lp3-faq__list">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={FAQ_KEYS[i].q} className="lp3-faq__item">
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