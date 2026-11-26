"use client";

import { ProductPreview } from "@/components/product-preview";
import { useLocale } from "@/components/i18n/locale-provider";

export function AuthVisualPanel() {
  const { t } = useLocale();
  const bullets = [
    t("authVisualPanelUi.bullet1"),
    t("authVisualPanelUi.bullet2"),
    t("authVisualPanelUi.bullet3"),
  ];

  return (
    <div className="auth-visual">
      <p className="auth-visual-label">{t("authVisualPanelUi.label")}</p>
      <h2 className="auth-visual-heading">
        {t("authVisualPanelUi.heading")}
        <span>{t("authVisualPanelUi.headingAccent")}</span>
      </h2>

      <ul className="auth-visual-list">
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="auth-visual-preview">
        <ProductPreview />
      </div>
    </div>
  );
}