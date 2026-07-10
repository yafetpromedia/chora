/** Inline SVG icons — no text labels, always visible */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconAttendance() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function IconGrades() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

export function IconAnnouncements() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M4 10v4" />
      <path d="M8 8v8" />
      <path d="M12 6v12" />
      <path d="M16 4v16" />
    </svg>
  );
}

export function IconParents() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconAdmin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

export function IconFinance() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function IconLibrary() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="12" y1="6" x2="12" y2="14" />
      <line x1="8" y1="10" x2="16" y2="10" />
    </svg>
  );
}

export function IconTimetable() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h2v2H8z" />
      <path d="M14 14h2v2h-2z" />
    </svg>
  );
}

export function IconSecurity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
