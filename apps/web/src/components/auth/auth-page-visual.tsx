"use client";

import { motion, useReducedMotion } from "framer-motion";

export type AuthVisualStep = {
  label: string;
  desc?: string;
};

type AuthPageVisualProps = {
  title: string;
  description: string;
  steps?: AuthVisualStep[];
  activeStep?: number;
};

export function AuthPageVisual({
  title,
  description,
  steps,
  activeStep = 0,
}: AuthPageVisualProps) {
  const reduce = useReducedMotion();

  return (
    <div className="auth-page-visual">
      <motion.div
        className="auth-page-visual-inner"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="auth-page-visual-glow"
          animate={reduce ? undefined : { opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="auth-page-visual-mesh" aria-hidden />

        <div className="auth-page-visual-content">
          <p className="auth-page-visual-title">{title}</p>
          <p className="auth-page-visual-desc">{description}</p>

          {steps && steps.length > 0 ? (
            <ol className="auth-page-steps">
              {steps.map((step, index) => {
                const isActive = index === activeStep;
                const isDone = index < activeStep;
                return (
                  <motion.li
                    key={step.label}
                    className={`auth-page-step${isActive ? " auth-page-step--active" : ""}${isDone ? " auth-page-step--done" : ""}`}
                    initial={reduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.08, duration: 0.35 }}
                  >
                    <span className="auth-page-step-num" aria-hidden>
                      {isDone ? "✓" : index + 1}
                    </span>
                    <span className="auth-page-step-text">
                      <span className="auth-page-step-label">{step.label}</span>
                      {step.desc ? (
                        <span className="auth-page-step-desc">{step.desc}</span>
                      ) : null}
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
