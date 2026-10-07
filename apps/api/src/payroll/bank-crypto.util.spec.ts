import {
  decryptBankAccount,
  encryptBankAccount,
  maskBankAccount,
} from './bank-crypto.util';

describe('bank-crypto.util', () => {
  const prev = process.env.PAYROLL_BANK_ENCRYPTION_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.PAYROLL_BANK_ENCRYPTION_KEY;
    else process.env.PAYROLL_BANK_ENCRYPTION_KEY = prev;
  });

  it('masks plaintext accounts', () => {
    delete process.env.PAYROLL_BANK_ENCRYPTION_KEY;
    expect(maskBankAccount('1234567890')).toBe('******7890');
  });

  it('round-trips encryption when key is set', () => {
    process.env.PAYROLL_BANK_ENCRYPTION_KEY = 'test-payroll-bank-key';
    const enc = encryptBankAccount('9876543210');
    expect(enc?.startsWith('enc:v1:')).toBe(true);
    expect(decryptBankAccount(enc)).toBe('9876543210');
    expect(maskBankAccount(enc)).toBe('******3210');
  });

  it('does not double-encrypt', () => {
    process.env.PAYROLL_BANK_ENCRYPTION_KEY = 'test-payroll-bank-key';
    const once = encryptBankAccount('111122223333');
    const twice = encryptBankAccount(once);
    expect(twice).toBe(once);
  });
});
