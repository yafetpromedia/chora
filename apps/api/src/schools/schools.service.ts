import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type SchoolRecord = {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  country: string | null;
  phone: string | null;
};

@Injectable()
export class SchoolsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.school.upsert({
      where: { id: 'school-addis' },
      create: {
        id: 'school-addis',
        name: 'Bright Side International School',
        slug: 'bright-side',
        joinCode: 'BRIGHT1',
        country: 'Ethiopia',
      },
      update: {
        name: 'Bright Side International School',
        joinCode: 'BRIGHT1',
      },
    });
  }

  async createSchool(input: {
    name: string;
    country?: string;
    phone?: string;
  }): Promise<SchoolRecord> {
    const joinCode = await this.generateUniqueJoinCode();
    const slug = await this.generateUniqueSlug(input.name);
    const id = `school_${randomBytes(6).toString('hex')}`;

    try {
      const school = await this.prisma.school.create({
        data: {
          id,
          name: input.name.trim(),
          slug,
          joinCode,
          country: input.country?.trim() || null,
          phone: input.phone?.trim() || null,
        },
      });
      return this.toRecord(school);
    } catch {
      throw new ConflictException('Could not create school. Try a different name.');
    }
  }

  async findByJoinCode(joinCode: string): Promise<SchoolRecord> {
    const school = await this.prisma.school.findUnique({
      where: { joinCode: joinCode.trim().toUpperCase() },
    });
    if (!school) {
      throw new NotFoundException('Invalid school code');
    }
    return this.toRecord(school);
  }

  async findById(id: string): Promise<SchoolRecord | null> {
    const school = await this.prisma.school.findUnique({ where: { id } });
    return school ? this.toRecord(school) : null;
  }

  private async generateUniqueJoinCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 20; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const existing = await this.prisma.school.findUnique({
        where: { joinCode: code },
      });
      if (!existing) {
        return code;
      }
    }
    return randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || 'school';

    let slug = base;
    let suffix = 0;
    while (true) {
      const existing = await this.prisma.school.findUnique({ where: { slug } });
      if (!existing) {
        return slug;
      }
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
  }

  private toRecord(school: {
    id: string;
    name: string;
    slug: string;
    joinCode: string;
    country: string | null;
    phone: string | null;
  }): SchoolRecord {
    return {
      id: school.id,
      name: school.name,
      slug: school.slug,
      joinCode: school.joinCode,
      country: school.country,
      phone: school.phone,
    };
  }
}
