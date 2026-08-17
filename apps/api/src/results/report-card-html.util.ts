import { buildCardScanPayload } from '../students/student-card.util';

export type ReportCardMode = 'term' | 'annual';

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

export type ReportCardSummaryColumn = {
  total: number | null;
  average: number | null;
};

export type ReportCardTermSubjectRow = {
  subject: string;
  average: number | null;
  letter: string | null;
};

export type ReportCardPromotion = {
  outcome: 'PROMOTED' | 'GRADUATED' | 'RETAINED' | 'PASSED';
  label: string;
  nextGradeLabel: string | null;
};

export type ReportCardPrintPayload = {
  mode: ReportCardMode;
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
  };
  student: {
    name: string;
    number: string | null;
    sex: string | null;
    age: number | null;
    gradeLabel: string;
    academicYear: string;
    cardCode: string | null;
    photoUrl: string | null;
  };
  termName: string;
  promotion: ReportCardPromotion | null;
  /** @deprecated Prefer promotion.label — kept for callers that still read it. */
  promotionText: string | null;
  subjectGrid: ReportCardSubjectGridRow[];
  termSubjects: ReportCardTermSubjectRow[];
  summary: {
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
  };
  remarks: {
    teacher: string | null;
    principal: string | null;
    semester1: string | null;
    semester2: string | null;
    cumulative: string | null;
  };
  generatedAt: string;
};

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

export function ageFromDateOfBirth(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatGenderLabel(gender: string | null | undefined): string | null {
  if (!gender) return null;
  if (gender === 'MALE') return 'Male';
  if (gender === 'FEMALE') return 'Female';
  return 'Other';
}

export function buildGradeSectionLabel(grade: string, section: string | null): string {
  if (!section) return grade;
  return `${grade} · ${section}`;
}

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

export function buildSummaryFromGrid(
  grid: ReportCardSubjectGridRow[],
  absentDays: number | null,
  conduct: string | null,
  rank: number | null,
  classSize: number,
  attendanceRate: number | null = null,
): ReportCardPrintPayload['summary'] {
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

function letterGrade(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return '';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
}

function scoreTone(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return '';
  if (score >= 85) return 'rc-score--excellent';
  if (score >= 70) return 'rc-score--good';
  if (score >= 50) return 'rc-score--fair';
  return 'rc-score--low';
}

function fmtScoreCell(value: number | null | undefined, emphasize = false): string {
  if (value == null || Number.isNaN(value)) {
    return '<span class="rc-cell rc-cell--empty">—</span>';
  }
  const letter = letterGrade(value);
  const tone = scoreTone(value);
  const display = fmtScore(value);
  const tag = emphasize ? 'strong' : 'span';
  return `<${tag} class="rc-cell ${tone}">${display}${letter ? `<em>${letter}</em>` : ''}</${tag}>`;
}

function subjectRowCells(row: ReportCardSubjectGridRow): string {
  return `
    <td>${fmtScoreCell(row.term1)}</td>
    <td>${fmtScoreCell(row.term2)}</td>
    <td>${fmtScoreCell(row.semester1, true)}</td>
    <td>${fmtScoreCell(row.term3)}</td>
    <td>${fmtScoreCell(row.term4)}</td>
    <td>${fmtScoreCell(row.semester2, true)}</td>
    <td>${fmtScoreCell(row.cumulative, true)}</td>`;
}

function summaryTotalCells(summary: ReportCardSummaryColumn): string {
  return `<td>${fmtScoreCell(summary.total)}</td>`;
}

function remarkBlock(label: string, text: string | null): string {
  return `
    <div class="rc-remark">
      <div class="rc-remark__head">${escapeHtml(label)}</div>
      <div class="rc-remark__body">
        <p>${text ? escapeHtml(text) : '<span class="rc-empty">No remark recorded.</span>'}</p>
      </div>
    </div>`;
}

function promotionStampHtml(promotion: ReportCardPromotion): string {
  const title =
    promotion.outcome === 'PROMOTED'
      ? 'PROMOTED'
      : promotion.outcome === 'GRADUATED'
        ? 'GRADUATED'
        : promotion.outcome === 'RETAINED'
          ? 'RETAINED'
          : 'PASSED';
  const sub =
    promotion.outcome === 'PROMOTED' && promotion.nextGradeLabel
      ? escapeHtml(promotion.nextGradeLabel)
      : escapeHtml(promotion.label);
  const tone =
    promotion.outcome === 'RETAINED'
      ? 'rc-stamp--retain'
      : promotion.outcome === 'GRADUATED'
        ? 'rc-stamp--grad'
        : 'rc-stamp--promo';

  return `
    <aside class="rc-stamp ${tone}" aria-label="${escapeHtml(promotion.label)}">
      <svg class="rc-stamp__ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="4 3"/>
        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <div class="rc-stamp__copy">
        <strong>${title}</strong>
        <span>${sub}</span>
      </div>
    </aside>`;
}

function sharedStyles(): string {
  return `
    :root {
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --paper: #ffffff;
      --soft: #f8fafc;
      --accent: #0f766e;
      --accent-dark: #115e59;
      --excellent-bg: #ecfdf5; --excellent-fg: #166534;
      --good-bg: #eff6ff; --good-fg: #1d4ed8;
      --fair-bg: #fffbeb; --fair-fg: #b45309;
      --low-bg: #fef2f2; --low-fg: #b91c1c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "DM Sans", "Segoe UI", system-ui, sans-serif;
      color: var(--ink);
      background: #eef2f7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .rc-page {
      width: 297mm;
      height: 210mm;
      margin: 0 auto 10px;
      background: var(--paper);
      position: relative;
      overflow: hidden;
      page-break-after: always;
      page-break-inside: avoid;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    .rc-page:last-child { page-break-after: auto; margin-bottom: 0; }
    .rc-page__accent {
      position: absolute; inset: 0 auto 0 0; width: 3.5mm;
      background: var(--accent);
    }
    .rc-sheet {
      height: 100%;
      padding: 10mm 12mm 8mm 14mm;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }
    .rc-brand {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 4mm;
      align-items: center;
      padding-bottom: 3mm;
      border-bottom: 1px solid var(--line);
    }
    .rc-logo {
      width: 16mm; height: 16mm; border-radius: 3mm;
      object-fit: cover; border: 1px solid var(--line);
      background: var(--soft);
    }
    .rc-logo--fallback {
      display: grid; place-items: center;
      background: var(--accent);
      color: #fff; font-weight: 800; font-size: 5mm;
    }
    .rc-brand__doc {
      margin: 0; font-size: 2.2mm; font-weight: 700;
      letter-spacing: .12em; text-transform: uppercase; color: var(--accent);
    }
    .rc-brand h1 {
      margin: 0.8mm 0 0; font-size: 5.4mm; font-weight: 800;
      letter-spacing: .01em; line-height: 1.1; color: var(--ink);
    }
    .rc-brand__tag {
      margin: 0.8mm 0 0; font-size: 2.4mm; font-weight: 500; color: var(--muted);
    }
    .rc-brand__meta {
      margin: 1mm 0 0; font-size: 2.2mm; color: var(--muted); font-weight: 600;
    }
    .rc-brand__side {
      text-align: right; font-size: 2.2mm; color: var(--muted); font-weight: 600;
      line-height: 1.45;
    }
    .rc-brand__side strong { display: block; color: var(--ink); font-size: 2.6mm; }

    .rc-layout {
      flex: 1; min-height: 0;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 4mm;
    }
    .rc-layout--term { grid-template-columns: 0.9fr 1.1fr; }
    .rc-panel {
      border: 1px solid var(--line);
      border-radius: 2.5mm;
      background: #fff;
      display: flex; flex-direction: column; min-height: 0; overflow: hidden;
    }
    .rc-panel__h {
      margin: 0; padding: 2mm 3mm;
      font-size: 2.2mm; font-weight: 800; letter-spacing: .08em;
      text-transform: uppercase; color: var(--accent-dark);
      background: var(--soft); border-bottom: 1px solid var(--line);
    }
    .rc-panel__b { padding: 3mm; flex: 1; min-height: 0; }

    .rc-id {
      display: grid; grid-template-columns: 18mm 1fr; gap: 3mm; align-items: center;
      margin-bottom: 3mm;
    }
    .rc-avatar {
      width: 18mm; height: 18mm; border-radius: 3mm;
      display: grid; place-items: center;
      background: var(--soft);
      color: var(--accent-dark); font-weight: 800; font-size: 5mm;
      border: 1px solid var(--line);
    }
    .rc-avatar--photo { object-fit: cover; padding: 0; }
    .rc-id strong {
      display: block; font-size: 4mm; letter-spacing: .02em; line-height: 1.15;
    }
    .rc-id span { display: block; margin-top: 0.8mm; font-size: 2.3mm; color: var(--muted); font-weight: 600; }

    .rc-fields {
      display: grid; grid-template-columns: 1fr 1fr; gap: 2mm;
    }
    .rc-field {
      border: 1px solid var(--line); border-radius: 1.8mm;
      padding: 1.6mm 2mm; background: var(--soft);
    }
    .rc-field em {
      display: block; font-style: normal; font-size: 1.9mm;
      color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    }
    .rc-field strong {
      display: block; margin-top: 0.6mm; font-size: 2.7mm; font-weight: 700;
    }

    .rc-kpis {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm; margin-bottom: 3mm;
    }
    .rc-kpi {
      border: 1px solid var(--line); border-radius: 1.8mm;
      padding: 2mm 2.2mm; background: var(--soft);
    }
    .rc-kpi em {
      display: block; font-style: normal; font-size: 1.9mm;
      text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 700;
    }
    .rc-kpi strong { display: block; margin-top: 0.6mm; font-size: 3.4mm; font-weight: 800; }

    .rc-stamp {
      position: relative;
      width: 34mm; height: 34mm;
      margin: 2mm auto 0;
      color: var(--accent);
      display: grid; place-items: center;
    }
    .rc-stamp--promo { color: #0f766e; }
    .rc-stamp--grad { color: #1d4ed8; }
    .rc-stamp--retain { color: #b45309; }
    .rc-stamp__ring { position: absolute; inset: 0; width: 100%; height: 100%; }
    .rc-stamp__copy {
      position: relative; z-index: 1; text-align: center; padding: 0 2mm;
      transform: rotate(-12deg);
    }
    .rc-stamp__copy strong {
      display: block; font-size: 3.2mm; letter-spacing: .08em; font-weight: 800;
    }
    .rc-stamp__copy span {
      display: block; margin-top: 0.8mm; font-size: 2mm; font-weight: 700; line-height: 1.2;
    }

    .rc-table-wrap {
      flex: 1; min-height: 0; overflow: hidden;
      border: 1px solid var(--line); border-radius: 2mm;
    }
    table.rc-tbl {
      width: 100%; border-collapse: collapse; font-size: 2.2mm;
    }
    .rc-tbl thead th {
      padding: 1.6mm 1.2mm; background: #0f172a; color: #fff;
      border: 1px solid rgba(255,255,255,.08);
      font-size: 1.95mm; text-transform: uppercase; letter-spacing: .04em; font-weight: 700;
    }
    .rc-tbl thead th.rc-sem { background: var(--accent-dark); }
    .rc-tbl td, .rc-tbl tbody th {
      border: 1px solid var(--line); padding: 1.2mm 1mm; text-align: center; background: #fff;
    }
    .rc-tbl tr.is-alt td, .rc-tbl tr.is-alt th { background: #f8fafc; }
    .rc-tbl tbody th {
      text-align: left; padding-left: 2.2mm; font-weight: 700; white-space: nowrap; color: var(--ink);
    }
    .rc-cell {
      display: inline-flex; align-items: baseline; justify-content: center; gap: 0.6mm;
      min-width: 9mm; padding: 0.4mm 1mm; border-radius: 999px; font-weight: 700; font-size: 2.05mm;
    }
    .rc-cell em { font-style: normal; font-size: 1.7mm; opacity: .85; }
    .rc-cell--empty {
      color: #94a3b8; background: #f1f5f9; border: 1px dashed #cbd5e1; min-width: 8mm;
    }
    .rc-score--excellent { background: var(--excellent-bg); color: var(--excellent-fg); }
    .rc-score--good { background: var(--good-bg); color: var(--good-fg); }
    .rc-score--fair { background: var(--fair-bg); color: var(--fair-fg); }
    .rc-score--low { background: var(--low-bg); color: var(--low-fg); }
    .rc-tbl__sum th {
      text-align: left !important; padding-left: 2.2mm !important;
      background: #f1f5f9 !important; color: var(--ink);
      text-transform: uppercase; font-size: 1.95mm; letter-spacing: .04em;
    }
    .rc-tbl__sum td { background: #f8fafc; }

    .rc-remarks {
      display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm;
    }
    .rc-remarks--3 { grid-template-columns: repeat(3, 1fr); }
    .rc-remark {
      border: 1px solid var(--line); border-radius: 2mm; min-height: 18mm; overflow: hidden;
      background: #fff;
    }
    .rc-remark__head {
      padding: 1.2mm 2mm; background: var(--soft); border-bottom: 1px solid var(--line);
      font-size: 1.95mm; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--accent-dark);
    }
    .rc-remark__body p {
      margin: 0; padding: 1.6mm 2mm; font-size: 2.15mm; line-height: 1.4; color: #334155;
    }
    .rc-empty { color: #94a3b8; font-style: italic; }

    .rc-signs {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm;
      padding-top: 2mm;
    }
    .rc-sign { text-align: center; }
    .rc-sign__line { height: 6mm; border-bottom: 1px solid #94a3b8; margin-bottom: 1.2mm; }
    .rc-sign__img {
      display: block; height: 10mm; max-width: 100%; margin: 0 auto 1mm;
      object-fit: contain; object-position: center bottom;
    }
    .rc-sign strong {
      display: block; font-size: 2mm; text-transform: uppercase; letter-spacing: .05em; color: var(--muted);
    }

    .rc-foot {
      display: grid; grid-template-columns: 1fr auto auto; gap: 4mm; align-items: end;
      font-size: 1.95mm; color: var(--muted); line-height: 1.4;
      border-top: 1px solid var(--line); padding-top: 2mm;
    }
    .rc-foot strong {
      color: var(--ink); text-transform: uppercase; letter-spacing: .05em; font-size: 1.9mm;
    }
    .rc-foot__qr {
      display: flex; align-items: center; gap: 2mm;
    }
    .rc-foot__qr img {
      width: 12mm; height: 12mm; border-radius: 1mm; border: 1px solid var(--line); background: #fff;
    }

    @page { size: A4 landscape; margin: 0; }
    @media print {
      body { background: #fff; }
      .rc-page { margin: 0; box-shadow: none; width: 297mm; height: 210mm; }
    }
  `;
}

function brandHeader(
  data: ReportCardPrintPayload,
  opts: { documentLabel: string; sideMeta: string },
): string {
  const schoolName = escapeHtml(data.school.name);
  const headerTitle = escapeHtml(
    data.school.headerTitle?.trim() || opts.documentLabel,
  );
  const headerTagline = data.school.headerTagline?.trim()
    ? escapeHtml(data.school.headerTagline.trim())
    : null;
  const logo = data.school.logoUrl
    ? `<img class="rc-logo" src="${escapeHtml(data.school.logoUrl)}" alt=""/>`
    : `<div class="rc-logo rc-logo--fallback" aria-hidden="true">${schoolName.slice(0, 2).toUpperCase()}</div>`;
  const contactBits = [
    data.school.address ? escapeHtml(data.school.address) : '',
    data.school.phone ? escapeHtml(data.school.phone) : '',
    data.school.email ? escapeHtml(data.school.email) : '',
  ].filter(Boolean);

  return `
    <header class="rc-brand">
      ${logo}
      <div>
        <p class="rc-brand__doc">${headerTitle}</p>
        <h1>${schoolName}</h1>
        ${headerTagline ? `<p class="rc-brand__tag">${headerTagline}</p>` : ''}
        <p class="rc-brand__meta">${escapeHtml(data.student.academicYear)}${contactBits.length ? ` · ${contactBits.join(' · ')}` : ''}</p>
      </div>
      <div class="rc-brand__side">
        <strong>${escapeHtml(opts.documentLabel)}</strong>
        ${opts.sideMeta}
      </div>
    </header>`;
}

function studentAvatar(data: ReportCardPrintPayload): string {
  if (data.student.photoUrl) {
    return `<img class="rc-avatar rc-avatar--photo" src="${escapeHtml(data.student.photoUrl)}" alt=""/>`;
  }
  const initials =
    data.student.name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  return `<div class="rc-avatar" aria-hidden="true">${escapeHtml(initials)}</div>`;
}

function directorSignHtml(data: ReportCardPrintPayload): string {
  const label = escapeHtml(
    data.school.authorizedSignatureLabel?.trim() || 'Director',
  );
  if (data.school.authorizedSignatureUrl) {
    return `<div class="rc-sign"><img class="rc-sign__img" src="${escapeHtml(data.school.authorizedSignatureUrl)}" alt=""/><strong>${label}</strong></div>`;
  }
  return `<div class="rc-sign"><div class="rc-sign__line"></div><strong>${label}</strong></div>`;
}

function footerHtml(data: ReportCardPrintPayload, documentRef: string, issuedDate: string): string {
  const qrPayload = data.student.cardCode
    ? buildCardScanPayload(data.student.cardCode)
    : `CAMPUS1:STUDENT:${data.student.number ?? 'unknown'}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=4&data=${encodeURIComponent(qrPayload)}`;
  const schoolName = escapeHtml(data.school.name);

  return `
    <div class="rc-foot">
      <div>
        <strong>Grading</strong><br/>
        90–100 A · 80–89 B · 70–79 C · 60–69 D · 50–59 E · Below 50 F
      </div>
      <div>
        <strong>Document</strong><br/>
        ${documentRef} · ${issuedDate}<br/>
        ${schoolName}
      </div>
      <div class="rc-foot__qr">
        <img src="${qrUrl}" alt="Verification QR"/>
        <span>Scan to verify<br/>in school registry</span>
      </div>
    </div>`;
}

function buildTermReportHtml(data: ReportCardPrintPayload): string {
  const studentName = escapeHtml(data.student.name);
  const studentNameUpper = escapeHtml(data.student.name.toUpperCase());
  const documentRef = escapeHtml(
    data.student.cardCode ?? data.student.number ?? 'DRAFT',
  );
  const issuedDate = escapeHtml(
    new Date(data.generatedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  );
  const rankLabel =
    data.summary.rank != null
      ? `${data.summary.rank} / ${data.summary.classSize}`
      : '—';
  const avg = data.summary.cumulative.average;
  const avatar = studentAvatar(data);

  const subjectRows = data.termSubjects
    .map(
      (row, i) => `
      <tr class="${i % 2 === 1 ? 'is-alt' : ''}">
        <th scope="row">${escapeHtml(row.subject)}</th>
        <td>${fmtScoreCell(row.average, true)}</td>
        <td><strong>${row.letter ? escapeHtml(row.letter) : '—'}</strong></td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Term Report — ${studentNameUpper}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet"/>
  <style>${sharedStyles()}</style>
</head>
<body>
  <section class="rc-page">
    <div class="rc-page__accent" aria-hidden="true"></div>
    <div class="rc-sheet">
      ${brandHeader(data, {
        documentLabel: 'Term report card',
        sideMeta: `${escapeHtml(data.termName)}<br/>Issued ${issuedDate}`,
      })}

      <div class="rc-layout rc-layout--term">
        <section class="rc-panel">
          <h2 class="rc-panel__h">Student</h2>
          <div class="rc-panel__b">
            <div class="rc-id">
              ${avatar}
              <div>
                <strong>${studentNameUpper}</strong>
                <span>${escapeHtml(data.termName)} · ${escapeHtml(data.student.gradeLabel)}</span>
              </div>
            </div>
            <div class="rc-fields">
              <div class="rc-field"><em>Student ID</em><strong>${data.student.number ? escapeHtml(data.student.number) : '—'}</strong></div>
              <div class="rc-field"><em>Document ref</em><strong>${documentRef}</strong></div>
              <div class="rc-field"><em>Sex</em><strong>${data.student.sex ? escapeHtml(data.student.sex) : '—'}</strong></div>
              <div class="rc-field"><em>Age</em><strong>${data.student.age != null ? String(data.student.age) : '—'}</strong></div>
              <div class="rc-field"><em>Grade / section</em><strong>${escapeHtml(data.student.gradeLabel)}</strong></div>
              <div class="rc-field"><em>Academic year</em><strong>${escapeHtml(data.student.academicYear)}</strong></div>
            </div>
            <div class="rc-kpis" style="margin-top:3mm">
              <div class="rc-kpi"><em>Term average</em><strong>${fmtScore(avg)}${data.summary.conduct ? ` · ${escapeHtml(data.summary.conduct)}` : ''}</strong></div>
              <div class="rc-kpi"><em>Class rank</em><strong>${rankLabel}</strong></div>
              <div class="rc-kpi"><em>Absent days</em><strong>${data.summary.absentDays != null ? String(data.summary.absentDays) : '—'}</strong></div>
              <div class="rc-kpi"><em>Attendance</em><strong>${data.summary.attendanceRate != null ? `${data.summary.attendanceRate}%` : '—'}</strong></div>
            </div>
          </div>
        </section>

        <section class="rc-panel">
          <h2 class="rc-panel__h">Subject results — ${escapeHtml(data.termName)}</h2>
          <div class="rc-panel__b" style="padding:0;display:flex;flex-direction:column">
            <div class="rc-table-wrap" style="border:0;border-radius:0;flex:1">
              <table class="rc-tbl">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Average</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjectRows || '<tr><td colspan="3">No scores recorded yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div class="rc-remarks">
        ${remarkBlock('Teacher comment', data.remarks.teacher)}
        ${remarkBlock('Principal comment', data.remarks.principal)}
      </div>

      <div class="rc-signs">
        ${directorSignHtml(data)}
        <div class="rc-sign"><div class="rc-sign__line"></div><strong>Homeroom teacher</strong></div>
        <div class="rc-sign"><div class="rc-sign__line"></div><strong>Parent / guardian</strong></div>
      </div>

      ${footerHtml(data, documentRef, issuedDate)}
    </div>
  </section>
</body>
</html>`;
}

function buildAnnualReportHtml(data: ReportCardPrintPayload): string {
  const studentName = escapeHtml(data.student.name);
  const studentNameUpper = escapeHtml(data.student.name.toUpperCase());
  const documentRef = escapeHtml(
    data.student.cardCode ?? data.student.number ?? 'DRAFT',
  );
  const issuedDate = escapeHtml(
    new Date(data.generatedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  );
  const rankLabel =
    data.summary.rank != null
      ? `${data.summary.rank} / ${data.summary.classSize}`
      : '—';
  const avg = data.summary.cumulative.average;
  const avatar = studentAvatar(data);
  const stamp = data.promotion ? promotionStampHtml(data.promotion) : '';

  const subjectRows = data.subjectGrid
    .map(
      (row, i) => `
      <tr class="${i % 2 === 1 ? 'is-alt' : ''}">
        <th scope="row">${escapeHtml(row.subject)}</th>
        ${subjectRowCells(row)}
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Year-end Report — ${studentNameUpper}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet"/>
  <style>${sharedStyles()}</style>
</head>
<body>
  <section class="rc-page">
    <div class="rc-page__accent" aria-hidden="true"></div>
    <div class="rc-sheet">
      ${brandHeader(data, {
        documentLabel: 'Year-end report card',
        sideMeta: `${escapeHtml(data.student.academicYear)}<br/>Issued ${issuedDate}`,
      })}

      <div class="rc-layout">
        <section class="rc-panel">
          <h2 class="rc-panel__h">Student</h2>
          <div class="rc-panel__b">
            <div class="rc-id">
              ${avatar}
              <div>
                <strong>${studentNameUpper}</strong>
                <span>${escapeHtml(data.student.gradeLabel)} · ${escapeHtml(data.student.academicYear)}</span>
              </div>
            </div>
            <div class="rc-fields">
              <div class="rc-field"><em>Student ID</em><strong>${data.student.number ? escapeHtml(data.student.number) : '—'}</strong></div>
              <div class="rc-field"><em>Document ref</em><strong>${documentRef}</strong></div>
              <div class="rc-field"><em>Sex</em><strong>${data.student.sex ? escapeHtml(data.student.sex) : '—'}</strong></div>
              <div class="rc-field"><em>Age</em><strong>${data.student.age != null ? String(data.student.age) : '—'}</strong></div>
              <div class="rc-field"><em>Grade / section</em><strong>${escapeHtml(data.student.gradeLabel)}</strong></div>
              <div class="rc-field"><em>Academic year</em><strong>${escapeHtml(data.student.academicYear)}</strong></div>
            </div>
          </div>
        </section>

        <section class="rc-panel">
          <h2 class="rc-panel__h">Year summary</h2>
          <div class="rc-panel__b">
            <div class="rc-kpis">
              <div class="rc-kpi"><em>Year average</em><strong>${fmtScore(avg)}${data.summary.conduct ? ` · ${escapeHtml(data.summary.conduct)}` : ''}</strong></div>
              <div class="rc-kpi"><em>Class rank</em><strong>${rankLabel}</strong></div>
              <div class="rc-kpi"><em>Absent days</em><strong>${data.summary.absentDays != null ? String(data.summary.absentDays) : '—'}</strong></div>
              <div class="rc-kpi"><em>Attendance</em><strong>${data.summary.attendanceRate != null ? `${data.summary.attendanceRate}%` : '—'}</strong></div>
            </div>
            ${stamp}
          </div>
        </section>
      </div>

      <div class="rc-remarks rc-remarks--3">
        ${remarkBlock('1st semester', data.remarks.semester1)}
        ${remarkBlock('2nd semester', data.remarks.semester2)}
        ${remarkBlock('Principal / year', data.remarks.cumulative)}
      </div>

      <div class="rc-signs">
        ${directorSignHtml(data)}
        <div class="rc-sign"><div class="rc-sign__line"></div><strong>Homeroom teacher</strong></div>
        <div class="rc-sign"><div class="rc-sign__line"></div><strong>Parent / guardian</strong></div>
      </div>

      ${footerHtml(data, documentRef, issuedDate)}
    </div>
  </section>

  <section class="rc-page">
    <div class="rc-page__accent" aria-hidden="true"></div>
    <div class="rc-sheet">
      ${brandHeader(data, {
        documentLabel: 'Year-end results',
        sideMeta: `${studentName}<br/>${escapeHtml(data.student.gradeLabel)}`,
      })}

      <div class="rc-table-wrap">
        <table class="rc-tbl">
          <thead>
            <tr>
              <th>Subject</th>
              <th>T1</th>
              <th>T2</th>
              <th class="rc-sem">S1</th>
              <th>T3</th>
              <th>T4</th>
              <th class="rc-sem">S2</th>
              <th>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows || '<tr><td colspan="8">No scores recorded yet.</td></tr>'}
            <tr class="rc-tbl__sum">
              <th scope="row">Total</th>
              ${summaryTotalCells(data.summary.term1)}
              ${summaryTotalCells(data.summary.term2)}
              ${summaryTotalCells(data.summary.semester1)}
              ${summaryTotalCells(data.summary.term3)}
              ${summaryTotalCells(data.summary.term4)}
              ${summaryTotalCells(data.summary.semester2)}
              ${summaryTotalCells(data.summary.cumulative)}
            </tr>
            <tr class="rc-tbl__sum">
              <th scope="row">Average</th>
              <td>${fmtScoreCell(data.summary.term1.average)}</td>
              <td>${fmtScoreCell(data.summary.term2.average)}</td>
              <td>${fmtScoreCell(data.summary.semester1.average, true)}</td>
              <td>${fmtScoreCell(data.summary.term3.average)}</td>
              <td>${fmtScoreCell(data.summary.term4.average)}</td>
              <td>${fmtScoreCell(data.summary.semester2.average, true)}</td>
              <td>${fmtScoreCell(data.summary.cumulative.average, true)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${footerHtml(data, documentRef, issuedDate)}
    </div>
  </section>
</body>
</html>`;
}

export function buildReportCardHtml(data: ReportCardPrintPayload): string {
  return data.mode === 'annual' ? buildAnnualReportHtml(data) : buildTermReportHtml(data);
}

/** @deprecated Use buildReportCardHtml */
export function buildEthiopianReportCardHtml(data: ReportCardPrintPayload): string {
  return buildReportCardHtml(data);
}
