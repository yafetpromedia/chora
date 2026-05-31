import { Plan } from '@prisma/client';

export type PlanLimits = {
  students: number | null;
  teachers: number | null;
  admins: number | null;
  label: string;
  description: string;
};

export const TRIAL_DAYS = 14;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  TRIAL: {
    students: 50,
    teachers: 10,
    admins: 1,
    label: 'Free trial',
    description: '14 days · up to 50 students · core features',
  },
  STARTER: {
    students: 500,
    teachers: 50,
    admins: null,
    label: 'Starter',
    description: 'Small schools · up to 500 students',
  },
  PROFESSIONAL: {
    students: 2000,
    teachers: null,
    admins: null,
    label: 'Professional',
    description: 'Growing schools · analytics & notifications',
  },
  ENTERPRISE: {
    students: null,
    teachers: null,
    admins: null,
    label: 'Enterprise',
    description: 'Multi-campus · API · dedicated support',
  },
};

export const UPGRADE_PLANS: Plan[] = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
