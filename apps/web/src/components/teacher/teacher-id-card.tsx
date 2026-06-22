"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { StudentCardBarcode } from "@/components/students/student-card-barcode";
import type { TeacherIdCard } from "@/lib/teacher-cards";

export type TeacherIdCardVariant = "standard" | "compact" | "mini";

const CAMPUSONE_WATERMARK = "/campusone/watermark.svg";

function CardWatermark() {
  return (
    <div className="sid__watermark" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CAMPUSONE_WATERMARK} alt="" className="sid__watermark-img" />
    </div>
  );
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
    void QRCode.toDataURL(card.scanPayload, {
      width: backQrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a3d42", light: "#ffffff" },
    }).then(setQrGenerated);
  }, [card.scanPayload, backQrSize, qrDataUrlProp]);

  const initial = card.name.trim().slice(0, 1).toUpperCase() || "?";
  const roleLine = card.homeroom
    ? `${card.roleLabel} · ${card.homeroom}`
    : card.roleLabel;
  const vClass = variantClass(variant);

  const front = (
    <article className={`sid sid--staff${vClass}`}>
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
            <span className="sid__school-sub">Official faculty identification</span>
          </div>
        </div>
        <div className="sid__head-meta">
          <span className="sid__badge sid__badge--staff">Faculty</span>
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
            <p className="sid__grade-line">{roleLine}</p>
          </div>

          <dl className="sid__fields sid__fields--body">
            <div className="sid__field sid__field--col-a">
              <dt>Teacher ID</dt>
              <dd className="sid__teacher-id">{card.teacherId ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>Role</dt>
              <dd>{card.roleLabel}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>Homeroom</dt>
              <dd>{card.homeroom ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>Academic year</dt>
              <dd>{card.academicYear}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>Email</dt>
              <dd className="sid__email">{card.email}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>Phone</dt>
              <dd className="sid__phone">{card.phone ?? "—"}</dd>
            </div>
            <div className="sid__field sid__field--col-a">
              <dt>School</dt>
              <dd className="sid__address">{card.schoolName}</dd>
            </div>
            <div className="sid__field sid__field--col-b">
              <dt>Card code</dt>
              <dd className="sid__code">{card.cardCode}</dd>
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
    <article className={`sid sid--back sid--staff${vClass}`}>
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
            <span className="sid__scan-hint">Scan for campus access</span>
          </div>

          <div className="sid__body-signature">
            <div className="sid__body-signature-line" aria-hidden />
            <span className="sid__body-signature-label">Authorized signature</span>
          </div>
        </div>

        <div className="sid__back-info">
          <h4 className="sid__body-section-title">Staff record</h4>
          <div className="sid__body-contacts">
            <div className="sid__body-contact">
              <span className="sid__body-contact-label">Teacher ID</span>
              <span className="sid__body-contact-name sid__teacher-id">
                {card.teacherId ?? "—"}
              </span>
            </div>
            <div className="sid__body-contact">
              <span className="sid__body-contact-label">Role</span>
              <span className="sid__body-contact-name">{card.roleLabel}</span>
            </div>
            <div className="sid__body-contact">
              <span className="sid__body-contact-label">Homeroom</span>
              <span className="sid__body-contact-name">{card.homeroom ?? "—"}</span>
            </div>
            <div className="sid__body-contact sid__body-contact--emergency">
              <span className="sid__body-contact-label">Contact</span>
              <span className="sid__body-contact-name">{card.email}</span>
              {card.phone ? (
                <span className="sid__body-contact-phone">{card.phone}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <footer className="sid__back-foot">
        Faculty card — property of {card.schoolName}. Report loss to school administration
        immediately.
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
