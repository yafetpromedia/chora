import { isSchoolStudentIdLogin } from '../students/student-card.util';
import { isSchoolTeacherIdLogin } from '../teachers/staff-card.util';

/** Normalize username for storage and login lookup. */
export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (isSchoolStudentIdLogin(trimmed) || isSchoolTeacherIdLogin(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed.toLowerCase();
}

/** Contact email when the user did not provide one (globally unique). */
export function buildContactEmail(joinCode: string, username: string): string {
  const school = joinCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  const user = normalizeUsername(username).replace(/[^a-z0-9-]/g, '');
  return `${user}.${school}@users.chora.app`;
}

/** Parent portal contact email — short, tied to username + school code. */
export function buildParentContactEmail(joinCode: string, username: string): string {
  const school = joinCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  const user = normalizeUsername(username).replace(/[^a-z0-9-]/g, '');
  return `${user}.${school}@parent.chora.app`;
}

export function isLegacyParentContactEmail(email: string): boolean {
  return /^\d+\.[a-z]+@parent\.(chora|campusone)\.app$/i.test(email.trim());
}

export function isValidUsername(raw: string): boolean {
  const n = normalizeUsername(raw);
  if (n.length < 3 || n.length > 40) return false;
  if (isSchoolStudentIdLogin(n) || isSchoolTeacherIdLogin(n)) return true;
  return /^[a-z0-9][a-z0-9._-]*$/.test(n);
}
