import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { classifyStaffScanPayload } from '../staff-attendance/staff-qr-payload.util';
import { parseCardScanPayload } from '../students/student-card.util';
import { parseTeacherCardScanPayload } from '../teachers/staff-card.util';

export type IdCardLookupResult =
  | {
      kind: 'student';
      cardCode: string;
      scanPayload: string;
      name: string;
      photoUrl: string | null;
      studentProfileId: string;
      studentId: string | null;
      grade: string;
      section: string | null;
      gender: string | null;
      phone: string | null;
    }
  | {
      kind: 'staff';
      cardCode: string | null;
      scanPayload: string;
      name: string;
      photoUrl: string | null;
      userId: string;
      teacherId: string | null;
      roleLabel: string;
      credential: 'teacher_card' | 'staff_gate_qr';
      phone: string | null;
    };

@Injectable()
export class IdCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(schoolId: string, rawCode: string): Promise<IdCardLookupResult> {
    const trimmed = rawCode.trim();
    const classified = classifyStaffScanPayload(trimmed);

    if (classified.kind === 'staff_credential') {
      return this.lookupStaffGate(schoolId, classified.token ?? '', trimmed);
    }

    if (classified.kind === 'teacher_card') {
      return this.lookupTeacher(schoolId, trimmed);
    }

    if (classified.kind === 'student_card') {
      return this.lookupStudent(schoolId, trimmed);
    }

    // Bare CODE128 / typed code — try student first, then staff.
    const student = await this.tryLookupStudent(schoolId, trimmed);
    if (student) return student;

    const staff = await this.tryLookupTeacher(schoolId, trimmed);
    if (staff) return staff;

    throw new NotFoundException(
      'No student or staff ID card matched that QR / barcode.',
    );
  }

  private async lookupStudent(
    schoolId: string,
    raw: string,
  ): Promise<IdCardLookupResult> {
    const found = await this.tryLookupStudent(schoolId, raw);
    if (!found) {
      throw new NotFoundException('Student ID card not found');
    }
    return found;
  }

  private async tryLookupStudent(
    schoolId: string,
    raw: string,
  ): Promise<IdCardLookupResult | null> {
    const cardCode = parseCardScanPayload(raw);
    if (!cardCode) return null;

    const profile = await this.prisma.studentProfile.findFirst({
      where: { schoolId, cardCode },
      select: {
        id: true,
        cardCode: true,
        photoUrl: true,
        phone: true,
        gender: true,
        grade: { select: { name: true } },
        section: { select: { name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            externalRef: true,
          },
        },
      },
    });
    if (!profile?.cardCode) return null;

    return {
      kind: 'student',
      cardCode: profile.cardCode,
      scanPayload: `CAMPUS1:${profile.cardCode}`,
      name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      photoUrl: profile.photoUrl,
      studentProfileId: profile.id,
      studentId: profile.user.externalRef,
      grade: profile.grade.name,
      section: profile.section?.name ?? null,
      gender: profile.gender,
      phone: profile.phone,
    };
  }

  private async lookupTeacher(
    schoolId: string,
    raw: string,
  ): Promise<IdCardLookupResult> {
    const found = await this.tryLookupTeacher(schoolId, raw);
    if (!found) {
      throw new NotFoundException('Staff ID card not found');
    }
    return found;
  }

  private async tryLookupTeacher(
    schoolId: string,
    raw: string,
  ): Promise<IdCardLookupResult | null> {
    const fromPayload = parseTeacherCardScanPayload(raw);
    const normalized = (fromPayload ?? raw)
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
    if (!normalized || normalized.length < 4) return null;

    const candidates = Array.from(
      new Set(
        [
          fromPayload,
          normalized,
          normalized.replace(/-/g, ''),
          normalized.replace(/^TCH-/, ''),
        ].filter((v): v is string => Boolean(v && v.length >= 4)),
      ),
    );

    const profile = await this.prisma.teacherProfile.findFirst({
      where: {
        schoolId,
        OR: [
          { cardCode: { in: candidates } },
          { user: { externalRef: { in: candidates } } },
        ],
      },
      select: {
        cardCode: true,
        photoUrl: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            externalRef: true,
            phone: true,
            roleTemplate: { select: { name: true } },
          },
        },
      },
    });
    if (!profile) return null;

    const cardCode = profile.cardCode;
    return {
      kind: 'staff',
      cardCode,
      scanPayload: cardCode ? `CAMPUS1-T:${cardCode}` : raw.trim(),
      name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      photoUrl: profile.photoUrl,
      userId: profile.user.id,
      teacherId: profile.user.externalRef,
      roleLabel: profile.user.roleTemplate?.name ?? 'Staff',
      credential: 'teacher_card',
      phone: profile.user.phone,
    };
  }

  private async lookupStaffGate(
    schoolId: string,
    token: string,
    raw: string,
  ): Promise<IdCardLookupResult> {
    if (!token) {
      throw new NotFoundException('Invalid staff QR code');
    }
    const cred = await this.prisma.staffQrCredential.findFirst({
      where: { schoolId, token, active: true },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            externalRef: true,
            phone: true,
            roleTemplate: { select: { name: true } },
            teacherProfile: {
              select: { cardCode: true, photoUrl: true },
            },
          },
        },
      },
    });
    if (!cred?.user) {
      throw new NotFoundException(
        'Staff QR not found or deactivated. Ask an admin to reissue it.',
      );
    }

    const tp = cred.user.teacherProfile;
    return {
      kind: 'staff',
      cardCode: tp?.cardCode ?? null,
      scanPayload: raw.trim(),
      name: `${cred.user.firstName} ${cred.user.lastName}`.trim(),
      photoUrl: tp?.photoUrl ?? null,
      userId: cred.user.id,
      teacherId: cred.user.externalRef,
      roleLabel: cred.user.roleTemplate?.name ?? 'Staff',
      credential: 'staff_gate_qr',
      phone: cred.user.phone ?? null,
    };
  }
}
