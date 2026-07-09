"use client";

export type JoinRole = "teacher" | "student" | "parent";

const ROLES: { value: JoinRole; label: string; desc: string }[] = [
  { value: "teacher", label: "Teacher", desc: "Classes & grades" },
  { value: "student", label: "Student", desc: "Your school work" },
  { value: "parent", label: "Parent", desc: "Track your child" },
];

type JoinRoleSelectorProps = {
  value: JoinRole;
  onChange: (role: JoinRole) => void;
  compact?: boolean;
  variant?: "default" | "join";
};

export function JoinRoleSelector({
  value,
  onChange,
  compact,
  variant = "default",
}: JoinRoleSelectorProps) {
  const gridClass =
    variant === "join"
      ? "join-role-grid"
      : `auth-role-grid${compact ? " auth-role-grid--compact" : ""}`;
  const pillClass = variant === "join" ? "join-role-pill" : "auth-role-pill";
  const activeClass =
    variant === "join" ? " join-role-pill--active" : " auth-role-pill--active";

  return (
    <div className={gridClass} role="radiogroup" aria-label="Your role">
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          role="radio"
          aria-checked={value === r.value}
          className={`${pillClass}${value === r.value ? activeClass : ""}`}
          onClick={() => onChange(r.value)}
        >
          <span className={variant === "join" ? "join-role-pill__label" : "auth-role-pill-label"}>
            {r.label}
          </span>
          <span className={variant === "join" ? "join-role-pill__desc" : "auth-role-pill-desc"}>
            {r.desc}
          </span>
        </button>
      ))}
    </div>
  );
}
