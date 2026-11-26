import { platformFetch } from "@/lib/platform-auth";

export type EmailOverview = {
  totals: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    skipped: number;
  };
  rates: { delivery: number | null; bounce: number | null };
  queue: { pending: number; oldestPendingAt: string | null };
  lastTest: {
    at: string | null;
    ok: boolean | null;
    error: string | null;
    mailbox: string | null;
  } | null;
};

export type EmailLog = {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  category: string;
  templateId: string;
  schoolId: string | null;
  schoolName: string | null;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type EmailTemplateInfo = {
  id: string;
  category: string;
  label: string;
  description: string;
  wired: boolean;
};

export type EmailPreview = EmailTemplateInfo & {
  subject: string;
  html: string;
  text: string;
};

export type EmailLogPage = {
  items: EmailLog[];
  nextCursor: string | null;
};

export type SmtpConnectionState =
  | "missing_credentials"
  | "disabled"
  | "not_tested"
  | "last_test_failed"
  | "last_test_accepted";

export type EmailProvider = {
  enabled: boolean;
  host: string;
  port: number;
  encryption: string;
  connection: SmtpConnectionState;
  validationErrors: string[];
  mailboxes: { id: string; address: string; configured: boolean }[];
  lastTest: EmailOverview["lastTest"];
  dns: {
    domain: string;
    spf: string | null;
    dmarc: string | null;
    dkimSelectors: string[];
    error?: string;
  };
};

export type EmailTestResult = {
  sent: boolean;
  queued: boolean;
  reason?: string;
};

export function getEmailOverview() {
  return platformFetch<EmailOverview>("/platform/email/overview");
}

export function getEmailLogs(cursor?: string) {
  const params = new URLSearchParams({ limit: "25" });
  if (cursor) params.set("cursor", cursor);
  return platformFetch<EmailLogPage>(`/platform/email/logs?${params.toString()}`);
}

export function getEmailTemplates() {
  return platformFetch<EmailTemplateInfo[]>("/platform/email/templates");
}

export function previewEmailTemplate(id: string) {
  return platformFetch<EmailPreview>(
    `/platform/email/templates/${encodeURIComponent(id)}/preview`,
  );
}

export function getEmailProvider() {
  return platformFetch<EmailProvider>("/platform/email/provider");
}

export function sendTestEmail(body: { to: string; mailboxId?: string }) {
  return platformFetch<EmailTestResult>("/platform/email/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
