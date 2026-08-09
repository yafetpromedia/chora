"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { AppStoreBadges } from "@/components/landing/app-store-badges";

const PERKS = [
  "Real-time attendance alerts for parents",
  "Digital campus ID with QR check-in",
  "Fees, results, and notices in one feed",
  "Same login as web — school code + username",
];

function PhoneFrame({
  variant,
  children,
}: {
  variant: "back" | "front";
  children: ReactNode;
}) {
  return (
    <div className={`lp3-phone lp3-phone--${variant}`}>
      <div className="lp3-phone__shadow" aria-hidden />
      <div className="lp3-phone__frame">
        <span className="lp3-phone__btn lp3-phone__btn--silent" aria-hidden />
        <span className="lp3-phone__btn lp3-phone__btn--vol-up" aria-hidden />
        <span className="lp3-phone__btn lp3-phone__btn--vol-down" aria-hidden />
        <span className="lp3-phone__btn lp3-phone__btn--power" aria-hidden />
        <div className="lp3-phone__bezel" aria-hidden />
        <div className="lp3-phone__island" aria-hidden>
          <span className="lp3-phone__island-cam" />
        </div>
        <div className="lp3-phone__screen">
          <div className="lp3-phone__status">
            <span>9:41</span>
            <span className="lp3-phone__status-icons" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
          {children}
        </div>
        <div className="lp3-phone__home-bar" aria-hidden />
      </div>
    </div>
  );
}

export function LandingAppSection() {
  return (
    <section id="app" className="lp3-app">
      <div className="lp3-container">
        <Reveal>
          <div className="lp3-app__panel">
            <div className="lp3-app__copy">
              <span className="lp3-eyebrow">Mobile app</span>
              <h2 className="lp3-heading">CampusOne on iOS &amp; Android</h2>
              <p className="lp3-lead">
                Parents and students stay connected between school and home. Download from Google
                Play or the App Store — free for every family linked to your school.
              </p>
              <ul className="lp3-app__list">
                {PERKS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <AppStoreBadges variant="dark" className="lp3-app__stores" />
            </div>

            <div className="lp3-app__phones" aria-hidden>
              <div className="lp3-app__phones-glow" />
              <div className="lp3-app__phones-ring" />

              <div className="lp3-app__chip lp3-app__chip--attendance">Present · 8:04 AM</div>
              <div className="lp3-app__chip lp3-app__chip--fee">2,400 ETB due</div>

              <PhoneFrame variant="back">
                <div className="lp3-phone__screen-body lp3-phone__screen-body--id">
                  <header className="lp3-phone__app-head">
                    <span>C1</span>
                    <div>
                      <strong>Campus ID</strong>
                      <em>Everest Youth Academy</em>
                    </div>
                  </header>
                  <div className="lp3-phone__id-card">
                    <div className="lp3-phone__id-top">
                      <div className="lp3-phone__avatar">YT</div>
                      <div>
                        <p className="lp3-phone__id-name">Yafet Tesfaye</p>
                        <em>Grade 11 · Natural B</em>
                      </div>
                    </div>
                    <div className="lp3-phone__id-meta">
                      <span>ID #EYA-2041</span>
                      <span>Valid 2026</span>
                    </div>
                    <div className="lp3-phone__qr" aria-hidden>
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </PhoneFrame>

              <PhoneFrame variant="front">
                <div className="lp3-phone__screen-body lp3-phone__screen-body--parent">
                  <header className="lp3-phone__app-head lp3-phone__app-head--row">
                    <span>C1</span>
                    <div>
                      <strong>Parent</strong>
                      <em>Everest Youth Academy</em>
                    </div>
                  </header>
                  <div className="lp3-phone__hero">
                    <div className="lp3-phone__hero-top">
                      <p>Today</p>
                      <span className="lp3-phone__badge">Live</span>
                    </div>
                    <h4>Present</h4>
                    <span className="lp3-phone__hero-time">Checked in 8:04 AM</span>
                  </div>
                  <div className="lp3-phone__feed">
                    <div className="lp3-phone__feed-item">
                      <span className="lp3-phone__feed-dot lp3-phone__feed-dot--teal" />
                      <div>
                        <strong>Attendance marked</strong>
                        <em>Period 1 · On time</em>
                      </div>
                    </div>
                    <div className="lp3-phone__feed-item">
                      <span className="lp3-phone__feed-dot lp3-phone__feed-dot--amber" />
                      <div>
                        <strong>Fee reminder</strong>
                        <em>Term 2 balance due</em>
                      </div>
                    </div>
                  </div>
                  <div className="lp3-phone__tiles">
                    <div>
                      <span>Fees</span>
                      <strong>2,400 ETB</strong>
                    </div>
                    <div>
                      <span>Results</span>
                      <strong>Term 2</strong>
                    </div>
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
