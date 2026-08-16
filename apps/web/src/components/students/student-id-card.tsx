"use client";

import { useEffect, useState, type CSSProperties } from "react";
import QRCode from "qrcode";
import { StudentCardBarcode } from "@/components/students/student-card-barcode";
import type { StudentIdCard } from "@/lib/student-cards";
import {
  DEFAULT_SCHOOL_THEME,
  readSchoolBrand,
} from "@/lib/school-brand";

export type StudentIdCardVariant = "standard" | "compact" | "mini";

const CAMPUSONE_WATERMARK = "/campusone/watermark.svg";

function CardWatermark() {
  return (
    <div className="sid__watermark" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CAMPUSONE_WATERMARK} alt="" className="sid__watermark-img" />
    </div>
  );
}

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function cardThemeStyle(card: StudentIdCard): CSSProperties {
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
  const mid = deep;

  return {
    ["--sid-deep" as string]: deep,
    ["--sid-mid" as string]: mid,
    ["--sid-bright" as string]: bright,
    ["--sid-light" as string]: light,
  };
}

type Props = {
  card: StudentIdCard;
  variant?: StudentIdCardVariant;
  showBack?: boolean;
  /** Print layout: render only the back face */
  backOnly?: boolean;
  /** Pre-generated QR (bulk print). Skips client QR generation. */
  qrDataUrl?: string;
  className?: string;
};

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

function genderLabel(g: StudentIdCard["gender"]) {
  if (g === "MALE") return "Male";
  if (g === "FEMALE") return "Female";
  if (g === "OTHER") return "Other";
  return "—";
}

function variantClass(variant: StudentIdCardVariant) {
  if (variant === "compact") return " sid--compact";
  if (variant === "mini") return " sid--mini";
  return "";
}

export function StudentIdCardView({
  card,
  variant = "standard",
  showBack = false,
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
  const gradeLine = card.section ? `${card.grade} · ${card.section}` : card.grade;
  const vClass = variantClass(variant);
  const themeStyle = cardThemeStyle(card);

  const front = (
    <article className={`sid${vClass}`} style={themeStyle}>
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
            <span className="sid__school-sub">Official student identification</span>
          </div>
        </div>
        <div className="sid__head-meta">
          <span className="sid__badge">Student</span>
        </div>
      </header>

      <div className="sid__main sid__main--front">
        <CardWatermark />
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
            <StudentCardBarcode code={card.cardCode} variant={variant} />
          </div>
        </div>

        <div className="sid__details">
          <div className="sid__identity">
            <h3 className="sid__name">{card.name}</h3>
            <p className="sid__grade-line">{gradeLine}</p>
          </div>

          <dl className="sid__fields sid__fields--body">
            <div className="sid__field sid__field--col-a">
              <dt>Student ID</dt>
              <dd className="sid__student-id">{card.studentId ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>FAN</dt>
              <dd className="sid__fan">{card.fan ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>Date of birth</dt>
              <dd>{formatDob(card.dateOfBirth)}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>Age</dt>
              <dd>{card.age != null ? `${card.age} yrs` : "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>Sex</dt>
              <dd>{genderLabel(card.gender)}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>Academic year</dt>
              <dd>{card.academicYear}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>Address</dt>
              <dd className="sid__address">{card.address ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>Phone</dt>
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
          {(card.schoolPhone || card.schoolEmail) && (
            <>
              <span className="sid__foot-divider" aria-hidden />
              <span className="sid__foot-contact">
                {card.schoolPhone}
                {card.schoolPhone && card.schoolEmail ? " · " : ""}
                {card.schoolEmail}
              </span>
            </>
          )}
        </div>
      </footer>
    </article>
  );

  const back = (
    <article className={`sid sid--back${vClass}`} style={themeStyle}>
      <div className="sid__stripe sid__stripe--back" aria-hidden />
      <header className="sid__back-head">
        <strong>{card.schoolName}</strong>
        <span>
          Powered by CampusOne · {card.schoolJoinCode}
          {card.schoolPhone ? ` · ${card.schoolPhone}` : ""}
        </span>
      </header>

      <div className="sid__back-body">
        <CardWatermark />
        <div className="sid__back-left">
          <div className="sid__back-qr sid__back-qr--large">
            {qrLargeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrLargeUrl} alt="" />
            ) : (
              <div className="sid__qr sid__qr--loading" aria-hidden />
            )}
            <span className="sid__scan-hint">Scan for attendance</span>
          </div>

          <div className="sid__body-signature">
            <div className="sid__body-signature-line" aria-hidden />
            <span className="sid__body-signature-label">Authorized signature</span>
          </div>
        </div>

        <div className="sid__back-info">
          <h4 className="sid__body-section-title">Parents / Guardians</h4>
          <div className="sid__body-contacts">
            <div className="sid__body-contact">
              <span className="sid__body-contact-label">Father</span>
              <span className="sid__body-contact-name">{card.fatherName ?? "—"}</span>
              {card.fatherPhone ? (
                <span className="sid__body-contact-phone">{card.fatherPhone}</span>
              ) : null}
            </div>
            <div className="sid__body-contact">
              <span className="sid__body-contact-label">Mother</span>
              <span className="sid__body-contact-name">{card.motherName ?? "—"}</span>
              {card.motherPhone ? (
                <span className="sid__body-contact-phone">{card.motherPhone}</span>
              ) : null}
            </div>
            <div className="sid__body-contact sid__body-contact--emergency">
              <span className="sid__body-contact-label">Emergency</span>
              <span className="sid__body-contact-name">
                {card.emergencyContactName ?? "—"}
              </span>
              {card.emergencyContactPhone ? (
                <span className="sid__body-contact-phone">{card.emergencyContactPhone}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <footer className="sid__back-foot">
        If found, return to {card.schoolName}. Property of the school — misuse is prohibited.
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
