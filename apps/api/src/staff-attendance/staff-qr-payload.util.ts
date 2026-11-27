export type StaffScanPayloadKind =
  | 'staff_credential'
  | 'teacher_card'
  | 'student_card'
  | 'raw';

/** Classify a raw gate scan string before DB lookup. */
export function classifyStaffScanPayload(raw: string): {
  kind: StaffScanPayloadKind;
  token?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'raw' };

  if (/^CAMPUS1-S:/i.test(trimmed)) {
    return {
      kind: 'staff_credential',
      token: trimmed.slice('CAMPUS1-S:'.length).trim(),
    };
  }

  if (/^CAMPUS1-T:/i.test(trimmed)) {
    return { kind: 'teacher_card' };
  }

  if (/^CAMPUS1:/i.test(trimmed)) {
    return { kind: 'student_card' };
  }

  // Student ID QR is a public results URL on any phone.
  if (/\/results\/card/i.test(trimmed) || /[?&]c=/i.test(trimmed)) {
    return { kind: 'student_card' };
  }

  return { kind: 'raw' };
}

export function formatStaffQrPayload(token: string): string {
  return `CAMPUS1-S:${token}`;
}
