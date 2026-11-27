"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { fetchCurriculumPackages, type CurriculumPackageOption } from "@/lib/api";
import { platformFetch } from "@/lib/platform-auth";
import { AppToast } from "@/components/ui/app-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateSchoolDrawer({ open, onClose, onCreated }: Props) {
  const { t } = useLocale();
  const [schoolName, setSchoolName] = useState("");
  const [country, setCountry] = useState("Ethiopia");
  const [curriculumPackageKey, setCurriculumPackageKey] = useState("ETHIOPIAN_PRIVATE");
  const [packages, setPackages] = useState<CurriculumPackageOption[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchCurriculumPackages()
      .then(setPackages)
      .catch(() => undefined);
  }, [open]);

  if (!open) return null;

  function reset() {
    setSchoolName("");
    setCountry("Ethiopia");
    setAdminEmail("");
    setAdminFirstName("");
    setAdminLastName("");
    setAdminPassword("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await platformFetch("/platform/schools", {
        method: "POST",
        body: JSON.stringify({
          schoolName,
          country: country || undefined,
          curriculumPackageKey,
          adminEmail,
          adminFirstName,
          adminLastName,
          adminPassword,
        }),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platformUi.errCreateTenant"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="stu-drawer-backdrop"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <aside
        className="stu-drawer plat-school-drawer"
        role="dialog"
        aria-labelledby="plat-create-school-title"
      >
        <header className="stu-drawer__head">
          <div>
            <h2 id="plat-create-school-title" className="stu-drawer__title">
              {t("platformUi.createTitle")}
            </h2>
            <p className="stu-drawer__sub">{t("platformUi.createSub")}</p>
          </div>
          <button type="button" className="stu-drawer__close" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="stu-drawer__body" onSubmit={(e) => void submit(e)}>
          <AppToast message={error} tone="error" onDismiss={() => setError("")} />

          <label className="plat-field">
            <span>{t("platformUi.createOrgName")}</span>
            <input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              autoComplete="organization"
            />
          </label>
          <label className="plat-field">
            <span>{t("platformUi.createCurriculum")}</span>
            <select
              value={curriculumPackageKey}
              onChange={(e) => setCurriculumPackageKey(e.target.value)}
            >
              {packages.length === 0 ? (
                <option value="ETHIOPIAN_PRIVATE">{t("platformUi.createEthiopianPrivate")}</option>
              ) : (
                packages.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                    {!p.isBlank
                      ? ` ${t("platformUi.createSubjectsSuffix", { count: p.counts.subjects })}`
                      : ` ${t("platformUi.createBlankSuffix")}`}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="plat-field">
            <span>{t("platformUi.createCountry")}</span>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              autoComplete="country-name"
            />
          </label>

          <p className="plat-form-divider">{t("platformUi.createFirstAdmin")}</p>

          <div className="plat-field-row">
            <label className="plat-field">
              <span>{t("platformUi.createFirstName")}</span>
              <input
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </label>
            <label className="plat-field">
              <span>{t("platformUi.createLastName")}</span>
              <input
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </label>
          </div>
          <label className="plat-field">
            <span>{t("platformUi.createAdminEmail")}</span>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="plat-field">
            <span>{t("platformUi.createAdminPassword")}</span>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <footer className="stu-drawer__foot stu-drawer__foot--split">
            <button type="button" className="plat-btn plat-btn--ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="plat-btn plat-btn--primary" disabled={busy}>
              {busy ? t("platformUi.createCreating") : t("platformUi.createSubmit")}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}