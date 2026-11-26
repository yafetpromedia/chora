import { randomBytes } from 'crypto';

const CARD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short code printed on card + encoded in QR (school resolved from auth). */
export function generateStudentCardCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CARD_CHARS[randomBytes(1)[0] % CARD_CHARS.length];
  }
  return code;
}

export function buildCardScanPayload(cardCode: string): string {
  return `CAMPUS1:${cardCode}`;
}

/** Public URL encoded in the student ID QR — opens on any phone camera. */
export function buildStudentCardPublicResultsUrl(
  joinCode: string,
  cardCode: string,
): string {
  const webAppUrl =
    process.env.WEB_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const s = encodeURIComponent(joinCode.trim());
  const c = encodeURIComponent(cardCode.trim().toUpperCase());
  return `${webAppUrl}/results/card?s=${s}&c=${c}`;
}

export function parseCardScanPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Native-camera QR: https://…/results/card?s=JOIN&c=CARDCODE
  try {
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes('/results/card')) {
      const url = new URL(
        trimmed.startsWith('http')
          ? trimmed
          : `https://local.invalid${trimmed.startsWith('/') ? '' : '/'}${trimmed}`,
      );
      const fromQuery = url.searchParams.get('c')?.trim();
      if (fromQuery) {
        return fromQuery.toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
      }
    }
  } catch {
    /* fall through */
  }

  const upper = trimmed.toUpperCase();
  if (upper.startsWith('CAMPUS1:')) {
    return upper.slice('CAMPUS1:'.length).replace(/[^A-Z0-9]/g, '') || null;
  }
  // Reject teacher / staff prefixes so student parsers stay role-safe.
  if (upper.startsWith('CAMPUS1-T:') || upper.startsWith('CAMPUS1-S:')) {
    return null;
  }
  return upper.replace(/[^A-Z0-9]/g, '') || null;
}

const STUDENT_ID_PREFIX = 'STU-';
const STUDENT_ID_RANDOM_LEN = 8;

/** Login email derived from school code + student ID (globally unique). */
export function buildStudentPortalEmail(
  joinCode: string,
  schoolStudentId: string,
): string {
  const school = joinCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = schoolStudentId.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `${id}.${school}@students.chora.app`;
}

export function isSchoolStudentIdLogin(input: string): boolean {
  return /^stu-[a-z0-9]+$/i.test(input.trim());
}

/** School roll number, e.g. STU-K7H3NP2M (unique random per school). */
export function generateSchoolStudentId(): string {
  let suffix = '';
  for (let i = 0; i < STUDENT_ID_RANDOM_LEN; i++) {
    suffix += CARD_CHARS[randomBytes(1)[0] % CARD_CHARS.length];
  }
  return `${STUDENT_ID_PREFIX}${suffix}`;
}
