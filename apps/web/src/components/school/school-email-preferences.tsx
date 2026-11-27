"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashIcon } from "@/components/dashboard/dash-icons";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import {
  EMAIL_PREFERENCE_FIELDS,
  getSchoolEmailPreferences,
  updateSchoolEmailPreferences,
  type SchoolEmailPreferences,
} from "@/lib/email-preferences";
import type { MessageKey } from "@/lib/i18n";

export function SchoolEmailPreferences() {
  const { t } = useLocale();
  const [prefs, setPrefs] = useState<SchoolEmailPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void getSchoolEmailPreferences()
      .then(setPrefs)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : t("schoolEmailPreferencesUi.loadFailed"),
        );
      });
  }, []);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateSchoolEmailPreferences(prefs);
      setPrefs(updated);
      setToast(t("schoolEmailPreferencesUi.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("schoolEmailPreferencesUi.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function prefLabel(key: keyof SchoolEmailPreferences) {
    return t(`schoolEmailPreferencesUi.pref_${key}` as MessageKey);
  }

  function prefHint(key: keyof SchoolEmailPreferences) {
    return t(`schoolEmailPreferencesUi.pref_${key}_hint` as MessageKey);
  }

  return (
    <section className="set-v2__panel">
      <div className="set-v2__panel-head">
        <span className="set-v2__panel-icon" aria-hidden>
          <DashIcon name="announcements" className="dash-icon--sm" />
        </span>
        <div>
          <h2 className="set-v2__panel-title">{t("schoolEmailPreferencesUi.title")}</h2>
          <p className="set-v2__panel-sub">{t("schoolEmailPreferencesUi.sub")}</p>
        </div>
      </div>
      <AppToast message={error} tone="error" onDismiss={() => setError("")} />
      <AppToast message={toast} tone="success" onDismiss={() => setToast(null)} />
      {!prefs && !error ? (
        <p className="set-v2__panel-sub">{t("schoolEmailPreferencesUi.loading")}</p>
      ) : null}
      {!prefs && error ? (
        <p className="set-v2__panel-sub">{t("schoolEmailPreferencesUi.loadError")}</p>
      ) : null}
      {prefs ? (
        <form className="cfg-form" onSubmit={(event) => void onSave(event)}>
          {EMAIL_PREFERENCE_FIELDS.map((field) => (
            <label className="cfg-field" key={field.key}>
              <span>
                <input
                  type="checkbox"
                  checked={prefs[field.key]}
                  onChange={(event) =>
                    setPrefs({ ...prefs, [field.key]: event.target.checked })
                  }
                />{" "}
                {prefLabel(field.key)}
              </span>
              <p className="set-v2__panel-sub">{prefHint(field.key)}</p>
            </label>
          ))}
          <button className="cfg-btn cfg-btn--primary" type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("schoolEmailPreferencesUi.saveBtn")}
          </button>
        </form>
      ) : null}
    </section>
  );
}