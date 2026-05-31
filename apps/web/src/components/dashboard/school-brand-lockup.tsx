"use client";

type Props = {
  schoolName: string;
  schoolLogoUrl: string | null;
  roleLabel?: string;
  compact?: boolean;
};

export function SchoolBrandLockup({ schoolName, schoolLogoUrl, roleLabel, compact }: Props) {
  return (
    <div className={`dash-brand-lockup${compact ? " dash-brand-lockup--compact" : ""}`}>
      <div className="dash-brand-lockup__logos" aria-hidden>
        <span className="logo-mark logo-mark--sidebar-pro dash-brand-lockup__c1">C1</span>
        {schoolLogoUrl ? (
          <>
            <span className="dash-brand-lockup__sep" />
            <img
              src={schoolLogoUrl}
              alt=""
              className="dash-brand-lockup__school-img"
            />
          </>
        ) : null}
      </div>
      <div className="dash-brand-lockup__text">
        <span className="dash-sidebar-title">CampusOne</span>
        <span className="dash-brand-lockup__school-name" title={schoolName}>
          {schoolName}
        </span>
        {!compact && roleLabel ? (
          <span className="dash-sidebar-role">{roleLabel}</span>
        ) : null}
      </div>
    </div>
  );
}
