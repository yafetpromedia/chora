"use client";

import { telHref } from "@/lib/student-photo";

type ContactRowProps = {
  label: string;
  name?: string;
  phone?: string | null;
};

export function StudentContactLinks({ label, name, phone }: ContactRowProps) {
  const tel = telHref(phone);
  if (!phone?.trim() && !name) return null;

  return (
    <div className="stu-contact-row">
      <div className="stu-contact-row__info">
        <span className="stu-contact-row__label">{label}</span>
        {name ? <span className="stu-contact-row__name">{name}</span> : null}
        {phone ? <span className="stu-contact-row__phone">{phone}</span> : null}
      </div>
      {tel ? (
        <div className="stu-contact-row__actions">
          <a href={tel} className="stu-contact-btn">
            Call
          </a>
          <a href={`sms:${tel.replace("tel:", "")}`} className="stu-contact-btn stu-contact-btn--muted">
            SMS
          </a>
        </div>
      ) : null}
    </div>
  );
}
