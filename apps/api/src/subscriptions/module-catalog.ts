import { Plan } from '@prisma/client';

export type SchoolModuleKey =
  | 'attendance'
  | 'results'
  | 'parent'
  | 'timetable'
  | 'finance'
  | 'classroom'
  | 'worksheets'
  | 'library';

export type BillingBundleId = 'ops' | 'school' | 'full';

export type SchoolModuleDef = {
  key: SchoolModuleKey;
  label: string;
  description: string;
  etbMonthly: number;
  usdMonthly: number;
};

export type BillingBundleDef = {
  id: BillingBundleId;
  label: string;
  description: string;
  modules: SchoolModuleKey[];
  /** Percent off module subtotal only (not base). */
  percentOffModules: number;
};

/** ~158 ETB/USD, rounded to nearest 50 for display companions */
const USD_ETB_RATE = 158;

function usdFromEtb(etb: number): number {
  if (etb <= 0) return 0;
  return Math.max(1, Math.round(etb / USD_ETB_RATE));
}

export const SCHOOL_MODULE_KEYS: SchoolModuleKey[] = [
  'attendance',
  'results',
  'parent',
  'timetable',
  'finance',
  'classroom',
  'worksheets',
  'library',
];

export const SCHOOL_MODULE_CATALOG: SchoolModuleDef[] = [
  {
    key: 'attendance',
    label: 'Attendance',
    description: 'Take and track daily attendance',
    etbMonthly: 1500,
    usdMonthly: usdFromEtb(1500),
  },
  {
    key: 'results',
    label: 'Results',
    description: 'Grades, assessments, and report cards',
    etbMonthly: 2500,
    usdMonthly: usdFromEtb(2500),
  },
  {
    key: 'parent',
    label: 'Parent portal',
    description: 'Parent login and student updates',
    etbMonthly: 1500,
    usdMonthly: usdFromEtb(1500),
  },
  {
    key: 'timetable',
    label: 'Timetable',
    description: 'Class timetable and exam schedules',
    etbMonthly: 1000,
    usdMonthly: usdFromEtb(1000),
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Fees, invoices, and payments',
    etbMonthly: 2500,
    usdMonthly: usdFromEtb(2500),
  },
  {
    key: 'classroom',
    label: 'Classroom',
    description: 'Assignments and classwork',
    etbMonthly: 1500,
    usdMonthly: usdFromEtb(1500),
  },
  {
    key: 'worksheets',
    label: 'Worksheets',
    description: 'Worksheet library for classes',
    etbMonthly: 1000,
    usdMonthly: usdFromEtb(1000),
  },
  {
    key: 'library',
    label: 'E-library',
    description: 'Digital library resources',
    etbMonthly: 1000,
    usdMonthly: usdFromEtb(1000),
  },
];

export const BILLING_BUNDLES: BillingBundleDef[] = [
  {
    id: 'ops',
    label: 'Ops',
    description: 'Attendance + Results',
    modules: ['attendance', 'results'],
    percentOffModules: 20,
  },
  {
    id: 'school',
    label: 'School',
    description: 'Ops + Parent + Timetable',
    modules: ['attendance', 'results', 'parent', 'timetable'],
    percentOffModules: 25,
  },
  {
    id: 'full',
    label: 'Full',
    description: 'All modules',
    modules: [...SCHOOL_MODULE_KEYS],
    percentOffModules: 30,
  },
];

export function isSchoolModuleKey(value: string): value is SchoolModuleKey {
  return (SCHOOL_MODULE_KEYS as string[]).includes(value);
}

export function isBillingBundleId(value: string): value is BillingBundleId {
  return BILLING_BUNDLES.some((b) => b.id === value);
}

export function parseEnabledModules(raw: unknown): SchoolModuleKey[] {
  if (!Array.isArray(raw)) return [];
  const out: SchoolModuleKey[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && isSchoolModuleKey(item) && !out.includes(item)) {
      out.push(item);
    }
  }
  return out;
}

export function allSchoolModules(): SchoolModuleKey[] {
  return [...SCHOOL_MODULE_KEYS];
}

export function resolveModulesForBundle(
  bundleId: BillingBundleId | null | undefined,
  modules?: string[],
): SchoolModuleKey[] {
  if (bundleId && isBillingBundleId(bundleId)) {
    const bundle = BILLING_BUNDLES.find((b) => b.id === bundleId)!;
    return [...bundle.modules];
  }
  return parseEnabledModules(modules ?? []);
}

export type ModularPriceBreakdown = {
  baseEtb: number;
  baseUsd: number;
  modulesEtb: number;
  modulesUsd: number;
  discountEtb: number;
  discountUsd: number;
  totalEtb: number;
  totalUsd: number;
  custom: boolean;
  bundleId: BillingBundleId | null;
  modules: SchoolModuleKey[];
  percentOffModules: number;
};

export function computeModularMonthlyTotal(input: {
  plan: Plan;
  baseEtb: number;
  baseUsd: number;
  modules: SchoolModuleKey[];
  bundleId?: BillingBundleId | null;
}): ModularPriceBreakdown {
  const custom = input.plan === Plan.ENTERPRISE;
  const bundle =
    input.bundleId && isBillingBundleId(input.bundleId)
      ? BILLING_BUNDLES.find((b) => b.id === input.bundleId) ?? null
      : null;
  const modules = bundle ? [...bundle.modules] : [...input.modules];
  const percentOffModules = bundle?.percentOffModules ?? 0;

  let modulesEtb = 0;
  let modulesUsd = 0;
  for (const key of modules) {
    const def = SCHOOL_MODULE_CATALOG.find((m) => m.key === key);
    if (!def) continue;
    modulesEtb += def.etbMonthly;
    modulesUsd += def.usdMonthly;
  }

  const discountEtb = Math.round((modulesEtb * percentOffModules) / 100);
  const discountUsd = Math.round((modulesUsd * percentOffModules) / 100);
  const baseEtb = custom ? 0 : input.baseEtb;
  const baseUsd = custom ? 0 : input.baseUsd;

  return {
    baseEtb,
    baseUsd,
    modulesEtb,
    modulesUsd,
    discountEtb,
    discountUsd,
    totalEtb: custom ? 0 : baseEtb + modulesEtb - discountEtb,
    totalUsd: custom ? 0 : baseUsd + modulesUsd - discountUsd,
    custom,
    bundleId: bundle?.id ?? null,
    modules,
    percentOffModules,
  };
}
