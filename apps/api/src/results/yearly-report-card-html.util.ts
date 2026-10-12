import type { ReportCardPrintPayload } from './report-card-html.util';

const CHORA_TEAL = '#147D76';
const CHORA_TEAL_DARK = '#0F5F5A';
const CHORA_TEAL_SOFT = '#E8F5F4';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function brandColor(data: ReportCardPrintPayload): string {
  const c = data.school.primaryColor?.trim();
  return c && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : CHORA_TEAL;
}

function schoolInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function logoBlock(
  data: ReportCardPrintPayload,
  className: string,
): string {
  if (data.school.logoUrl) {
    return `<img class="${className}" src="${escapeHtml(data.school.logoUrl)}" alt="" />`;
  }
  const initials = escapeHtml(schoolInitials(data.school.name));
  return `<div class="${className} ${className}--ph" aria-hidden="true">${initials}</div>`;
}

function watermark(data: ReportCardPrintPayload): string {
  if (data.school.logoUrl) {
    return `<img class="yr-wm" src="${escapeHtml(data.school.logoUrl)}" alt="" />`;
  }
  return `<div class="yr-wm yr-wm--text" aria-hidden="true">${escapeHtml(schoolInitials(data.school.name))}</div>`;
}

function qrImg(verifyUrl: string, size: number): string {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&ecc=H&data=${encodeURIComponent(verifyUrl)}`;
  return `<img src="${qrUrl}" alt="Scan to verify this report card" width="${size}" height="${size}" />`;
}

function choraPoweredBy(data: ReportCardPrintPayload): string {
  const mark = data.platform.logoUrl
    ? `<img class="yr-powered__mark" src="${escapeHtml(data.platform.logoUrl)}" alt="" />`
    : `<span class="yr-powered__mark yr-powered__mark--text" aria-hidden="true">${escapeHtml(data.platform.nameAm || 'ጮራ')}</span>`;
  return `
    <div class="yr-powered">
      ${mark}
      <span>Powered by <strong>${escapeHtml(data.platform.name)}</strong> · ${escapeHtml(data.platform.nameAm)}</span>
    </div>
  `;
}

function scoreRange(band: { minScore: number; maxScore?: number | null }): string {
  if (band.maxScore != null && Number.isFinite(band.maxScore)) {
    return `${band.minScore}–${band.maxScore}`;
  }
  return `${band.minScore}+`;
}

/** Elegant abstract campus panel when no cover photo is configured. */
function coverArtPlaceholder(primary: string): string {
  return `
    <svg class="yr-cover__art" viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b8e0dc"/>
          <stop offset="55%" stop-color="#e8f5f4"/>
          <stop offset="100%" stop-color="#f7fbfb"/>
        </linearGradient>
        <linearGradient id="bld" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${primary}"/>
          <stop offset="100%" stop-color="${CHORA_TEAL_DARK}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#sky)"/>
      <ellipse cx="320" cy="48" rx="42" ry="42" fill="#fff" opacity="0.55"/>
      <path d="M0 210 Q80 170 160 195 T320 185 T400 200 L400 280 L0 280 Z" fill="${primary}" opacity="0.18"/>
      <path d="M0 230 Q100 200 200 220 T400 215 L400 280 L0 280 Z" fill="${primary}" opacity="0.28"/>
      <rect x="70" y="95" width="90" height="120" rx="4" fill="url(#bld)" opacity="0.92"/>
      <rect x="175" y="70" width="70" height="145" rx="4" fill="url(#bld)" opacity="0.85"/>
      <rect x="260" y="110" width="80" height="105" rx="4" fill="url(#bld)" opacity="0.9"/>
      <rect x="85" y="115" width="14" height="14" fill="#e8f5f4" opacity="0.7"/>
      <rect x="108" y="115" width="14" height="14" fill="#e8f5f4" opacity="0.55"/>
      <rect x="131" y="115" width="14" height="14" fill="#e8f5f4" opacity="0.7"/>
      <rect x="85" y="140" width="14" height="14" fill="#e8f5f4" opacity="0.55"/>
      <rect x="108" y="140" width="14" height="14" fill="#e8f5f4" opacity="0.7"/>
      <rect x="131" y="140" width="14" height="14" fill="#e8f5f4" opacity="0.55"/>
      <rect x="190" y="90" width="12" height="12" fill="#e8f5f4" opacity="0.65"/>
      <rect x="210" y="90" width="12" height="12" fill="#e8f5f4" opacity="0.5"/>
      <rect x="190" y="112" width="12" height="12" fill="#e8f5f4" opacity="0.5"/>
      <rect x="210" y="112" width="12" height="12" fill="#e8f5f4" opacity="0.65"/>
      <rect x="275" y="125" width="12" height="12" fill="#e8f5f4" opacity="0.6"/>
      <rect x="295" y="125" width="12" height="12" fill="#e8f5f4" opacity="0.45"/>
      <rect x="315" y="125" width="12" height="12" fill="#e8f5f4" opacity="0.6"/>
      <rect x="105" y="185" width="20" height="30" fill="#0a4a46"/>
      <circle cx="55" cy="200" r="22" fill="${primary}" opacity="0.35"/>
      <circle cx="55" cy="200" r="14" fill="${primary}" opacity="0.45"/>
      <rect x="52" y="210" width="6" height="30" fill="${CHORA_TEAL_DARK}" opacity="0.7"/>
      <path d="M340 175 Q355 140 370 175 Q355 165 340 175" fill="${primary}" opacity="0.5"/>
    </svg>
  `;
}

function yearlyStyles(primary: string): string {
  return `
    :root {
      --yr: ${primary};
      --yr-dark: ${CHORA_TEAL_DARK};
      --yr-soft: ${CHORA_TEAL_SOFT};
      --ink: #1a2430;
      --muted: #5a6570;
      --line: #c8d6d4;
      --paper: #ffffff;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
      color: var(--ink);
      background: #d5e0e2;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Exact ISO A4 landscape: 297mm × 210mm */
    @page {
      size: A4 landscape;
      margin: 0;
    }
    .yr-stage {
      display: block;
      margin: 0 auto 16px;
    }
    .yr-page {
      width: 297mm;
      height: 210mm;
      padding: 5mm;
      box-sizing: border-box;
      background: var(--paper);
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      box-shadow: 0 10px 28px rgba(15, 95, 90, 0.16);
      border: 0.3mm solid #b7ccc9;
    }
    .yr-page:last-of-type {
      page-break-after: auto;
      break-after: auto;
    }
    .yr-col {
      position: relative;
      padding: 3mm 4.5mm 3mm;
      overflow: hidden;
      min-width: 0;
      min-height: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .yr-col + .yr-col { border-left: 0.3mm solid var(--line); }

    /* —— Back page: Chora curved hero + dual panels —— */
    .yr-page--back {
      display: flex;
      flex-direction: column;
      grid-template-columns: none;
      padding: 0;
      background: #f7fbfb;
    }
    .yr-back-hero {
      position: relative;
      flex: 0 0 auto;
      height: 38mm;
      overflow: visible;
      color: #fff;
      z-index: 2;
      background: transparent;
    }
    .yr-back-hero__shape {
      position: absolute;
      left: 0;
      top: 0;
      width: 68%;
      height: 100%;
      display: block;
      pointer-events: none;
    }
    .yr-back-hero__leaf {
      position: absolute;
      right: 10mm;
      top: 1mm;
      width: 48mm;
      height: 32mm;
      opacity: 0.14;
      pointer-events: none;
      z-index: 0;
      color: var(--yr);
    }
    .yr-back-hero__inner {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 3.5mm;
      height: 100%;
      width: 58%;
      max-width: 175mm;
      padding: 2mm 6mm 8mm 7mm;
      box-sizing: border-box;
    }
    .yr-back-hero__logo {
      width: 14mm;
      height: 14mm;
      object-fit: contain;
      background: #fff;
      border-radius: 50%;
      padding: 1.4mm;
      flex-shrink: 0;
      box-shadow: 0 0.5mm 1.5mm rgba(0,0,0,0.15);
    }
    .yr-back-hero__logo--ph {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3.8mm;
      font-weight: 800;
      color: #006d68;
    }
    .yr-back-hero__text strong {
      display: block;
      font-size: 3.7mm;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      line-height: 1.1;
      color: #fff;
    }
    .yr-back-hero__am {
      display: block;
      margin-top: 0.9mm;
      font-size: 2.6mm;
      font-weight: 600;
      color: #fff;
    }
    .yr-back-hero__motto {
      display: block;
      margin-top: 1.1mm;
      font-size: 1.9mm;
      font-weight: 500;
      letter-spacing: 0.08em;
      color: #fff;
      opacity: 0.92;
    }
    .yr-back-body {
      flex: 1 1 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3.5mm;
      min-height: 0;
      padding: 2mm 5mm 10mm;
      position: relative;
      z-index: 1;
    }
    .yr-page--back .yr-col {
      height: auto;
      min-height: 0;
      background: #fff;
      border: 0.4mm solid #b7d6d2;
      border-radius: 3.2mm;
      padding: 4mm 4.5mm 3.5mm;
    }
    .yr-page--back .yr-col + .yr-col { border-left: 0.4mm solid #b7d6d2; }
    .yr-back-foot {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 95mm;
      height: 28mm;
      z-index: 3;
      pointer-events: none;
      overflow: visible;
    }
    .yr-back-foot__shape {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    .yr-back-foot__label {
      position: absolute;
      right: 7mm;
      bottom: 5mm;
      z-index: 1;
      color: #fff;
      font-size: 2.3mm;
      font-weight: 700;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .yr-wm {
      position: absolute;
      left: 50%;
      top: 48%;
      transform: translate(-50%, -50%);
      width: 78mm;
      height: 78mm;
      object-fit: contain;
      opacity: 0.08;
      pointer-events: none;
      z-index: 0;
    }
    .yr-wm--text {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 42mm;
      font-weight: 800;
      color: var(--yr);
      opacity: 0.06;
    }
    .yr-col > *:not(.yr-wm):not(.yr-wave) { position: relative; z-index: 1; }
    .yr-grow { flex: 1 1 auto; min-height: 3mm; }

    .yr-h1 {
      margin: 0 0 2.2mm;
      color: var(--yr);
      font-size: 3.8mm;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .yr-lead {
      margin: 0 0 3.5mm;
      font-size: 2.55mm;
      line-height: 1.45;
      color: #4a5560;
    }
    /* B-style fill card + tables (grading column) */
    .yr-fill-card {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 4.5mm 4.5mm 3.5mm;
      background: #f7fbfb;
      border: 0.3mm solid #cfe3e1;
      border-radius: 3mm;
      box-shadow: inset 0 0 0 0.15mm rgba(20,125,118,0.06);
    }
    .yr-fill-card .yr-h1 {
      font-size: 4.2mm;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: none;
      margin-bottom: 2mm;
    }
    .yr-fill-card .yr-lead {
      font-size: 2.7mm;
      font-weight: 500;
      line-height: 1.45;
      color: #4a5560;
      margin-bottom: 3.2mm;
    }
    .yr-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 2.85mm;
      margin-bottom: 4mm;
      overflow: hidden;
      border-radius: 2mm;
      border: 0.25mm solid #b9d4d1;
      background: #fff;
    }
    .yr-table th, .yr-table td {
      border-right: 0.2mm solid #d5e6e4;
      border-bottom: 0.2mm solid #d5e6e4;
      padding: 2mm 2.4mm;
      vertical-align: middle;
    }
    .yr-table th:last-child, .yr-table td:last-child { border-right: none; }
    .yr-table tbody tr:last-child td { border-bottom: none; }
    .yr-table th {
      background: var(--yr);
      color: #fff;
      font-weight: 700;
      text-align: center;
      font-size: 2.8mm;
    }
    .yr-table th:first-child { text-align: left; }
    .yr-table td { font-weight: 500; }
    .yr-table td.num, .yr-table th.num { text-align: center; }
    .yr-table td.wt {
      text-align: right;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .yr-table th.wt { text-align: center; }
    .yr-table td.grade {
      text-align: center;
      font-weight: 800;
      color: var(--yr);
      font-size: 3.1mm;
    }
    .yr-table tbody tr:nth-child(even) td { background: #f3f9f8; }
    .yr-table tfoot td {
      font-weight: 800;
      background: #e5f4f2;
      color: var(--yr-dark);
      border-bottom: none;
      font-size: 2.95mm;
    }
    .yr-note-block {
      margin: 0;
    }
    .yr-note-block__title {
      margin: 0 0 1.6mm;
      color: var(--yr);
      font-size: 3.3mm;
      font-weight: 800;
    }
    .yr-notes {
      margin: 0;
      padding: 0 0 0 4.5mm;
      font-size: 2.55mm;
      font-weight: 500;
      line-height: 1.5;
      color: #3d4750;
      background: transparent;
      border: none;
      border-radius: 0;
      list-style: none;
    }
    .yr-notes li {
      position: relative;
      margin-bottom: 1.5mm;
      padding-left: 0.5mm;
    }
    .yr-notes li::before {
      content: "";
      position: absolute;
      left: -3.6mm;
      top: 1.1mm;
      width: 1.7mm;
      height: 1.7mm;
      border-radius: 50%;
      background: var(--yr);
    }
    .yr-notes li:last-child { margin-bottom: 0; }
    .yr-slogan {
      margin: 3mm 0 0;
      text-align: center;
      font-size: 2.6mm;
      font-style: italic;
      color: var(--yr);
      font-weight: 600;
      letter-spacing: 0.05em;
      padding-top: 0;
      border-top: none;
    }
    .yr-warn {
      margin: 0 0 2.2mm;
      padding: 1.4mm 2mm;
      border: 0.25mm solid #d4a017;
      background: #fff8e8;
      color: #6a4d00;
      font-size: 2.1mm;
      line-height: 1.35;
      border-radius: 0.8mm;
    }

    /* —— Front cover (right) — modern hero —— */
    .yr-cover {
      display: flex;
      flex-direction: column;
      padding: 0 !important;
      background: #fff;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
    }
    .yr-cover__hero {
      flex: 0 0 auto;
      position: relative;
      padding: 5mm 5mm 7mm;
      background:
        linear-gradient(145deg, var(--yr-dark) 0%, var(--yr) 55%, #1aa39a 100%);
      color: #fff;
      clip-path: polygon(0 0, 100% 0, 100% 86%, 0 100%);
      z-index: 1;
    }
    .yr-cover__hero-row {
      display: flex;
      align-items: center;
      gap: 3.5mm;
    }
    .yr-cover__logo {
      width: 22mm;
      height: 22mm;
      object-fit: contain;
      flex-shrink: 0;
      background: #fff;
      border-radius: 50%;
      padding: 1.2mm;
      box-shadow: 0 1.5mm 4mm rgba(0,0,0,0.18);
    }
    .yr-cover__logo--ph {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #fff;
      color: var(--yr);
      font-weight: 800;
      font-size: 7mm;
      border: none;
    }
    .yr-cover__name {
      margin: 0;
      font-size: 4mm;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: 0.01em;
      color: #fff;
    }
    .yr-cover__name-am {
      margin: 0.8mm 0 0;
      font-size: 2.8mm;
      font-weight: 600;
      opacity: 0.92;
      color: #fff;
    }
    .yr-cover__motto {
      margin: 1.2mm 0 0;
      font-size: 2mm;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.85;
      color: #fff;
    }
    .yr-cover__mid {
      flex: 0 0 auto;
      padding: 4mm 5mm 3mm;
      text-align: left;
      z-index: 1;
    }
    .yr-cover__eyebrow {
      margin: 0 0 1.5mm;
      font-size: 2.1mm;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--yr);
    }
    .yr-cover__title {
      margin: 0;
      font-size: 5.2mm;
      font-weight: 900;
      letter-spacing: -0.01em;
      color: var(--yr-dark);
      line-height: 1.08;
      text-transform: uppercase;
    }
    .yr-cover__year {
      display: inline-block;
      margin: 2.5mm 0 0;
      padding: 1.2mm 3mm;
      border-radius: 999px;
      background: var(--yr-soft);
      color: var(--yr-dark);
      font-size: 2.5mm;
      font-weight: 800;
      letter-spacing: 0.04em;
      border: 0.25mm solid #b9d4d1;
    }
    .yr-cover__photo {
      flex: 1 1 auto;
      margin: 0 5mm 0;
      border-radius: 2.5mm 2.5mm 0 0;
      overflow: hidden;
      position: relative;
      min-height: 0;
      z-index: 1;
      background: var(--yr-soft);
      box-shadow: 0 -1mm 8mm rgba(15,95,90,0.08);
    }
    .yr-cover__photo img,
    .yr-cover__art {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .yr-cover__photo-fade {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, transparent 35%, rgba(15,95,90,0.55) 100%),
        linear-gradient(90deg, rgba(20,125,118,0.15), transparent 40%);
      pointer-events: none;
    }
    .yr-powered {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2mm;
      padding: 2.2mm 4mm;
      background: #0f5f5a;
      color: #fff;
      font-size: 2.05mm;
      letter-spacing: 0.06em;
      font-weight: 600;
      z-index: 2;
    }
    .yr-powered strong {
      font-weight: 800;
      letter-spacing: 0.08em;
    }
    .yr-powered__mark {
      width: 5.5mm;
      height: 5.5mm;
      object-fit: contain;
      background: #fff;
      border-radius: 50%;
      padding: 0.5mm;
    }
    .yr-powered__mark--text {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 2.4mm;
      font-weight: 800;
      color: var(--yr-dark);
    }

    /* —— Back-left student panel (header is page-level) —— */
    .yr-col--student {
      background: #fff !important;
    }
    .yr-student-card {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      background: transparent;
      border: none;
      border-radius: 0;
      overflow: visible;
    }
    .yr-student-body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 0;
    }
    .yr-col--student .yr-h1 {
      font-size: 3.55mm;
      font-weight: 800;
      text-transform: none;
      letter-spacing: 0;
      margin: 0 0 2.4mm;
      color: #0d7377;
    }
    .yr-info-list {
      margin: 0 0 3.8mm;
      padding: 0;
      list-style: none;
    }
    .yr-info-list li {
      display: grid;
      grid-template-columns: 33mm 2.2mm 1fr;
      gap: 0;
      padding: 1.55mm 0;
      font-size: 2.55mm;
      align-items: baseline;
      line-height: 1.35;
    }
    .yr-info-list__k {
      color: #0d7377;
      font-weight: 600;
    }
    .yr-info-list__k::after { content: none; }
    .yr-info-list__colon {
      color: #0d7377;
      font-weight: 600;
      text-align: center;
    }
    .yr-info-list__v {
      color: #163a3f;
      font-weight: 700;
      padding-left: 1.6mm;
    }

    .yr-verify {
      display: flex;
      align-items: center;
      gap: 3.2mm;
      margin: 0 0 4mm;
      padding: 0;
      background: transparent;
      border: none;
    }
    .yr-verify__qr {
      display: block;
      width: 22mm;
      height: 22mm;
      flex-shrink: 0;
      background: #fff;
      padding: 0.6mm;
      border: 0.2mm solid #d0e3e0;
      border-radius: 0.6mm;
      text-decoration: none;
    }
    .yr-verify__qr img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .yr-verify h3 {
      margin: 0;
      max-width: 28mm;
      font-size: 2.45mm;
      color: #0d7377;
      font-weight: 700;
      text-transform: none;
      letter-spacing: 0;
      line-height: 1.35;
    }
    .yr-verify p,
    .yr-verify__url { display: none; }

    .yr-promo {
      display: flex;
      align-items: flex-start;
      gap: 3mm;
      margin: 0;
      padding: 3.4mm 3.6mm;
      background: #e0f2f1;
      border-radius: 2.6mm;
      border: none;
      text-align: left;
    }
    .yr-promo__icon {
      flex-shrink: 0;
      width: 7.8mm;
      height: 7.8mm;
      border-radius: 50%;
      background: #0d7377;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 4mm;
      font-weight: 900;
      line-height: 1;
      margin-top: 0.15mm;
    }
    .yr-promo__icon svg {
      width: 4.2mm;
      height: 4.2mm;
      display: block;
    }
    .yr-promo__label {
      margin: 0 0 0.9mm;
      font-size: 2.95mm;
      letter-spacing: 0;
      text-transform: none;
      opacity: 1;
      font-weight: 800;
      color: #0d7377;
    }
    .yr-promo__value {
      margin: 0;
      font-size: 2.3mm;
      font-weight: 500;
      line-height: 1.4;
      color: #2f6b66;
      display: block;
    }
    .yr-promo__check { display: none; }
    .yr-promo--pending {
      background: #eef3f2;
    }
    .yr-promo--pending .yr-promo__icon {
      background: #8a9a98;
      font-size: 3mm;
    }
    .yr-promo--pending .yr-promo__label {
      color: #4d5c5a;
    }
    .yr-promo--pending .yr-promo__value {
      color: #5a6b68;
    }
    .yr-student-spacer {
      flex: 1 1 auto;
      min-height: 4mm;
    }

    .yr-approval {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 2.8mm;
      align-items: end;
      margin-top: auto;
      padding-top: 3mm;
    }
    .yr-approval__dir,
    .yr-approval__parent {
      text-align: left;
      min-width: 0;
    }
    .yr-approval__stamp {
      display: flex;
      justify-content: center;
      align-items: center;
      padding-bottom: 1mm;
    }
    .yr-sign__slot {
      min-height: 11mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      margin-bottom: 1.4mm;
      border-bottom: 0.28mm solid #0d7377;
    }
    .yr-sign__img {
      max-height: 11mm;
      max-width: 34mm;
      object-fit: contain;
      display: block;
      margin: 0 0 0.4mm;
    }
    .yr-sign__role {
      margin: 0;
      font-size: 2.1mm;
      color: #0d7377;
      font-weight: 700;
    }
    .yr-sign__date {
      margin: 0.7mm 0 0;
      font-size: 1.95mm;
      color: #0d7377;
      font-weight: 600;
    }
    .yr-stamp {
      width: 30mm;
      height: 30mm;
      color: #0d7377;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .yr-stamp > img {
      width: 30mm;
      height: 30mm;
      object-fit: contain;
      border-radius: 50%;
    }
    .yr-stamp-svg {
      width: 30mm;
      height: 30mm;
      display: block;
      overflow: visible;
    }
    .yr-approval__parent .yr-parent__slot {
      min-height: 11mm;
      border-bottom: 0.28mm solid #0d7377;
      margin-bottom: 1.4mm;
    }
    .yr-approval__parent label {
      display: block;
      color: #0d7377;
      font-size: 1.95mm;
      font-weight: 700;
      line-height: 1.25;
    }
    .yr-approval__parent .yr-parent__date {
      display: flex;
      align-items: flex-end;
      gap: 1.2mm;
      margin-top: 2.8mm;
    }
    .yr-approval__parent .yr-parent__date label {
      flex: 0 0 auto;
      margin: 0;
    }
    .yr-approval__parent .yr-parent__date-line {
      flex: 1 1 auto;
      border-bottom: 0.28mm solid #0d7377;
      min-height: 3.5mm;
    }

    .yr-results-table { font-size: 2.45mm; }
    .yr-results-table th, .yr-results-table td { padding: 1.35mm 1.1mm; }
    .yr-results-table td.sub {
      text-align: left;
      font-weight: 600;
      max-width: 32mm;
      word-break: break-word;
    }
    .yr-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5mm 3.5mm;
      margin: 0 0 3mm;
      font-size: 2.4mm;
      padding: 2.2mm 2.5mm;
      background: var(--yr-soft);
      border-radius: 1.2mm;
      border: 0.2mm solid #c5dbd8;
    }
    .yr-summary span strong { color: var(--yr-dark); }
    .yr-remarks {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
      gap: 2mm;
    }
    .yr-remarks h3 {
      margin: 0;
      font-size: 2.9mm;
      color: #0d7377;
      font-weight: 800;
      text-transform: none;
      letter-spacing: 0;
    }
    .yr-remarks__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      flex: 1 1 auto;
      min-height: 0;
    }
    .yr-remark-block {
      margin: 0;
      border: 0.28mm solid #b7d6d2;
      border-radius: 2mm;
      overflow: hidden;
      background: #eef8f7;
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 16mm;
    }
    .yr-remark-block__h {
      margin: 0;
      padding: 1.4mm 2.2mm 0.4mm;
      background: transparent;
      color: #0d7377;
      font-size: 2.35mm;
      font-weight: 800;
      flex: 0 0 auto;
    }
    .yr-remark-block__b {
      margin: 0;
      flex: 1 1 auto;
      min-height: 10mm;
      overflow: hidden;
      padding: 1mm 2.2mm 2mm;
      font-size: 2.25mm;
      line-height: 1.4;
      white-space: pre-wrap;
      color: #2a4548;
    }
    .yr-remark-block--year {
      flex: 0 0 auto;
      min-height: 18mm;
    }

    .yr-col-foot { display: none; }
    .yr-page--back .yr-summary {
      background: #e0f2f1;
      border-color: #c5e4e0;
      border-radius: 2mm;
    }
    .yr-page--back .yr-results-table th {
      background: #006d68;
    }

    .yr-print-note { display: none; }
    @media print {
      html, body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .yr-stage {
        margin: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
      }
      .yr-page {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        width: 297mm !important;
        height: 210mm !important;
        transform: none !important;
      }
      .yr-print-note { display: none !important; }
    }
    @media screen {
      body {
        padding: 16px 0 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .yr-stage {
        /* JS sets width/height to scaled A4 landscape */
        width: 297mm;
        height: 210mm;
        overflow: hidden;
        flex-shrink: 0;
      }
      .yr-page {
        width: 297mm !important;
        height: 210mm !important;
        transform-origin: top left;
      }
      .yr-print-note {
        display: block;
        margin: 8px auto 0;
        font-size: 12px;
        color: #5a6570;
        text-align: center;
      }
    }
  `;
}

function buildFrontLeft(data: ReportCardPrintPayload): string {
  const components = data.assessmentComponents ?? [];
  const weightSum = components.reduce((s, c) => s + c.weightPercent, 0);
  const weightsValid =
    data.assessmentWeightsValid !== false &&
    components.length > 0 &&
    weightSum === 100;

  const componentRows =
    components.length > 0
      ? components
          .map(
            (c) =>
              `<tr><td>${escapeHtml(c.name)}</td><td class="wt">${c.weightPercent}%</td></tr>`,
          )
          .join('')
      : `<tr><td colspan="2">No assessment weighting configured for this grade.</td></tr>`;

  const gradeRows = data.gradingScale
    .map(
      (b) =>
        `<tr><td class="grade">${escapeHtml(b.letter)}</td><td class="num">${escapeHtml(scoreRange(b))}</td><td>${escapeHtml(b.description || '—')}</td></tr>`,
    )
    .join('');

  const warn =
    components.length === 0
      ? `<p class="yr-warn">Assessment component weights are not configured for this student’s grade. Configure them under Academics → Assessment templates before issuing official yearly reports.</p>`
      : !weightsValid
        ? `<p class="yr-warn">Configured assessment weights total ${weightSum}% (expected 100%). Values are shown as configured and have not been altered.</p>`
        : '';

  const slogan =
    data.school.headerTagline?.trim() || 'Learning Today | Leading Tomorrow';

  return `
    <section class="yr-col yr-col--grading" aria-label="Grading and marking method">
      <div class="yr-fill-card">
        <h1 class="yr-h1">Grading &amp; Marking Method</h1>
        <p class="yr-lead">
          Continuous assessment follows this school’s approved components and grading scale.
          Annual subject results are calculated from finalized term marks.
        </p>
        ${warn}
        <table class="yr-table">
          <thead>
            <tr><th>Assessment Component</th><th class="wt">Weight</th></tr>
          </thead>
          <tbody>${componentRows}</tbody>
          ${
            components.length > 0
              ? `<tfoot><tr><td>Total</td><td class="wt">${weightSum}%</td></tr></tfoot>`
              : ''
          }
        </table>
        <h2 class="yr-h1">Grade Values</h2>
        <table class="yr-table">
          <thead>
            <tr><th>Grade</th><th>Score Range</th><th>Meaning</th></tr>
          </thead>
          <tbody>${gradeRows}</tbody>
        </table>
        <div class="yr-grow" aria-hidden="true"></div>
        <div class="yr-note-block">
          <p class="yr-note-block__title">Note:</p>
          <ul class="yr-notes">
            <li>Marks are based on the school’s approved grading scale.</li>
            <li>The annual result is calculated from recorded term averages according to school policy.</li>
            <li>This is an official school document and can be verified using the QR code on the reverse side.</li>
          </ul>
        </div>
        <p class="yr-slogan">${escapeHtml(slogan)}</p>
      </div>
    </section>
  `;
}

function buildFrontRight(data: ReportCardPrintPayload, primary: string): string {
  const nameAm = data.school.nameAm?.trim();
  const motto = data.school.headerTagline?.trim();
  const cover = data.school.coverImageUrl?.trim();

  return `
    <section class="yr-col yr-cover" aria-label="School cover">
      <header class="yr-cover__hero">
        <div class="yr-cover__hero-row">
          ${logoBlock(data, 'yr-cover__logo')}
          <div>
            <p class="yr-cover__name">${escapeHtml(data.school.name)}</p>
            ${nameAm ? `<p class="yr-cover__name-am">${escapeHtml(nameAm)}</p>` : ''}
            ${motto ? `<p class="yr-cover__motto">${escapeHtml(motto)}</p>` : ''}
          </div>
        </div>
      </header>
      <div class="yr-cover__mid">
        <p class="yr-cover__eyebrow">Official academic record</p>
        <h1 class="yr-cover__title">Student Yearly<br/>Report Card</h1>
        <span class="yr-cover__year">Academic Year ${escapeHtml(data.student.academicYear)}</span>
      </div>
      <div class="yr-cover__photo">
        ${
          cover
            ? `<img src="${escapeHtml(cover)}" alt="" /><div class="yr-cover__photo-fade"></div>`
            : `${coverArtPlaceholder(primary)}<div class="yr-cover__photo-fade"></div>`
        }
      </div>
      ${choraPoweredBy(data)}
    </section>
  `;
}

function backHeroShapeSvg(primary: string): string {
  /* Partial top-left wave — not a full-width bar (Chora reference). */
  return `
    <svg class="yr-back-hero__shape" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 0 H148 C168 0 178 6 186 16 C196 30 198 42 188 52 C176 64 152 68 118 66 C72 63 36 54 0 46 Z" fill="${primary}"/>
      <path d="M118 0 H152 C166 0 174 5 180 14 C188 26 186 38 174 48 C162 58 142 62 118 58 C128 40 132 22 118 0 Z" fill="${CHORA_TEAL_DARK}" opacity="0.35"/>
      <path d="M0 0 H128 C148 2 162 10 170 22 C178 36 172 48 156 56 C138 65 108 66 78 62 C42 56 18 48 0 42 Z" fill="#ffffff" opacity="0.08"/>
      <path d="M155 8 C172 18 180 32 176 46 C168 58 148 62 132 56 C148 42 154 24 155 8 Z" fill="#5fb8b0" opacity="0.45"/>
    </svg>
  `;
}

function backHeroLeafSvg(): string {
  return `
    <svg class="yr-back-hero__leaf" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="70" cy="28" rx="22" ry="10" transform="rotate(-28 70 28)"/>
        <ellipse cx="88" cy="42" rx="18" ry="8" transform="rotate(18 88 42)"/>
        <ellipse cx="58" cy="48" rx="16" ry="7" transform="rotate(-8 58 48)"/>
        <path d="M48 55 C62 40 78 32 96 28" fill="none" stroke="currentColor" stroke-width="2"/>
      </g>
    </svg>
  `;
}

function backFootShapeSvg(primary: string): string {
  /* Bottom-right layered wave — curved, not a solid rectangle. */
  return `
    <svg class="yr-back-foot__shape" viewBox="0 0 160 48" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 48 C22 40 40 28 58 22 C86 12 112 4 160 0 V48 Z" fill="${primary}"/>
      <path d="M48 48 C70 36 96 18 160 6 V48 Z" fill="${CHORA_TEAL_DARK}" opacity="0.55"/>
      <path d="M90 48 C112 38 132 24 160 14 V48 Z" fill="#0a4a46" opacity="0.4"/>
      <path d="M20 48 C42 34 68 20 98 14 C124 9 142 8 160 10 V22 C130 18 100 24 72 34 C48 42 28 48 20 48 Z" fill="#ffffff" opacity="0.1"/>
    </svg>
  `;
}

function buildBackHero(data: ReportCardPrintPayload, primary: string): string {
  const nameAm = data.school.nameAm?.trim();
  const mottoRaw =
    data.school.headerTagline?.trim() || 'Knowledge · Growth · Future';
  const motto = mottoRaw
    .replace(/\s*[|•·]\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
  return `
    <header class="yr-back-hero yr-back-banner" aria-label="School header">
      ${backHeroShapeSvg(primary)}
      ${backHeroLeafSvg()}
      <div class="yr-back-hero__inner">
        ${logoBlock(data, 'yr-back-hero__logo')}
        <div class="yr-back-hero__text">
          <strong>${escapeHtml(data.school.name)}</strong>
          ${nameAm ? `<span class="yr-back-hero__am">${escapeHtml(nameAm)}</span>` : ''}
          <span class="yr-back-hero__motto">${escapeHtml(motto)}</span>
        </div>
      </div>
    </header>
  `;
}

function buildBackFoot(data: ReportCardPrintPayload, primary: string): string {
  const am = data.platform.nameAm?.trim() || 'ጮራ';
  return `
    <div class="yr-back-foot" aria-hidden="true">
      ${backFootShapeSvg(primary)}
      <span class="yr-back-foot__label">${escapeHtml(data.platform.name)} · ${escapeHtml(am)}</span>
    </div>
  `;
}

function promoCheckIcon(): string {
  return `<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="#fff" d="M7.8 14.2 3.6 10l1.4-1.4 2.8 2.8 7.2-7.2L16.4 5.6z"/></svg>`;
}

function schoolSealHtml(data: ReportCardPrintPayload): string {
  const stamp = data.school.stampUrl?.trim();
  if (stamp) {
    return `<div class="yr-stamp"><img src="${escapeHtml(stamp)}" alt="" /></div>`;
  }
  const en = escapeHtml(data.school.name.toUpperCase());
  const am = data.school.nameAm?.trim()
    ? escapeHtml(data.school.nameAm.trim())
    : '';
  const logo = data.school.logoUrl?.trim();
  const center = logo
    ? `<image href="${escapeHtml(logo)}" xlink:href="${escapeHtml(logo)}" x="34" y="34" width="32" height="32" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="50" y="54" text-anchor="middle" fill="currentColor" font-size="7" font-weight="800">${escapeHtml(schoolInitials(data.school.name))}</text>`;

  return `
    <div class="yr-stamp" aria-hidden="true">
      <svg class="yr-stamp-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="2.2"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="0.9"/>
        <defs>
          <path id="yrSealTop" d="M 16,50 A 34,34 0 1 1 84,50" fill="none"/>
          <path id="yrSealBot" d="M 84,50 A 34,34 0 1 1 16,50" fill="none"/>
        </defs>
        <text fill="currentColor" font-size="5.2" font-weight="700" letter-spacing="0.8">
          <textPath href="#yrSealTop" xlink:href="#yrSealTop" startOffset="50%" text-anchor="middle">${en}</textPath>
        </text>
        ${
          am
            ? `<text fill="currentColor" font-size="4.6" font-weight="600" letter-spacing="0.4">
                <textPath href="#yrSealBot" xlink:href="#yrSealBot" startOffset="50%" text-anchor="middle">${am}</textPath>
              </text>`
            : `<text fill="currentColor" font-size="4.4" font-weight="700" letter-spacing="1.4">
                <textPath href="#yrSealBot" xlink:href="#yrSealBot" startOffset="50%" text-anchor="middle">★ SCHOOL SEAL ★</textPath>
              </text>`
        }
        ${center}
      </svg>
    </div>
  `;
}

function buildBackLeft(data: ReportCardPrintPayload, _primary: string): string {
  const verifyUrl = data.verification.qrPayload;
  const promo = data.summary.promotion;
  const isPromoted =
    promo?.outcome === 'PROMOTED' ||
    promo?.outcome === 'GRADUATED' ||
    promo?.outcome === 'PASSED';
  const isRetained = promo?.outcome === 'RETAINED';
  const promoTitle = isPromoted
    ? promo?.outcome === 'GRADUATED'
      ? 'Graduated'
      : 'Promoted to the Next Class'
    : isRetained
      ? 'Retained'
      : 'Pending decision';
  const promoDetail = isPromoted
    ? promo?.outcome === 'GRADUATED'
      ? 'You have successfully completed your programme of study.'
      : promo?.nextGradeLabel
        ? `You have successfully completed the academic year and are promoted to ${promo.nextGradeLabel}.`
        : 'You have successfully completed the academic year and are promoted to the next class.'
    : isRetained
      ? promo?.label ||
        'The student will continue in the current grade for the next academic year.'
      : 'Promotion decision has not been recorded yet.';
  const promoClass =
    isPromoted ? 'yr-promo' : 'yr-promo yr-promo--pending';

  const infoRows: Array<[string, string | null | undefined]> = [
    ['Full Name', data.student.name],
    ['Student ID', data.student.number],
    ['Grade / Section', data.student.gradeLabel],
    ['Academic Year', data.student.academicYear],
    ['Date of Birth', data.student.dateOfBirth],
    ['Gender', data.student.sex],
  ];
  const infoHtml = infoRows
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(
      ([k, v]) =>
        `<li><span class="yr-info-list__k">${escapeHtml(k)}</span><span class="yr-info-list__colon">:</span><span class="yr-info-list__v">${escapeHtml(String(v))}</span></li>`,
    )
    .join('');

  const sigLabel =
    data.school.authorizedSignatureLabel?.trim() || 'Director';
  const sigImg = data.school.authorizedSignatureUrl?.trim();

  return `
    <section class="yr-col yr-col--student" aria-label="Student information and approval">
      <div class="yr-student-card">
        <div class="yr-student-body">
          <h1 class="yr-h1">Student Information</h1>
          <ul class="yr-info-list">${infoHtml}</ul>
          <div class="yr-verify">
            <a class="yr-verify__qr" href="${escapeHtml(verifyUrl)}" target="_blank" rel="noopener noreferrer" title="Scan to verify">
              ${qrImg(verifyUrl, 140)}
            </a>
            <h3>Scan to verify<br/>this report card</h3>
          </div>
          <div class="${promoClass}">
            <span class="yr-promo__icon" aria-hidden="true">${isPromoted ? promoCheckIcon() : '○'}</span>
            <div>
              <p class="yr-promo__label">${escapeHtml(promoTitle)}</p>
              <p class="yr-promo__value">${escapeHtml(promoDetail)}</p>
            </div>
          </div>
          <div class="yr-student-spacer" aria-hidden="true"></div>
          <div class="yr-approval">
            <div class="yr-approval__dir">
              <div class="yr-sign__slot">
                ${
                  sigImg
                    ? `<img class="yr-sign__img" src="${escapeHtml(sigImg)}" alt="" />`
                    : ''
                }
              </div>
              <p class="yr-sign__role">${escapeHtml(sigLabel)}</p>
              <p class="yr-sign__date">Date: _______________</p>
            </div>
            <div class="yr-approval__stamp">
              ${schoolSealHtml(data)}
            </div>
            <div class="yr-approval__parent">
              <div class="yr-parent__slot"></div>
              <label>Parent / Guardian Signature</label>
              <div class="yr-parent__date">
                <label>Date:</label>
                <span class="yr-parent__date-line"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildBackRight(data: ReportCardPrintPayload): string {
  const termCount = Math.max(data.terms.length, 1);
  const termHeaders = data.terms
    .map((t, i) => {
      const label = t.shortName || `T${i + 1}`;
      // Prefer Term 1… labels when shortName is T1-style
      const nice = /^T\d+$/i.test(label) ? label.replace(/^T/i, 'Term ') : label;
      return `<th class="num">${escapeHtml(nice)}</th>`;
    })
    .join('');

  const rows = data.subjectRows
    .map((row, idx) => {
      const scores = Array.from({ length: termCount }, (_, i) => {
        const v = row.termScores[i] ?? null;
        return `<td class="num">${fmtScore(v)}</td>`;
      }).join('');
      return `<tr>
        <td class="num">${idx + 1}</td>
        <td class="sub">${escapeHtml(row.subject)}</td>
        ${scores}
        <td class="num">${fmtScore(row.average)}</td>
      </tr>`;
    })
    .join('');

  const showRank =
    data.school.reportShowRank !== false && data.summary.rank != null;
  const showAtt = data.school.reportShowAttendance !== false;

  const summaryBits: string[] = [];
  if (data.summary.overallAverage != null) {
    summaryBits.push(
      `<span><strong>Annual average:</strong> ${fmtScore(data.summary.overallAverage)}${data.summary.overallLetter ? ` (${escapeHtml(data.summary.overallLetter)})` : ''}</span>`,
    );
  }
  summaryBits.push(
    `<span><strong>Subjects:</strong> ${data.subjectRows.length}</span>`,
  );
  if (showRank) {
    summaryBits.push(
      `<span><strong>Class rank:</strong> ${data.summary.rank}${data.summary.classSize ? ` / ${data.summary.classSize}` : ''}</span>`,
    );
  }
  if (showAtt) {
    const t = data.attendance.totals;
    if (t.totalDays > 0) {
      summaryBits.push(
        `<span><strong>Attendance:</strong> ${t.present} present · ${t.absent} absent · ${t.late} late</span>`,
      );
    }
  }

  const sem1Label = data.semesterLabels?.first ?? 'First Semester';
  const sem2Label = data.semesterLabels?.second ?? 'Second Semester';
  const rem = data.remarks;

  const overflowWarn =
    data.subjectRows.length > 22
      ? `<p class="yr-warn">This grade has many subjects. Review print preview carefully so content stays on two pages.</p>`
      : '';

  return `
    <section class="yr-col" aria-label="Academic results">
      ${watermark(data)}
      <h1 class="yr-h1">Academic Results</h1>
      ${overflowWarn}
      <table class="yr-table yr-results-table">
        <thead>
          <tr>
            <th class="num">No.</th>
            <th>Subject</th>
            ${termHeaders}
            <th class="num">Annual Result</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="${termCount + 3}">No subject results recorded for this academic year.</td></tr>`}</tbody>
      </table>
      <div class="yr-summary">${summaryBits.join('')}</div>
      <div class="yr-remarks">
        <h3>Teacher's Remarks</h3>
        <div class="yr-remarks__row">
          <div class="yr-remark-block">
            <p class="yr-remark-block__h">${escapeHtml(sem1Label)}</p>
            <p class="yr-remark-block__b">${escapeHtml(rem.semester1?.trim() || '')}</p>
          </div>
          <div class="yr-remark-block">
            <p class="yr-remark-block__h">${escapeHtml(sem2Label)}</p>
            <p class="yr-remark-block__b">${escapeHtml(rem.semester2?.trim() || '')}</p>
          </div>
        </div>
        <div class="yr-remark-block yr-remark-block--year">
          <p class="yr-remark-block__h">Remarks for the Year</p>
          <p class="yr-remark-block__b">${escapeHtml((rem.yearly ?? rem.general ?? rem.teacher)?.trim() || '')}</p>
        </div>
      </div>
    </section>
  `;
}

const A4_FIT_SCRIPT = `
(function () {
  function mmToPx(mm) {
    return (mm * 96) / 25.4;
  }
  function fit() {
    // A4 landscape: 297mm wide × 210mm tall
    var pageW = mmToPx(297);
    var pageH = mmToPx(210);
    var availW = Math.max(320, document.documentElement.clientWidth - 24);
    var availH = Math.max(240, document.documentElement.clientHeight - 48);
    var scale = Math.min(1, availW / pageW, availH / pageH);
    document.querySelectorAll('.yr-stage').forEach(function (stage) {
      var page = stage.querySelector('.yr-page');
      if (!page) return;
      stage.style.width = pageW * scale + 'px';
      stage.style.height = pageH * scale + 'px';
      page.style.transform = 'scale(' + scale + ')';
    });
  }
  fit();
  window.addEventListener('resize', fit);
})();
`;

export function buildYearlyReportCardHtml(data: ReportCardPrintPayload): string {
  const primary = brandColor(data);
  const title = `${data.student.name} — Yearly Report Card`;
  const body = `
    <div class="yr-stage">
      <article class="yr-page" aria-label="Yearly report card front">
        ${buildFrontLeft(data)}
        ${buildFrontRight(data, primary)}
      </article>
    </div>
    <div class="yr-stage">
      <article class="yr-page yr-page--back" aria-label="Yearly report card back">
        ${buildBackHero(data, primary)}
        <div class="yr-back-body">
          ${buildBackLeft(data, primary)}
          ${buildBackRight(data)}
        </div>
        ${buildBackFoot(data, primary)}
      </article>
    </div>
    <p class="yr-print-note">Print duplex on A4 landscape, short-edge flip so front and back align.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>${yearlyStyles(primary)}</style>
</head>
<body>
${body}
<script>${A4_FIT_SCRIPT}</script>
</body>
</html>`;
}
