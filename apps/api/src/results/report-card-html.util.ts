import { scoreToLetter, type GradingBand } from './grading.util';
import { buildYearlyReportCardHtml } from './yearly-report-card-html.util';

export type ReportCardMode = 'term' | 'annual';

export type ReportCardPromotion = {
  outcome: 'PROMOTED' | 'GRADUATED' | 'RETAINED' | 'PASSED';
  label: string;
  nextGradeLabel: string | null;
};

export type ReportCardTermColumn = {
  id: string;
  name: string;
  shortName: string;
};

export type ReportCardSubjectRow = {
  subject: string;
  termScores: Array<number | null>;
  total: number | null;
  average: number | null;
  letter: string | null;
};

export type ReportCardAttendanceTerm = {
  termName: string;
  present: number;
  absent: number;
  late: number;
  totalDays: number;
};

export type ReportCardGradingBand = GradingBand & {
  description: string;
};

/** @deprecated Kept for older annual helpers; prefer subjectRows + terms. */
export type ReportCardSubjectGridRow = {
  subject: string;
  term1: number | null;
  term2: number | null;
  semester1: number | null;
  term3: number | null;
  term4: number | null;
  semester2: number | null;
  cumulative: number | null;
};

/** @deprecated */
export type ReportCardSummaryColumn = {
  total: number | null;
  average: number | null;
};

/** @deprecated */
export type ReportCardTermSubjectRow = {
  subject: string;
  average: number | null;
  letter: string | null;
};

export type ReportCardPrintPayload = {
  mode: ReportCardMode;
  platform: {
    name: string;
    nameAm: string;
    logoUrl: string | null;
    tagline: string;
  };
  school: {
    name: string;
    logoUrl: string | null;
    authorizedSignatureUrl: string | null;
    authorizedSignatureLabel: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    headerTitle: string | null;
    headerTagline: string | null;
    /** Optional Amharic school name */
    nameAm?: string | null;
    stampUrl?: string | null;
    coverImageUrl?: string | null;
    primaryColor?: string | null;
    reportShowRank?: boolean;
    reportShowAttendance?: boolean;
  };
  /** Configured assessment components for the student's grade (yearly front-left). */
  assessmentComponents?: Array<{ name: string; weightPercent: number }>;
  /** False when weights exist but do not total 100. */
  assessmentWeightsValid?: boolean;
  semesterLabels?: { first: string; second: string };
  student: {
    name: string;
    number: string | null;
    sex: string | null;
    dateOfBirth: string | null;
    age: number | null;
    gradeLabel: string;
    section: string | null;
    academicYear: string;
    cardCode: string | null;
    photoUrl: string | null;
  };
  /** Active terms for this academic year (1–4+). */
  terms: ReportCardTermColumn[];
  /** Current term label (term mode). */
  termName: string;
  subjectRows: ReportCardSubjectRow[];
  gradingScale: ReportCardGradingBand[];
  attendance: {
    byTerm: ReportCardAttendanceTerm[];
    totals: {
      present: number;
      absent: number;
      late: number;
      totalDays: number;
    };
  };
  conduct: {
    overall: string | null;
    discipline: string | null;
    participation: string | null;
    attitude: string | null;
    cooperation: string | null;
    note: string | null;
  };
  summary: {
    overallAverage: number | null;
    overallLetter: string | null;
    rank: number | null;
    classSize: number;
    promotion: ReportCardPromotion | null;
  };
  remarks: {
    teacher: string | null;
    principal: string | null;
    general: string | null;
    semester1?: string | null;
    semester2?: string | null;
    yearly?: string | null;
  };
  verification: {
    qrPayload: string;
  };
  generatedAt: string;

  /** @deprecated Legacy annual grid — populated for backward compatibility. */
  subjectGrid: ReportCardSubjectGridRow[];
  /** @deprecated */
  termSubjects: ReportCardTermSubjectRow[];
  /** @deprecated Prefer summary.promotion */
  promotion: ReportCardPromotion | null;
  /** @deprecated */
  promotionText: string | null;
};

const CHORA_TEAL = '#147D76';
const CHORA_TEAL_DARK = '#0F5F5A';
const CHORA_TEAL_SOFT = '#E8F5F4';

const LETTER_DESCRIPTIONS: Record<string, string> = {
  A: 'Excellent',
  'A+': 'Outstanding',
  'A-': 'Very Good',
  'B+': 'Good',
  B: 'Good',
  'B-': 'Fair',
  'C+': 'Satisfactory',
  C: 'Pass',
  'C-': 'Pass',
  D: 'Needs Improvement',
  E: 'Weak',
  F: 'Fail',
};

export function gradingBandDescription(letter: string): string {
  return LETTER_DESCRIPTIONS[letter] ?? '';
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function avgNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) * 10) / 10;
}

/** @deprecated Prefer academic year name from the database. */
export function ethiopianCalendarYear(date = new Date()): number {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 9 ? year - 7 : year - 8;
}

export function ageFromDateOfBirth(
  dob: Date | null | undefined,
): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatGenderLabel(
  gender: string | null | undefined,
): string | null {
  if (!gender) return null;
  if (gender === 'MALE') return 'Male';
  if (gender === 'FEMALE') return 'Female';
  return 'Other';
}

export function formatDateOfBirth(dob: Date | null | undefined): string | null {
  if (!dob) return null;
  try {
    return new Date(dob).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function buildGradeSectionLabel(
  grade: string,
  section: string | null,
): string {
  if (!section) return grade;
  return `${grade} · ${section}`;
}

export function shortTermName(name: string, index: number): string {
  const trimmed = name.trim();
  if (/^term\s*\d+/i.test(trimmed) || /^t\d+$/i.test(trimmed)) {
    return `T${index + 1}`;
  }
  if (/semester/i.test(trimmed)) {
    const m = trimmed.match(/(\d+)/);
    return m ? `S${m[1]}` : `S${index + 1}`;
  }
  if (trimmed.length <= 8) return trimmed;
  return `T${index + 1}`;
}

export function buildSubjectRows(
  subjects: string[],
  termAverages: Array<Array<number | null>>,
  bands: GradingBand[],
): ReportCardSubjectRow[] {
  return subjects.map((subject, subjectIndex) => {
    const termScores = termAverages.map(
      (termCol) => termCol[subjectIndex] ?? null,
    );
    const total = sumNullable(termScores);
    const average = avgNullable(termScores);
    const letter = average != null ? scoreToLetter(average, bands) : null;
    return { subject, termScores, total, average, letter };
  });
}

/** @deprecated Compatibility shim for older annual grid shape. */
export function buildSubjectGridRows(
  subjects: string[],
  termAverages: Array<Array<number | null>>,
): ReportCardSubjectGridRow[] {
  return subjects.map((subject, subjectIndex) => {
    const t1 = termAverages[0]?.[subjectIndex] ?? null;
    const t2 = termAverages[1]?.[subjectIndex] ?? null;
    const t3 = termAverages[2]?.[subjectIndex] ?? null;
    const t4 = termAverages[3]?.[subjectIndex] ?? null;
    const semester1 = avgNullable([t1, t2]);
    const semester2 = avgNullable([t3, t4]);
    const cumulative = avgNullable([t1, t2, t3, t4]);
    return {
      subject,
      term1: t1,
      term2: t2,
      semester1,
      term3: t3,
      term4: t4,
      semester2,
      cumulative,
    };
  });
}

/** @deprecated */
export function buildSummaryFromGrid(
  grid: ReportCardSubjectGridRow[],
  absentDays: number | null,
  conduct: string | null,
  rank: number | null,
  classSize: number,
  attendanceRate: number | null = null,
): {
  term1: ReportCardSummaryColumn;
  term2: ReportCardSummaryColumn;
  semester1: ReportCardSummaryColumn;
  term3: ReportCardSummaryColumn;
  term4: ReportCardSummaryColumn;
  semester2: ReportCardSummaryColumn;
  cumulative: ReportCardSummaryColumn;
  absentDays: number | null;
  conduct: string | null;
  rank: number | null;
  classSize: number;
  attendanceRate: number | null;
} {
  const col = (pick: (row: ReportCardSubjectGridRow) => number | null) => ({
    total: sumNullable(grid.map(pick)),
    average: avgNullable(grid.map(pick)),
  });
  return {
    term1: col((r) => r.term1),
    term2: col((r) => r.term2),
    semester1: col((r) => r.semester1),
    term3: col((r) => r.term3),
    term4: col((r) => r.term4),
    semester2: col((r) => r.semester2),
    cumulative: col((r) => r.cumulative),
    absentDays,
    conduct,
    rank,
    classSize,
    attendanceRate,
  };
}

function infoLine(
  label: string,
  value: string | number | null | undefined,
): string {
  if (
    value == null ||
    value === '' ||
    (typeof value === 'number' && Number.isNaN(value))
  ) {
    return '';
  }
  return `<div class="rc-info-line"><span>${escapeHtml(label)}:</span> <strong>${escapeHtml(String(value))}</strong></div>`;
}

function choraMarkHtml(logoUrl: string | null): string {
  if (logoUrl) {
    return `<img class="rc-brand__logo" src="${escapeHtml(logoUrl)}" alt="Chora"/>`;
  }
  return `<span class="rc-brand__mark" aria-hidden="true">ጮ</span>`;
}

function schoolLogoHtml(data: ReportCardPrintPayload): string {
  if (data.school.logoUrl) {
    return `<img class="rc-schoolbox__logo" src="${escapeHtml(data.school.logoUrl)}" alt=""/>`;
  }
  return `<div class="rc-schoolbox__logo rc-schoolbox__logo--ph" aria-hidden="true">
    <svg viewBox="0 0 48 48" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="18" width="32" height="22" rx="2" stroke="#147D76" stroke-width="2.5"/>
      <path d="M14 18V14a10 10 0 0 1 20 0v4" stroke="#147D76" stroke-width="2.5"/>
      <path d="M24 28v6M18 34h12" stroke="#147D76" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
    </div>`;
}

function sharedStyles(): string {
  return `
    :root {
      --chora: ${CHORA_TEAL};
      --chora-dark: ${CHORA_TEAL_DARK};
      --chora-soft: ${CHORA_TEAL_SOFT};
      --ink: #1c2430;
      --muted: #5a6570;
      --line: #d0d8de;
      --soft: #f3f8f7;
      --paper: #ffffff;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
      color: var(--ink);
      background: #d9e2e4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .rc-page {
      width: 297mm;
      height: 210mm;
      margin: 6mm auto;
      background: var(--paper);
      position: relative;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      box-shadow: 0 8px 24px rgba(20, 125, 118, 0.14);
    }
    .rc-page:last-child { page-break-after: auto; break-after: auto; margin-bottom: 8mm; }
    .rc-corner {
      position: absolute;
      width: 14mm;
      height: 14mm;
      background: var(--chora);
      z-index: 1;
      pointer-events: none;
    }
    .rc-corner--bl {
      left: 0; bottom: 0;
      border-top-right-radius: 100%;
    }
    .rc-corner--br {
      right: 0; bottom: 0;
      border-top-left-radius: 100%;
    }
    .rc-face {
      position: absolute;
      top: 2mm; right: 3mm;
      z-index: 3;
      font-size: 2mm;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--chora-dark);
      background: var(--chora-soft);
      border: 0.25mm solid #b9d6d3;
      padding: 0.7mm 1.6mm;
    }
    .rc-sheet {
      height: 100%;
      padding: 7mm 9mm 8mm;
      display: flex;
      flex-direction: column;
      gap: 3.2mm;
      position: relative;
      z-index: 2;
    }

    /* —— Front header —— */
    .rc-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4mm;
      flex-shrink: 0;
    }
    .rc-brand {
      display: flex;
      align-items: center;
      gap: 2.4mm;
    }
    .rc-brand__logo {
      width: 11mm; height: 11mm;
      object-fit: cover;
      border-radius: 2.4mm;
      background: var(--chora);
      overflow: hidden;
      display: block;
    }
    .rc-brand__mark {
      width: 11mm; height: 11mm;
      border-radius: 2.4mm;
      display: grid; place-items: center;
      background: var(--chora);
      color: #fff;
      font-weight: 800;
      font-size: 5.2mm;
    }
    .rc-brand__text strong {
      display: block;
      font-size: 4.2mm;
      letter-spacing: 0.18em;
      color: var(--chora);
      line-height: 1;
    }
    .rc-brand__text span {
      display: block;
      margin-top: 0.6mm;
      font-size: 2.8mm;
      color: var(--muted);
    }
    .rc-head__rule {
      width: 0.45mm;
      align-self: stretch;
      background: var(--chora);
      opacity: 0.55;
      margin: 0 1mm;
    }
    .rc-head__title {
      text-align: right;
      margin-left: auto;
    }
    .rc-head__title h1 {
      margin: 0;
      font-size: 6.2mm;
      font-weight: 800;
      color: var(--chora-dark);
      letter-spacing: 0.02em;
      text-transform: uppercase;
      line-height: 1.05;
    }
    .rc-head__title p {
      margin: 1mm 0 0;
      font-size: 3mm;
      color: var(--muted);
      font-weight: 600;
    }

    .rc-schoolbox {
      display: flex;
      align-items: center;
      gap: 3.5mm;
      border: 0.4mm solid #b7d4d1;
      border-radius: 2.5mm;
      padding: 2.6mm 3.5mm;
      background: linear-gradient(180deg, #f7fbfb 0%, #fff 100%);
      flex-shrink: 0;
    }
    .rc-schoolbox__logo {
      width: 14mm; height: 14mm;
      max-width: 14mm; max-height: 14mm;
      object-fit: contain;
      flex-shrink: 0;
    }
    .rc-schoolbox__logo--ph {
      display: grid;
      place-items: center;
      border: 0.35mm dashed #9ec4c0;
      border-radius: 2mm;
      background: var(--soft);
    }
    .rc-schoolbox__meta { min-width: 0; }
    .rc-schoolbox__meta strong {
      display: block;
      font-size: 4.4mm;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.15;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .rc-schoolbox__meta span {
      display: block;
      margin-top: 0.8mm;
      font-size: 2.8mm;
      color: var(--muted);
      font-weight: 600;
      font-style: italic;
    }

    .rc-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5mm 10mm;
      padding: 1mm 1mm 0.5mm;
      flex-shrink: 0;
    }
    .rc-info-col { display: flex; flex-direction: column; gap: 1.4mm; }
    .rc-info-line {
      font-size: 3.2mm;
      line-height: 1.25;
      color: var(--ink);
    }
    .rc-info-line span {
      color: var(--muted);
      font-weight: 700;
    }
    .rc-info-line strong { font-weight: 700; color: var(--ink); }

    .rc-main {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }
    .rc-table-wrap {
      flex: 1 1 auto;
      min-height: 0;
      border: 0.35mm solid #b7d4d1;
      border-radius: 2.5mm;
      overflow: hidden;
      background: #fff;
    }
    table.rc-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 3mm;
      height: 100%;
    }
    .rc-tbl thead th {
      padding: 2.4mm 1.5mm;
      background: var(--chora);
      color: #fff;
      font-size: 2.6mm;
      font-weight: 700;
      text-transform: none;
      letter-spacing: 0.01em;
      white-space: nowrap;
      border: none;
    }
    .rc-tbl td, .rc-tbl tbody th {
      border-bottom: 0.25mm solid #e2e9ec;
      border-right: 0.25mm solid #eef2f4;
      padding: 2.1mm 1.5mm;
      text-align: center;
      background: #fff;
      font-weight: 600;
      font-size: 3.05mm;
      vertical-align: middle;
    }
    .rc-tbl tbody th {
      text-align: left;
      padding-left: 3mm;
      font-weight: 700;
      color: var(--ink);
      white-space: nowrap;
      max-width: 48mm;
      overflow: hidden;
      text-overflow: ellipsis;
      border-right: 0.25mm solid #e2e9ec;
    }
    .rc-tbl tr.is-alt td, .rc-tbl tr.is-alt th { background: #eef7f6; }
    .rc-tbl__foot td, .rc-tbl__foot th {
      background: #e5f3f1 !important;
      font-weight: 800;
      border-bottom: none;
    }
    .rc-num { width: 9mm; color: #6b7780; }

    .rc-front-foot {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6mm;
      align-items: end;
      flex-shrink: 0;
      margin-top: auto;
    }
    .rc-scale {
      border: 0.4mm solid var(--chora);
      border-radius: 2.5mm;
      overflow: hidden;
      max-width: 100%;
      background: #fff;
    }
    .rc-scale__h {
      margin: 0;
      padding: 1.6mm 2.6mm;
      background: var(--chora);
      color: #fff;
      font-size: 2.7mm;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .rc-scale__list {
      margin: 0;
      padding: 2mm 2.8mm;
      list-style: none;
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 0 3.2mm;
      font-size: 2.35mm;
      color: var(--muted);
      background: var(--soft);
      white-space: nowrap;
    }
    .rc-scale__list li {
      display: inline-flex;
      align-items: baseline;
      gap: 1.2mm;
      flex: 0 0 auto;
    }
    .rc-scale__list strong {
      color: var(--chora-dark);
      font-weight: 800;
      font-size: 2.5mm;
    }
    .rc-motto {
      text-align: right;
      font-size: 3.1mm;
      font-weight: 700;
      color: var(--chora-dark);
      line-height: 1.4;
      padding: 0 4mm 2mm 0;
    }
    .rc-motto::before {
      content: "";
      display: block;
      width: 18mm;
      height: 0.45mm;
      background: var(--chora);
      margin: 0 0 2mm auto;
    }
    .rc-motto em {
      display: block;
      font-style: italic;
      font-weight: 600;
      color: var(--muted);
      font-size: 2.8mm;
    }
    .rc-tbl thead th.rc-term-group {
      border-left: 0.3mm solid rgba(255,255,255,0.35);
      border-right: 0.3mm solid rgba(255,255,255,0.35);
    }
    .rc-tbl thead tr.rc-subhead th {
      padding: 1.4mm 1mm;
      font-size: 2.4mm;
      background: #0f5f5a;
    }

    /* —— Back page —— */
    .rc-back-top {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 3.5mm;
      flex-shrink: 0;
    }
    .rc-panel {
      border: 0.35mm solid #b7d4d1;
      border-radius: 2.5mm;
      overflow: hidden;
      background: #fff;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .rc-panel__h {
      margin: 0;
      padding: 1.8mm 2.8mm;
      background: var(--chora);
      color: #fff;
      font-size: 2.8mm;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .rc-panel__b { padding: 0; flex: 1; }
    .rc-panel__b--pad { padding: 2.2mm 2.8mm; }

    .rc-conduct {
      width: 100%;
      border-collapse: collapse;
      font-size: 3mm;
    }
    .rc-conduct tr:nth-child(even) { background: #eef7f6; }
    .rc-conduct th, .rc-conduct td {
      padding: 2mm 2.6mm;
      text-align: left;
      border-bottom: 0.25mm solid #e2e9ec;
    }
    .rc-conduct th {
      width: 48%;
      font-weight: 700;
      color: var(--muted);
      font-size: 2.7mm;
    }
    .rc-conduct td { font-weight: 700; color: var(--ink); font-size: 3.05mm; }
    .rc-conduct tr:last-child th, .rc-conduct tr:last-child td { border-bottom: none; }

    .rc-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
      flex-shrink: 0;
    }
    .rc-kpi {
      border: 0.4mm solid var(--chora);
      border-radius: 2.5mm;
      background: var(--chora-soft);
      padding: 3.2mm 2.8mm;
      text-align: center;
      min-height: 28mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .rc-kpi em {
      display: block;
      font-style: normal;
      font-size: 2.5mm;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--chora-dark);
    }
    .rc-kpi strong {
      display: block;
      margin-top: 1.6mm;
      font-size: 5.8mm;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.05;
    }
    .rc-kpi span {
      display: block;
      margin-top: 1mm;
      font-size: 2.6mm;
      color: var(--muted);
      font-weight: 600;
    }

    .rc-signrow {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 4mm;
      align-items: stretch;
      flex-shrink: 0;
    }
    .rc-sign {
      border: 0.35mm solid #c5d2d6;
      border-radius: 2.5mm;
      padding: 2.4mm 3mm 2.2mm;
      text-align: center;
      background: #fff;
    }
    .rc-sign__line {
      height: 16mm;
      border-bottom: 0.4mm solid #7a8790;
      margin-bottom: 1.8mm;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .rc-sign__img {
      max-height: 14mm;
      max-width: 100%;
      object-fit: contain;
    }
    .rc-sign strong {
      display: block;
      font-size: 3mm;
      font-weight: 800;
      color: var(--ink);
    }
    .rc-sign span {
      display: block;
      margin-top: 0.5mm;
      font-size: 2.4mm;
      color: var(--muted);
      font-weight: 600;
    }
    .rc-qr {
      width: 38mm;
      border: 0.35mm solid #b7d4d1;
      border-radius: 2.5mm;
      padding: 2mm;
      text-align: center;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.2mm;
    }
    .rc-qr img {
      width: 24mm;
      height: 24mm;
      background: #fff;
    }
    .rc-qr strong {
      font-size: 2.3mm;
      color: var(--chora-dark);
      font-weight: 800;
      line-height: 1.25;
    }

    .rc-remarks {
      border: 0.35mm solid #b7d4d1;
      border-radius: 2.5mm;
      overflow: hidden;
      flex: 1 1 auto;
      min-height: 28mm;
      display: flex;
      flex-direction: column;
    }
    .rc-remarks__body {
      flex: 1;
      padding: 2.8mm 3.2mm;
      font-size: 3mm;
      line-height: 1.45;
      color: #2a3540;
      background: #fff;
    }
    .rc-remarks__body.is-empty {
      color: #94a3b8;
      font-style: italic;
    }

    .rc-foot {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      border-top: 0.4mm solid var(--chora);
      padding-top: 1.8mm;
      margin-top: auto;
      flex-shrink: 0;
      font-size: 2.6mm;
      font-weight: 700;
      color: var(--chora-dark);
      letter-spacing: 0.04em;
    }

    .rc-att .rc-tbl thead th { font-size: 2.4mm; padding: 1.8mm 1.2mm; }
    .rc-att .rc-tbl td, .rc-att .rc-tbl tbody th {
      font-size: 2.8mm;
      padding: 1.8mm 1.2mm;
    }

    /* —— Term mode: two half-height cards per A4 landscape —— */
    .rc-page--pair {
      display: flex;
      flex-direction: column;
      padding: 0;
      gap: 0;
    }
    .rc-half {
      position: relative;
      height: 105mm;
      flex: 0 0 105mm;
      overflow: hidden;
      background: var(--paper);
    }
    .rc-half + .rc-half {
      border-top: 0.35mm dashed #9aabb3;
    }
    .rc-half__cut {
      position: absolute;
      top: -0.2mm;
      left: 50%;
      transform: translateX(-50%);
      z-index: 4;
      font-size: 1.8mm;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8a97a0;
      background: #fff;
      padding: 0 2mm;
    }
    .rc-half--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        repeating-linear-gradient(
          -45deg,
          #fff,
          #fff 4mm,
          #f4f8f8 4mm,
          #f4f8f8 8mm
        );
    }
    .rc-half--empty__hint {
      text-align: center;
      color: #7a8790;
      max-width: 120mm;
    }
    .rc-half--empty__hint strong {
      display: block;
      font-size: 3.2mm;
      font-weight: 800;
      color: var(--chora-dark);
      margin-bottom: 1.5mm;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .rc-half--empty__hint span {
      display: block;
      font-size: 2.6mm;
      font-weight: 600;
      line-height: 1.4;
    }
    .rc-sheet--term {
      height: 100%;
      padding: 3.5mm 6mm 3.2mm;
      gap: 2mm;
    }
    .rc-sheet--term .rc-head { gap: 2.5mm; }
    .rc-sheet--term .rc-brand__logo,
    .rc-sheet--term .rc-brand__mark {
      width: 7.5mm; height: 7.5mm;
      border-radius: 1.6mm;
    }
    .rc-sheet--term .rc-brand__mark { font-size: 3.6mm; }
    .rc-sheet--term .rc-brand__text strong { font-size: 3mm; letter-spacing: 0.14em; }
    .rc-sheet--term .rc-brand__text span { font-size: 2.1mm; margin-top: 0.3mm; }
    .rc-sheet--term .rc-head__title h1 { font-size: 4.2mm; }
    .rc-sheet--term .rc-head__title p { font-size: 2.4mm; margin-top: 0.5mm; }
    .rc-sheet--term .rc-schoolbox {
      padding: 1.4mm 2.4mm;
      gap: 2.2mm;
      border-radius: 1.8mm;
    }
    .rc-sheet--term .rc-schoolbox__logo,
    .rc-sheet--term .rc-schoolbox__logo--ph {
      width: 9mm; height: 9mm;
      max-width: 9mm; max-height: 9mm;
    }
    .rc-sheet--term .rc-schoolbox__meta strong { font-size: 3.2mm; }
    .rc-sheet--term .rc-schoolbox__meta span { font-size: 2.2mm; margin-top: 0.3mm; }
    .rc-sheet--term .rc-info-grid {
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.8mm 5mm;
      padding: 0;
    }
    .rc-sheet--term .rc-info-line { font-size: 2.5mm; }
    .rc-sheet--term .rc-table-wrap {
      border-radius: 1.8mm;
      flex: 1 1 auto;
    }
    .rc-sheet--term table.rc-tbl { font-size: 2.5mm; height: auto; }
    .rc-sheet--term .rc-tbl thead th {
      padding: 1.3mm 1.2mm;
      font-size: 2.2mm;
    }
    .rc-sheet--term .rc-tbl td,
    .rc-sheet--term .rc-tbl tbody th {
      padding: 1.1mm 1.2mm;
      font-size: 2.45mm;
    }
    .rc-sheet--term .rc-tbl tbody th {
      padding-left: 2.2mm;
      max-width: 70mm;
    }
    .rc-term-foot {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      gap: 2.5mm;
      align-items: stretch;
      flex-shrink: 0;
      margin-top: auto;
    }
    .rc-term-kpi {
      border: 0.3mm solid var(--chora);
      border-radius: 1.6mm;
      background: var(--chora-soft);
      padding: 1.4mm 2.4mm;
      text-align: center;
      min-width: 28mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .rc-term-kpi em {
      display: block;
      font-style: normal;
      font-size: 1.9mm;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--chora-dark);
    }
    .rc-term-kpi strong {
      display: block;
      margin-top: 0.6mm;
      font-size: 3.4mm;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.05;
    }
    .rc-term-sign {
      border: 0.3mm solid #c5d2d6;
      border-radius: 1.6mm;
      padding: 1.2mm 2.5mm 1.4mm;
      text-align: center;
      background: #fff;
      min-width: 0;
    }
    .rc-term-sign__line {
      height: 7mm;
      border-bottom: 0.35mm solid #7a8790;
      margin-bottom: 1mm;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .rc-term-sign__line img {
      max-height: 6mm;
      max-width: 100%;
      object-fit: contain;
    }
    .rc-term-sign strong {
      display: block;
      font-size: 2.1mm;
      font-weight: 800;
      color: var(--ink);
    }
    .rc-term-qr {
      width: 18mm;
      border: 0.3mm solid #b7d4d1;
      border-radius: 1.6mm;
      padding: 1mm;
      text-align: center;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5mm;
    }
    .rc-term-qr img {
      width: 12mm;
      height: 12mm;
      background: #fff;
    }
    .rc-term-qr span {
      font-size: 1.7mm;
      font-weight: 800;
      color: var(--chora-dark);
      line-height: 1.15;
    }
    .rc-face--term {
      top: 1.2mm;
      right: 2mm;
      font-size: 1.7mm;
      padding: 0.4mm 1.2mm;
    }
    .rc-half .rc-corner {
      width: 9mm;
      height: 9mm;
    }

    @page { size: A4 landscape; margin: 0; }
    @media print {
      body { background: #fff; }
      .rc-face { display: none !important; }
      .rc-half__cut { display: none !important; }
      .rc-page {
        margin: 0;
        box-shadow: none;
        width: 297mm;
        height: 210mm;
      }
    }
  `;
}

function frontHeader(
  data: ReportCardPrintPayload,
  opts?: { subtitle?: string },
): string {
  const docTitle = data.school.headerTitle?.trim() || 'Student Report Card';
  const tagline =
    data.school.headerTagline?.trim() || 'Learning Today, Leading Tomorrow';
  const subtitle = opts?.subtitle ?? 'Academic Year Report';
  return `
    <header class="rc-head">
      <div class="rc-brand">
        ${choraMarkHtml(data.platform.logoUrl)}
        <div class="rc-brand__text">
          <strong>${escapeHtml(data.platform.name.toUpperCase())}</strong>
          <span>${escapeHtml(data.platform.nameAm)}</span>
                </div>
              </div>
      <div class="rc-head__rule" aria-hidden="true"></div>
      <div class="rc-head__title">
        <h1>${escapeHtml(docTitle.toUpperCase())}</h1>
        <p>${escapeHtml(subtitle)}</p>
              </div>
    </header>
    <div class="rc-schoolbox">
      ${schoolLogoHtml(data)}
      <div class="rc-schoolbox__meta">
        <strong>${escapeHtml(data.school.name)}</strong>
        <span>${escapeHtml(tagline)}</span>
            </div>
    </div>`;
}

/** Compact single-term results: No. · Subject · Score · Grade */
function termResultsTableHtml(data: ReportCardPrintPayload): string {
  const rows = data.subjectRows
    .map((row, i) => {
      const score = row.termScores[0] ?? row.average ?? row.total;
      return `
        <tr class="${i % 2 === 1 ? 'is-alt' : ''}">
          <td class="rc-num">${i + 1}</td>
          <th scope="row">${escapeHtml(row.subject)}</th>
          <td>${fmtScore(score)}</td>
          <td><strong>${row.letter ? escapeHtml(row.letter) : '—'}</strong></td>
        </tr>`;
    })
    .join('');
  const empty = `<tr><td colspan="4">No subject scores recorded yet.</td></tr>`;

  return `
    <div class="rc-table-wrap">
      <table class="rc-tbl">
        <thead>
          <tr>
            <th class="rc-num">No.</th>
            <th>Subject</th>
            <th>Score</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${rows || empty}
        </tbody>
      </table>
    </div>`;
}

function termStudentInfoHtml(data: ReportCardPrintPayload): string {
  const [grade, sectionFromLabel] = data.student.gradeLabel.includes(' · ')
    ? data.student.gradeLabel.split(' · ')
    : [data.student.gradeLabel, data.student.section];
  const cells = [
    infoLine('Student', data.student.name),
    infoLine('ID', data.student.number),
    infoLine('Grade', grade),
    infoLine('Section', data.student.section ?? sectionFromLabel ?? null),
    infoLine('Year', data.student.academicYear),
    infoLine('Term', data.termName),
  ]
    .filter(Boolean)
    .join('');

  return `
    <section class="rc-info-grid" aria-label="Student information">
      ${cells}
    </section>`;
}

function termFooterHtml(data: ReportCardPrintPayload): string {
  const avg = data.summary.overallAverage;
  const letter = data.summary.overallLetter;
  const att = data.attendance.totals;
  const presentLabel =
    att.totalDays > 0 ? `${att.present}/${att.totalDays}` : String(att.present);
  const principalLabel =
    data.school.authorizedSignatureLabel?.trim() || 'Principal';
  const principalImg = data.school.authorizedSignatureUrl
    ? `<img src="${escapeHtml(data.school.authorizedSignatureUrl)}" alt=""/>`
    : '';
  const verifyUrl = data.verification.qrPayload;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=2&ecc=M&data=${encodeURIComponent(verifyUrl)}`;

  return `
    <div class="rc-term-foot">
      <div class="rc-term-kpi">
        <em>Average</em>
        <strong>${fmtScore(avg)}${avg != null ? '%' : ''}${letter ? ` ${escapeHtml(letter)}` : ''}</strong>
        </div>
      <div class="rc-term-kpi">
        <em>Attendance</em>
        <strong>${escapeHtml(presentLabel)}</strong>
        </div>
      <div class="rc-term-sign">
        <div class="rc-term-sign__line">${principalImg}</div>
        <strong>${escapeHtml(principalLabel)} / Class Teacher</strong>
      </div>
      <div class="rc-term-qr">
        <img src="${qrUrl}" alt="Verification QR code"/>
        <span>Verify</span>
    </div>
    </div>`;
}

function buildTermHalfCard(data: ReportCardPrintPayload): string {
  return `
    <article class="rc-half" aria-label="Term report card">
      <div class="rc-corner rc-corner--bl" aria-hidden="true"></div>
      <div class="rc-face rc-face--term">Term · Front</div>
      <div class="rc-sheet rc-sheet--term">
        ${frontHeader(data, { subtitle: `${data.termName} Report` })}
        ${termStudentInfoHtml(data)}
        <div class="rc-main">
          ${termResultsTableHtml(data)}
          ${termFooterHtml(data)}
        </div>
      </div>
    </article>`;
}

function buildTermEmptyHalf(): string {
  return `
    <article class="rc-half rc-half--empty" aria-label="Second term report slot">
      <span class="rc-half__cut">Cut here</span>
      <div class="rc-half--empty__hint">
        <strong>Second term report</strong>
        <span>One A4 landscape holds two term cards. Print another student here, then cut along the dashed line.</span>
      </div>
    </article>`;
}

function buildTermSheet(data: ReportCardPrintPayload): string {
  return `
  <section class="rc-page rc-page--pair" aria-label="Term report cards — two per A4">
    ${buildTermHalfCard(data)}
    ${buildTermEmptyHalf()}
  </section>`;
}

function documentShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <style>${sharedStyles()}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function buildReportCardHtml(data: ReportCardPrintPayload): string {
  if (data.mode === 'annual') {
    return buildYearlyReportCardHtml(data);
  }
  const title = `${data.student.name} — Report Card`;
  const body = buildTermSheet(data);
  return documentShell(title, body);
}

/** @deprecated Use buildReportCardHtml */
export function buildEthiopianReportCardHtml(
  data: ReportCardPrintPayload,
): string {
  return buildReportCardHtml(data);
}
