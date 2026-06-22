"use client";

import { Reveal } from "@/components/motion/reveal";
import { AppStoreBadges } from "@/components/landing/app-store-badges";

const PERKS = [
  "Real-time attendance alerts for parents",
  "Digital campus ID with QR check-in",
  "Fees, results, and notices in one feed",
  "Same login as web — school code + username",
];

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
              <AppStoreBadges variant="dark" />
            </div>

            <div className="lp3-app__phones" aria-hidden>
              <div className="lp3-phone lp3-phone--back">
                <div className="lp3-phone__screen">
                  <header>
                    <span>C1</span>
                    <strong>Student ID</strong>
                  </header>
                  <div className="lp3-phone__card">
                    <div className="lp3-phone__avatar">YT</div>
                    <p>Yafet Tesfaye</p>
                    <em>Grade 11 · Natural B</em>
                  </div>
                </div>
              </div>
              <div className="lp3-phone lp3-phone--front">
                <div className="lp3-phone__screen">
                  <header>
                    <span>C1</span>
                    <div>
                      <strong>Parent</strong>
                      <em>Everest Youth Academy</em>
                    </div>
                  </header>
                  <div className="lp3-phone__hero">
                    <p>Today</p>
                    <h4>Present · 8:04 AM</h4>
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
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
