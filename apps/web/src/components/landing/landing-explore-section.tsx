"use client";

import { useEffect, useState } from "react";
import { DemoVideoPlayer } from "@/components/landing/demo-video-player";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import {
  PRODUCT_DOCS_BENEFITS,
  PRODUCT_DOCS_FALLBACK_PATH,
  PRODUCT_DOCS_FILENAME,
  PRODUCT_DOCS_META,
  productDocsDownloadUrl,
  resolveProductDocsUrl,
} from "@/lib/product-docs";
import { getPublicPlatformConfig } from "@/lib/public-platform-config";

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

function DocumentCoverMockup() {
  return (
    <div className="lp3-explore-doc__stack" aria-hidden>
      <div className="lp3-explore-doc__sheet lp3-explore-doc__sheet--back" />
      <div className="lp3-explore-doc__sheet lp3-explore-doc__sheet--mid" />
      <div className="lp3-explore-doc__cover">
        <div className="lp3-explore-doc__cover-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_LOGO_SRC} alt="" width={36} height={36} />
          <span>{BRAND_NAME}</span>
        </div>
        <p className="lp3-explore-doc__cover-kicker">School Management &amp; Learning Platform</p>
        <h3 className="lp3-explore-doc__cover-title">Product Documentation</h3>
        <p className="lp3-explore-doc__cover-sub">
          Features · Roles · Workflows · Implementation · Security
        </p>
        <div className="lp3-explore-doc__cover-foot">
          <span>Awud Digitals</span>
          <span>2026</span>
        </div>
      </div>
    </div>
  );
}

export function LandingExploreSection() {
  const [docsUrl, setDocsUrl] = useState(PRODUCT_DOCS_FALLBACK_PATH);

  useEffect(() => {
    let cancelled = false;
    void getPublicPlatformConfig()
      .then((cfg) => {
        if (cancelled) return;
        setDocsUrl(resolveProductDocsUrl(cfg.productDocsUrl));
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
            <span className="lp3-eyebrow">Before you begin</span>
            <h2 id="explore-heading" className="lp3-heading">
              Explore Chora before you get started.
            </h2>
            <p className="lp3-lead lp3-lead--center">
              Watch the platform in action or download the complete guide to see how Chora can fit
              your school&apos;s workflow.
            </p>
          </div>
        </Reveal>

        <Stagger className="lp3-explore-grid">
          <StaggerItem>
            <article className="lp3-explore-card lp3-explore-card--video">
              <div className="lp3-explore-card__copy">
                <h3>See Chora in Action</h3>
                <p>
                  See how Chora connects administration, teaching, learning, assessment, payments,
                  and parents in one platform.
                </p>
              </div>
              <DemoVideoPlayer variant="showcase" showChapters={false} />
            </article>
          </StaggerItem>

          <StaggerItem>
            <article className="lp3-explore-card lp3-explore-card--docs">
              <DocumentCoverMockup />
              <div className="lp3-explore-card__copy">
                <h3>Chora Product Documentation</h3>
                <p>
                  Explore the complete Chora platform, including features, user roles, workflows,
                  implementation, security, support, and future roadmap.
                </p>
                <ul className="lp3-explore-meta" aria-label="Documentation details">
                  <li>{PRODUCT_DOCS_META.pages}</li>
                  <li>{PRODUCT_DOCS_META.kind}</li>
                  <li>{PRODUCT_DOCS_META.audience}</li>
                </ul>
                <ul className="lp3-explore-checks">
                  {PRODUCT_DOCS_BENEFITS.map((item) => (
                    <li key={item}>
                      <CheckIcon />
                      <span>{item}</span>
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
                    aria-label="Download Chora Product Documentation PDF"
                  >
                    Download Documentation
                  </a>
                  <a
                    href={viewUrl}
                    className="lp3-btn lp3-btn--ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View Chora Product Documentation PDF in a new tab"
                  >
                    View Documentation
                  </a>
                </div>
              </div>
            </article>
          </StaggerItem>
        </Stagger>

        <Reveal>
          <p className="lp3-explore-trust">
            Built for modern schools. Powered by{" "}
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
