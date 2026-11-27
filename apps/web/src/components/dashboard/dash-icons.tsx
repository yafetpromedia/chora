type IconProps = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export type DashIconName =
  | "overview"
  | "students"
  | "teachers"
  | "attendance"
  | "results"
  | "subjects"
  | "assign"
  | "report-card"
  | "templates"
  | "finance"
  | "announcements"
  | "settings"
  | "fees"
  | "menu"
  | "logout"
  | "chevron"
  | "alert"
  | "calendar"
  | "users"
  | "profile"
  | "chart"
  | "plus"
  | "arrow"
  | "library"
  | "building"
  | "flask"
  | "globe"
  | "monitor"
  | "palette"
  | "mail"
  | "message"
  | "support"
  | "eye"
  | "sparkle"
  | "upload"
  | "id-card";

export function DashIcon({ name, className }: { name: DashIconName; className?: string }) {
  const p = { ...base, className: className ?? "dash-icon" };
  switch (name) {
    case "overview":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "students":
      return (
        <svg {...p}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "teachers":
      return (
        <svg {...p}>
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 0 1 .665 6.479A11.952 11.952 0 0 0 12 20.055a11.952 11.952 0 0 0-6.824-2.998 12.078 12.078 0 0 1 .665-6.479L12 14z" />
        </svg>
      );
    case "attendance":
      return (
        <svg {...p}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "results":
      return (
        <svg {...p}>
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      );
    case "subjects":
      return (
        <svg {...p}>
          <path d="M12 3 2 8l10 5 10-5-10-5z" />
          <path d="M2 13l10 5 10-5" />
          <path d="M2 18l10 5 10-5" />
        </svg>
      );
    case "assign":
      return (
        <svg {...p}>
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="17" r="3" />
          <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
        </svg>
      );
    case "report-card":
      return (
        <svg {...p}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="14" y2="16" />
          <path d="M8 8h3" />
        </svg>
      );
    case "templates":
      return (
        <svg {...p}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M7 8l1.5 1.5L11 7" />
          <line x1="12" y1="8.5" x2="17" y2="8.5" />
          <path d="M7 12l1.5 1.5L11 11" />
          <line x1="12" y1="12.5" x2="17" y2="12.5" />
          <path d="M7 16l1.5 1.5L11 15" />
          <line x1="12" y1="16.5" x2="15" y2="16.5" />
        </svg>
      );
    case "finance":
      return (
        <svg {...p}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "announcements":
      return (
        <svg {...p}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    case "fees":
      return (
        <svg {...p}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "menu":
      return (
        <svg {...p}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case "logout":
      return (
        <svg {...p}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...p}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case "alert":
      return (
        <svg {...p}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "users":
      return <DashIcon name="students" className={className} />;
    case "profile":
      return (
        <svg {...p}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <polyline points="3 17 9 11 13 15 21 7" />
          <line x1="3" y1="21" x2="21" y2="21" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...p}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case "library":
      return (
        <svg {...p}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="12" y1="6" x2="12" y2="14" />
          <line x1="8" y1="10" x2="16" y2="10" />
        </svg>
      );
    case "building":
      return (
        <svg {...p}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-6h6v6" />
          <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
        </svg>
      );
    case "flask":
      return (
        <svg {...p}>
          <path d="M9 3h6" />
          <path d="M10 3v5.5L5 18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l-5-9.5V3" />
          <path d="M8.5 14h7" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...p}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "palette":
      return (
        <svg {...p}>
          <circle cx="13.5" cy="6.5" r="1.5" />
          <circle cx="17.5" cy="10.5" r="1.5" />
          <circle cx="8.5" cy="7.5" r="1.5" />
          <circle cx="6.5" cy="12.5" r="1.5" />
          <path d="M12 2a10 10 0 1 0 10 10c0-2.5-2.5-3-5-3s-3 1.5-5 1.5-2-1-2-3.5A10 10 0 0 0 12 2z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...p}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 7L2 7" />
        </svg>
      );
    case "message":
      return (
        <svg {...p}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "support":
      return (
        <svg {...p}>
          <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
          <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...p}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...p}>
          <path d="M12 3l1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6L12 3z" />
          <path d="M19 14l.7 2.1L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.9L19 14z" />
          <path d="M5 15l.6 1.8L7.5 17.5 5.6 18.1 5 20l-.6-1.9L2.5 17.5l1.9-.7L5 15z" />
        </svg>
      );
    case "upload":
      return (
        <svg {...p}>
          <path d="M12 16V5" />
          <polyline points="7 10 12 5 17 10" />
          <path d="M4 19h16" />
        </svg>
      );
    case "id-card":
      return (
        <svg {...p}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <circle cx="8" cy="12" r="2" />
          <path d="M14 10h4M14 14h4" />
        </svg>
      );
    default:
      return null;
  }
}
