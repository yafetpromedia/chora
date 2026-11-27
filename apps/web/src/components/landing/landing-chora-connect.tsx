"use client";

import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { useLocale } from "@/components/i18n/locale-provider";
import { BRAND_NAME, CHORA_CONNECT_NAME } from "@/lib/brand";
import type { ReactNode } from "react";

const PILLAR_KEYS = [
  {
    title: "pillarAcademics",
    items: ["itemResults", "itemTimetable", "itemAssessments"],
  },
  {
    title: "pillarOperations",
    items: ["itemAttendance", "itemFinance", "itemAdmissions"],
  },
  {
    title: "pillarLearning",
    items: ["itemElibrary", "itemClasswork", "itemAi"],
  },
] as const;

const AUDIENCE_KEYS = [
  "audienceParents",
  "audienceTeachers",
  "audienceStudents",
  "audienceSchool",
] as const;

const FEATURE_KEYS = [
  { title: "featDirectMessaging", desc: "featDirectMessagingDesc", icon: "chat" },
  { title: "featParentComm", desc: "featParentCommDesc", icon: "family" },
  { title: "featAnnouncements", desc: "featAnnouncementsDesc", icon: "megaphone" },
  { title: "featSmartNotif", desc: "featSmartNotifDesc", icon: "bell" },
  { title: "featMsgRequests", desc: "featMsgRequestsDesc", icon: "inbox" },
  { title: "featFileSharing", desc: "featFileSharingDesc", icon: "file" },
  { title: "featDeptChannels", desc: "featDeptChannelsDesc", icon: "building" },
  { title: "featRoleAccess", desc: "featRoleAccessDesc", icon: "shield" },
] as const;

function ConnectIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function FeatureIcon({ name }: { name: (typeof FEATURE_KEYS)[number]["icon"] }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const icons: Record<(typeof FEATURE_KEYS)[number]["icon"], ReactNode> = {
    chat: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>,
    family: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    megaphone: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M4 10v4M8 8v8M12 6v12M16 4v16" /></svg>,
    bell: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    inbox: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M22 12h-6l-2 3H10l-2-3H4" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>,
    file: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
    building: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" /></svg>,
    shield: <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  };

  return <span className="lp3-connect__cap-icon">{icons[name]}</span>;
}

function ConnectDiagram({ t }: { t: (key: string) => string }) {
  return (
    <div className="lp3-connect__flow">
      <div className="lp3-connect__flow-row lp3-connect__flow-row--top">
        {PILLAR_KEYS.map((pillar) => (
          <div key={pillar.title} className="lp3-connect__flow-pillar">
            <strong>{t(`choraConnect.${pillar.title}`)}</strong>
            <ul>
              {pillar.items.map((item) => (
                <li key={item}>{t(`choraConnect.${item}`)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="lp3-connect__flow-connector" aria-hidden>
        <span /><span /><span />
      </div>

      <div className="lp3-connect__flow-core">
        <ConnectIcon />
        <span>{CHORA_CONNECT_NAME}</span>
      </div>

      <div className="lp3-connect__flow-connector lp3-connect__flow-connector--down" aria-hidden>
        <span />
      </div>

      <div className="lp3-connect__flow-row lp3-connect__flow-row--bottom">
        {AUDIENCE_KEYS.map((role) => (
          <span key={role} className="lp3-connect__flow-audience">
            {t(`choraConnect.${role}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingChoraConnect() {
  const { t } = useLocale();

  return (
    <section id="connect" className="lp3-connect" aria-labelledby="connect-heading">
      <div className="lp3-container">
        <Reveal>
          <div className="lp3-connect__hero">
            <div className="lp3-connect__mesh" aria-hidden />

            <div className="lp3-connect__hero-inner">
              <div className="lp3-connect__copy">
                <div className="lp3-connect__badges">
                  <span className="lp3-connect__badge lp3-connect__badge--glass">{CHORA_CONNECT_NAME}</span>
                  <span className="lp3-connect__badge lp3-connect__badge--solid">
                    {t("choraConnect.comingSoon")}
                  </span>
                </div>

                <h2 id="connect-heading" className="lp3-connect__headline">
                  {t("choraConnect.tagline")}
                </h2>

                <p className="lp3-connect__subhead">{t("choraConnect.subhead")}</p>

                <article className="lp3-connect__preview">
                  <div className="lp3-connect__preview-icon">
                    <ConnectIcon size={22} />
                  </div>
                  <div className="lp3-connect__preview-body">
                    <h3>{CHORA_CONNECT_NAME}</h3>
                    <p>{t("choraConnect.cardLine")}</p>
                  </div>
                  <span className="lp3-connect__preview-soon">{t("choraConnect.comingSoon")}</span>
                </article>

                <p className="lp3-connect__note">
                  {t("choraConnect.note", { brand: BRAND_NAME })}
                </p>
              </div>

              <div className="lp3-connect__visual" aria-hidden>
                <ConnectDiagram t={t} />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="lp3-connect__caps-head">
            <span className="lp3-eyebrow">{t("choraConnect.plannedCaps")}</span>
            <h3 className="lp3-connect__caps-title">
              {t("choraConnect.whatIncludes", { name: CHORA_CONNECT_NAME })}
            </h3>
          </div>
        </Reveal>

        <Stagger className="lp3-connect__caps">
          {FEATURE_KEYS.map((feature) => (
            <StaggerItem key={feature.title}>
              <article className="lp3-connect__cap">
                <FeatureIcon name={feature.icon} />
                <h4>{t(`choraConnect.${feature.title}`)}</h4>
                <p>{t(`choraConnect.${feature.desc}`)}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
