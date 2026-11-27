"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";

const HOLD_MS = 1750;
const EXIT_MS = 650;

function isPrintPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  return pathname === "/print" || pathname.startsWith("/print/");
}

function shouldSkipPreloader(pathname: string | null) {
  if (isPrintPath(pathname)) return true;
  if (typeof window !== "undefined") {
    return isPrintPath(window.location.pathname);
  }
  return false;
}

export function ChoraPreloader() {
  const { t } = useLocale();
  const pathname = usePathname();
  const skip = shouldSkipPreloader(pathname);
  const [visible, setVisible] = useState(() => !shouldSkipPreloader(pathname));
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (skip) {
      setVisible(false);
      setExiting(false);
      document.getElementById("chora-preloader")?.remove();
      return;
    }

    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function startExit() {
      if (cancelled) return;
      holdTimer = setTimeout(() => {
        if (cancelled) return;
        setExiting(true);
        exitTimer = setTimeout(() => {
          if (!cancelled) setVisible(false);
        }, EXIT_MS);
      }, HOLD_MS);
    }

    if (document.readyState === "complete") {
      startExit();
    } else {
      window.addEventListener("load", startExit, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", startExit);
      if (holdTimer) clearTimeout(holdTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [skip]);

  if (skip || !visible) return null;

  return (
    <div
      id="chora-preloader"
      className={`chora-preloader${exiting ? " chora-preloader--exit" : ""}`}
      aria-busy="true"
      aria-live="polite"
      data-print-hide="true"
    >
      <div className="chora-preloader__icon chora-icon-anim" aria-hidden="true">
        <svg
          viewBox="0 0 100 100"
          className="chora-preloader__svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={t("choraPreloaderUi.logoAria")}
        >
          <defs>
            <linearGradient
              id="choraTileGrad-preloader"
              x1="10"
              y1="8"
              x2="90"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#1E8A7F" />
              <stop offset="55%" stopColor="#16756D" />
              <stop offset="100%" stopColor="#0F5C55" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="22"
            fill="url(#choraTileGrad-preloader)"
          />
          <path
            d="M74 52 C74 34, 62 22, 47 22 C30 22, 18 35, 18 51 C18 68, 31 80, 49 80 C55 80, 59 76.5, 59 71.5 C59 66.5, 55 63.5, 49 63.5 L38 63.5 C32.5 63.5, 29 60.2, 29 55.5 C29 50.8, 32.5 47.5, 38 47.5 L53 47.5 C63.5 47.5, 70 52, 74 58.5 Z"
            fill="#FFFFFF"
          />
          <circle cx="47.5" cy="36.5" r="8.2" fill="#146E66" />
        </svg>
      </div>

      <div className="chora-preloader__copy">
        <div className="chora-preloader__name">Chora</div>
        <div className="chora-preloader__tagline">{t("choraPreloaderUi.tagline")}</div>
      </div>

      <div className="chora-preloader__track" aria-hidden="true">
        <div className="chora-preloader__bar chora-bar-fill" />
      </div>
    </div>
  );
}
