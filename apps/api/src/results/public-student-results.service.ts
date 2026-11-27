import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { parseCardScanPayload } from '../students/student-card.util';
import { AcademicsService } from './academics.service';

@Injectable()
export class PublicStudentResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academics: AcademicsService,
  ) {}

  async meta(schoolCode: string, cardCodeRaw: string) {
    const { school, profile } = await this.resolveCard(schoolCode, cardCodeRaw);
    return {
      school: {
        name: school.name,
        logoUrl: school.logoUrl,
        joinCode: school.joinCode,
      },
      student: {
        displayName: profile.user.firstName,
        grade: profile.grade.name,
        section: profile.section?.name ?? null,
        cardCode: profile.cardCode,
      },
    };
  }

  async unlock(schoolCode: string, cardCodeRaw: string, password: string) {
    const { school, profile } = await this.resolveCard(schoolCode, cardCodeRaw);

    const ok = await compare(password, profile.user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Incorrect password');
    }

    const all = await this.academics.listStudentReleasedScores(
      school.id,
      profile.id,
    );
    const scores = all.filter((row) => row.published);

    const terms = Array.from(
      new Map(
        scores.map((s) => [
          s.termId,
          {
            termId: s.termId,
            termName: s.termName,
            academicYear: s.academicYear,
          },
        ]),
      ).values(),
    );

    return {
      school: {
        name: school.name,
        logoUrl: school.logoUrl,
        joinCode: school.joinCode,
      },
      student: {
        name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
        studentId: profile.user.externalRef,
        grade: profile.grade.name,
        section: profile.section?.name ?? null,
        cardCode: profile.cardCode,
        photoUrl: profile.photoUrl,
      },
      terms,
      scores,
      unlockedAt: new Date().toISOString(),
    };
  }

  private async resolveCard(schoolCode: string, cardCodeRaw: string) {
    const joinCode = schoolCode.trim();
    if (!joinCode) {
      throw new NotFoundException('School code is required');
    }

    const school = await this.prisma.school.findFirst({
      where: { joinCode: { equals: joinCode, mode: 'insensitive' } },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        joinCode: true,
      },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const cardCode = parseCardScanPayload(cardCodeRaw);
    if (!cardCode) {
      throw new NotFoundException('Invalid card code');
    }

    const profile = await this.prisma.studentProfile.findFirst({
      where: { schoolId: school.id, cardCode },
      select: {
        id: true,
        cardCode: true,
        photoUrl: true,
        grade: { select: { name: true } },
        section: { select: { name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            externalRef: true,
            passwordHash: true,
          },
        },
      },
    });
    if (!profile?.cardCode) {
      throw new NotFoundException('Student ID card not found');
    }

    return { school, profile };
  }
}
