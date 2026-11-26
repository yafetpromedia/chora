"use client";

import Link from "next/link";
import { DemoVideoPlayer } from "@/components/landing/demo-video-player";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { BOOK_DEMO_HREF } from "@/lib/demo-video";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  variant?: "home" | "page";
};

export function LandingDemoSection({ variant = "home" }: Props) {
  const { t } = useLocale();
  const isPage = variant === "page";

  const storyPoints = [
    {
      n: "01",
      title: t("demoPageUi.story01Title"),
      desc: t("demoPageUi.story01Desc"),
    },
    {
      n: "02",
      title: t("demoPageUi.story02Title"),
      desc: t("demoPageUi.story02Desc"),
    },
    {
      n: "03",
      title: t("demoPageUi.story03Title"),
      desc: t("demoPageUi.story03Desc"),
    },
    {
      n: "04",
      title: t("demoPageUi.story04Title"),
      desc: t("demoPageUi.story04Desc"),
    },
  ];

  return (
    <section
      id="demo"
      className={`lp3-section lp3-section--demo${isPage ? " lp3-section--demo-page" : ""}`}
    >
      <div className="lp3-container">
        <Reveal>
          <div className="lp3-section__head lp3-section__head--center lp3-section__head--demo">
            <span className="lp3-eyebrow">{t("demoPageUi.eyebrow")}</span>
            <h2 className="lp3-heading">
              {isPage ? t("demoPageUi.titlePage") : t("demoPageUi.titleHome")}
            </h2>
            <p className="lp3-lead lp3-lead--demo">
              {isPage ? t("demoPageUi.leadPage") : t("demoPageUi.leadHome")}
            </p>
          </div>
        </Reveal>

        <Reveal>
          <DemoVideoPlayer size={isPage ? "hero" : "default"} showChapters={isPage} />
        </Reveal>

        <Reveal>
          <p className="lp3-demo-story-lead">{t("demoPageUi.storyLead")}</p>
        </Reveal>

        <Stagger className="lp3-demo-story">
          {storyPoints.map((point) => (
            <StaggerItem key={point.n}>
              <article className="lp3-demo-story__item">
                <span className="lp3-demo-story__n">{point.n}</span>
                <h3>{point.title}</h3>
                <p>{point.desc}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal>
          <div className="lp3-demo-cta">
            <h3 className="lp3-demo-cta__title">
              {t("demoPageUi.ctaTitle", { brand: BRAND_NAME })}
            </h3>
            <p className="lp3-demo-cta__sub">{t("demoPageUi.ctaSub")}</p>
            <div className="lp3-demo-cta__actions">
              <Link href="/register" className="lp3-btn lp3-btn--primary">
                {t("demoPageUi.startTrial")}
              </Link>
              <a href={BOOK_DEMO_HREF} className="lp3-btn lp3-btn--ghost">
                {t("demoPageUi.bookDemo")}
              </a>
              {!isPage ? (
                <Link href="/demo" className="lp3-demo-cta__more">
                  {t("demoPageUi.fullWalkthrough")}
                </Link>
              ) : null}
            </div>
            <p className="lp3-demo-cta__credit">
              {t("demoPageUi.builtBy")}{" "}
              <a
                href="https://awuddigitals.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Awud Digitals
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}