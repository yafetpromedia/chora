/** Basename-safe student document filenames (timestamp + extension from upload). */
export function assertSafeUploadedFilename(filename: string): string {
  const base = filename.replace(/\\/g, '/').split('/').pop() ?? '';
  if (!base || base === '.' || base === '..') {
    throw new Error('Invalid filename');
  }
  if (!/^[A-Za-z0-9._-]+$/.test(base)) {
    throw new Error('Invalid filename');
  }
  return base;
}
