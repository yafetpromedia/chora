"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { StudentIdCard } from "@/lib/student-cards";

export type StudentIdCardVariant = "standard" | "compact" | "mini";

const CAMPUSONE_WATERMARK = "/campusone/watermark.svg";

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
    void QRCode.toDataURL(card.scanPayload, {
      width: backQrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a3d42", light: "#ffffff" },
    }).then(setQrGenerated);
  }, [card.scanPayload, backQrSize, qrDataUrlProp]);

  const initial = card.name.trim().slice(0, 1).toUpperCase() || "?";
  const gradeLine = card.section ? `${card.grade} · ${card.section}` : card.grade;
  const vClass = variantClass(variant);

  const front = (
    <article className={`sid${vClass}`}>
      <div
        className="sid__watermark"
        style={{ backgroundImage: `url(${CAMPUSONE_WATERMARK})` }}
        aria-hidden
      />
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
          <span className="sid__year">{card.academicYear}</span>
        </div>
      </header>

      <div className="sid__main sid__main--front">
        <div className="sid__photo-block">
          {card.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photoUrl} alt="" className="sid__photo" />
          ) : (
            <div className="sid__photo sid__photo--empty" aria-hidden>
              {initial}
            </div>
          )}
        </div>

        <div className="sid__details">
          <div className="sid__identity">
            <h3 className="sid__name">{card.name}</h3>
            <span className="sid__grade-pill">{gradeLine}</span>
          </div>

          <dl className="sid__fields sid__fields--modern">
            <div className="sid__field-cell">
              <dt>Student ID</dt>
              <dd>{card.studentId ?? "—"}</dd>
            </div>
            <div className="sid__field-cell">
              <dt>FAN</dt>
              <dd className="sid__fan">{card.fan ?? "—"}</dd>
            </div>
            <div className="sid__field-cell">
              <dt>Date of birth</dt>
              <dd>{formatDob(card.dateOfBirth)}</dd>
            </div>
            <div className="sid__field-cell">
              <dt>Age</dt>
              <dd>{card.age != null ? `${card.age} yrs` : "—"}</dd>
            </div>
            <div className="sid__field-cell">
              <dt>Sex</dt>
              <dd>{genderLabel(card.gender)}</dd>
            </div>
            <div className="sid__field-cell sid__field-cell--code">
              <dt>Card code</dt>
              <dd>
                <code className="sid__inline-code">{card.cardCode}</code>
              </dd>
            </div>
            <div className="sid__field-cell sid__field-cell--wide">
              <dt>Address</dt>
              <dd className="sid__address">{card.address ?? "—"}</dd>
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
    <article className={`sid sid--back${vClass}`}>
      <div
        className="sid__watermark"
        style={{ backgroundImage: `url(${CAMPUSONE_WATERMARK})` }}
        aria-hidden
      />
      <div className="sid__stripe sid__stripe--back" aria-hidden />
      <header className="sid__back-head">
        <strong>{card.schoolName}</strong>
        <span>
          Powered by CampusOne · {card.schoolJoinCode}
          {card.schoolPhone ? ` · ${card.schoolPhone}` : ""}
        </span>
      </header>

      <div className="sid__back-body">
        <div className="sid__back-qr sid__back-qr--large">
          {qrLargeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrLargeUrl} alt="" />
          ) : (
            <div className="sid__qr sid__qr--loading" aria-hidden />
          )}
          <span className="sid__scan-hint">Scan for attendance</span>
        </div>

        <div className="sid__back-info">
          <div className="sid__back-cards">
            <div className="sid__back-card">
              <span className="sid__back-card-label">Father</span>
              <span className="sid__back-card-name">{card.fatherName ?? "—"}</span>
              {card.fatherPhone ? (
                <span className="sid__back-phone">{card.fatherPhone}</span>
              ) : null}
            </div>
            <div className="sid__back-card">
              <span className="sid__back-card-label">Mother</span>
              <span className="sid__back-card-name">{card.motherName ?? "—"}</span>
              {card.motherPhone ? (
                <span className="sid__back-phone">{card.motherPhone}</span>
              ) : null}
            </div>
            <div className="sid__back-card">
              <span className="sid__back-card-label">Emergency</span>
              <span className="sid__back-card-name">{card.emergencyContactName ?? "—"}</span>
              {card.emergencyContactPhone ? (
                <span className="sid__back-phone">{card.emergencyContactPhone}</span>
              ) : null}
            </div>
            <div className="sid__back-card">
              <span className="sid__back-card-label">Student phone</span>
              <span className="sid__back-card-name sid__back-card-name--solo">
                {card.phone ?? "—"}
              </span>
            </div>
          </div>

          <div className="sid__signature">
            <div className="sid__signature-line" aria-hidden />
            <span className="sid__signature-label">Authorized signature</span>
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
