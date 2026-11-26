"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import {
  EMAIL_PREFERENCE_FIELDS,
  getParentEmailPreferences,
  updateParentEmailPreferences,
  type ParentEmailPreferences,
} from "@/lib/email-preferences";

export function ParentEmailPreferences() {
  const { t } = useLocale();
  const [prefs, setPrefs] = useState<ParentEmailPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void getParentEmailPreferences()
      .then(setPrefs)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : t("profile.emailPrefsLoadFailed"),
        );
      });
  }, [t]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setError("");
    try {
      setPrefs(await updateParentEmailPreferences(prefs));
      setToast(t("profile.emailPrefsSaved"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("profile.emailPrefsLoadFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-card">
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />
      <div className="profile-card__head">
        <div>
          <h3 className="profile-card__title">{t("profile.emailFromSchool")}</h3>
          <p className="profile-card__sub">{t("profile.emailFromSchoolSub")}</p>
        </div>
        <span className="profile-card__icon" aria-hidden>
          <DashIcon name="announcements" />
        </span>
      </div>

      {!prefs && !error ? (
        <p className="profile-facts__empty">{t("profile.loadingEmailPrefs")}</p>
      ) : null}
      {!prefs && error ? (
        <p className="profile-facts__empty">{t("profile.emailPrefsLoadFailed")}</p>
      ) : null}

      {prefs ? (
        <form className="par-email-form" onSubmit={(event) => void onSave(event)}>
          <label className="par-email-toggle">
            <input
              type="checkbox"
              checked={prefs.enabled}
              onChange={(event) =>
                setPrefs({ ...prefs, enabled: event.target.checked })
              }
            />
            <span>
              <strong>{t("profile.sendEmails")}</strong>
              <small>{t("profile.sendEmailsHint")}</small>
            </span>
          </label>

          <div className="par-email-grid">
            {EMAIL_PREFERENCE_FIELDS.map((field) => (
              <label
                key={field.key}
                className={`par-email-option${!prefs.enabled ? " par-email-option--off" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={prefs[field.key]}
                  disabled={!prefs.enabled}
                  onChange={(event) =>
                    setPrefs({ ...prefs, [field.key]: event.target.checked })
                  }
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>

          <div className="profile-form__actions">
            <button className="profile-btn" type="submit" disabled={saving}>
              {saving ? t("common.saving") : t("profile.saveEmailPrefs")}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}