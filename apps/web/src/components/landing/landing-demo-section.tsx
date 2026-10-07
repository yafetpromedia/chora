"use client";

import Link from "next/link";
import { DemoVideoPlayer } from "@/components/landing/demo-video-player";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { BOOK_DEMO_HREF, DEMO_STORY_POINTS } from "@/lib/demo-video";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  variant?: "home" | "page";
};

export function LandingDemoSection({ variant = "home" }: Props) {
  const isPage = variant === "page";

  return (
    <section
      id="demo"
      className={`lp3-section lp3-section--demo${isPage ? " lp3-section--demo-page" : ""}`}
    >
      <div className="lp3-container">
        <Reveal>
          <div className="lp3-section__head lp3-section__head--center lp3-section__head--demo">
            <span className="lp3-eyebrow">Product walkthrough</span>
            <h2 className="lp3-heading">
              {isPage ? "See how Chora works" : "See Chora in Action"}
            </h2>
            <p className="lp3-lead lp3-lead--demo">
              {isPage
                ? "A closer look at how schools, teachers, students and parents use Chora every day."
                : "From administration to learning, see how Chora connects your entire school community in one platform."}
            </p>
          </div>
        </Reveal>

        <Reveal>
          <DemoVideoPlayer size={isPage ? "hero" : "default"} showChapters={isPage} />
        </Reveal>

        <Reveal>
          <p className="lp3-demo-story-lead">
            From school administration to student learning.
          </p>
        </Reveal>

        <Stagger className="lp3-demo-story">
          {DEMO_STORY_POINTS.map((point) => (
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
              Ready to see what {BRAND_NAME} can do for your school?
            </h3>
            <p className="lp3-demo-cta__sub">
              Start your 14-day free trial — no credit card required.
            </p>
            <div className="lp3-demo-cta__actions">
              <Link href="/register" className="lp3-btn lp3-btn--primary">
                Start free trial
              </Link>
              <a href={BOOK_DEMO_HREF} className="lp3-btn lp3-btn--ghost">
                Book a demo
              </a>
              {!isPage ? (
                <Link href="/demo" className="lp3-demo-cta__more">
                  Full walkthrough &amp; chapters
                </Link>
              ) : null}
            </div>
            <p className="lp3-demo-cta__credit">
              Built by{" "}
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
