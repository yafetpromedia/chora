import { createHmac, timingSafeEqual } from 'crypto';

export type ReportCardVerifyPayload = {
  v: 1;
  schoolId: string;
  studentProfileId: string;
  academicYearId: string;
  termId: string;
};

function secret(): string {
  return (
    process.env.REPORT_CARD_VERIFY_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'chora-report-card-dev-secret'
  );
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

export function signReportCardVerifyToken(
  payload: ReportCardVerifyPayload,
): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function parseReportCardVerifyToken(
  token: string,
): ReportCardVerifyPayload | null {
  const trimmed = token.trim();
  const [body, sig] = trimmed.split('.');
  if (!body || !sig) return null;
  const expected = b64url(createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(fromB64url(body).toString('utf8')) as ReportCardVerifyPayload;
    if (
      parsed?.v !== 1 ||
      !parsed.schoolId ||
      !parsed.studentProfileId ||
      !parsed.academicYearId ||
      !parsed.termId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildReportCardVerifyUrl(token: string): string {
  const webAppUrl =
    process.env.WEB_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  return `${webAppUrl}/verify/report-card?t=${encodeURIComponent(token)}`;
}
