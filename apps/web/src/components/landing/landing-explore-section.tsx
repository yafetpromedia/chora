"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { DemoVideoPlayer } from "@/components/landing/demo-video-player";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import {
  PRODUCT_DOCS_FALLBACK_PATH,
  PRODUCT_DOCS_FILENAME,
  productDocsDownloadUrl,
  resolveProductDocsUrl,
} from "@/lib/product-docs";
import { getPublicPlatformConfig } from "@/lib/public-platform-config";

const DOC_BENEFIT_KEYS = [
  "landing.docsBenefit1",
  "landing.docsBenefit2",
  "landing.docsBenefit3",
] as const;

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden width="16" height="16">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M6 10.2l2.4 2.4L14 7.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentCoverMockup({ thumbnailSrc }: { thumbnailSrc?: string | null }) {
  const { t } = useLocale();

  return (
    <div className="lp3-explore-doc__stack" aria-hidden>
      <div className="lp3-explore-doc__sheet lp3-explore-doc__sheet--back" />
      <div className="lp3-explore-doc__sheet lp3-explore-doc__sheet--mid" />
      {thumbnailSrc ? (
        <div className="lp3-explore-doc__cover lp3-explore-doc__cover--photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailSrc} alt="" className="lp3-explore-doc__cover-img" />
        </div>
      ) : (
        <div className="lp3-explore-doc__cover">
          <div className="lp3-explore-doc__cover-top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_LOGO_SRC} alt="" width={36} height={36} />
            <span>{BRAND_NAME}</span>
          </div>
          <p className="lp3-explore-doc__cover-kicker">{t("landing.docsCoverKicker")}</p>
          <h3 className="lp3-explore-doc__cover-title">{t("landing.docsCoverTitle")}</h3>
          <p className="lp3-explore-doc__cover-sub">{t("landing.docsCoverSub")}</p>
          <div className="lp3-explore-doc__cover-foot">
            <span>Awud Digitals</span>
            <span>2026</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingExploreSection() {
  const { t } = useLocale();
  const [docsUrl, setDocsUrl] = useState(PRODUCT_DOCS_FALLBACK_PATH);
  const [docsThumb, setDocsThumb] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicPlatformConfig()
      .then((cfg) => {
        if (cancelled) return;
        setDocsUrl(resolveProductDocsUrl(cfg.productDocsUrl));
        setDocsThumb(cfg.productDocsThumbnailUrl?.trim() || null);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const viewUrl = docsUrl;
  const downloadUrl = productDocsDownloadUrl(docsUrl);

  return (
    <section id="explore" className="lp3-section lp3-section--explore" aria-labelledby="explore-heading">
      <div className="lp3-container">
        <Reveal>
          <div className="lp3-section__head lp3-section__head--center">
            <span className="lp3-eyebrow">{t("landing.exploreEyebrow")}</span>
            <h2 id="explore-heading" className="lp3-heading">
              {t("landing.exploreTitle")}
            </h2>
            <p className="lp3-lead lp3-lead--center">{t("landing.exploreLead")}</p>
          </div>
        </Reveal>

        <Stagger className="lp3-explore-grid">
          <StaggerItem>
            <article className="lp3-explore-card lp3-explore-card--video">
              <div className="lp3-explore-card__copy">
                <h3>{t("landing.videoTitle")}</h3>
                <p>{t("landing.videoDesc")}</p>
              </div>
              <DemoVideoPlayer variant="showcase" showChapters={false} />
            </article>
          </StaggerItem>

          <StaggerItem>
            <article className="lp3-explore-card lp3-explore-card--docs">
              <DocumentCoverMockup thumbnailSrc={docsThumb} />
              <div className="lp3-explore-card__copy">
                <h3>{t("landing.docsTitle")}</h3>
                <p>{t("landing.docsDesc")}</p>
                <ul className="lp3-explore-meta" aria-label={t("landing.docsDetailsAria")}>
                  <li>{t("landing.docsPages")}</li>
                  <li>{t("landing.docsKind")}</li>
                  <li>{t("landing.docsAudience")}</li>
                </ul>
                <ul className="lp3-explore-checks">
                  {DOC_BENEFIT_KEYS.map((key) => (
                    <li key={key}>
                      <CheckIcon />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
                <div className="lp3-explore-actions">
                  <a
                    href={downloadUrl}
                    className="lp3-btn lp3-btn--primary"
                    download={PRODUCT_DOCS_FILENAME}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("landing.downloadDocsAria")}
                  >
                    {t("landing.downloadDocs")}
                  </a>
                  <a
                    href={viewUrl}
                    className="lp3-btn lp3-btn--ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("landing.viewDocsAria")}
                  >
                    {t("landing.viewDocs")}
                  </a>
                </div>
              </div>
            </article>
          </StaggerItem>
        </Stagger>

        <Reveal>
          <p className="lp3-explore-trust">
            {t("landing.exploreTrustBefore")}{" "}
            <a href="https://awuddigitals.com" target="_blank" rel="noopener noreferrer">
              Awud Digitals
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}