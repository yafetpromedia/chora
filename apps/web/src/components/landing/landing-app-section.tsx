"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocale } from "@/components/i18n/locale-provider";
import { Reveal } from "@/components/motion/reveal";
import { AppStoreBadges } from "@/components/landing/app-store-badges";
import { EtbAmount } from "@/components/billing/etb-amount";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";

const PERK_KEYS = [
  "landing.perkQr",
  "landing.perkLang",
  "landing.perkChapa",
  "landing.perkFeed",
] as const;

/** Matches the Everest Youth Academy sample ID card in the product demo. */
const DEMO_CAMPUS_ID = {
  school: "Everest Youth Academy",
  name: "Yafet Tesfaye",
  grade: "Grade 11 · Natural B",
  studentId: "STU-DG82VJMC",
  academicYear: "2026-2027",
  photoSrc: "/fayeda/demo-male.svg",
};

function randomDemoScanPayload() {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `CAMPUS1:${DEMO_CAMPUS_ID.studentId}:${token}`;
}

function LandingMockQr() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(randomDemoScanPayload(), {
      margin: 0,
      errorCorrectionLevel: "M",
      width: 128,
      color: { dark: "#0a3d42", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="lp3-phone__qr" aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : null}
    </div>
  );
}

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
  const { t } = useLocale();

  return (
    <section id="app" className="lp3-app">
      <div className="lp3-container">
        <Reveal>
          <div className="lp3-app__panel">
            <div className="lp3-app__copy">
              <span className="lp3-eyebrow">{t("landing.mobileApp")}</span>
              <h2 className="lp3-heading">
                {t("landing.appTitle", { brand: BRAND_NAME })}
              </h2>
              <p className="lp3-lead">{t("landing.appLead")}</p>
              <ul className="lp3-app__list">
                {PERK_KEYS.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
              <AppStoreBadges variant="dark" className="lp3-app__stores" />
            </div>

            <div className="lp3-app__phones" aria-hidden>
              <div className="lp3-app__phones-glow" />
              <div className="lp3-app__phones-ring" />

              <div className="lp3-app__chip lp3-app__chip--attendance">
                {t("landing.chipPresent", {
                  status: t("common.present"),
                  time: "8:04 AM",
                })}
              </div>
              <div className="lp3-app__chip lp3-app__chip--fee">
                <EtbAmount amount={2400} maximumFractionDigits={0} symbolSize={11} />{" "}
                {t("landing.feeDue")}
              </div>

              <PhoneFrame variant="back">
                <div className="lp3-phone__screen-body lp3-phone__screen-body--id">
                  <header className="lp3-phone__app-head">
                    <BrandMark />
                    <div>
                      <strong>{t("dash.campusId")}</strong>
                      <em>{DEMO_CAMPUS_ID.school}</em>
                    </div>
                  </header>
                  <div className="lp3-phone__id-card">
                    <div className="lp3-phone__id-top">
                      <div className="lp3-phone__avatar lp3-phone__avatar--photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={DEMO_CAMPUS_ID.photoSrc} alt="" />
                      </div>
                      <div>
                        <p className="lp3-phone__id-name">{DEMO_CAMPUS_ID.name}</p>
                        <em>{DEMO_CAMPUS_ID.grade}</em>
                      </div>
                    </div>
                    <div className="lp3-phone__id-meta">
                      <span>{DEMO_CAMPUS_ID.studentId}</span>
                      <span>
                        {t("landing.validYear", {
                          year: DEMO_CAMPUS_ID.academicYear,
                        })}
                      </span>
                    </div>
                    <LandingMockQr />
                  </div>
                </div>
              </PhoneFrame>

              <PhoneFrame variant="front">
                <div className="lp3-phone__screen-body lp3-phone__screen-body--parent">
                  <header className="lp3-phone__app-head lp3-phone__app-head--row">
                    <BrandMark />
                    <div>
                      <strong>{t("landing.parentView")}</strong>
                      <em>{DEMO_CAMPUS_ID.school}</em>
                    </div>
                  </header>
                  <div className="lp3-phone__hero">
                    <div className="lp3-phone__hero-top">
                      <p>{t("dash.today")}</p>
                      <span className="lp3-phone__badge">{t("dash.live")}</span>
                    </div>
                    <h4>{t("common.present")}</h4>
                    <span className="lp3-phone__hero-time">
                      {t("landing.checkedIn", { time: "8:04 AM" })}
                    </span>
                  </div>
                  <div className="lp3-phone__feed">
                    <div className="lp3-phone__feed-item">
                      <span className="lp3-phone__feed-dot lp3-phone__feed-dot--teal" />
                      <div>
                        <strong>{t("landing.attendanceMarked")}</strong>
                        <em>{t("landing.periodOnTime")}</em>
                      </div>
                    </div>
                    <div className="lp3-phone__feed-item">
                      <span className="lp3-phone__feed-dot lp3-phone__feed-dot--amber" />
                      <div>
                        <strong>{t("landing.feeReminder")}</strong>
                        <em>{t("landing.term2Balance")}</em>
                      </div>
                    </div>
                  </div>
                  <div className="lp3-phone__tiles">
                    <div>
                      <span>{t("dash.fees")}</span>
                      <strong>
                        <EtbAmount amount={2400} maximumFractionDigits={0} symbolSize={11} />
                      </strong>
                    </div>
                    <div>
                      <span>{t("dash.results")}</span>
                      <strong>{t("landing.term2")}</strong>
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