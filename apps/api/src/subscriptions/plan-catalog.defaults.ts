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

export const DEFAULT_PLAN_CATALOG: PlanCatalogRow[] = [
  {
    plan: Plan.TRIAL,
    label: 'Free trial',
    description: '14 days · up to 50 students · core features',
    studentsLimit: 50,
    teachersLimit: 10,
    adminsLimit: 1,
    usdMonthly: 0,
    etbMonthly: 0,
    features: ['All core modules', 'Up to 50 students', 'Email support'],
    trialDays: 14,
    sortOrder: 0,
    isListed: false,
  },
  {
    plan: Plan.STARTER,
    label: 'Starter',
    description: 'Small schools · up to 500 students',
    studentsLimit: 500,
    teachersLimit: 50,
    adminsLimit: null,
    usdMonthly: 99,
    etbMonthly: 15650,
    features: [
      'Up to 500 students',
      'Up to 50 teachers',
      'Parent portal',
      'Attendance, results & announcements',
    ],
    trialDays: null,
    sortOrder: 1,
    isListed: true,
  },
  {
    plan: Plan.PROFESSIONAL,
    label: 'Professional',
    description: 'Growing schools · analytics & notifications',
    studentsLimit: 2000,
    teachersLimit: null,
    adminsLimit: null,
    usdMonthly: 259,
    etbMonthly: 40900,
    features: [
      'Up to 2,000 students',
      'Unlimited teachers',
      'Analytics & notifications',
      'Mobile app access',
    ],
    trialDays: null,
    sortOrder: 2,
    isListed: true,
  },
  {
    plan: Plan.ENTERPRISE,
    label: 'Enterprise',
    description: 'Multi-campus · API · dedicated support',
    studentsLimit: null,
    teachersLimit: null,
    adminsLimit: null,
    usdMonthly: 0,
    etbMonthly: 0,
    features: [
      'Unlimited students',
      'Multi-campus support',
      'Advanced analytics & API',
      'Dedicated support',
    ],
    trialDays: null,
    sortOrder: 3,
    isListed: true,
  },
];
