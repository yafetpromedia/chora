"use client";

const CAPABILITIES = [
  "Daily attendance",
  "Period attendance",
  "Report cards",
  "Fee schedules",
  "Parent portal",
  "Staff roles",
  "Campus ID cards",
  "Announcements",
  "USD & ETB billing",
  "Multi-grade setup",
  "Telebirr-ready fees",
  "Academic years",
];

export function TrustMarquee() {
  const items = [...CAPABILITIES, ...CAPABILITIES];

  return (
    <section className="marquee-wrap lp-marquee" aria-label="Platform capabilities">
      <p className="lp-marquee__label">What you can run on CampusOne</p>
      <div className="relative overflow-hidden">
        <div className="marquee-fade-left" aria-hidden />
        <div className="marquee-fade-right" aria-hidden />
        <div className="marquee-track">
          {items.map((name, i) => (
            <span key={`${name}-${i}`} className="marquee-item">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
