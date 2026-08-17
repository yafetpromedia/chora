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
    body: "Create the account you’ll use to manage the school. Add teachers and students later from admin.",
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
      </div>
    </div>
  );
}
