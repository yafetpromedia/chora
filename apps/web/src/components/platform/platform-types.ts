export type PlatformSection =
  | "overview"
  | "schools"
  | "curriculum"
  | "subjects"
  | "library"
  | "messages"
  | "structures"
  | "provisioning"
  | "assessments"
  | "billing"
  | "invoices"
  | "usage"
  | "plans"
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
  logoUrl?: string | null;
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
    logoUrl: string | null;
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
  curriculum: {
    title: "Curriculum packages",
    subtitle: "Manage starter packs for school provisioning",
  },
  subjects: {
    title: "Subject repository",
    subtitle: "Master subjects inherited by schools on provision",
  },
  library: {
    title: "eLibrary repository",
    subtitle: "Master learning resources for curriculum packages",
  },
  messages: {
    title: "Communication templates",
    subtitle: "SMS, email, and teacher message starters",
  },
  structures: {
    title: "Academic structures",
    subtitle: "Grade presets for school onboarding",
  },
  provisioning: {
    title: "School provisioning",
    subtitle: "Audit log when packages are applied to tenants",
  },
  assessments: {
    title: "Assessment templates",
    subtitle: "Platform catalog and per-school grading structures",
  },
  billing: {
    title: "Billing",
    subtitle: "MRR, subscriptions, and trial status",
  },
  invoices: {
    title: "Invoices",
    subtitle: "Issue and track school invoices",
  },
  usage: {
    title: "Usage",
    subtitle: "Seat usage vs plan limits per school",
  },
  plans: {
    title: "Plans",
    subtitle: "Prices, limits, and catalog shown to schools",
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
