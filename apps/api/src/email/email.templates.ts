import type { EmailCategory } from './email.types';
import { escapeHtml, isSafeHttpUrl, sanitizeHeader } from './email.policy';

export type EmailTemplateId =
  | 'welcome'
  | 'email_verification'
  | 'password_reset'
  | 'account_invitation'
  | 'password_change'
  | 'student_absence'
  | 'student_late'
  | 'announcement'
  | 'examination'
  | 'results_published'
  | 'report_card'
  | 'payment_confirmation'
  | 'payment_receipt'
  | 'payment_reminder'
  | 'payment_failed'
  | 'subscription_activation'
  | 'subscription_expiration'
  | 'trial_activation'
  | 'school_decision'
  | 'security_alert'
  | 'support_confirmation'
  | 'test';

type TemplateDetail = { label: string; valueKey: string };

type TemplateDef = {
  id: EmailTemplateId;
  category: EmailCategory;
  label: string;
  description: string;
  wired: boolean;
  subject: string;
  heading: string;
  paragraphs: string[];
  actionLabel?: string;
  details?: TemplateDetail[];
  sample: Record<string, string>;
};

const TEAL = '#147D76';

export const EMAIL_TEMPLATES: TemplateDef[] = [
  {
    id: 'welcome',
    category: 'welcome',
    label: 'Welcome',
    description: 'Sent when a school account is created.',
    wired: true,
    subject: 'Welcome to Chora, {{firstName}}',
    heading: 'Welcome to Chora',
    paragraphs: [
      'Hi {{firstName}},',
      '{{schoolName}} now has a Chora workspace. Sign in with the school code your administrator shared.',
    ],
    actionLabel: 'Open Chora',
    sample: {
      firstName: 'Sara',
      schoolName: 'Everest Youth Academy',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'email_verification',
    category: 'email_verification',
    label: 'Email verification',
    description:
      'Ready for a verification flow. Chora does not issue verification links today.',
    wired: false,
    subject: 'Confirm your Chora email',
    heading: 'Confirm your email',
    paragraphs: [
      'Hi {{firstName}},',
      'Confirm this address so Chora can send account notices for {{schoolName}}.',
    ],
    actionLabel: 'Confirm email',
    sample: {
      firstName: 'Sara',
      schoolName: 'Everest Youth Academy',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'password_reset',
    category: 'password_reset',
    label: 'Password reset',
    description:
      'Ready for a reset flow. Chora does not issue reset links today.',
    wired: false,
    subject: 'Reset your Chora password',
    heading: 'Reset your password',
    paragraphs: [
      'Hi {{firstName}},',
      'A password reset was requested for your Chora account. If you did not ask for this, you can ignore this email.',
    ],
    actionLabel: 'Choose a new password',
    sample: {
      firstName: 'Sara',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'account_invitation',
    category: 'account_invitation',
    label: 'Account invitation',
    description: 'Sent when a platform operator is invited.',
    wired: true,
    subject: 'You are invited to the Chora platform console',
    heading: 'You are invited',
    paragraphs: [
      'Hi {{firstName}},',
      '{{actorName}} invited you as a {{roleLabel}} operator on Chora. The link expires in 7 days.',
      'If you did not expect this invite, you can ignore this email.',
    ],
    actionLabel: 'Accept invite',
    sample: {
      firstName: 'Hana',
      actorName: 'owner@awuddigitals.com',
      roleLabel: 'Support',
      actionUrl: 'https://chora.awuddigitals.com/platform/invite/example',
    },
  },
  {
    id: 'password_change',
    category: 'password_change',
    label: 'Password change',
    description: 'Sent after an account password is changed.',
    wired: true,
    subject: 'Your Chora password was changed',
    heading: 'Password changed',
    paragraphs: [
      'Hi {{firstName}},',
      'The password for your Chora account was just changed. If you made this change, no further action is needed.',
      'If you did not change it, contact your school administrator.',
    ],
    sample: { firstName: 'Sara' },
  },
  {
    id: 'student_absence',
    category: 'student_absence',
    label: 'Student absence',
    description: 'Sent to linked parents when attendance is marked absent.',
    wired: true,
    subject: 'Absence notice for {{childName}}',
    heading: 'Absence recorded',
    paragraphs: [
      'Hi {{firstName}},',
      '{{childName}} was marked absent at {{schoolName}}.',
    ],
    details: [
      { label: 'Date', valueKey: 'dateLabel' },
      { label: 'Class', valueKey: 'gradeSection' },
    ],
    actionLabel: 'View attendance',
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      schoolName: 'Everest Youth Academy',
      dateLabel: 'Nov 24, 2026',
      gradeSection: 'Grade 4-A',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'student_late',
    category: 'student_late',
    label: 'Late arrival',
    description: 'Sent to linked parents when attendance is marked late.',
    wired: true,
    subject: 'Late arrival notice for {{childName}}',
    heading: 'Late arrival recorded',
    paragraphs: [
      'Hi {{firstName}},',
      '{{childName}} was marked late at {{schoolName}}.',
    ],
    details: [
      { label: 'Date', valueKey: 'dateLabel' },
      { label: 'Class', valueKey: 'gradeSection' },
    ],
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      schoolName: 'Everest Youth Academy',
      dateLabel: 'Nov 24, 2026',
      gradeSection: 'Grade 4-A',
    },
  },
  {
    id: 'announcement',
    category: 'announcement',
    label: 'Announcement',
    description: 'Sent when a school publishes an announcement.',
    wired: true,
    subject: '{{schoolName}}: {{title}}',
    heading: '{{title}}',
    paragraphs: ['Hi {{firstName}},', '{{message}}'],
    actionLabel: 'Open Chora',
    sample: {
      firstName: 'Marta',
      schoolName: 'Everest Youth Academy',
      title: 'Parent meeting',
      message: 'The term parent meeting is on Friday. Details are in Chora.',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'examination',
    category: 'examination',
    label: 'Examination',
    description: 'Sent when an exam timetable is published.',
    wired: true,
    subject: 'Examination timetable published — {{title}}',
    heading: 'Examination timetable',
    paragraphs: [
      'Hi {{firstName}},',
      '{{schoolName}} published the examination timetable “{{title}}”. Dates and subjects are in Chora. This email does not include seating or scores.',
    ],
    details: [{ label: 'Dates', valueKey: 'dateRange' }],
    actionLabel: 'View timetable',
    sample: {
      firstName: 'Marta',
      schoolName: 'Everest Youth Academy',
      title: 'First term finals',
      dateRange: 'Jan 12 – Jan 16',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'results_published',
    category: 'results_published',
    label: 'Results published',
    description: 'Sent when published results are shared with parents.',
    wired: true,
    subject: 'Results published for {{childName}}',
    heading: 'Results are available',
    paragraphs: [
      'Hi {{firstName}},',
      '{{message}} Scores stay in the parent portal and are not included in this email.',
    ],
    actionLabel: 'Open results',
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      message: 'Mathematics results for Liya are published for Term 1.',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'report_card',
    category: 'report_card',
    label: 'Report card',
    description: 'Sent when an official report card becomes available.',
    wired: true,
    subject: 'Report card available for {{childName}}',
    heading: 'Report card ready',
    paragraphs: [
      'Hi {{firstName}},',
      'The official report card for {{childName}} at {{schoolName}} is available in Chora. Grades are not included in this email.',
    ],
    details: [{ label: 'Term', valueKey: 'termName' }],
    actionLabel: 'Open report card',
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      schoolName: 'Everest Youth Academy',
      termName: 'Term 1',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'payment_confirmation',
    category: 'payment_confirmation',
    label: 'Payment confirmation',
    description:
      'Confirmation copy. Live payments send the receipt template so parents receive one email.',
    wired: false,
    subject: 'Payment confirmed for {{childName}}',
    heading: 'Payment confirmed',
    paragraphs: [
      'Hi {{firstName}},',
      '{{schoolName}} confirmed a payment of {{amount}} ETB for {{childName}}.',
    ],
    details: [{ label: 'Receipt', valueKey: 'receiptNumber' }],
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      schoolName: 'Everest Youth Academy',
      amount: '1,500',
      receiptNumber: 'RCT-1001',
    },
  },
  {
    id: 'payment_receipt',
    category: 'payment_receipt',
    label: 'Payment receipt',
    description: 'Sent when finance verifies a parent payment.',
    wired: true,
    subject: 'Receipt {{receiptNumber}} for {{childName}}',
    heading: 'Payment receipt',
    paragraphs: [
      'Hi {{firstName}},',
      '{{schoolName}} verified a payment of {{amount}} ETB for {{childName}}. Keep this receipt number for your records.',
    ],
    details: [{ label: 'Receipt', valueKey: 'receiptNumber' }],
    actionLabel: 'View finance',
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      schoolName: 'Everest Youth Academy',
      amount: '1,500',
      receiptNumber: 'RCT-1001',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'payment_reminder',
    category: 'payment_reminder',
    label: 'Payment reminder',
    description:
      'Template only. Chora has no outstanding-balance reminder job yet.',
    wired: false,
    subject: 'Payment reminder from {{schoolName}}',
    heading: 'Outstanding balance',
    paragraphs: [
      'Hi {{firstName}},',
      '{{schoolName}} has an outstanding balance for {{childName}}. Sign in to Chora for the amount and payment instructions.',
    ],
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      schoolName: 'Everest Youth Academy',
    },
  },
  {
    id: 'payment_failed',
    category: 'payment_failed',
    label: 'Payment failed',
    description:
      'Template only. Rejected payments are recorded in finance without a parent email today.',
    wired: false,
    subject: 'Payment not completed',
    heading: 'Payment not completed',
    paragraphs: [
      'Hi {{firstName}},',
      'A payment for {{childName}} at {{schoolName}} was not completed. Contact the school finance office if you need help.',
    ],
    sample: {
      firstName: 'Marta',
      childName: 'Liya',
      schoolName: 'Everest Youth Academy',
    },
  },
  {
    id: 'subscription_activation',
    category: 'subscription_activation',
    label: 'Subscription activation',
    description: 'Sent to school admins when a paid subscription is activated.',
    wired: true,
    subject: '{{schoolName}} subscription is active',
    heading: 'Subscription active',
    paragraphs: [
      'Hi {{firstName}},',
      'The {{plan}} plan for {{schoolName}} is active through {{periodEnd}}.',
    ],
    sample: {
      firstName: 'Sara',
      schoolName: 'Everest Youth Academy',
      plan: 'PROFESSIONAL',
      periodEnd: '2027-11-24',
    },
  },
  {
    id: 'subscription_expiration',
    category: 'subscription_expiration',
    label: 'Subscription expiration',
    description:
      'Template only. Chora has no expiration reminder scheduler yet.',
    wired: false,
    subject: '{{schoolName}} subscription is ending',
    heading: 'Subscription ending',
    paragraphs: [
      'Hi {{firstName}},',
      'The subscription for {{schoolName}} ends on {{periodEnd}}. Sign in to renew.',
    ],
    actionLabel: 'Review billing',
    sample: {
      firstName: 'Sara',
      schoolName: 'Everest Youth Academy',
      periodEnd: '2027-11-24',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'trial_activation',
    category: 'trial_activation',
    label: 'Trial activation',
    description: 'Sent when a new school trial starts.',
    wired: true,
    subject: 'Your Chora trial is active',
    heading: 'Trial started',
    paragraphs: [
      'Hi {{firstName}},',
      'The trial for {{schoolName}} is active. You can invite staff and enroll students from the admin workspace.',
    ],
    actionLabel: 'Open Chora',
    sample: {
      firstName: 'Sara',
      schoolName: 'Everest Youth Academy',
      actionUrl: 'https://chora.awuddigitals.com',
    },
  },
  {
    id: 'school_decision',
    category: 'school_decision',
    label: 'School status',
    description:
      'Sent when a platform operator activates or suspends a school.',
    wired: true,
    subject: '{{schoolName}} status: {{statusLabel}}',
    heading: 'School status updated',
    paragraphs: ['Hi {{firstName}},', '{{message}}'],
    sample: {
      firstName: 'Sara',
      schoolName: 'Everest Youth Academy',
      statusLabel: 'Active',
      message: 'Your school is active on Chora.',
    },
  },
  {
    id: 'security_alert',
    category: 'security_alert',
    label: 'Security alert',
    description:
      'Template only. Chora does not yet detect suspicious sign-ins.',
    wired: false,
    subject: 'Chora security notice',
    heading: 'Security notice',
    paragraphs: [
      'Hi {{firstName}},',
      '{{message}} If this was not you, reset access with your school administrator.',
    ],
    sample: {
      firstName: 'Sara',
      message: 'A new sign-in was noticed on your Chora account.',
    },
  },
  {
    id: 'support_confirmation',
    category: 'support_confirmation',
    label: 'Support request',
    description: 'Sent to the person who opened a support ticket.',
    wired: true,
    subject: 'We received your support request',
    heading: 'Support request received',
    paragraphs: [
      'Hi {{firstName}},',
      'Chora support received “{{title}}” from {{schoolName}}. A reply will appear in your school support inbox.',
    ],
    sample: {
      firstName: 'Sara',
      title: 'Cannot publish results',
      schoolName: 'Everest Youth Academy',
    },
  },
  {
    id: 'test',
    category: 'test',
    label: 'SMTP test',
    description:
      'Used by the platform console to authenticate and deliver a real test message.',
    wired: true,
    subject: 'Chora SMTP test',
    heading: 'SMTP test',
    paragraphs: [
      'This message confirms that Chora authenticated to Awud Digitals mail and delivered a message from {{sender}}.',
    ],
    sample: { sender: 'contact@awuddigitals.com' },
  },
];

function fill(
  template: string,
  vars: Record<string, string>,
  html: boolean,
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key: string) => {
      const value = vars[key] ?? '';
      return html ? escapeHtml(value) : value;
    },
  );
}

export function findTemplate(id: string): TemplateDef | undefined {
  return EMAIL_TEMPLATES.find((template) => template.id === id);
}

export function listTemplateCatalog() {
  return EMAIL_TEMPLATES.map((template) => ({
    id: template.id,
    category: template.category,
    label: template.label,
    description: template.description,
    wired: template.wired,
  }));
}

export function renderTemplate(
  id: string,
  vars: Record<string, string>,
): { subject: string; html: string; text: string } {
  const template = findTemplate(id);
  if (!template) {
    throw new Error('Unknown email template');
  }

  const subject = sanitizeHeader(fill(template.subject, vars, false)).slice(
    0,
    180,
  );
  const heading = fill(template.heading, vars, true);
  const paragraphs = template.paragraphs.map((paragraph) =>
    fill(paragraph, vars, true),
  );
  const textParagraphs = template.paragraphs.map((paragraph) =>
    fill(paragraph, vars, false),
  );
  const details = (template.details ?? [])
    .map((detail) => ({
      label: detail.label,
      value: vars[detail.valueKey]?.trim() ?? '',
    }))
    .filter((detail) => detail.value);
  const actionUrl = isSafeHttpUrl(vars.actionUrl ?? '') ? vars.actionUrl : '';
  const actionLabel =
    template.actionLabel && actionUrl ? template.actionLabel : '';

  const detailHtml = details
    .map(
      (detail) =>
        `<tr><td style="padding:8px 0;color:#5b6b69;font-size:14px;">${escapeHtml(detail.label)}</td><td style="padding:8px 0;color:#163330;font-size:14px;font-weight:600;">${escapeHtml(detail.value)}</td></tr>`,
    )
    .join('');
  const button = actionLabel
    ? `<p style="margin:28px 0;"><a href="${escapeHtml(actionUrl)}" style="background:${TEAL};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;">${escapeHtml(actionLabel)}</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;color:#163330;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${TEAL};padding:22px 28px;color:#ffffff;">
<p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Chora</p>
<p style="margin:6px 0 0;font-size:20px;font-weight:700;line-height:1.3;">${heading}</p>
</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.6;">
${paragraphs.map((paragraph) => `<p style="margin:0 0 14px;">${paragraph}</p>`).join('')}
${detailHtml ? `<table role="presentation" width="100%" style="margin-top:8px;">${detailHtml}</table>` : ''}
${button}
</td></tr>
<tr><td style="padding:18px 28px 24px;background:#f7fbfa;color:#5b6b69;font-size:13px;line-height:1.5;">
Chora is a product of Awud Digitals.<br />
This is a transactional message about your school account.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    fill(template.heading, vars, false),
    '',
    ...textParagraphs,
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
    actionLabel ? `${actionLabel}: ${actionUrl}` : '',
    '',
    'Chora is a product of Awud Digitals.',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject, html, text };
}
