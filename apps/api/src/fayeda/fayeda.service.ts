import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gender } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  FayedaSendCodeResult,
  FayedaVerificationSession,
  FayedaVerificationToken,
  FayedaVerifiedProfile,
} from './fayeda.types';

const SESSION_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000;

/** Sample profiles matching real Fayeda card layouts (demo / mock mode). */
const DEMO_PROFILES: Record<
  string,
  Omit<FayedaVerifiedProfile, 'verificationToken'>
> = {
  '285473403197': {
    fan: '2854734031970000',
    fcn: '285473403197',
    firstName: 'Test',
    middleName: 'Test',
    lastName: 'Test',
    gender: Gender.MALE,
    dateOfBirth: '1991-09-11',
    nationality: 'ET',
    phone: null,
    region: null,
    zone: null,
    woreda: null,
    photoUrl: '/fayeda/demo-male.svg',
  },
  '2854734031970000': {
    fan: '2854734031970000',
    fcn: '285473403197',
    firstName: 'Test',
    middleName: 'Test',
    lastName: 'Test',
    gender: Gender.MALE,
    dateOfBirth: '1991-09-11',
    nationality: 'ET',
    phone: null,
    region: null,
    zone: null,
    woreda: null,
    photoUrl: '/fayeda/demo-male.svg',
  },
  '815401367562': {
    fan: '8154013675620000',
    fcn: '815401367562',
    firstName: 'Abel',
    middleName: 'Tesfaye',
    lastName: 'Bekele',
    gender: Gender.MALE,
    dateOfBirth: '2005-03-15',
    nationality: 'ET',
    phone: '0991185321',
    region: 'Oromia',
    zone: 'Shager City Administration - Gafarsa Guje Sub City',
    woreda: 'Dalati',
    photoUrl: '/fayeda/demo-male.svg',
  },
  '8154013675620000': {
    fan: '8154013675620000',
    fcn: '815401367562',
    firstName: 'Abel',
    middleName: 'Tesfaye',
    lastName: 'Bekele',
    gender: Gender.MALE,
    dateOfBirth: '2005-03-15',
    nationality: 'ET',
    phone: '0991185321',
    region: 'Oromia',
    zone: 'Shager City Administration - Gafarsa Guje Sub City',
    woreda: 'Dalati',
    photoUrl: '/fayeda/demo-male.svg',
  },
  '5912846529014975': {
    fan: '5912846529014975',
    fcn: '5912846529014975'.slice(0, 12),
    firstName: 'Yafet',
    middleName: 'Tesfaye',
    lastName: 'Yelma',
    gender: Gender.MALE,
    dateOfBirth: '2000-01-01',
    nationality: 'ET',
    phone: null,
    region: null,
    zone: null,
    woreda: null,
    photoUrl: '/fayeda/demo-male.svg',
  },
};

@Injectable()
export class FayedaService {
  private readonly sessions = new Map<string, FayedaVerificationSession>();
  private readonly tokens = new Map<string, FayedaVerificationToken>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sendCode(
    schoolId: string,
    identifier: string,
  ): Promise<FayedaSendCodeResult> {
    const normalized = identifier.replace(/\D/g, '');
    const identifierType = this.resolveIdentifierType(normalized);

    await this.assertNotAlreadyEnrolled(schoolId, normalized, identifierType);

    this.purgeExpired();

    const sessionId = `fyd_${randomBytes(12).toString('hex')}`;
    const code = this.config.get('FAYEDA_MOCK_OTP') ?? '123456';
    const phone = this.resolvePhone(normalized);

    this.sessions.set(sessionId, {
      sessionId,
      schoolId,
      identifier: normalized,
      identifierType,
      code,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return {
      sessionId,
      maskedPhone: this.maskPhone(phone),
      identifierType,
    };
  }

  async verifyCode(
    schoolId: string,
    sessionId: string,
    code: string,
  ): Promise<FayedaVerifiedProfile> {
    this.purgeExpired();

    const session = this.sessions.get(sessionId);
    if (!session || session.schoolId !== schoolId) {
      throw new NotFoundException('Verification session expired. Send a new code.');
    }

    if (session.code !== code.trim()) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const profile = this.lookupProfile(session.identifier, session.identifierType);
    await this.assertNotAlreadyEnrolled(
      schoolId,
      profile.fan,
      'FAN',
      profile.fcn ?? undefined,
    );

    const verificationToken = `fvt_${randomBytes(16).toString('hex')}`;
    const { verificationToken: _omit, ...rest } = profile;

    this.tokens.set(verificationToken, {
      token: verificationToken,
      schoolId,
      profile: rest,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });

    this.sessions.delete(sessionId);

    return { ...rest, verificationToken };
  }

  consumeVerificationToken(
    schoolId: string,
    token: string,
  ): Omit<FayedaVerifiedProfile, 'verificationToken'> {
    this.purgeExpired();

    const entry = this.tokens.get(token);
    if (!entry || entry.schoolId !== schoolId) {
      throw new BadRequestException(
        'Fayeda verification expired. Verify the student again.',
      );
    }

    this.tokens.delete(token);
    return entry.profile;
  }

  private resolveIdentifierType(identifier: string): 'FAN' | 'FCN' {
    if (identifier.length === 16) return 'FAN';
    if (identifier.length === 12) return 'FCN';
    throw new BadRequestException(
      'FAN must be 16 digits; FCN must be 12 digits',
    );
  }

  private async assertNotAlreadyEnrolled(
    schoolId: string,
    primaryId: string,
    type: 'FAN' | 'FCN',
    secondaryId?: string,
  ) {
    const fan = type === 'FAN' ? primaryId : secondaryId;
    const fcn = type === 'FCN' ? primaryId : secondaryId;

    const existing = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [
          fan ? { fan } : undefined,
          fcn ? { fcn } : undefined,
          fan ? { fcn: fan.slice(0, 12) } : undefined,
        ].filter(Boolean) as { fan?: string; fcn?: string }[],
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (existing) {
      throw new ConflictException(
        `${existing.user.firstName} ${existing.user.lastName} is already enrolled with this Fayeda ID`,
      );
    }
  }

  private lookupProfile(
    identifier: string,
    type: 'FAN' | 'FCN',
  ): FayedaVerifiedProfile {
    const mode = this.config.get('FAYEDA_MODE') ?? 'mock';

    if (mode === 'mock') {
      const direct = DEMO_PROFILES[identifier];
      if (direct) {
        return { ...direct, verificationToken: '' };
      }

      const fcnKey = type === 'FCN' ? identifier : identifier.slice(0, 12);
      const fanKey = type === 'FAN' ? identifier : `${identifier}0000`;
      const fromFcn = DEMO_PROFILES[fcnKey];
      const fromFan = DEMO_PROFILES[fanKey];
      if (fromFcn) return { ...fromFcn, verificationToken: '' };
      if (fromFan) return { ...fromFan, verificationToken: '' };

      return {
        ...this.generateMockProfile(identifier, type),
        verificationToken: '',
      };
    }

    throw new BadRequestException(
      'Live Fayeda integration is not configured. Set FAYEDA_MODE=mock for development or register at id.gov.et/api.',
    );
  }

  private generateMockProfile(
    identifier: string,
    type: 'FAN' | 'FCN',
  ): Omit<FayedaVerifiedProfile, 'verificationToken'> {
    const hash = createHash('sha256').update(identifier).digest('hex');
    const fan = type === 'FAN' ? identifier : `${identifier}0000`;
    const fcn = type === 'FCN' ? identifier : identifier.slice(0, 12);
    const isMale = parseInt(hash.slice(0, 2), 16) % 2 === 0;
    const year = 2000 + (parseInt(hash.slice(2, 4), 16) % 10);
    const month = 1 + (parseInt(hash.slice(4, 6), 16) % 12);
    const day = 1 + (parseInt(hash.slice(6, 8), 16) % 28);

    const firstNames = ['Hanna', 'Meron', 'Sara', 'Lidya', 'Betty', 'Nati', 'Dawit', 'Samuel'];
    const middleNames = ['Tesfaye', 'Abebe', 'Kebede', 'Mulu', 'Girma', 'Haile'];
    const lastNames = ['Bekele', 'Tadesse', 'Alemu', 'Desta', 'Worku', 'Gebre'];

    const pick = (arr: string[], offset: number) =>
      arr[parseInt(hash.slice(offset, offset + 2), 16) % arr.length];

    return {
      fan,
      fcn,
      firstName: pick(firstNames, 8),
      middleName: pick(middleNames, 10),
      lastName: pick(lastNames, 12),
      gender: isMale ? Gender.MALE : Gender.FEMALE,
      dateOfBirth: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      nationality: 'ET',
      phone: `09${hash.slice(14, 22).replace(/\D/g, '').slice(0, 8)}`.slice(0, 10),
      region: 'Addis Ababa',
      zone: 'Bole Sub City',
      woreda: 'Woreda 03',
      photoUrl: isMale ? '/fayeda/demo-male.svg' : '/fayeda/demo-female.svg',
    };
  }

  private resolvePhone(identifier: string): string {
    const profile =
      DEMO_PROFILES[identifier] ??
      DEMO_PROFILES[`${identifier.slice(0, 12)}0000`] ??
      DEMO_PROFILES[identifier.slice(0, 12)];
    return profile?.phone ?? `09${identifier.slice(-8)}`;
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '****';
    return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(key);
    }
    for (const [key, token] of this.tokens) {
      if (token.expiresAt <= now) this.tokens.delete(key);
    }
  }
}
