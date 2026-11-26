"use client";

import { useEffect, useState, type CSSProperties } from "react";
import QRCode from "qrcode";
import { StudentCardBarcode } from "@/components/students/student-card-barcode";
import type { TeacherIdCard } from "@/lib/teacher-cards";
import {
  DEFAULT_SCHOOL_THEME,
  readSchoolBrand,
} from "@/lib/school-brand";
import { BRAND_NAME } from "@/lib/brand";
import { trimStampSrc } from "@/lib/student-photo";

export type TeacherIdCardVariant = "standard" | "compact" | "mini";

const CAMPUSONE_WATERMARK = "/campusone/watermark.svg";

function CardWatermark({ security = false }: { security?: boolean }) {
  return (
    <div className="sid__watermark" aria-hidden>
      {security ? <div className="sid__security" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CAMPUSONE_WATERMARK} alt="" className="sid__watermark-img" />
      {security ? (
        <div className="sid__security-seal">
          <span className="sid__security-seal-glow" />
          <span className="sid__security-seal-text">
            <span className="sid__security-seal-en">Original</span>
            <span className="sid__security-seal-am" lang="am">
              ኦሪጅናል
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function FittedStamp({ src }: { src: string }) {
  const [trimmedStamp, setTrimmedStamp] = useState<{ src: string; url: string } | null>(null);
  const url = trimmedStamp?.src === src ? trimmedStamp.url : src;

  useEffect(() => {
    let cancelled = false;
    void trimStampSrc(src).then((trimmed) => {
      if (!cancelled) setTrimmedStamp({ src, url: trimmed });
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="sid__body-stamp-img" />
  );
}

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function cardThemeStyle(card: TeacherIdCard): CSSProperties {
  const brand = typeof window !== "undefined" ? readSchoolBrand() : null;
  const deep =
    normalizeHex(card.schoolAccentDeep) ??
    normalizeHex(brand?.accentDeep) ??
    DEFAULT_SCHOOL_THEME.accentDeep;
  const bright =
    normalizeHex(card.schoolPrimaryColor) ??
    normalizeHex(brand?.primaryColor) ??
    DEFAULT_SCHOOL_THEME.primaryColor;
  const light =
    normalizeHex(card.schoolAccentColor) ??
    normalizeHex(brand?.accentColor) ??
    DEFAULT_SCHOOL_THEME.accentColor;

  return {
    ["--sid-deep" as string]: deep,
    ["--sid-mid" as string]: deep,
    ["--sid-bright" as string]: bright,
    ["--sid-light" as string]: light,
  };
}

type Props = {
  card: TeacherIdCard;
  variant?: TeacherIdCardVariant;
  showBack?: boolean;
  backOnly?: boolean;
  qrDataUrl?: string;
  className?: string;
};

function formatIssued(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDob(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function genderLabel(g: TeacherIdCard["gender"]) {
  if (g === "MALE") return "Male · ወንድ";
  if (g === "FEMALE") return "Female · ሴት";
  if (g === "OTHER") return "Other · ሌላ";
  return "—";
}

function BiLabel({ en, am }: { en: string; am: string }) {
  return (
    <>
      <span className="sid__lbl-en">{en}</span>
      <span className="sid__lbl-am" lang="am">
        {am}
      </span>
    </>
  );
}

function variantClass(variant: TeacherIdCardVariant) {
  if (variant === "compact") return " sid--compact";
  if (variant === "mini") return " sid--mini";
  return "";
}

export function TeacherIdCardView({
  card,
  variant = "standard",
  showBack = true,
  backOnly = false,
  qrDataUrl: qrDataUrlProp,
  className = "",
}: Props) {
  const [qrGenerated, setQrGenerated] = useState("");

  const backQrSize = variant === "mini" ? 140 : variant === "compact" ? 180 : 220;
  const qrLargeUrl = qrDataUrlProp ?? qrGenerated;

  useEffect(() => {
    if (qrDataUrlProp) return;
    const dark =
      normalizeHex(card.schoolAccentDeep) ??
      normalizeHex(card.schoolPrimaryColor) ??
      DEFAULT_SCHOOL_THEME.accentDeep;
    void QRCode.toDataURL(card.scanPayload, {
      width: backQrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark, light: "#ffffff" },
    }).then(setQrGenerated);
  }, [
    card.scanPayload,
    card.schoolAccentDeep,
    card.schoolPrimaryColor,
    backQrSize,
    qrDataUrlProp,
  ]);

  const initial = card.name.trim().slice(0, 1).toUpperCase() || "?";
  const vClass = variantClass(variant);
  const themeStyle = cardThemeStyle(card);
  const footContact = [card.schoolPhone, card.schoolAddress]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" · ");

  const front = (
    <article className={`sid sid--staff${vClass}`} style={themeStyle}>
      <header className="sid__head">
        <div className="sid__school">
          <div className="sid__logo-wrap">
            {card.schoolLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.schoolLogoUrl} alt="" className="sid__logo" />
            ) : (
              <span className="sid__logo sid__logo--text" aria-hidden>
                {card.schoolName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="sid__school-text">
            <span className="sid__school-name">{card.schoolName}</span>
            <span className="sid__school-sub">
              Official staff ID ·{" "}
              <span lang="am">ይፋዊ የሰራተኛ መታወቂያ</span>
            </span>
          </div>
        </div>
        <div className="sid__head-meta">
          <span className="sid__badge sid__badge--staff">
            Staff · <span lang="am">ሰራተኛ</span>
          </span>
        </div>
      </header>

      <div className="sid__main sid__main--front">
        <CardWatermark security />
        <div className="sid__photo-block">
          <div className="sid__photo-col">
            <div className="sid__photo-frame">
              {card.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.photoUrl} alt="" className="sid__photo" />
              ) : (
                <div className="sid__photo sid__photo--empty" aria-hidden>
                  {initial}
                </div>
              )}
            </div>
            <StudentCardBarcode
              code={card.scanPayload}
              displayValue={card.cardCode}
              variant={variant}
            />
          </div>
        </div>

        <div className="sid__details">
          <div className="sid__identity">
            <h3 className="sid__name">{card.name}</h3>
            <p className="sid__grade-line">{card.roleLabel}</p>
          </div>

          <dl className="sid__fields sid__fields--body">
            <div className="sid__field sid__field--col-a">
              <dt>
                <BiLabel en="Staff ID" am="የሰራተኛ መለያ" />
              </dt>
              <dd className="sid__teacher-id">{card.teacherId ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>
                <BiLabel en="Homeroom" am="ክፍል ኃላፊ" />
              </dt>
              <dd>{card.homeroom ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>
                <BiLabel en="Date of birth" am="የትውልድ ቀን" />
              </dt>
              <dd>{formatDob(card.dateOfBirth)}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>
                <BiLabel en="Sex" am="ጾታ" />
              </dt>
              <dd>{genderLabel(card.gender)}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>
                <BiLabel en="Academic year" am="የትምህርት ዘመን" />
              </dt>
              <dd>{card.academicYear}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>
                <BiLabel en="Phone" am="ስልክ" />
              </dt>
              <dd className="sid__phone">{card.phone ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <footer className="sid__foot">
        <div className="sid__foot-strip">
          <span className="sid__foot-chip">Valid {card.validThrough}</span>
          <span className="sid__foot-divider" aria-hidden />
          <span className="sid__foot-chip">Issued {formatIssued(card.issuedAt)}</span>
          {footContact ? (
            <>
              <span className="sid__foot-divider" aria-hidden />
              <span className="sid__foot-contact">{footContact}</span>
            </>
          ) : null}
        </div>
      </footer>
    </article>
  );

  const back = (
    <article className={`sid sid--back sid--staff${vClass}`} style={themeStyle}>
      <div className="sid__stripe sid__stripe--back" aria-hidden />
      <header className="sid__back-head">
        <strong>{card.schoolName}</strong>
        <span>
          Powered by {BRAND_NAME}
          {card.schoolPhone ? ` · ${card.schoolPhone}` : ""}
        </span>
      </header>

      <div className="sid__back-body">
        <CardWatermark security />
        <div className="sid__back-left">
          <div className="sid__back-qr sid__back-qr--large">
            {qrLargeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrLargeUrl} alt="" />
            ) : (
              <div className="sid__qr sid__qr--loading" aria-hidden />
            )}
            <span className="sid__scan-hint">
              <span className="sid__scan-hint-en">
                Scan QR or barcode · campus use
              </span>
              <span className="sid__scan-hint-sep" aria-hidden>
                ·
              </span>
              <span className="sid__scan-hint-am" lang="am">
                QR ወይም ባርኮድ ይቃኙ
              </span>
            </span>
          </div>

          <div className="sid__body-signature">
            <div className="sid__body-signature-pad">
              {card.schoolSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="sid__body-signature-img"
                  src={card.schoolSignatureUrl}
                  alt=""
                />
              ) : null}
            </div>
            <div className="sid__body-signature-rule" aria-hidden />
            {card.schoolSignatureLabel?.trim() ? (
              <span className="sid__body-signature-name">
                {card.schoolSignatureLabel.trim()}
              </span>
            ) : null}
            <span className="sid__body-signature-label">
              Authorized signature
              {" · "}
              <span lang="am">የባለሥልጣን ፊርማ</span>
            </span>
          </div>
        </div>

        <div className="sid__back-info">
          <h4 className="sid__body-section-title">
            Staff record · <span lang="am">የሰራተኛ መረጃ</span>
          </h4>
          <div className="sid__body-contacts">
            <div className="sid__body-contact">
              <span className="sid__body-contact-label">
                Staff ID · <span lang="am">መለያ</span>
              </span>
              <span className="sid__body-contact-name sid__teacher-id">
                {card.teacherId ?? "—"}
              </span>
            </div>
            <div className="sid__body-contact">
              <span className="sid__body-contact-label">
                Role · <span lang="am">ሥራ</span>
              </span>
              <span className="sid__body-contact-name">{card.roleLabel}</span>
            </div>
            {card.homeroom ? (
              <div className="sid__body-contact">
                <span className="sid__body-contact-label">
                  Homeroom · <span lang="am">ክፍል ኃላፊ</span>
                </span>
                <span className="sid__body-contact-name">{card.homeroom}</span>
              </div>
            ) : null}
            {card.address ? (
              <div className="sid__body-contact">
                <span className="sid__body-contact-label">
                  Address · <span lang="am">አድራሻ</span>
                </span>
                <span className="sid__body-contact-name">{card.address}</span>
              </div>
            ) : null}
            {(card.emergencyContactName || card.emergencyContactPhone) ? (
              <div className="sid__body-contact sid__body-contact--emergency">
                <span className="sid__body-contact-label">
                  Emergency · <span lang="am">አደጋ ጊዜ</span>
                </span>
                {card.emergencyContactName ? (
                  <span className="sid__body-contact-name">
                    {card.emergencyContactName}
                  </span>
                ) : null}
                {card.emergencyContactPhone ? (
                  <span className="sid__body-contact-phone">
                    {card.emergencyContactPhone}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {card.bloodType?.trim() ? (
            <div className="sid__blood sid__blood--back">
              <span className="sid__blood-lbl">
                Blood type
                <span lang="am">የደም አይነት</span>
              </span>
              <span className="sid__blood-val">{card.bloodType.trim()}</span>
            </div>
          ) : null}
          {card.schoolStampUrl ? (
            <div className="sid__body-stamp sid__body-stamp--right" aria-hidden>
              <FittedStamp src={card.schoolStampUrl} />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="sid__back-foot">
        Property of {card.schoolName}. Report loss immediately.{" "}
        <span lang="am">የትምህርት ቤቱ ንብረት ነው። ካጠፉ ወዲያውኑ ያሳውቁ።</span>
      </footer>
    </article>
  );

  if (backOnly) {
    return <div className={`sid-wrap${className ? ` ${className}` : ""}`}>{back}</div>;
  }

  return (
    <div
      className={`sid-wrap${showBack && !backOnly ? " sid-wrap--duplex" : ""}${className ? ` ${className}` : ""}`}
    >
      {front}
      {showBack && !backOnly ? back : null}
    </div>
  );
}
