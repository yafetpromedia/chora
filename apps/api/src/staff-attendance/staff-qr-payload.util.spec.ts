import {
  classifyStaffScanPayload,
  formatStaffQrPayload,
} from './staff-qr-payload.util';

describe('staff QR payloads', () => {
  it('classifies staff credential, teacher, and student payloads', () => {
    expect(classifyStaffScanPayload('CAMPUS1-S:ABC123')).toEqual({
      kind: 'staff_credential',
      token: 'ABC123',
    });
    expect(classifyStaffScanPayload('CAMPUS1-T:XYZ')).toEqual({
      kind: 'teacher_card',
    });
    expect(classifyStaffScanPayload('CAMPUS1:STU99')).toEqual({
      kind: 'student_card',
    });
    expect(classifyStaffScanPayload('TCH-1001').kind).toBe('raw');
  });

  it('rejects empty student-looking tokens as empty raw', () => {
    expect(classifyStaffScanPayload('   ').kind).toBe('raw');
  });

  it('formats staff credential payloads', () => {
    expect(formatStaffQrPayload('TOKEN1')).toBe('CAMPUS1-S:TOKEN1');
  });
});
