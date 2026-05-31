"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { StudentIdCard } from "@/lib/student-cards";

export type StudentIdCardVariant = "standard" | "compact" | "mini";

type Props = {
  card: StudentIdCard;
  variant?: StudentIdCardVariant;
  showBack?: boolean;
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
  className = "",
}: Props) {
  const [qrUrl, setQrUrl] = useState("");
  const [qrLargeUrl, setQrLargeUrl] = useState("");

  const frontQrSize = variant === "mini" ? 120 : variant === "compact" ? 160 : 200;
  const backQrSize = variant === "mini" ? 140 : variant === "compact" ? 180 : 220;

  useEffect(() => {
    void QRCode.toDataURL(card.scanPayload, {
      width: frontQrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a3d42", light: "#ffffff" },
    }).then(setQrUrl);
  }, [card.scanPayload, frontQrSize]);

  useEffect(() => {
    void QRCode.toDataURL(card.scanPayload, {
      width: backQrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a3d42", light: "#ffffff" },
    }).then(setQrLargeUrl);
  }, [card.scanPayload, backQrSize]);

  const initial = card.name.trim().slice(0, 1).toUpperCase() || "?";
  const gradeLine = card.section ? `${card.grade} · ${card.section}` : card.grade;
  const vClass = variantClass(variant);

  const front = (
    <article className={`sid${vClass}`}>
      <div className="sid__stripe" aria-hidden />
      <header className="sid__head">
        <div className="sid__school">
          {card.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.schoolLogoUrl} alt="" className="sid__logo" />
          ) : (
            <span className="sid__logo sid__logo--text" aria-hidden>
              C1
            </span>
          )}
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

      <div className="sid__main">
        <div className="sid__photo-block">
          {card.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photoUrl} alt="" className="sid__photo" />
          ) : (
            <div className="sid__photo sid__photo--empty" aria-hidden>
              {initial}
            </div>
          )}
          <div className="sid__qr-wrap">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="sid__qr" src={qrUrl} alt={`Attendance QR for ${card.name}`} />
            ) : (
              <div className="sid__qr sid__qr--loading" aria-hidden />
            )}
            <span className="sid__scan-hint">Scan for attendance</span>
          </div>
        </div>

        <div className="sid__details">
          <h3 className="sid__name">{card.name}</h3>
          <p className="sid__grade">{gradeLine}</p>

          <dl className="sid__fields">
            <div>
              <dt>Student ID</dt>
              <dd>{card.studentId ?? "—"}</dd>
            </div>
            <div>
              <dt>National ID</dt>
              <dd>{card.idNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>FAN</dt>
              <dd>{card.fan ?? "—"}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{formatDob(card.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{card.age != null ? `${card.age} yrs` : "—"}</dd>
            </div>
            <div>
              <dt>Sex</dt>
              <dd>{genderLabel(card.gender)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <footer className="sid__foot">
        <div className="sid__foot-left">
          <span className="sid__card-label">Card code</span>
          <code className="sid__card-code">{card.cardCode}</code>
        </div>
        <div className="sid__foot-right">
          <span className="sid__valid">Valid {card.validThrough}</span>
          <span className="sid__issued">Issued {formatIssued(card.issuedAt)}</span>
        </div>
      </footer>
    </article>
  );

  const back = (
    <article className={`sid sid--back${vClass}`}>
      <div className="sid__stripe sid__stripe--back" aria-hidden />
      <header className="sid__back-head">
        <strong>{card.schoolName}</strong>
        <span>CampusOne · School code {card.schoolJoinCode}</span>
      </header>

      <div className="sid__back-body">
        <div className="sid__back-qr sid__back-qr--large">
          {qrLargeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrLargeUrl} alt="" />
          ) : (
            <div className="sid__qr sid__qr--loading" aria-hidden />
          )}
          <code className="sid__back-payload">{card.scanPayload}</code>
        </div>

        <div className="sid__back-info">
          <section className="sid__parents">
            <h4 className="sid__section-title">Parents / guardians</h4>
            <dl className="sid__parent-grid">
              <div>
                <dt>Father</dt>
                <dd>
                  {card.fatherName ?? "—"}
                  {card.fatherPhone ? (
                    <span className="sid__back-phone">{card.fatherPhone}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Mother</dt>
                <dd>
                  {card.motherName ?? "—"}
                  {card.motherPhone ? (
                    <span className="sid__back-phone">{card.motherPhone}</span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </section>

          <dl className="sid__back-fields">
            <div>
              <dt>Emergency contact</dt>
              <dd>
                {card.emergencyContactName ?? "—"}
                {card.emergencyContactPhone ? (
                  <span className="sid__back-phone">{card.emergencyContactPhone}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Student phone</dt>
              <dd>{card.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>School address</dt>
              <dd>{card.schoolAddress ?? card.schoolName}</dd>
            </div>
            <div>
              <dt>School contact</dt>
              <dd>
                {card.schoolPhone ?? "—"}
                {card.schoolEmail ? (
                  <span className="sid__back-email">{card.schoolEmail}</span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <footer className="sid__back-foot">
        If found, return to {card.schoolName}. Property of the school — misuse is prohibited.
      </footer>
    </article>
  );

  return (
    <div
      className={`sid-wrap${showBack ? " sid-wrap--duplex" : ""}${className ? ` ${className}` : ""}`}
    >
      {front}
      {showBack ? back : null}
    </div>
  );
}
