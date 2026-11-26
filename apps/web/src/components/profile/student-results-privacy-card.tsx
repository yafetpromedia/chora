"use client";

import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "@/lib/profile";
import { AppToast } from "@/components/ui/app-toast";
import { useLocale } from "@/components/i18n/locale-provider";

export function StudentResultsPrivacyCard() {
  const { t } = useLocale();
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void getMyProfile()
      .then((data) => {
        if (data.student) {
          setAllowed(data.student.parentsCanViewResults !== false);
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : t("studentResultsPrivacyUi.loadFailed"),
        ),
      )
      .finally(() => setLoading(false));
  }, [t]);

  async function onToggle(next: boolean) {
    setSaving(true);
    setError("");
    setToast(null);
    try {
      const updated = await updateMyProfile({ parentsCanViewResults: next });
      setAllowed(updated.student?.parentsCanViewResults !== false);
      setToast(
        next
          ? t("studentResultsPrivacyUi.toastEnabled")
          : t("studentResultsPrivacyUi.toastDisabled"),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("studentResultsPrivacyUi.updateFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="profile-card">
        <p className="profile-card__sub">{t("studentResultsPrivacyUi.loading")}</p>
      </section>
    );
  }

  return (
    <section
      className="profile-card"
      aria-label={t("studentResultsPrivacyUi.ariaLabel")}
    >
      <div className="profile-card__head">
        <div>
          <h3 className="profile-card__title">{t("studentResultsPrivacyUi.title")}</h3>
          <p className="profile-card__sub">{t("studentResultsPrivacyUi.sub")}</p>
        </div>
      </div>

      {error ? <p className="auth-alert auth-alert--error">{error}</p> : null}

      <label className="profile-privacy-toggle">
        <input
          type="checkbox"
          checked={allowed}
          disabled={saving}
          onChange={(e) => void onToggle(e.target.checked)}
        />
        <span>
          <strong>{t("studentResultsPrivacyUi.toggleTitle")}</strong>
          <small>
            {allowed
              ? t("studentResultsPrivacyUi.toggleOnSub")
              : t("studentResultsPrivacyUi.toggleOffSub")}
          </small>
        </span>
      </label>

      <AppToast message={toast ?? ""} tone="success" onDismiss={() => setToast(null)} />
    </section>
  );
}