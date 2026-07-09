import { buildCardScanPayload } from '../students/student-card.util';

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

export type ReportCardPrintPayload = {
  school: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
  };
  student: {
    name: string;
    number: string | null;
    sex: string | null;
    age: number | null;
    gradeLabel: string;
    academicYearEc: string;
    academicYear: string;
    cardCode: string | null;
  };
  promotionText: string | null;
  subjectGrid: ReportCardSubjectGridRow[];
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
  };
  remarks: {
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
  if (value == null || Number.isNaN(value)) return '<span class="rc-cell rc-cell--empty">—</span>';
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

function scoreRingSvg(percent: number | null): string {
  const value = percent != null && !Number.isNaN(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const display = percent != null ? fmtScore(percent) : '—';
  const letter = letterGrade(percent);
  const stroke = ringStroke(percent);
  return `
    <svg class="rc-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="rc-ring__track" cx="50" cy="50" r="${radius}" />
      <circle class="rc-ring__fill" cx="50" cy="50" r="${radius}"
        stroke="${stroke}"
        stroke-dasharray="${circumference.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}" />
    </svg>
    <div class="rc-ring__label">
      <strong>${display}</strong>
      <span>%</span>
      ${letter ? `<em>${letter}</em>` : ''}
    </div>`;
}

function achievementLabel(avg: number | null | undefined): string {
  if (avg == null || Number.isNaN(avg)) return 'Academic record in progress';
  if (avg >= 90) return 'Outstanding performance';
  if (avg >= 80) return 'Excellent standing';
  if (avg >= 70) return 'Good academic progress';
  if (avg >= 60) return 'Satisfactory progress';
  return 'Needs focused support';
}

function ringStroke(percent: number | null | undefined): string {
  if (percent == null || Number.isNaN(percent)) return '#94a3b8';
  if (percent >= 85) return '#15803d';
  if (percent >= 70) return '#1d4ed8';
  if (percent >= 50) return '#b45309';
  return '#b91c1c';
}

function subjectSnapshotHtml(grid: ReportCardSubjectGridRow[]): string {
  if (grid.length === 0) return '';
  return grid
    .map((row) => {
      const score = row.cumulative ?? row.semester1 ?? row.term1;
      const pct = score != null && !Number.isNaN(score) ? Math.min(100, Math.max(0, score)) : 0;
      const tone = scoreTone(score);
      const letter = letterGrade(score);
      return `
        <article class="rc-snap ${tone}">
          <div class="rc-snap__top">
            <strong>${escapeHtml(row.subject)}</strong>
            <span>${fmtScore(score)}${letter ? ` · ${letter}` : ''}</span>
          </div>
          <div class="rc-snap__bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
        </article>`;
    })
    .join('');
}

function remarkCard(label: string, text: string | null): string {
  return `
    <div class="rc-remark">
      <div class="rc-remark__head">${escapeHtml(label)}</div>
      <div class="rc-remark__body">
        <p>${text ? escapeHtml(text) : '<span class="rc-remark__empty">No remark recorded.</span>'}</p>
      </div>
    </div>`;
}

export function buildEthiopianReportCardHtml(data: ReportCardPrintPayload): string {
  const schoolName = escapeHtml(data.school.name);
  const studentName = escapeHtml(data.student.name);
  const studentNameUpper = escapeHtml(data.student.name.toUpperCase());
  const qrPayload = data.student.cardCode
    ? buildCardScanPayload(data.student.cardCode)
    : `CAMPUS1:STUDENT:${data.student.number ?? 'unknown'}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=6&data=${encodeURIComponent(qrPayload)}`;
  const logo = data.school.logoUrl
    ? `<img class="rc-logo" src="${escapeHtml(data.school.logoUrl)}" alt=""/>`
    : `<div class="rc-logo rc-logo--fallback" aria-hidden>${schoolName.slice(0, 2)}</div>`;

  const subjectRows = data.subjectGrid
    .map(
      (row, i) => `
      <tr class="${i % 2 === 1 ? 'rc-tbl__alt' : ''}">
        <th scope="row" class="rc-tbl__subject">${escapeHtml(row.subject)}</th>
        ${subjectRowCells(row)}
      </tr>`,
    )
    .join('');

  const infoField = (am: string, en: string, value: string) => `
    <div class="rc-field">
      <div class="rc-field__label">
        <span class="rc-field__am">${am}</span>
        <span class="rc-field__en">${en}</span>
      </div>
      <div class="rc-field__value">${value}</div>
    </div>`;

  const contactLine = [
    data.school.phone ? escapeHtml(data.school.phone) : '',
    data.school.email ? escapeHtml(data.school.email) : '',
    data.school.address ? escapeHtml(data.school.address) : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  const rankLabel =
    data.summary.rank != null ? `${data.summary.rank} / ${data.summary.classSize}` : '—';

  const studentInitials = escapeHtml(
    data.student.name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?',
  );
  const documentRef = escapeHtml(
    data.student.cardCode ?? data.student.number ?? 'DRAFT',
  );
  const avgNumeric = data.summary.cumulative.average;
  const achievement = achievementLabel(avgNumeric);
  const subjectSnapshot = subjectSnapshotHtml(data.subjectGrid);

  const issuedDate = escapeHtml(
    new Date(data.generatedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Report Card — ${studentNameUpper}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Ethiopic:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --rc-paper: #fffdf8;
      --rc-ink: #1f2d2f;
      --rc-muted: #657576;
      --rc-border: #9eb9b2;
      --rc-accent: #244f7f;
      --rc-seal: #8c5f2b;
      --rc-green: #1d8f4f;
      --rc-gold: #f5bf31;
      --rc-red: #c8343d;
      --rc-excellent-bg: #e8f8ee;
      --rc-excellent-fg: #1c7a4a;
      --rc-good-bg: #e9f2ff;
      --rc-good-fg: #245ea9;
      --rc-fair-bg: #fff6df;
      --rc-fair-fg: #8a6516;
      --rc-low-bg: #ffe9e9;
      --rc-low-fg: #9d2b34;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Inter, "Segoe UI", system-ui, sans-serif;
      color: var(--rc-ink);
      background: #e5ece8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .rc-page {
      width: 297mm;
      height: 210mm;
      margin: 0 auto 12px;
      background: var(--rc-paper);
      overflow: hidden;
      page-break-after: always;
      page-break-inside: avoid;
      position: relative;
      box-shadow: 0 12px 28px rgba(22, 38, 34, 0.14);
    }

    .rc-page:last-child {
      margin-bottom: 0;
      page-break-after: auto;
    }

    .rc-tricolor {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 9px;
      display: grid;
      grid-template-rows: repeat(3, 3px);
      z-index: 5;
      pointer-events: none;
    }
    .rc-tricolor span:nth-child(1) { background: var(--rc-green); }
    .rc-tricolor span:nth-child(2) { background: var(--rc-gold); }
    .rc-tricolor span:nth-child(3) { background: var(--rc-red); }

    .rc-frame {
      position: absolute;
      inset: 6mm;
      border: 2px solid #6f8f86;
      z-index: 3;
      pointer-events: none;
    }
    .rc-frame::before {
      content: "";
      position: absolute;
      inset: 3px;
      border: 1px solid #c9d8d1;
    }
    .rc-corner {
      position: absolute;
      width: 11mm;
      height: 11mm;
      border-color: #6f8f86;
      border-style: solid;
      z-index: 4;
      pointer-events: none;
    }
    .rc-corner--tl { top: 7mm; left: 7mm; border-width: 2px 0 0 2px; }
    .rc-corner--tr { top: 7mm; right: 7mm; border-width: 2px 2px 0 0; }
    .rc-corner--bl { bottom: 7mm; left: 7mm; border-width: 0 0 2px 2px; }
    .rc-corner--br { bottom: 7mm; right: 7mm; border-width: 0 2px 2px 0; }

    .rc-watermark {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      opacity: 0.035;
      z-index: 0;
      pointer-events: none;
    }
    .rc-watermark .rc-logo,
    .rc-watermark img {
      width: 250px;
      height: 250px;
      border-radius: 50%;
    }

    .rc-logo {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #ffffff;
      box-shadow: 0 0 0 2px #7f9f95;
      flex-shrink: 0;
    }
    .rc-logo--fallback {
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #2f6d57, #235f74);
      color: #fff;
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    .rc-sheet {
      position: relative;
      z-index: 2;
      height: 100%;
      padding: 12mm 11mm 9mm;
      display: flex;
      flex-direction: column;
    }

    .rc-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.9rem;
      padding: 0.75rem 0.85rem;
      margin-bottom: 4mm;
      border-radius: 10px;
      border: 1px solid rgba(36, 79, 127, 0.14);
      background:
        radial-gradient(circle at 0% 0%, rgba(29, 143, 79, 0.12), transparent 42%),
        radial-gradient(circle at 100% 100%, rgba(36, 79, 127, 0.14), transparent 45%),
        linear-gradient(135deg, #ffffff, #f3f8f5);
      box-shadow: 0 8px 22px rgba(31, 45, 47, 0.06);
    }
    .rc-header__title {
      min-width: 0;
      text-align: center;
    }
    .rc-header h1 {
      margin: 0;
      font-size: 1.26rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #244f7f;
      line-height: 1.08;
    }
    .rc-header p {
      margin: 0.18rem 0 0;
      font-size: 0.62rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5a6f70;
      font-weight: 600;
    }
    .rc-badge {
      align-self: start;
      justify-self: end;
      padding: 0.28rem 0.68rem;
      border: 1px solid #b89663;
      background: linear-gradient(160deg, #f9ecd4, #f1debb);
      color: #7c5228;
      font-size: 0.5rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      border-radius: 999px;
      box-shadow: inset 0 1px 0 #fff8ea;
      white-space: nowrap;
    }

    .rc-front-main {
      flex: 1;
      display: grid;
      grid-template-columns: 1.35fr 0.9fr;
      gap: 5mm;
      min-height: 0;
    }

    .rc-block {
      border: 1px solid #bfd0ca;
      background: rgba(255, 255, 255, 0.55);
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .rc-block__head {
      margin: 0;
      padding: 0.45rem 0.65rem;
      font-size: 0.57rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #2c5a51;
      background: linear-gradient(90deg, rgba(36, 79, 127, 0.06), rgba(29, 143, 79, 0.08));
      border-bottom: 1px solid #d1dfda;
      font-weight: 700;
    }
    .rc-block__body {
      padding: 0.62rem 0.75rem;
      flex: 1;
      min-height: 0;
    }

    .rc-student-hero {
      display: grid;
      grid-template-columns: 85px 1fr;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.55rem;
    }
    .rc-avatar {
      width: 82px;
      height: 82px;
      border-radius: 50%;
      border: 2px solid #7d9a90;
      background: radial-gradient(circle at 30% 30%, #f6fbf7, #dfece5);
      display: grid;
      place-items: center;
      color: #2f6558;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .rc-student-name strong {
      display: block;
      font-size: 1.02rem;
      line-height: 1.15;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .rc-student-name span {
      display: block;
      margin-top: 0.22rem;
      color: var(--rc-muted);
      font-size: 0.58rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-weight: 600;
    }

    .rc-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.48rem 0.72rem;
    }
    .rc-field__label {
      display: flex;
      flex-direction: column;
      gap: 0.03rem;
      margin-bottom: 0.12rem;
    }
    .rc-field__am {
      font-family: "Noto Sans Ethiopic", Inter, sans-serif;
      font-size: 0.51rem;
      color: #728b8a;
      line-height: 1.2;
    }
    .rc-field__en {
      font-size: 0.51rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #5d7272;
      font-weight: 700;
    }
    .rc-field__value {
      padding: 0.1rem 0 0.2rem;
      border-bottom: 1px dashed #92aaa4;
      font-size: 0.75rem;
      font-weight: 700;
      color: #1f2f2f;
      min-height: 1.2em;
    }

    .rc-performance {
      display: flex;
      flex-direction: column;
      gap: 0.56rem;
      height: 100%;
    }
    .rc-ring-wrap {
      border: 1px solid #d1dfda;
      background: linear-gradient(160deg, #ffffff, #f7fbf9);
      display: grid;
      grid-template-columns: 116px 1fr;
      gap: 0.5rem;
      align-items: center;
      padding: 0.52rem;
    }
    .rc-ring-shell {
      width: 104px;
      height: 104px;
      position: relative;
      margin: 0 auto;
      display: grid;
      place-items: center;
    }
    .rc-ring {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .rc-ring__track {
      fill: none;
      stroke: #dbe7e1;
      stroke-width: 9;
    }
    .rc-ring__fill {
      fill: none;
      stroke: #2f7c5e;
      stroke-width: 9;
      stroke-linecap: round;
      transition: stroke-dashoffset .3s ease;
    }
    .rc-ring__label {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      text-align: center;
      line-height: 1.05;
    }
    .rc-ring__label strong {
      font-size: 1.2rem;
      color: #2e6657;
      font-weight: 800;
    }
    .rc-ring__label span {
      font-size: 0.46rem;
      color: #637f77;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .rc-ring__label em {
      margin-top: 0.07rem;
      font-size: 0.67rem;
      font-style: normal;
      color: #356486;
      font-weight: 800;
      letter-spacing: 0.06em;
    }
    .rc-ring-meta h4 {
      margin: 0;
      font-size: 0.57rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #4f6967;
    }
    .rc-ring-meta p {
      margin: 0.35rem 0 0;
      font-size: 0.53rem;
      line-height: 1.5;
      color: #607776;
    }

    .rc-stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #d1dfda;
      background: #fff;
    }
    .rc-stat-card {
      padding: 0.45rem 0.5rem;
      border-right: 1px solid #d9e5e0;
      border-bottom: 1px solid #d9e5e0;
      text-align: center;
    }
    .rc-stat-card:nth-child(2n) { border-right: 0; }
    .rc-stat-card:nth-last-child(-n + 2) { border-bottom: 0; }
    .rc-stat-card em {
      display: block;
      font-size: 0.47rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #607675;
      font-style: normal;
      font-weight: 700;
    }
    .rc-stat-card i {
      display: block;
      margin-top: 0.05rem;
      font-family: "Noto Sans Ethiopic", Inter, sans-serif;
      font-size: 0.45rem;
      color: #809190;
      font-style: normal;
    }
    .rc-stat-card strong {
      display: block;
      margin-top: 0.16rem;
      font-size: 0.85rem;
      color: #244f7f;
      font-weight: 800;
    }

    .rc-security {
      border: 1px dashed #b89c73;
      background: linear-gradient(160deg, #fffaf0, #fff6e8);
      padding: 0.48rem 0.56rem;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.52rem;
      align-items: center;
    }
    .rc-security__qr {
      position: relative;
      border: 2px solid #d1b487;
      border-radius: 50%;
      width: 83px;
      height: 83px;
      padding: 7px;
      background: #fff;
      display: grid;
      place-items: center;
    }
    .rc-security__qr::before {
      content: "Verified";
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff8eb;
      border: 1px solid #d2b58a;
      border-radius: 999px;
      padding: 0.03rem 0.35rem;
      font-size: 0.41rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8f6132;
      font-weight: 700;
    }
    .rc-security__qr img {
      width: 60px;
      height: 60px;
    }
    .rc-security__meta strong {
      display: block;
      font-size: 0.52rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7f5a2e;
      font-weight: 800;
    }
    .rc-security__meta p {
      margin: 0.18rem 0 0;
      font-size: 0.5rem;
      line-height: 1.45;
      color: #6f6a5f;
    }

    .rc-promo {
      margin-top: 3.5mm;
      padding: 0.55rem 0.8rem;
      border-radius: 8px;
      border: 1px solid #c8d9d2;
      background: linear-gradient(90deg, rgba(29, 143, 79, 0.1), rgba(36, 79, 127, 0.08));
      text-align: center;
      font-size: 0.72rem;
      font-weight: 800;
      color: #24507f;
      letter-spacing: 0.03em;
    }

    .rc-ribbon {
      margin-top: 3.5mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 999px;
      background: linear-gradient(90deg, #1d4f91, #1d8f4f);
      color: #fff;
      font-size: 0.56rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      box-shadow: 0 6px 16px rgba(29, 79, 145, 0.22);
    }
    .rc-ribbon span {
      opacity: 0.9;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .rc-snapshot {
      margin-top: 3.5mm;
      padding: 0.55rem 0.65rem;
      border: 1px solid #c5d8d0;
      border-radius: 10px;
      background: linear-gradient(180deg, #ffffff, #f7fbf8);
    }
    .rc-snapshot__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.45rem;
      font-size: 0.52rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 800;
      color: #4d6663;
    }
    .rc-snapshot__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .rc-snap {
      padding: 0.38rem 0.45rem;
      border-radius: 8px;
      border: 1px solid #d5e4dc;
      background: #fff;
    }
    .rc-snap__top {
      display: flex;
      justify-content: space-between;
      gap: 0.35rem;
      font-size: 0.52rem;
      margin-bottom: 0.28rem;
    }
    .rc-snap__top strong {
      font-weight: 800;
      color: #1f2f2f;
    }
    .rc-snap__top span {
      font-weight: 700;
      color: #4f6967;
      white-space: nowrap;
    }
    .rc-snap__bar {
      height: 6px;
      border-radius: 999px;
      background: #e4ece8;
      overflow: hidden;
    }
    .rc-snap__bar i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    }
    .rc-snap.rc-score--excellent .rc-snap__bar i {
      background: linear-gradient(90deg, #22c55e, #15803d);
    }
    .rc-snap.rc-score--good .rc-snap__bar i {
      background: linear-gradient(90deg, #60a5fa, #2563eb);
    }
    .rc-snap.rc-score--fair .rc-snap__bar i {
      background: linear-gradient(90deg, #fbbf24, #d97706);
    }
    .rc-snap.rc-score--low .rc-snap__bar i {
      background: linear-gradient(90deg, #f87171, #dc2626);
    }

    .rc-signatures {
      margin-top: 3.5mm;
      padding-top: 2.5mm;
      border-top: 1px solid #cddbd5;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6mm;
    }
    .rc-sign {
      text-align: center;
      color: #546a69;
    }
    .rc-sign__line {
      height: 17px;
      border-bottom: 1px solid #9fb4ae;
      margin-bottom: 0.26rem;
    }
    .rc-sign strong {
      display: block;
      font-size: 0.53rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
      color: #476060;
    }
    .rc-sign span {
      display: block;
      margin-top: 0.08rem;
      font-family: "Noto Sans Ethiopic", Inter, sans-serif;
      font-size: 0.47rem;
      color: #748c89;
    }

    .rc-footer-meta {
      margin-top: 2.6mm;
      border-top: 1px solid #d3dfda;
      padding-top: 2mm;
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 0.7rem;
      align-items: start;
      font-size: 0.47rem;
      color: #6b7f7f;
      line-height: 1.4;
    }
    .rc-footer-meta strong {
      color: #3d5758;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.46rem;
      font-weight: 700;
    }
    .rc-footer-meta__right {
      text-align: right;
    }

    .rc-back {
      display: grid;
      grid-template-columns: 1fr 11mm;
      height: 100%;
      position: relative;
      z-index: 2;
    }
    .rc-back__body {
      padding: 12mm 8mm 8mm 11mm;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .rc-back-head {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 0.85rem;
      margin-bottom: 3mm;
      padding-bottom: 2.6mm;
      border-bottom: 1px solid #c9dad3;
    }
    .rc-back-head h2 {
      margin: 0;
      font-size: 0.8rem;
      color: #244f7f;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-weight: 800;
    }
    .rc-back-head p {
      margin: 0.18rem 0 0;
      font-size: 0.56rem;
      color: #5f7777;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 600;
    }
    .rc-back-head span {
      font-size: 0.52rem;
      color: #66817d;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
      letter-spacing: 0.04em;
    }

    .rc-table-wrap {
      border: 1px solid #b4cac3;
      background: #fff;
      overflow: hidden;
    }
    .rc-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.51rem;
    }
    .rc-tbl thead th {
      padding: 0.36rem 0.2rem;
      background: #244f7f;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 0.45rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.2;
      font-weight: 700;
    }
    .rc-tbl thead th.rc-sem {
      background: #1f6e5f;
    }
    .rc-tbl td,
    .rc-tbl tbody th {
      border: 1px solid #d4e3de;
      padding: 0.22rem 0.16rem;
      text-align: center;
      vertical-align: middle;
      background: #fff;
    }
    .rc-tbl__alt td,
    .rc-tbl__alt th {
      background: #f9fcfb;
    }
    .rc-tbl__subject {
      text-align: left !important;
      padding-left: 0.42rem !important;
      min-width: 72px;
      font-weight: 700;
      color: #2d4647;
      background: #fcfefc !important;
      white-space: nowrap;
    }
    .rc-cell {
      display: inline-flex;
      align-items: baseline;
      justify-content: center;
      gap: 0.17rem;
      min-width: 34px;
      padding: 0.1rem 0.24rem;
      border-radius: 999px;
      font-size: 0.49rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .rc-cell em {
      font-style: normal;
      font-size: 0.42rem;
      opacity: 0.86;
      letter-spacing: 0.02em;
      font-weight: 700;
    }
    .rc-cell--empty {
      color: #8ba29b;
      background: #f3f7f5;
      border: 1px dashed #c7d8d1;
      min-width: 30px;
      padding: 0.06rem 0.22rem;
    }
    .rc-score--excellent {
      background: var(--rc-excellent-bg);
      color: var(--rc-excellent-fg);
    }
    .rc-score--good {
      background: var(--rc-good-bg);
      color: var(--rc-good-fg);
    }
    .rc-score--fair {
      background: var(--rc-fair-bg);
      color: var(--rc-fair-fg);
    }
    .rc-score--low {
      background: var(--rc-low-bg);
      color: var(--rc-low-fg);
    }
    .rc-tbl__summary th {
      text-align: left !important;
      padding-left: 0.42rem !important;
      font-size: 0.47rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #2d5c53;
      background: #f2f7f4 !important;
      font-weight: 800;
    }
    .rc-tbl__summary td {
      background: #f7fbf9;
    }
    .rc-tbl__summary--average th {
      background: #eef4fb !important;
      color: #2d5278;
    }
    .rc-tbl__summary--average td {
      background: #f5f9ff;
    }

    .rc-remarks {
      margin-top: 3mm;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 2.8mm;
    }
    .rc-remark {
      border: 1px solid #c8d9d3;
      background:
        repeating-linear-gradient(
          to bottom,
          #ffffff 0,
          #ffffff 11px,
          #edf5f1 11px,
          #edf5f1 12px
        );
      min-height: 70px;
    }
    .rc-remark__head {
      padding: 0.27rem 0.44rem;
      background: #f0f6f3;
      border-bottom: 1px solid #d4e3de;
      color: #2f5f56;
      font-size: 0.46rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 800;
    }
    .rc-remark__body p {
      margin: 0;
      padding: 0.32rem 0.44rem;
      font-size: 0.5rem;
      line-height: 1.45;
      color: #2f4545;
    }
    .rc-remark__empty {
      color: #7d9090;
      font-style: italic;
    }

    .rc-rail {
      background: linear-gradient(180deg, #224b79, #1f6e5f);
      border-left: 3px solid #f1b82d;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      text-transform: uppercase;
      font-size: 0.51rem;
      letter-spacing: 0.1em;
      text-align: center;
      line-height: 1.5;
      font-weight: 700;
      padding: 0.45rem 0;
    }

    @page {
      size: A4 landscape;
      margin: 0;
    }
    @media print {
      body { background: #fff; }
      .rc-page {
        margin: 0;
        width: 297mm;
        height: 210mm;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <section class="rc-page">
    <div class="rc-tricolor"><span></span><span></span><span></span></div>
    <div class="rc-frame"></div>
    <span class="rc-corner rc-corner--tl"></span>
    <span class="rc-corner rc-corner--tr"></span>
    <span class="rc-corner rc-corner--bl"></span>
    <span class="rc-corner rc-corner--br"></span>
    <div class="rc-watermark">${logo}</div>

    <div class="rc-sheet">
      <header class="rc-header">
        ${logo}
        <div class="rc-header__title">
          <h1>${schoolName}</h1>
          <p>Student report card · ${escapeHtml(data.student.academicYear)} · ${escapeHtml(data.student.academicYearEc)} E.C.</p>
        </div>
        <div class="rc-badge">Official academic record</div>
      </header>

      <div class="rc-front-main">
        <section class="rc-block">
          <h3 class="rc-block__head">Student identification / የተማሪ መረጃ</h3>
          <div class="rc-block__body">
            <div class="rc-student-hero">
              <div class="rc-avatar" aria-hidden="true">${studentInitials}</div>
              <div class="rc-student-name">
                <strong>${studentNameUpper}</strong>
                <span>Academic profile and enrollment details</span>
              </div>
            </div>

            <div class="rc-fields">
              ${infoField('ቁጥር', 'Student number', data.student.number ? escapeHtml(data.student.number) : '—')}
              ${infoField('መለያ ኮድ', 'Document ID', documentRef)}
              ${infoField('ጾታ', 'Sex', data.student.sex ? escapeHtml(data.student.sex) : '—')}
              ${infoField('ዕድሜ', 'Age', data.student.age != null ? String(data.student.age) : '—')}
              ${infoField('ክፍል', 'Grade / section', escapeHtml(data.student.gradeLabel))}
              ${infoField('የትምህርት ዓመት', 'Academic year', `${escapeHtml(data.student.academicYearEc)} E.C.`)}
            </div>
          </div>
        </section>

        <section class="rc-performance">
          <article class="rc-block">
            <h3 class="rc-block__head">Performance overview / የውጤት አጠቃላይ ግምገማ</h3>
            <div class="rc-block__body">
              <div class="rc-ring-wrap">
                <div class="rc-ring-shell">${scoreRingSvg(avgNumeric)}</div>
                <div class="rc-ring-meta">
                  <h4>Cumulative average</h4>
                  <p>Graphical score index computed from all recorded terms and semester evaluations.</p>
                </div>
              </div>

              <div class="rc-stat-grid">
                <div class="rc-stat-card">
                  <em>Class rank</em>
                  <i>ደረጃ</i>
                  <strong>${rankLabel}</strong>
                </div>
                <div class="rc-stat-card">
                  <em>Conduct</em>
                  <i>ስነ-ምግባር</i>
                  <strong>${data.summary.conduct ? escapeHtml(data.summary.conduct) : '—'}</strong>
                </div>
                <div class="rc-stat-card">
                  <em>Absent days</em>
                  <i>የቀሩበት ቀን</i>
                  <strong>${data.summary.absentDays != null ? String(data.summary.absentDays) : '—'}</strong>
                </div>
                <div class="rc-stat-card">
                  <em>Issued on</em>
                  <i>የተሰጠበት ቀን</i>
                  <strong>${issuedDate}</strong>
                </div>
              </div>
            </div>
          </article>

          <article class="rc-security">
            <div class="rc-security__qr">
              <img src="${qrUrl}" alt="Verification QR code"/>
            </div>
            <div class="rc-security__meta">
              <strong>Security Verification Seal</strong>
              <p>Scan this encrypted school QR stamp to authenticate this document in the digital registry.</p>
            </div>
          </article>
        </section>
      </div>

      <div class="rc-ribbon">
        <strong>${escapeHtml(achievement)}</strong>
        <span>${escapeHtml(data.student.academicYear)} · ${escapeHtml(data.student.academicYearEc)} E.C.</span>
      </div>

      ${subjectSnapshot ? `
      <section class="rc-snapshot">
        <div class="rc-snapshot__head">
          <strong>Subject performance snapshot</strong>
          <span>Term averages</span>
        </div>
        <div class="rc-snapshot__grid">${subjectSnapshot}</div>
      </section>` : ''}

      ${data.promotionText ? `<div class="rc-promo">${escapeHtml(data.promotionText)}</div>` : ''}

      <div class="rc-signatures">
        <div class="rc-sign">
          <div class="rc-sign__line"></div>
          <strong>Director signature</strong>
          <span>የዳይሬክተር ፊርማ</span>
        </div>
        <div class="rc-sign">
          <div class="rc-sign__line"></div>
          <strong>Homeroom teacher</strong>
          <span>የክፍል አስተማሪ ፊርማ</span>
        </div>
        <div class="rc-sign">
          <div class="rc-sign__line"></div>
          <strong>Parent / guardian</strong>
          <span>የወላጅ / አሳዳጊ ፊርማ</span>
        </div>
      </div>

      <div class="rc-footer-meta">
        <div>
          <strong>Grading legend</strong><br/>
          90-100 Excellent (A) · 80-89 Very Good (B) · 70-79 Good (C) · 60-69 Satisfactory (D) · 50-59 Needs support (E) · Below 50 Failing (F)
        </div>
        <div class="rc-footer-meta__right">
          <strong>Document reference</strong><br/>
          ${documentRef}<br/>
          ${contactLine ? `<strong>School contact</strong><br/>${contactLine}` : ''}
        </div>
      </div>
    </div>
  </section>

  <section class="rc-page">
    <div class="rc-tricolor"><span></span><span></span><span></span></div>
    <div class="rc-frame"></div>
    <span class="rc-corner rc-corner--tl"></span>
    <span class="rc-corner rc-corner--tr"></span>
    <span class="rc-corner rc-corner--bl"></span>
    <span class="rc-corner rc-corner--br"></span>
    <div class="rc-watermark">${logo}</div>

    <div class="rc-back">
      <div class="rc-back__body">
        <div class="rc-back-head">
          <div>
            <h2>Detailed Academic Results</h2>
            <p>${studentName} · ${escapeHtml(data.student.gradeLabel)}</p>
          </div>
          <span>${escapeHtml(data.student.academicYearEc)} E.C. / ${escapeHtml(data.student.academicYear)}</span>
        </div>

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
              <tr class="rc-tbl__summary">
                <th scope="row">Total</th>
                ${summaryTotalCells(data.summary.term1)}
                ${summaryTotalCells(data.summary.term2)}
                ${summaryTotalCells(data.summary.semester1)}
                ${summaryTotalCells(data.summary.term3)}
                ${summaryTotalCells(data.summary.term4)}
                ${summaryTotalCells(data.summary.semester2)}
                ${summaryTotalCells(data.summary.cumulative)}
              </tr>
              <tr class="rc-tbl__summary rc-tbl__summary--average">
                <th scope="row">Average</th>
                <td>${fmtScoreCell(data.summary.term1.average)}</td>
                <td>${fmtScoreCell(data.summary.term2.average)}</td>
                <td>${fmtScoreCell(data.summary.semester1.average, true)}</td>
                <td>${fmtScoreCell(data.summary.term3.average)}</td>
                <td>${fmtScoreCell(data.summary.term4.average)}</td>
                <td>${fmtScoreCell(data.summary.semester2.average, true)}</td>
                <td>${fmtScoreCell(data.summary.cumulative.average, true)}</td>
              </tr>
              <tr class="rc-tbl__summary">
                <th scope="row">Absent days</th>
                <td colspan="6"></td>
                <td>${data.summary.absentDays != null ? String(data.summary.absentDays) : '—'}</td>
              </tr>
              <tr class="rc-tbl__summary">
                <th scope="row">Conduct</th>
                <td colspan="6"></td>
                <td>${data.summary.conduct ? escapeHtml(data.summary.conduct) : '—'}</td>
              </tr>
              <tr class="rc-tbl__summary">
                <th scope="row">Rank</th>
                <td colspan="6"></td>
                <td>${rankLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="rc-remarks">
          ${remarkCard('1st semester remark', data.remarks.semester1)}
          ${remarkCard('2nd semester remark', data.remarks.semester2)}
          ${remarkCard('Cumulative remark', data.remarks.cumulative)}
        </div>
      </div>

      <aside class="rc-rail">
        Verified school result · ${escapeHtml(data.student.academicYearEc)} E.C. · Ref ${documentRef}
      </aside>
    </div>
  </section>
</body>
</html>`;
}
