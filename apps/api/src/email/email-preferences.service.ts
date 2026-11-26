import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

function schoolView(row: Partial<SchoolEmailPreferenceView> | null): SchoolEmailPreferenceView {
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
    const row = await this.prisma.parentEmailPreference.upsert({
      where: { userId },
      create: { userId, schoolId, ...data },
      update: { schoolId, ...data },
    });
    if (row.schoolId !== schoolId) {
      throw new NotFoundException('Parent not found in this school');
    }
    return parentView(row);
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
