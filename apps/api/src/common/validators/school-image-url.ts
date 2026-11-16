import { BadRequestException } from '@nestjs/common';

const MAX_DATA_URL_CHARS = 3_000_000;
const MAX_HTTPS_URL_CHARS = 2048;

const DATA_IMAGE =
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const HTTPS_URL = /^https:\/\/[^\s<>"']+$/i;

/**
 * School branding fields: HTTPS URLs or image data-URLs only (no path / script payloads).
 */
export function sanitizeSchoolImageUrl(
  fieldLabel: string,
  value: string | null | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('data:')) {
    const normalized = trimmed.replace(/\s+/g, '');
    if (normalized.length > MAX_DATA_URL_CHARS) {
      throw new BadRequestException(`${fieldLabel} image is too large`);
    }
    if (!DATA_IMAGE.test(normalized)) {
      throw new BadRequestException(
        `${fieldLabel} must be a JPEG, PNG, or WebP data URL`,
      );
    }
    return normalized;
  }

  if (/^(javascript|file|vbscript):/i.test(trimmed)) {
    throw new BadRequestException(`${fieldLabel} URL is not allowed`);
  }

  if (HTTPS_URL.test(trimmed)) {
    if (trimmed.length > MAX_HTTPS_URL_CHARS) {
      throw new BadRequestException(`${fieldLabel} URL is too long`);
    }
    return trimmed;
  }

  throw new BadRequestException(
    `${fieldLabel} must be an https URL or an image data URL`,
  );
}