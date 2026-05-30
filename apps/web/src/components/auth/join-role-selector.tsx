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
};

export function JoinRoleSelector({ value, onChange }: JoinRoleSelectorProps) {
  return (
    <div className="auth-role-grid" role="radiogroup" aria-label="Your role">
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          role="radio"
          aria-checked={value === r.value}
          className={`auth-role-pill${value === r.value ? " auth-role-pill--active" : ""}`}
          onClick={() => onChange(r.value)}
        >
          <span className="auth-role-pill-label">{r.label}</span>
          <span className="auth-role-pill-desc">{r.desc}</span>
        </button>
      ))}
    </div>
  );
}
