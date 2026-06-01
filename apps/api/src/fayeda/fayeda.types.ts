import type { Gender } from '@prisma/client';

export type FayedaVerifiedProfile = {
  verificationToken: string;
  fan: string;
  fcn: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  nationality: string;
  phone: string | null;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  photoUrl: string;
};

export type FayedaSendCodeResult = {
  sessionId: string;
  maskedPhone: string;
  identifierType: 'FAN' | 'FCN';
};

export type FayedaVerificationSession = {
  sessionId: string;
  schoolId: string;
  identifier: string;
  identifierType: 'FAN' | 'FCN';
  code: string;
  expiresAt: number;
};

export type FayedaVerificationToken = {
  token: string;
  schoolId: string;
  profile: Omit<FayedaVerifiedProfile, 'verificationToken'>;
  expiresAt: number;
};
