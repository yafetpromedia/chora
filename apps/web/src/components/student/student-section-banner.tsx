type Stat = {
  value: string | number;
  label: string;
};

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  stats?: Stat[];
  tone?: "progress" | "ai" | "results";
  icon?: string;
};

export function StudentSectionBanner({
  eyebrow,
  title,
  subtitle,
  stats,
  tone = "progress",
  icon,
}: Props) {
  return (
    <header className={`stu-banner stu-banner--${tone}`}>
      <div className="stu-banner__main">
        <div className="stu-banner__brand">
          <span className="stu-banner__chip">{eyebrow}</span>
          {icon ? (
            <span className="stu-banner__icon" aria-hidden>
              {icon}
            </span>
          ) : null}
        </div>
        <h2 className="stu-banner__title">{title}</h2>
        <p className="stu-banner__sub">{subtitle}</p>
      </div>
      {stats?.length ? (
        <div className="stu-banner__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="stu-banner__stat">
              <span className="stu-banner__stat-value">{stat.value}</span>
              <span className="stu-banner__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}
