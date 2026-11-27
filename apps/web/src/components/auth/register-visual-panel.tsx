"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { useLandingHeroImage } from "@/hooks/use-landing-hero-image";
import { useLocale } from "@/components/i18n/locale-provider";

const STEP_KEYS = [
  {
    eyebrowKey: "auth.regVisualStep1Eyebrow",
    titleKey: "auth.regVisualStep1Title",
    bodyKey: "auth.regVisualStep1Body",
  },
  {
    eyebrowKey: "auth.regVisualStep2Eyebrow",
    titleKey: "auth.regVisualStep2Title",
    bodyKey: "auth.regVisualStep2Body",
  },
] as const;

const TRIAL_HIGHLIGHT_KEYS = [
  {
    titleKey: "auth.trialConcernTitle",
    descKey: "auth.trialConcernDesc",
  },
  {
    titleKey: "features.yearlyTitle",
    descKey: "auth.trialYearlyShortDesc",
  },
  {
    titleKey: "features.hrTitle",
    descKey: "auth.trialHrShortDesc",
  },
] as const;

export function useTrialHighlights() {
  const { t } = useLocale();
  return useMemo(
    () =>
      TRIAL_HIGHLIGHT_KEYS.map((item) => ({
        title: t(item.titleKey),
        desc: t(item.descKey),
      })),
    [t],
  );
}

type Props = {
  activeStep: number;
};

export function RegisterVisualPanel({ activeStep }: Props) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const heroSrc = useLandingHeroImage();
  const trialHighlights = useTrialHighlights();

  const stepCopy = useMemo(
    () =>
      STEP_KEYS.map((step) => ({
        eyebrow: t(step.eyebrowKey),
        title: t(step.titleKey),
        body: t(step.bodyKey),
      })),
    [t],
  );

  const copy = stepCopy[activeStep] ?? stepCopy[0];

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
          {trialHighlights.map((item) => (
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