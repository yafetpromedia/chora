"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  DEMO_CHAPTERS,
  DEMO_VIDEO_URL_ENV,
  isDirectVideoUrl,
  resolveDemoMediaUrl,
  youtubeEmbedSrc,
  youtubeIdFromUrl,
  type DemoChapter,
} from "@/lib/demo-video";
import { getPublicPlatformConfig } from "@/lib/public-platform-config";
import { BRAND_DEMO_POSTER_SRC, BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/components/i18n/locale-provider";

const DEMO_CHAPTER_KEYS = [
  "ch0",
  "ch1",
  "ch2",
  "ch3",
  "ch4",
  "ch5",
  "ch6",
  "ch7",
  "ch8",
  "ch9",
  "ch10",
] as const;

type Props = {
  size?: "default" | "hero";
  showChapters?: boolean;
  /** Premium product-card style: subtle hover, modal playback, no giant play button. */
  variant?: "default" | "showcase";
};

export function DemoVideoPlayer({
  size = "default",
  showChapters = true,
  variant = "default",
}: Props) {
  const { t } = useLocale();
  const labelId = useId();
  const dialogTitleId = useId();
  const [videoUrl, setVideoUrl] = useState(DEMO_VIDEO_URL_ENV);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [startAt, setStartAt] = useState(0);

  const showcase = variant === "showcase";

  useEffect(() => {
    let cancelled = false;
    void getPublicPlatformConfig()
      .then((cfg) => {
        if (cancelled) return;
        const fromPlatform = cfg.demoVideoUrl?.trim() || "";
        setVideoUrl(fromPlatform || DEMO_VIDEO_URL_ENV);
        setThumbnailUrl(cfg.demoVideoThumbnailUrl?.trim() || "");
      })
      .catch(() => {
        /* keep env / default poster */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showcase || !playing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPlaying(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showcase, playing]);

  const resolvedVideo = resolveDemoMediaUrl(videoUrl);
  const youtubeId = youtubeIdFromUrl(videoUrl);
  const direct = isDirectVideoUrl(videoUrl);
  const hasSource = Boolean(youtubeId || (direct && resolvedVideo));
  const posterSrc =
    resolveDemoMediaUrl(thumbnailUrl) || BRAND_DEMO_POSTER_SRC;
  const usingBrandedPoster = !thumbnailUrl.trim();

  function playFrom(chapter?: DemoChapter) {
    if (!hasSource) return;
    setStartAt(chapter?.seconds ?? 0);
    setPlaying(true);
  }

  function closePlayer() {
    setPlaying(false);
    setStartAt(0);
  }

  const media =
    playing && youtubeId ? (
      <iframe
        className="lp3-demo-stage__frame"
        title={t("demoVideoUi.productOverview", { brand: BRAND_NAME })}
        src={youtubeEmbedSrc(youtubeId, startAt)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    ) : playing && direct && resolvedVideo ? (
      <video
        className="lp3-demo-stage__frame"
        src={`${resolvedVideo}${startAt > 0 ? `#t=${startAt}` : ""}`}
        controls
        autoPlay
        playsInline
        poster={posterSrc}
      />
    ) : null;

  if (showcase) {
    return (
      <div className="lp3-explore-video">
        <button
          type="button"
          className="lp3-explore-video__trigger"
          onClick={() => (hasSource ? playFrom() : undefined)}
          disabled={!hasSource}
          aria-labelledby={labelId}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="lp3-explore-video__poster"
            src={posterSrc}
            alt={t("demoVideoUi.posterAlt", { brand: BRAND_NAME })}
          />
          <span className="lp3-explore-video__veil" aria-hidden />
          <span className="lp3-explore-video__cue" aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M8.5 6.8v10.4L18 12 8.5 6.8z" />
            </svg>
          </span>
          <span id={labelId} className="sr-only">
            {hasSource
              ? t("demoVideoUi.playOverview", { brand: BRAND_NAME })
              : t("demoVideoUi.overviewSoon", { brand: BRAND_NAME })}
          </span>
        </button>

        {!hasSource ? (
          <p className="lp3-explore-video__soon">
            {t("demoVideoUi.overviewSoonBody")}{" "}
            <Link href="/demo">{t("demoVideoUi.openWalkthrough")}</Link>
          </p>
        ) : null}

        {playing && media ? (
          <div
            className="lp3-explore-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={closePlayer}
          >
            <div
              className="lp3-explore-modal__panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lp3-explore-modal__bar">
                <h3 id={dialogTitleId}>
                  {t("demoVideoUi.productOverview", { brand: BRAND_NAME })}
                </h3>
                <button
                  type="button"
                  className="lp3-explore-modal__close"
                  onClick={closePlayer}
                  aria-label={t("demoVideoUi.closeVideo")}
                >
                  ×
                </button>
              </div>
              <div className="lp3-explore-modal__stage">{media}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`lp3-demo-player${size === "hero" ? " lp3-demo-player--hero" : ""}`}>
      <div className="lp3-demo-stage">
        {media ? (
          media
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={`lp3-demo-stage__poster${usingBrandedPoster ? " lp3-demo-stage__poster--branded" : ""}`}
              src={posterSrc}
              alt=""
            />
            {hasSource ? (
              <button
                type="button"
                className={`lp3-demo-play${usingBrandedPoster ? " lp3-demo-play--on-art" : ""}`}
                onClick={() => playFrom()}
                aria-labelledby={labelId}
              >
                <span className="lp3-demo-play__ring" aria-hidden />
                <span className="lp3-demo-play__core" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8.5 6.8v10.4L18 12 8.5 6.8z" />
                  </svg>
                </span>
                <span id={labelId} className="lp3-demo-play__label">
                  {t("demoVideoUi.playWalkthrough")}
                </span>
              </button>
            ) : (
              <Link
                href="/demo"
                className={`lp3-demo-play lp3-demo-play--link${usingBrandedPoster ? " lp3-demo-play--on-art" : ""}`}
                aria-labelledby={labelId}
              >
                <span className="lp3-demo-play__ring" aria-hidden />
                <span className="lp3-demo-play__core" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8.5 6.8v10.4L18 12 8.5 6.8z" />
                  </svg>
                </span>
                <span id={labelId} className="lp3-demo-play__label">
                  {t("demoVideoUi.openDemo")}
                </span>
              </Link>
            )}
          </>
        )}
      </div>

      {showChapters ? (
        <div className="lp3-demo-chapters">
          <p className="lp3-demo-chapters__label">{t("demoVideoUi.chapters")}</p>
          <ol className="lp3-demo-chapters__list">
            {DEMO_CHAPTERS.map((ch, index) => (
              <li key={ch.time}>
                <button
                  type="button"
                  className="lp3-demo-chapters__item"
                  onClick={() => playFrom(ch)}
                  disabled={!hasSource}
                >
                  <time dateTime={`PT${ch.seconds}S`}>{ch.time}</time>
                  <span>
                    {t(`demoVideoUi.${DEMO_CHAPTER_KEYS[index] ?? "ch0"}`)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
