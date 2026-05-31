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

/** School roll number, e.g. STU-2026-00042 */
export function formatSchoolStudentId(year: number, sequence: number): string {
  return `STU-${year}-${String(sequence).padStart(5, '0')}`;
}

export function parseSchoolStudentIdSequence(
  externalRef: string,
  year: number,
): number | null {
  const prefix = `STU-${year}-`;
  if (!externalRef.startsWith(prefix)) return null;
  const n = Number.parseInt(externalRef.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : null;
}
