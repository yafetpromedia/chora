import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  allSchoolModules,
  isBillingBundleId,
  parseEnabledModules,
  resolveModulesForBundle,
  type BillingBundleId,
  type SchoolModuleKey,
} from './module-catalog';

@Injectable()
export class ModuleEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async getEnabledModules(schoolId: string): Promise<SchoolModuleKey[]> {
    const sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
      select: {
        enabledModules: true,
        billingBundle: true,
      },
    });
    if (!sub) {
      return allSchoolModules();
    }
    return this.resolveFromSubscription(sub);
  }

  resolveFromSubscription(sub: {
    enabledModules: unknown;
    billingBundle: string | null;
  }): SchoolModuleKey[] {
    if (sub.billingBundle === 'base') {
      return [];
    }
    if (sub.billingBundle && isBillingBundleId(sub.billingBundle)) {
      return resolveModulesForBundle(sub.billingBundle);
    }
    const parsed = parseEnabledModules(sub.enabledModules);
    // Legacy / unset → grandfather all modules
    if (parsed.length === 0 && !sub.billingBundle) {
      return allSchoolModules();
    }
    return parsed;
  }

  async hasModule(schoolId: string, key: SchoolModuleKey): Promise<boolean> {
    const modules = await this.getEnabledModules(schoolId);
    return modules.includes(key);
  }

  async assertModule(schoolId: string, key: SchoolModuleKey) {
    const ok = await this.hasModule(schoolId, key);
    if (!ok) {
      throw new ForbiddenException(
        `Your school plan does not include the ${key} module. Update billing to enable it.`,
      );
    }
  }

  async backfillAllModulesIfUnset(schoolId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { schoolId },
      select: { enabledModules: true, billingBundle: true },
    });
    if (!sub) return;
    const parsed = parseEnabledModules(sub.enabledModules);
    if (parsed.length === 0 && !sub.billingBundle) {
      await this.prisma.subscription.update({
        where: { schoolId },
        data: {
          enabledModules: allSchoolModules() as unknown as Prisma.InputJsonValue,
          billingBundle: 'full',
        },
      });
    }
  }

  normalizeSelection(input: {
    modules?: string[];
    bundleId?: string | null;
  }): {
    modules: SchoolModuleKey[];
    billingBundle: BillingBundleId | 'base' | null;
  } {
    if (input.bundleId === 'base') {
      return { modules: [], billingBundle: 'base' };
    }
    if (input.bundleId && isBillingBundleId(input.bundleId)) {
      return {
        modules: resolveModulesForBundle(input.bundleId),
        billingBundle: input.bundleId,
      };
    }
    const modules = parseEnabledModules(input.modules ?? []);
    return { modules, billingBundle: null };
  }
}
