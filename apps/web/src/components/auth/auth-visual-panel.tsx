"use client";

import { ProductPreview } from "@/components/product-preview";

const BULLETS = [
  "Each school gets its own secure workspace",
  "Admins invite teachers, students & parents",
  "Everyone joins with a school code — not open signup",
];

export function AuthVisualPanel() {
  return (
    <div className="auth-visual">
      <p className="auth-visual-label">Multi-school platform</p>
      <h2 className="auth-visual-heading">
        One platform — <span>many schools, fully separated</span>
      </h2>

      <ul className="auth-visual-list">
        {BULLETS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="auth-visual-preview">
        <ProductPreview />
      </div>
    </div>
  );
}
