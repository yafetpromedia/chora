"use client";

import type { UserRole } from "@/lib/auth";

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: "parent", label: "Parent", desc: "Track your child" },
  { value: "teacher", label: "Teacher", desc: "Classes & grades" },
  { value: "student", label: "Student", desc: "Your schedule" },
  { value: "admin", label: "Admin", desc: "Run the school" },
];

type RoleSelectorProps = {
  value: UserRole;
  onChange: (role: UserRole) => void;
};

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
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
