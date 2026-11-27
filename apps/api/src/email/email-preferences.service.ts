import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_PARENT_EMAIL_PREFERENCES,
  DEFAULT_SCHOOL_EMAIL_PREFERENCES,
  PREFERENCE_KEYS,
  type ParentEmailPreferenceView,
  type PreferenceKey,
  type SchoolEmailPreferenceView,
} from './email.types';

export type PreferencePatch = Partial<ParentEmailPreferenceView>;

function schoolView(
  row: Partial<SchoolEmailPreferenceView> | null,
): SchoolEmailPreferenceView {
  return { ...DEFAULT_SCHOOL_EMAIL_PREFERENCES, ...(row ?? {}) };
}

function parentView(
  row: Partial<ParentEmailPreferenceView> | null,
): ParentEmailPreferenceView {
  return { ...DEFAULT_PARENT_EMAIL_PREFERENCES, ...(row ?? {}) };
}

function pickPatch(patch: PreferencePatch, includeEnabled: boolean) {
  const data: Record<string, boolean> = {};
  for (const key of PREFERENCE_KEYS) {
    if (typeof patch[key] === 'boolean') data[key] = patch[key];
  }
  if (includeEnabled && typeof patch.enabled === 'boolean') {
    data.enabled = patch.enabled;
  }
  return data;
}

@Injectable()
export class EmailPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchool(schoolId: string): Promise<SchoolEmailPreferenceView> {
    const row = await this.prisma.schoolEmailPreference.findUnique({
      where: { schoolId },
    });
    return schoolView(row);
  }

  async updateSchool(schoolId: string, patch: PreferencePatch) {
    const data = pickPatch(patch, false);
    const row = await this.prisma.schoolEmailPreference.upsert({
      where: { schoolId },
      create: { schoolId, ...data },
      update: data,
    });
    return schoolView(row);
  }

  async getParent(
    schoolId: string,
    userId: string,
  ): Promise<ParentEmailPreferenceView> {
    const row = await this.prisma.parentEmailPreference.findFirst({
      where: { userId, schoolId },
    });
    return parentView(row);
  }

  async updateOwn(
    actor: { id: string; schoolId: string; role: string },
    patch: PreferencePatch,
  ) {
    if (actor.role !== 'parent') {
      throw new ForbiddenException(
        'Only parents can change their communication preferences',
      );
    }
    return this.writeParent(actor.schoolId, actor.id, patch);
  }

  async updateParentAsAdmin(
    schoolId: string,
    parentUserId: string,
    patch: PreferencePatch,
  ) {
    const parent = await this.prisma.user.findFirst({
      where: { id: parentUserId, schoolId, role: 'parent' },
      select: { id: true },
    });
    if (!parent) {
      throw new NotFoundException('Parent not found in this school');
    }
    return this.writeParent(schoolId, parent.id, patch);
  }

  private async writeParent(
    schoolId: string,
    userId: string,
    patch: PreferencePatch,
  ) {
    const data = pickPatch(patch, true);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const parent = await tx.user.findFirst({
          where: { id: userId, schoolId, role: 'parent' },
          select: { id: true },
        });
        if (!parent) {
          throw new NotFoundException('Parent not found in this school');
        }

        const existing = await tx.parentEmailPreference.findUnique({
          where: { userId },
        });
        if (existing) {
          if (existing.schoolId !== schoolId) {
            throw new NotFoundException('Parent not found in this school');
          }
          return tx.parentEmailPreference.update({
            where: { userId },
            data,
          });
        }

        return tx.parentEmailPreference.create({
          data: { userId, schoolId, ...data },
        });
      });
      return parentView(row);
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      // A concurrent create may have won. Re-check school ownership
      // in a fresh transaction before allowing an update.
      const row = await this.prisma.$transaction(async (tx) => {
        const parent = await tx.user.findFirst({
          where: { id: userId, schoolId, role: 'parent' },
          select: { id: true },
        });
        const existing = await tx.parentEmailPreference.findUnique({
          where: { userId },
        });
        if (!parent || !existing || existing.schoolId !== schoolId) {
          throw new NotFoundException('Parent not found in this school');
        }
        return tx.parentEmailPreference.update({
          where: { userId },
          data,
        });
      });
      return parentView(row);
    }
  }

  allows(
    school: SchoolEmailPreferenceView,
    parent: ParentEmailPreferenceView | null,
    key: PreferenceKey | null | undefined,
  ): boolean {
    if (!key) return true;
    if (parent && (!parent.enabled || parent[key] === false)) return false;
    return school[key] !== false;
  }
}
