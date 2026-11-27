"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/i18n/locale-provider";
import { BRAND_NAME } from "@/lib/brand";
import { useHydrated } from "@/lib/use-client-snapshot";

type Variant = "light" | "dark";
type StoreKind = "play" | "apple";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="lp3-store__icon-svg">
      <path
        fill="currentColor"
        d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z"
      />
    </svg>
  );
}

function AppleLogoMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="lp3-store__icon-svg lp3-store__icon-svg--apple">
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  );
}

function StoreButton({
  label,
  title,
  icon,
  variant,
  onClick,
}: {
  label: string;
  title: string;
  icon: ReactNode;
  variant: Variant;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`lp3-store lp3-store--${variant}`}
      onClick={onClick}
      aria-label={`${label} ${title}`}
    >
      <span className="lp3-store__icon">{icon}</span>
      <span className="lp3-store__text">
        <small>{label}</small>
        <strong>{title}</strong>
      </span>
    </button>
  );
}

function ComingSoonDialog({
  open,
  store,
  onClose,
}: {
  open: boolean;
  store: StoreKind | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const descId = useId();
  const mounted = useHydrated();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open || !store) return null;

  const storeName =
    store === "play" ? t("appStoreBadges.googlePlay") : t("appStoreBadges.appStore");

  return createPortal(
    <div className="lp3-soon" role="presentation">
      <button
        type="button"
        className="lp3-soon__backdrop"
        aria-label={t("appStoreBadges.close")}
        onClick={onClose}
      />
      <div
        className="lp3-soon__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="lp3-soon__mark" aria-hidden>
          {store === "play" ? <PlayIcon /> : <AppleLogoMark />}
        </div>
        <p className="lp3-soon__eyebrow">
          {t("appStoreBadges.mobileEyebrow", { brand: BRAND_NAME })}
        </p>
        <h2 id={titleId} className="lp3-soon__title">
          {t("appStoreBadges.comingSoon")}
        </h2>
        <p id={descId} className="lp3-soon__body">
          {t("appStoreBadges.body", { brand: BRAND_NAME, store: storeName })}
        </p>
        <ul className="lp3-soon__list">
          <li>{t("appStoreBadges.bullet1")}</li>
          <li>{t("appStoreBadges.bullet2")}</li>
          <li>{t("appStoreBadges.bullet3")}</li>
        </ul>
        <div className="lp3-soon__actions">
          <button type="button" className="lp3-soon__btn" onClick={onClose}>
            {t("appStoreBadges.gotIt")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AppStoreBadges({
  variant = "light",
  className = "",
  layout = "row",
}: {
  variant?: Variant;
  className?: string;
  layout?: "row" | "stack";
}) {
  const { t } = useLocale();
  const [store, setStore] = useState<StoreKind | null>(null);

  return (
    <>
      <div
        className={`lp3-stores${layout === "stack" ? " lp3-stores--stack" : ""}${
          className ? ` ${className}` : ""
        }`}
      >
        <StoreButton
          label={t("appStoreBadges.getItOn")}
          title={t("appStoreBadges.googlePlay")}
          icon={<PlayIcon />}
          variant={variant}
          onClick={() => setStore("play")}
        />
        <StoreButton
          label={t("appStoreBadges.downloadOnThe")}
          title={t("appStoreBadges.appStore")}
          icon={<AppleLogoMark />}
          variant={variant}
          onClick={() => setStore("apple")}
        />
      </div>
      <ComingSoonDialog
        open={store !== null}
        store={store}
        onClose={() => setStore(null)}
      />
    </>
  );
}
