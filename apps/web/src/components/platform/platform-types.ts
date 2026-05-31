export type PlatformSection =
  | "overview"
  | "schools"
  | "billing"
  | "permissions"
  | "profile"
  | "settings";

export type PlatformDashboard = {
  schools: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
    paid: number;
  };
  users: { students: number; teachers: number };
};

export type PlatformSchoolRow = {
  id: string;
  name: string;
  slug?: string;
  joinCode: string;
  status: string;
  createdAt: string;
  subscription: {
    plan: string;
    isActive: boolean;
    trialEndsAt: string | null;
  } | null;
  usage: {
    students: number;
    teachers: number;
    admins: number;
    parents: number;
  };
  gradeCount?: number;
};

export type PlatformSchoolDetail = {
  school: {
    id: string;
    name: string;
    slug: string;
    joinCode: string;
    status: string;
    email: string | null;
    phone: string | null;
    country: string | null;
    setupComplete: boolean;
    createdAt: string;
  };
  subscription: {
    plan: string;
    isActive: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd?: string | null;
  } | null;
  usage: Record<string, number> & { studentProfiles?: number };
  announcements: number;
};

export const SECTION_META: Record<
  PlatformSection,
  { title: string; subtitle: string }
> = {
  overview: {
    title: "Platform overview",
    subtitle: "Tenant health, growth, and quick actions",
  },
  schools: {
    title: "Schools",
    subtitle: "Create, inspect, and control tenant access",
  },
  billing: {
    title: "Billing & plans",
    subtitle: "Subscriptions and trial status across schools",
  },
  permissions: {
    title: "Access control",
    subtitle: "Platform roles and what each can do",
  },
  profile: {
    title: "My profile",
    subtitle: "Your platform operator account",
  },
  settings: {
    title: "Settings",
    subtitle: "Your account and platform links",
  },
};
