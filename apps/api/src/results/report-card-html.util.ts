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
    /** Per-school document title (defaults in renderer). */
    headerTitle: string | null;
    /** Per-school motto / tagline under the school name. */
    headerTagline: string | null;
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
    photoUrl: string | null;
  };
  termName: string;
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
  if (value == null || Number.isNaN(value)) return 'â€”';
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
  if (value == null || Number.isNaN(value)) return '<span class="rc-cell rc-cell--empty">â€”</span>';
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
  const display = percent != null ? fmtScore(percent) : 'â€”';
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
  const headerTitle = escapeHtml(
    data.school.headerTitle?.trim() || 'Student Report Card',
  );
  const headerTagline = data.school.headerTagline?.trim()
    ? escapeHtml(data.school.headerTagline.trim())
    : null;
  const qrPayload = data.student.cardCode
    ? buildCardScanPayload(data.student.cardCode)
    : `CAMPUS1:STUDENT:${data.student.number ?? 'unknown'}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(qrPayload)}`;
  const logo = data.school.logoUrl
    ? `<img class="rc-logo" src="${escapeHtml(data.school.logoUrl)}" alt=""/>`
    : `<div class="rc-logo rc-logo--fallback" aria-hidden="true">${schoolName.slice(0, 2).toUpperCase()}</div>`;
  const avatar = data.student.photoUrl
    ? `<img class="rc-avatar rc-avatar--photo" src="${escapeHtml(data.student.photoUrl)}" alt=""/>`
    : `<div class="rc-avatar" aria-hidden="true">${escapeHtml(
        data.student.name
          .trim()
          .split(/\s+/)
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase() || '?',
      )}</div>`;

  const subjectRows = data.subjectGrid
    .map(
      (row, i) => `
      <tr class="${i % 2 === 1 ? 'is-alt' : ''}">
        <th scope="row">${escapeHtml(row.subject)}</th>
        ${subjectRowCells(row)}
      </tr>`,
    )
    .join('');

  const contactBits = [
    data.school.address ? escapeHtml(data.school.address) : '',
    data.school.phone ? escapeHtml(data.school.phone) : '',
    data.school.email ? escapeHtml(data.school.email) : '',
  ].filter(Boolean);
  const contactLine = contactBits.join(' · ');
  const rankLabel =
    data.summary.rank != null ? `${data.summary.rank} / ${data.summary.classSize}` : '—';
  const documentRef = escapeHtml(
    data.student.cardCode ?? data.student.number ?? 'DRAFT',
  );
  const avgNumeric = data.summary.cumulative.average;
  const achievement = achievementLabel(avgNumeric);
  const issuedDate = escapeHtml(
    new Date(data.generatedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  );
  const yearLabel = `${escapeHtml(data.student.academicYear)} · ${escapeHtml(data.student.academicYearEc)} E.C.`;
  const snap = subjectSnapshotHtml(data.subjectGrid);

  const schoolHeader = `
    <header class="rc-brand">
      ${logo}
      <div class="rc-brand__text">
        <p class="rc-brand__doc">${headerTitle}</p>
        <h1>${schoolName}</h1>
        ${headerTagline ? `<p class="rc-brand__tag">${headerTagline}</p>` : ''}
        <p class="rc-brand__meta">${yearLabel}${contactLine ? ` · ${contactLine}` : ''}</p>
      </div>
      <div class="rc-brand__side">
        <span class="rc-brand__badge">Official</span>
        <span class="rc-brand__page">Page <strong>1</strong> · Front</span>
      </div>
    </header>`;

  const schoolHeaderBack = `
    <header class="rc-brand rc-brand--compact">
      ${logo}
      <div class="rc-brand__text">
        <p class="rc-brand__doc">${headerTitle}</p>
        <h1>${schoolName}</h1>
        <p class="rc-brand__meta">${studentName} · ${escapeHtml(data.student.gradeLabel)} · ${yearLabel}</p>
      </div>
      <div class="rc-brand__side">
        <span class="rc-brand__page">Page <strong>2</strong> · Back</span>
      </div>
    </header>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${headerTitle} — ${studentNameUpper}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Noto+Sans+Ethiopic:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --ink: #122427;
      --muted: #5b7274;
      --line: #d5e3df;
      --paper: #ffffff;
      --soft: #f3faf7;
      --teal: #0f766e;
      --teal-dark: #115e59;
      --navy: #1e3a5f;
      --excellent-bg: #e7f8ef; --excellent-fg: #166534;
      --good-bg: #e8f1ff; --good-fg: #1d4ed8;
      --fair-bg: #fff7e6; --fair-fg: #b45309;
      --low-bg: #feecec; --low-fg: #b91c1c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "DM Sans", "Segoe UI", system-ui, sans-serif;
      color: var(--ink);
      background: #e8eef0;
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
      box-shadow: 0 10px 28px rgba(18, 36, 39, 0.12);
    }
    .rc-page:last-child { page-break-after: auto; margin-bottom: 0; }
    .rc-page__bar {
      position: absolute; inset: 0 0 auto 0; height: 5mm;
      background: linear-gradient(90deg, var(--teal-dark), var(--teal) 55%, #0d9488);
    }
    .rc-sheet {
      height: 100%;
      padding: 9mm 10mm 7mm;
      display: flex;
      flex-direction: column;
      gap: 3.2mm;
    }
    .rc-brand {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 3.5mm;
      align-items: center;
      padding: 2.8mm 3.2mm;
      border: 1px solid var(--line);
      border-radius: 3mm;
      background:
        radial-gradient(circle at 0% 0%, rgba(15,118,110,.08), transparent 45%),
        linear-gradient(180deg, #fff, var(--soft));
    }
    .rc-brand--compact { padding: 2.2mm 3mm; }
    .rc-logo {
      width: 16mm; height: 16mm; border-radius: 50%;
      object-fit: cover; border: 2px solid #fff;
      box-shadow: 0 0 0 1.5px rgba(15,118,110,.35);
      flex-shrink: 0;
    }
    .rc-brand--compact .rc-logo { width: 12mm; height: 12mm; }
    .rc-logo--fallback {
      display: grid; place-items: center;
      background: linear-gradient(145deg, var(--teal-dark), var(--navy));
      color: #fff; font-weight: 800; font-size: 5mm; letter-spacing: .04em;
    }
    .rc-brand__doc {
      margin: 0; font-size: 2.1mm; font-weight: 800;
      letter-spacing: .14em; text-transform: uppercase; color: var(--teal);
    }
    .rc-brand h1 {
      margin: 0.6mm 0 0; font-size: 5.2mm; font-weight: 800;
      letter-spacing: .02em; line-height: 1.1; color: var(--navy);
      text-transform: uppercase;
    }
    .rc-brand--compact h1 { font-size: 4.2mm; }
    .rc-brand__tag {
      margin: 0.8mm 0 0; font-size: 2.5mm; font-weight: 600;
      color: var(--muted); font-style: italic;
    }
    .rc-brand__meta {
      margin: 1mm 0 0; font-size: 2.2mm; color: var(--muted); font-weight: 600;
    }
    .rc-brand__side { text-align: right; display: grid; gap: 1.4mm; justify-items: end; }
    .rc-brand__badge {
      padding: 0.8mm 2.2mm; border-radius: 999px;
      background: var(--teal); color: #fff;
      font-size: 2mm; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
    }
    .rc-brand__page {
      font-size: 2.1mm; color: var(--muted); font-weight: 700; text-transform: uppercase;
    }
    .rc-brand__page strong { color: var(--teal-dark); }

    .rc-front {
      flex: 1; min-height: 0;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 3.2mm;
    }
    .rc-card {
      border: 1px solid var(--line);
      border-radius: 2.6mm;
      background: #fff;
      display: flex; flex-direction: column; min-height: 0; overflow: hidden;
    }
    .rc-card__h {
      margin: 0; padding: 1.8mm 2.6mm;
      font-size: 2.2mm; font-weight: 800; letter-spacing: .1em;
      text-transform: uppercase; color: var(--teal-dark);
      background: var(--soft); border-bottom: 1px solid var(--line);
    }
    .rc-card__b { padding: 2.6mm; flex: 1; min-height: 0; }

    .rc-id {
      display: grid; grid-template-columns: 18mm 1fr; gap: 2.8mm; align-items: center;
      margin-bottom: 2.4mm;
    }
    .rc-avatar {
      width: 18mm; height: 18mm; border-radius: 50%;
      display: grid; place-items: center;
      background: linear-gradient(145deg, #ccfbf1, #99f6e4);
      color: var(--teal-dark); font-weight: 800; font-size: 5mm;
      border: 1.5px solid rgba(15,118,110,.25);
    }
    .rc-avatar--photo { object-fit: cover; padding: 0; }
    .rc-id strong {
      display: block; font-size: 4mm; letter-spacing: .03em;
      text-transform: uppercase; line-height: 1.15;
    }
    .rc-id span { display: block; margin-top: 0.8mm; font-size: 2.3mm; color: var(--muted); font-weight: 600; }

    .rc-fields {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm;
    }
    .rc-field {
      border: 1px solid var(--line); border-radius: 1.8mm;
      padding: 1.4mm 1.8mm; background: #fbfdfe;
    }
    .rc-field em {
      display: block; font-style: normal; font-size: 1.9mm;
      color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
    }
    .rc-field strong {
      display: block; margin-top: 0.6mm; font-size: 2.7mm; font-weight: 700;
    }

    .rc-perf { display: grid; gap: 2.4mm; }
    .rc-ring-row {
      display: grid; grid-template-columns: 28mm 1fr; gap: 2.4mm; align-items: center;
    }
    .rc-ring-shell { position: relative; width: 28mm; height: 28mm; }
    .rc-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
    .rc-ring__track { fill: none; stroke: #e2e8f0; stroke-width: 8; }
    .rc-ring__fill { fill: none; stroke-width: 8; stroke-linecap: round; }
    .rc-ring__label {
      position: absolute; inset: 0; display: grid; place-items: center; text-align: center;
    }
    .rc-ring__label strong { font-size: 5mm; font-weight: 800; line-height: 1; }
    .rc-ring__label span { font-size: 2mm; color: var(--muted); font-weight: 700; }
    .rc-ring__label em { font-style: normal; font-size: 2.4mm; font-weight: 800; color: var(--teal); }
    .rc-ring-meta h4 { margin: 0; font-size: 2.8mm; color: var(--navy); }
    .rc-ring-meta p { margin: 1mm 0 0; font-size: 2.2mm; color: var(--muted); line-height: 1.35; }

    .rc-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm;
    }
    .rc-stat {
      border: 1px solid var(--line); border-radius: 1.8mm;
      padding: 1.6mm 1.8mm; background: var(--soft);
    }
    .rc-stat em {
      display: block; font-style: normal; font-size: 1.9mm;
      text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 700;
    }
    .rc-stat strong { display: block; margin-top: 0.6mm; font-size: 3.2mm; font-weight: 800; }

    .rc-verify {
      display: grid; grid-template-columns: 22mm 1fr; gap: 2.2mm; align-items: center;
      padding: 2mm; border: 1px dashed rgba(15,118,110,.35); border-radius: 2mm; background: #f0fdfa;
    }
    .rc-verify img { width: 22mm; height: 22mm; border-radius: 1.5mm; background: #fff; }
    .rc-verify strong { display: block; font-size: 2.3mm; color: var(--teal-dark); text-transform: uppercase; letter-spacing: .06em; }
    .rc-verify p { margin: 0.8mm 0 0; font-size: 2.1mm; color: var(--muted); line-height: 1.35; }

    .rc-ribbon {
      display: flex; justify-content: space-between; align-items: center; gap: 3mm;
      padding: 1.8mm 3mm; border-radius: 2mm;
      background: linear-gradient(90deg, var(--navy), var(--teal-dark));
      color: #fff;
    }
    .rc-ribbon strong { font-size: 2.5mm; letter-spacing: .04em; }
    .rc-ribbon span { font-size: 2.1mm; opacity: .9; font-weight: 600; }

    .rc-snap-grid {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5mm;
    }
    .rc-snap {
      border: 1px solid var(--line); border-radius: 1.6mm; padding: 1.4mm 1.6mm; background: #fff;
    }
    .rc-snap__top {
      display: flex; justify-content: space-between; gap: 1mm; font-size: 2mm; font-weight: 700;
    }
    .rc-snap__top strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rc-snap__bar {
      margin-top: 1mm; height: 1.4mm; border-radius: 999px; background: #e2e8f0; overflow: hidden;
    }
    .rc-snap__bar i { display: block; height: 100%; background: linear-gradient(90deg, #14b8a6, var(--teal-dark)); }
    .rc-score--excellent .rc-snap__bar i { background: linear-gradient(90deg, #22c55e, #15803d); }
    .rc-score--good .rc-snap__bar i { background: linear-gradient(90deg, #60a5fa, #2563eb); }
    .rc-score--fair .rc-snap__bar i { background: linear-gradient(90deg, #fbbf24, #d97706); }
    .rc-score--low .rc-snap__bar i { background: linear-gradient(90deg, #f87171, #dc2626); }

    .rc-promo {
      padding: 1.6mm 2.4mm; border-radius: 1.8mm;
      background: #ecfdf5; border: 1px solid #a7f3d0;
      color: #065f46; font-size: 2.3mm; font-weight: 700;
    }

    .rc-signs {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm;
      padding-top: 1.5mm; border-top: 1px solid var(--line);
    }
    .rc-sign { text-align: center; }
    .rc-sign__line { height: 5mm; border-bottom: 1px solid #94a3b8; margin-bottom: 1mm; }
    .rc-sign strong {
      display: block; font-size: 2mm; text-transform: uppercase; letter-spacing: .05em; color: var(--muted);
    }
    .rc-sign span {
      display: block; margin-top: 0.4mm;
      font-family: "Noto Sans Ethiopic", "DM Sans", sans-serif;
      font-size: 1.9mm; color: #7c9193;
    }

    .rc-foot {
      display: grid; grid-template-columns: 1.4fr 1fr; gap: 3mm;
      font-size: 1.95mm; color: var(--muted); line-height: 1.4;
      border-top: 1px solid var(--line); padding-top: 1.5mm;
    }
    .rc-foot strong {
      color: var(--ink); text-transform: uppercase; letter-spacing: .05em; font-size: 1.9mm;
    }
    .rc-foot__right { text-align: right; }

    .rc-table-wrap {
      flex: 1; min-height: 0; overflow: hidden;
      border: 1px solid var(--line); border-radius: 2mm;
    }
    table.rc-tbl {
      width: 100%; border-collapse: collapse; font-size: 2.15mm;
    }
    .rc-tbl thead th {
      padding: 1.5mm 1mm; background: var(--navy); color: #fff;
      border: 1px solid rgba(255,255,255,.12);
      font-size: 1.9mm; text-transform: uppercase; letter-spacing: .04em; font-weight: 700;
    }
    .rc-tbl thead th.rc-sem { background: var(--teal-dark); }
    .rc-tbl td, .rc-tbl tbody th {
      border: 1px solid var(--line); padding: 1mm 0.8mm; text-align: center; background: #fff;
    }
    .rc-tbl tr.is-alt td, .rc-tbl tr.is-alt th { background: #f8fbfa; }
    .rc-tbl tbody th {
      text-align: left; padding-left: 2mm; font-weight: 700; white-space: nowrap; color: #243b3d;
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
      text-align: left !important; padding-left: 2mm !important;
      background: #eef7f4 !important; color: var(--teal-dark);
      text-transform: uppercase; font-size: 1.95mm; letter-spacing: .04em;
    }
    .rc-tbl__sum td { background: #f4faf8; }
    .rc-tbl__sum--avg th { background: #eef2ff !important; color: var(--navy); }
    .rc-tbl__sum--avg td { background: #f5f7ff; }

    .rc-remarks {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.2mm;
    }
    .rc-remark {
      border: 1px solid var(--line); border-radius: 2mm; min-height: 22mm; overflow: hidden;
      background: repeating-linear-gradient(#fff 0 4.2mm, #f3faf7 4.2mm 4.4mm);
    }
    .rc-remark__head {
      padding: 1.2mm 2mm; background: var(--soft); border-bottom: 1px solid var(--line);
      font-size: 1.95mm; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--teal-dark);
    }
    .rc-remark__body p {
      margin: 0; padding: 1.4mm 2mm; font-size: 2.15mm; line-height: 1.4; color: #2f4545;
    }
    .rc-remark__empty { color: #94a3b8; font-style: italic; }

    @page { size: A4 landscape; margin: 0; }
    @media print {
      body { background: #fff; }
      .rc-page { margin: 0; box-shadow: none; width: 297mm; height: 210mm; }
    }
  </style>
</head>
<body>
  <!-- FRONT -->
  <section class="rc-page">
    <div class="rc-page__bar" aria-hidden="true"></div>
    <div class="rc-sheet">
      ${schoolHeader}

      <div class="rc-front">
        <section class="rc-card">
          <h2 class="rc-card__h">Student identification · የተማሪ መረጃ</h2>
          <div class="rc-card__b">
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
              <div class="rc-field"><em>Academic year</em><strong>${escapeHtml(data.student.academicYearEc)} E.C.</strong></div>
            </div>
          </div>
        </section>

        <div class="rc-perf">
          <section class="rc-card">
            <h2 class="rc-card__h">Performance overview · አጠቃላይ ውጤት</h2>
            <div class="rc-card__b">
              <div class="rc-ring-row">
                <div class="rc-ring-shell">${scoreRingSvg(avgNumeric)}</div>
                <div class="rc-ring-meta">
                  <h4>Cumulative average</h4>
                  <p>Year average across recorded terms. Letter grades follow this school’s scale.</p>
                </div>
              </div>
              <div class="rc-stats" style="margin-top:2.2mm">
                <div class="rc-stat"><em>Class rank</em><strong>${rankLabel}</strong></div>
                <div class="rc-stat"><em>Conduct</em><strong>${data.summary.conduct ? escapeHtml(data.summary.conduct) : '—'}</strong></div>
                <div class="rc-stat"><em>Absent days</em><strong>${data.summary.absentDays != null ? String(data.summary.absentDays) : '—'}</strong></div>
                <div class="rc-stat"><em>Issued</em><strong>${issuedDate}</strong></div>
              </div>
            </div>
          </section>
          <section class="rc-verify">
            <img src="${qrUrl}" alt="Verification QR"/>
            <div>
              <strong>Verification seal</strong>
              <p>Scan to authenticate this report in the school registry. Ref ${documentRef}</p>
            </div>
          </section>
        </div>
      </div>

      <div class="rc-ribbon">
        <strong>${escapeHtml(achievement)}</strong>
        <span>${yearLabel}</span>
      </div>

      ${
        snap
          ? `<section class="rc-card"><h2 class="rc-card__h">Subject snapshot</h2><div class="rc-card__b"><div class="rc-snap-grid">${snap}</div></div></section>`
          : ''
      }

      ${data.promotionText ? `<div class="rc-promo">${escapeHtml(data.promotionText)}</div>` : ''}

      <div class="rc-signs">
        <div class="rc-sign"><div class="rc-sign__line"></div><strong>Director</strong><span>Director signature</span></div>
        <div class="rc-sign"><div class="rc-sign__line"></div><strong>Homeroom teacher</strong><span>Class teacher signature</span></div>
        <div class="rc-sign"><div class="rc-sign__line"></div><strong>Parent / guardian</strong><span>Parent signature</span></div>
      </div>

      <div class="rc-foot">
        <div>
          <strong>Grading legend</strong><br/>
          90–100 A · 80–89 B · 70–79 C · 60–69 D · 50–59 E · Below 50 F
        </div>
        <div class="rc-foot__right">
          <strong>Print</strong><br/>
          A4 landscape · duplex (front / back)<br/>
          ${contactLine || schoolName}
        </div>
      </div>
    </div>
  </section>

  <!-- BACK -->
  <section class="rc-page">
    <div class="rc-page__bar" aria-hidden="true"></div>
    <div class="rc-sheet">
      ${schoolHeaderBack}

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
            <tr class="rc-tbl__sum rc-tbl__sum--avg">
              <th scope="row">Average</th>
              <td>${fmtScoreCell(data.summary.term1.average)}</td>
              <td>${fmtScoreCell(data.summary.term2.average)}</td>
              <td>${fmtScoreCell(data.summary.semester1.average, true)}</td>
              <td>${fmtScoreCell(data.summary.term3.average)}</td>
              <td>${fmtScoreCell(data.summary.term4.average)}</td>
              <td>${fmtScoreCell(data.summary.semester2.average, true)}</td>
              <td>${fmtScoreCell(data.summary.cumulative.average, true)}</td>
            </tr>
            <tr class="rc-tbl__sum">
              <th scope="row">Absent days</th>
              <td colspan="6"></td>
              <td>${data.summary.absentDays != null ? String(data.summary.absentDays) : '—'}</td>
            </tr>
            <tr class="rc-tbl__sum">
              <th scope="row">Conduct</th>
              <td colspan="6"></td>
              <td>${data.summary.conduct ? escapeHtml(data.summary.conduct) : '—'}</td>
            </tr>
            <tr class="rc-tbl__sum">
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
        ${remarkCard('Principal / cumulative', data.remarks.cumulative)}
      </div>

      <div class="rc-foot">
        <div>
          <strong>${schoolName}</strong><br/>
          ${headerTagline ? `${headerTagline}<br/>` : ''}
          ${contactLine || 'Official academic record'}
        </div>
        <div class="rc-foot__right">
          <strong>Document</strong><br/>
          ${documentRef} · ${issuedDate}<br/>
          Flip for student summary (front)
        </div>
      </div>
    </div>
  </section>
</body>
</html>`;
}
