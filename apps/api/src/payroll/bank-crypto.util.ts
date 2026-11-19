import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const PREFIX = 'enc:v1:';

function keyFromEnv(): Buffer | null {
  const raw = process.env.PAYROLL_BANK_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  // Derive 32-byte key from any secret string.
  return createHash('sha256').update(raw).digest();
}

/** Encrypt bank account for at-rest storage. No-op (plaintext) if key unset. */
export function encryptBankAccount(
  plain: string | null | undefined,
): string | null {
  if (plain == null || plain === '') return null;
  if (plain.startsWith(PREFIX)) return plain;
  const key = keyFromEnv();
  if (!key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptBankAccount(
  stored: string | null | undefined,
): string | null {
  if (stored == null || stored === '') return null;
  if (!stored.startsWith(PREFIX)) return stored;
  const key = keyFromEnv();
  if (!key) {
    // Cannot decrypt without key — do not return ciphertext as account number.
    return null;
  }
  const body = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = body.split(':');
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export function maskBankAccount(
  stored: string | null | undefined,
): string | null {
  const plain = decryptBankAccount(stored);
  if (!plain) return stored?.startsWith(PREFIX) ? '****' : null;
  if (plain.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, plain.length - 4))}${plain.slice(-4)}`;
}

export function isBankEncryptionConfigured(): boolean {
  return keyFromEnv() != null;
}
