import { randomBytes } from 'crypto';
import { generateStudentCardCode } from '../students/student-card.util';

const TEACHER_ID_PREFIX = 'TCH-';
const TEACHER_ID_RANDOM_LEN = 8;
const CARD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSchoolTeacherId(): string {
  let suffix = '';
  for (let i = 0; i < TEACHER_ID_RANDOM_LEN; i++) {
    suffix += CARD_CHARS[randomBytes(1)[0]! % CARD_CHARS.length];
  }
  return `${TEACHER_ID_PREFIX}${suffix}`;
}

export function isSchoolTeacherIdLogin(input: string): boolean {
  return /^tch-[a-z0-9]+$/i.test(input.trim());
}

export function buildTeacherCardScanPayload(cardCode: string): string {
  return `CAMPUS1-T:${cardCode}`;
}

export function parseTeacherCardScanPayload(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.startsWith('CAMPUS1-T:')) {
    return trimmed.slice('CAMPUS1-T:'.length).replace(/[^A-Z0-9]/g, '');
  }
  return null;
}

export { generateStudentCardCode as generateTeacherCardCode };
