import { randomBytes } from 'crypto';

const CARD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short code printed on card + encoded in QR (school resolved from auth). */
export function generateStudentCardCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CARD_CHARS[randomBytes(1)[0]! % CARD_CHARS.length];
  }
  return code;
}

export function buildCardScanPayload(cardCode: string): string {
  return `CAMPUS1:${cardCode}`;
}

export function parseCardScanPayload(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.startsWith('CAMPUS1:')) {
    return trimmed.slice('CAMPUS1:'.length).replace(/[^A-Z0-9]/g, '');
  }
  return trimmed.replace(/[^A-Z0-9]/g, '') || null;
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
  return `${id}.${school}@students.campusone.app`;
}

export function isSchoolStudentIdLogin(input: string): boolean {
  return /^stu-[a-z0-9]+$/i.test(input.trim());
}

/** School roll number, e.g. STU-K7H3NP2M (unique random per school). */
export function generateSchoolStudentId(): string {
  let suffix = '';
  for (let i = 0; i < STUDENT_ID_RANDOM_LEN; i++) {
    suffix += CARD_CHARS[randomBytes(1)[0]! % CARD_CHARS.length];
  }
  return `${STUDENT_ID_PREFIX}${suffix}`;
}
