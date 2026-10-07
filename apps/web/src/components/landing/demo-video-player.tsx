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

type Props = {
  size?: "default" | "hero";
  showChapters?: boolean;
};

export function DemoVideoPlayer({ size = "default", showChapters = true }: Props) {
  const labelId = useId();
  const [videoUrl, setVideoUrl] = useState(DEMO_VIDEO_URL_ENV);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [startAt, setStartAt] = useState(0);

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

  return (
    <div className={`lp3-demo-player${size === "hero" ? " lp3-demo-player--hero" : ""}`}>
      <div className="lp3-demo-stage">
        {playing && youtubeId ? (
          <iframe
            className="lp3-demo-stage__frame"
            title={`${BRAND_NAME} product walkthrough`}
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
                  Play walkthrough
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
                  Open demo
                </span>
              </Link>
            )}
          </>
        )}
      </div>

      {showChapters ? (
        <div className="lp3-demo-chapters">
          <p className="lp3-demo-chapters__label">Chapters</p>
          <ol className="lp3-demo-chapters__list">
            {DEMO_CHAPTERS.map((ch) => (
              <li key={ch.time}>
                <button
                  type="button"
                  className="lp3-demo-chapters__item"
                  onClick={() => playFrom(ch)}
                  disabled={!hasSource}
                >
                  <time dateTime={`PT${ch.seconds}S`}>{ch.time}</time>
                  <span>{ch.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
