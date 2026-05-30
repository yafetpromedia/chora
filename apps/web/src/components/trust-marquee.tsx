"use client";

const SCHOOLS = [
  "Riverside Academy",
  "Northgate High",
  "Greenfield Intl",
  "Summit Prep",
  "Oakwood District",
  "Beacon College",
  "Lakeview School",
  "Heritage Academy",
];

export function TrustMarquee() {
  const items = [...SCHOOLS, ...SCHOOLS];

  return (
    <section className="marquee-wrap py-8" aria-label="Schools using School OS">
      <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] c-faint">
        Trusted by forward-thinking schools
      </p>
      <div className="relative overflow-hidden">
        <div className="marquee-fade-left" aria-hidden />
        <div className="marquee-fade-right" aria-hidden />
        <div className="marquee-track">
          {items.map((name, i) => (
            <span key={`${name}-${i}`} className="marquee-item">
              <span className="marquee-dot" />
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
