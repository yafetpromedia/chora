export const MAILBOX_IDS = [
  'contact',
  'support',
  'admin',
  'info',
  'sales',
] as const;

export type MailboxId = (typeof MAILBOX_IDS)[number];

export const EMAIL_CATEGORIES = [
  'welcome',
  'email_verification',
  'password_reset',
  'account_invitation',
  'password_change',
  'security_alert',
  'student_absence',
  'student_late',
  'announcement',
  'examination',
  'results_published',
  'report_card',
  'payment_confirmation',
  'payment_receipt',
  'payment_reminder',
  'payment_failed',
  'subscription_activation',
  'subscription_expiration',
  'trial_activation',
  'school_decision',
  'support_confirmation',
  'test',
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const PREFERENCE_KEYS = [
  'absenceEnabled',
  'lateEnabled',
  'examinationEnabled',
  'announcementEnabled',
  'paymentReminderEnabled',
  'paymentConfirmationEnabled',
  'reportCardEnabled',
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type SchoolEmailPreferenceView = Record<PreferenceKey, boolean>;

export type ParentEmailPreferenceView = SchoolEmailPreferenceView & {
  enabled: boolean;
};

export const DEFAULT_SCHOOL_EMAIL_PREFERENCES: SchoolEmailPreferenceView = {
  absenceEnabled: true,
  lateEnabled: true,
  examinationEnabled: true,
  announcementEnabled: true,
  paymentReminderEnabled: true,
  paymentConfirmationEnabled: true,
  reportCardEnabled: true,
};

export const DEFAULT_PARENT_EMAIL_PREFERENCES: ParentEmailPreferenceView = {
  enabled: true,
  ...DEFAULT_SCHOOL_EMAIL_PREFERENCES,
};

/** Authentication uses contact. Security uses admin. School support uses support. */
export const SENDER_BY_CATEGORY: Record<EmailCategory, MailboxId> = {
  welcome: 'contact',
  email_verification: 'contact',
  password_reset: 'contact',
  account_invitation: 'contact',
  password_change: 'contact',
  security_alert: 'admin',
  student_absence: 'info',
  student_late: 'info',
  announcement: 'info',
  examination: 'info',
  results_published: 'info',
  report_card: 'info',
  payment_confirmation: 'sales',
  payment_receipt: 'sales',
  payment_reminder: 'sales',
  payment_failed: 'sales',
  subscription_activation: 'sales',
  subscription_expiration: 'sales',
  trial_activation: 'sales',
  school_decision: 'contact',
  support_confirmation: 'support',
  test: 'contact',
};

export const PARENT_FACING_CATEGORIES = new Set<EmailCategory>([
  'student_absence',
  'student_late',
  'announcement',
  'examination',
  'results_published',
  'report_card',
  'payment_confirmation',
  'payment_receipt',
  'payment_reminder',
  'payment_failed',
]);

export type MailboxConfig = {
  id: MailboxId;
  address: string;
  password: string;
  configured: boolean;
};

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  encryption: 'SSL/TLS' | 'STARTTLS';
  mailboxes: Record<MailboxId, MailboxConfig>;
};

export type OutboundEmail = {
  to: string;
  category: EmailCategory;
  templateId: string;
  vars?: Record<string, string | undefined>;
  schoolId?: string | null;
  idempotencyKey: string;
  preference?: PreferenceKey | null;
  parentUserId?: string | null;
  mailboxId?: MailboxId;
};

export type EmailDispatchResult = {
  sent: boolean;
  queued: boolean;
  duplicate?: boolean;
  id?: string;
  reason?: string;
};
