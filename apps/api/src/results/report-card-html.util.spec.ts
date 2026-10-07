import { DEFAULT_GRADING_BANDS } from './grading.util';
import {
  buildReportCardHtml,
  buildSubjectRows,
  shortTermName,
  type ReportCardPrintPayload,
} from './report-card-html.util';
import {
  buildReportCardVerifyUrl,
  parseReportCardVerifyToken,
  signReportCardVerifyToken,
} from './report-card-verify.util';

function basePayload(termCount: number): ReportCardPrintPayload {
  const terms = Array.from({ length: termCount }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Term ${i + 1}`,
    shortName: `T${i + 1}`,
  }));
  const termAverages = terms.map((_, ti) => [80 + ti, 70 + ti]);
  const subjectRows = buildSubjectRows(
    ['Mathematics', 'English'],
    termAverages,
    DEFAULT_GRADING_BANDS,
  );

  return {
    mode: 'annual',
    platform: {
      name: 'Chora',
      nameAm: 'ጮራ',
      logoUrl: null,
      tagline: 'Learn | Grow | Succeed',
    },
    school: {
      name: 'Test Academy',
      logoUrl: null,
      authorizedSignatureUrl: null,
      authorizedSignatureLabel: 'Principal',
      address: null,
      email: null,
      phone: null,
      headerTitle: null,
      headerTagline: 'Excellence in learning',
    },
    student: {
      name: 'Ada Student',
      number: 'STU-1',
      sex: 'Female',
      dateOfBirth: '1 Jan 2012',
      age: 14,
      gradeLabel: 'Grade 8 · A',
      section: 'A',
      academicYear: '2017 E.C.',
      cardCode: 'ABCD1234',
      photoUrl: null,
    },
    terms,
    termName: terms[0]!.name,
    subjectRows,
    gradingScale: DEFAULT_GRADING_BANDS.map((b) => ({
      ...b,
      description: gradingDesc(b.letter),
    })),
    attendance: {
      byTerm: terms.map((t) => ({
        termName: t.name,
        present: 40,
        absent: 2,
        late: 1,
        totalDays: 43,
      })),
      totals: {
        present: 40 * termCount,
        absent: 2 * termCount,
        late: termCount,
        totalDays: 43 * termCount,
      },
    },
    conduct: {
      overall: 'Excellent',
      discipline: 'Excellent',
      participation: 'Very Good',
      attitude: 'Excellent',
      cooperation: 'Very Good',
      note: null,
    },
    summary: {
      overallAverage: 78,
      overallLetter: 'B',
      rank: 3,
      classSize: 32,
      promotion: {
        outcome: 'PROMOTED',
        label: 'Promoted',
        nextGradeLabel: 'Grade 9',
      },
    },
    remarks: {
      teacher: 'Keep up the good work.',
      principal: null,
      general: 'Keep up the good work.',
    },
    verification: {
      qrPayload: 'http://localhost:3000/verify/report-card?t=test-token',
    },
    generatedAt: new Date('2026-06-01T12:00:00.000Z').toISOString(),
    subjectGrid: [],
    termSubjects: [],
    promotion: {
      outcome: 'PROMOTED',
      label: 'Promoted',
      nextGradeLabel: 'Grade 9',
    },
    promotionText: 'Promoted',
  };
}

function gradingDesc(letter: string): string {
  const map: Record<string, string> = {
    A: 'Excellent',
    B: 'Good',
    C: 'Satisfactory',
    D: 'Needs Improvement',
    F: 'Fail',
  };
  return map[letter] ?? '';
}

describe('report-card-html.util', () => {
  it('shortTermName maps common labels', () => {
    expect(shortTermName('Term 1', 0)).toBe('T1');
    expect(shortTermName('Semester 2', 1)).toBe('S2');
  });

  it('buildSubjectRows keeps only provided term columns', () => {
    const two = buildSubjectRows(
      ['Math'],
      [[90], [80]],
      DEFAULT_GRADING_BANDS,
    );
    expect(two[0]!.termScores).toEqual([90, 80]);
    expect(two[0]!.average).toBe(85);
  });

  it.each([2, 3, 4] as const)(
    'renders %s term columns matching reference layout',
    (termCount) => {
      const html = buildReportCardHtml(basePayload(termCount));
      expect(html).toContain('size: A4 landscape');
      expect(html).toContain('#147D76');
      expect(html).toContain('ጮራ');
      expect(html).toContain('CHORA');
      expect(html).toContain('STUDENT REPORT CARD');
      expect(html).toContain('Academic Year Report');
      expect(html).toContain('Grading Scale');
      expect(html).toContain('Better Students');
      expect(html).toContain('Attendance Summary');
      expect(html).toContain('Conduct / Behavior');
      expect(html).toContain('Class Rank');
      expect(html).toContain('Scan to verify');
      expect(html).toContain('Learn | Grow | Succeed');
      expect(html).toContain(encodeURIComponent('/verify/report-card?t='));
      expect(html).toContain('rc-corner--bl');
      expect(html).toContain('rc-corner--br');
      expect(html).not.toContain('Teacher Remark');
      expect(html).not.toContain('CAMPUS1:');
      expect(html).not.toContain('Second term report');
      expect(html).not.toContain('two per A4');

      if (termCount >= 2) {
        expect(html).toContain('>Term<');
        for (let i = 1; i <= termCount; i += 1) {
          expect(html).toContain(`>${i}<`);
        }
      }
    },
  );

  it('renders term mode as half-page front-only (two per A4)', () => {
    const html = buildReportCardHtml({
      ...basePayload(1),
      mode: 'term',
      termName: 'Term 1',
    });
    expect(html).toContain('size: A4 landscape');
    expect(html).toContain('two per A4');
    expect(html).toContain('Term 1 Report');
    expect(html).toContain('Second term report');
    expect(html).toContain('>Score<');
    expect(html).toContain('>Verify<');
    expect(html).not.toContain('Attendance Summary');
    expect(html).not.toContain('Conduct / Behavior');
    expect(html).not.toContain('Academic Year Report');
    expect(html).not.toContain('aria-label="Report card back');
    expect(html).toContain(encodeURIComponent('/verify/report-card?t='));
  });
});

describe('report-card-verify.util', () => {
  it('signs and parses verification tokens', () => {
    const token = signReportCardVerifyToken({
      v: 1,
      schoolId: 'school_1',
      studentProfileId: 'stu_1',
      academicYearId: 'year_1',
      termId: 'term_1',
    });
    expect(parseReportCardVerifyToken(token)).toEqual({
      v: 1,
      schoolId: 'school_1',
      studentProfileId: 'stu_1',
      academicYearId: 'year_1',
      termId: 'term_1',
    });
    expect(buildReportCardVerifyUrl(token)).toContain('/verify/report-card?t=');
    expect(parseReportCardVerifyToken(`${token}x`)).toBeNull();
  });
});
