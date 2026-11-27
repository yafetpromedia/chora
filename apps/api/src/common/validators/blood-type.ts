import { BadRequestException } from '@nestjs/common';

/** ABO/Rh types shown on ID cards (matches web UI select). */
export const ALLOWED_BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export type AllowedBloodType = (typeof ALLOWED_BLOOD_TYPES)[number];

const BLOOD_LOOKUP = new Map(
  ALLOWED_BLOOD_TYPES.map((t) => [t.toUpperCase(), t]),
);

/** Returns canonical value, null when empty, or throws when invalid. */
export function normalizeBloodType(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const canonical = BLOOD_LOOKUP.get(trimmed.toUpperCase());
  if (!canonical) {
    throw new BadRequestException(
      `bloodType must be one of: ${ALLOWED_BLOOD_TYPES.join(', ')}`,
    );
  }
  return canonical;
}
