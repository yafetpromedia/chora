import { Plan } from '@prisma/client';

export type PlanCatalogRow = {
  plan: Plan;
  label: string;
  description: string;
  studentsLimit: number | null;
  teachersLimit: number | null;
  adminsLimit: number | null;
  usdMonthly: number;
  etbMonthly: number;
  features: string[];
  trialDays: number | null;
  sortOrder: number;
  isListed: boolean;
};

/** Size-band base fees only — modules priced separately in module-catalog. */
export const DEFAULT_PLAN_CATALOG: PlanCatalogRow[] = [
  {
    plan: Plan.TRIAL,
    label: 'Free trial',
    description: '14 days · all modules · up to 50 students',
    studentsLimit: 50,
    teachersLimit: 10,
    adminsLimit: 1,
    usdMonthly: 0,
    etbMonthly: 0,
    features: [
      'All modules included',
      'Up to 50 students',
      'Email support',
    ],
    trialDays: 14,
    sortOrder: 0,
    isListed: false,
  },
  {
    plan: Plan.STARTER,
    label: 'Small school',
    description: 'Base workspace · up to 500 students · pick modules',
    studentsLimit: 500,
    teachersLimit: 50,
    adminsLimit: null,
    usdMonthly: 13,
    etbMonthly: 2000,
    features: [
      'Base workspace (users, classes, announcements)',
      'Up to 500 students',
      'Up to 50 teachers',
      'Add only the modules you need',
    ],
    trialDays: null,
    sortOrder: 1,
    isListed: true,
  },
  {
    plan: Plan.PROFESSIONAL,
    label: 'Growing school',
    description: 'Base workspace · up to 2,000 students · pick modules',
    studentsLimit: 2000,
    teachersLimit: null,
    adminsLimit: null,
    usdMonthly: 25,
    etbMonthly: 4000,
    features: [
      'Base workspace (users, classes, announcements)',
      'Up to 2,000 students',
      'Unlimited teachers',
      'Add only the modules you need',
    ],
    trialDays: null,
    sortOrder: 2,
    isListed: true,
  },
  {
    plan: Plan.ENTERPRISE,
    label: 'Enterprise',
    description: 'Multi-campus · custom modules & contract',
    studentsLimit: null,
    teachersLimit: null,
    adminsLimit: null,
    usdMonthly: 0,
    etbMonthly: 0,
    features: [
      'Unlimited students',
      'Multi-campus support',
      'Custom module package',
      'Dedicated support',
    ],
    trialDays: null,
    sortOrder: 3,
    isListed: true,
  },
];
