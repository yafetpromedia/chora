import { apiFetch, apiPatch } from "@/lib/api";

export type SchoolEmailPreferences = {
  absenceEnabled: boolean;
  lateEnabled: boolean;
  examinationEnabled: boolean;
  announcementEnabled: boolean;
  paymentReminderEnabled: boolean;
  paymentConfirmationEnabled: boolean;
  reportCardEnabled: boolean;
};

export type ParentEmailPreferences = SchoolEmailPreferences & {
  enabled: boolean;
};

export const EMAIL_PREFERENCE_FIELDS: {
  key: keyof SchoolEmailPreferences;
  label: string;
  hint: string;
}[] = [
  {
    key: "absenceEnabled",
    label: "Absence notices",
    hint: "Email linked parents when a student is marked absent.",
  },
  {
    key: "lateEnabled",
    label: "Late arrival notices",
    hint: "Email linked parents when a student is marked late.",
  },
  {
    key: "examinationEnabled",
    label: "Examinations and results",
    hint: "Email parents when a timetable is published or results are released.",
  },
  {
    key: "announcementEnabled",
    label: "Announcements",
    hint: "Email parents when the school publishes an announcement.",
  },
  {
    key: "paymentConfirmationEnabled",
    label: "Payment receipts",
    hint: "Email parents when finance verifies a payment.",
  },
  {
    key: "paymentReminderEnabled",
    label: "Payment reminders",
    hint: "Reserved for outstanding-balance reminders. No reminder job runs yet.",
  },
  {
    key: "reportCardEnabled",
    label: "Report cards",
    hint: "Email parents when an official report card is available.",
  },
];

export function getSchoolEmailPreferences() {
  return apiFetch<SchoolEmailPreferences>("/schools/email-preferences");
}

export function updateSchoolEmailPreferences(body: Partial<SchoolEmailPreferences>) {
  return apiPatch<SchoolEmailPreferences>("/schools/email-preferences", body);
}

export function getParentEmailPreferences() {
  return apiFetch<ParentEmailPreferences>("/notifications/email-preferences");
}

export function updateParentEmailPreferences(body: Partial<ParentEmailPreferences>) {
  return apiPatch<ParentEmailPreferences>("/notifications/email-preferences", body);
}
