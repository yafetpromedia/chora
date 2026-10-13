"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";

const STEP_COPY = [
  {
    eyebrow: "Step 1 · School",
    title: "Your campus, ready in minutes",
    body: "We set up grades, sections, and an Ethiopian curriculum package as soon as you continue.",
  },
  {
    eyebrow: "Step 2 · Admin",
    title: "Your secure admin login",
    body: "Create the account you’ll use to manage attendance, report cards, leave, and payroll.",
  },
] as const;

export const TRIAL_HIGHLIGHTS = [
  {
    title: "Attendance concerns",
    desc: "Review a mark before it stays on the record",
  },
  {
    title: "Yearly report cards",
    desc: "Print the full year and let families verify it",
  },
  {
    title: "HR, leave & payroll",
    desc: "Staff check-in, leave approvals, and payslips",
  },
] as const;

type Props = {
  activeStep: number;
};

export function RegisterVisualPanel({ activeStep }: Props) {
  const reduce = useReducedMotion();
  const copy = STEP_COPY[activeStep] ?? STEP_COPY[0];
  const heroSrc = useLandingHeroImage();

  return (
    <div className="reg-visual reg-visual--photo">
      <div className="reg-visual__bg" aria-hidden>
        {heroSrc ? (
          <img src={heroSrc} alt="" className="reg-visual__photo" />
        ) : null}
        <div className="reg-visual__tint" />
      </div>

      <div className="reg-visual__content reg-visual__content--photo">
        <motion.div
          key={activeStep}
          className="reg-visual__copy"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="reg-visual__eyebrow">{copy.eyebrow}</p>
          <h2 className="reg-visual__title">{copy.title}</h2>
          <p className="reg-visual__body">{copy.body}</p>
        </motion.div>

        <ul className="reg-visual__features">
          {TRIAL_HIGHLIGHTS.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
