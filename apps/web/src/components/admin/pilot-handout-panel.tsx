"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildParentHandout,
  buildStudentHandout,
  getLoginUrl,
  normalizeLoginUrl,
  readSavedHandoutLoginUrl,
  saveHandoutLoginUrl,
} from "@/lib/school-welcome";
import { useLocale } from "@/components/i18n/locale-provider";

type Props = {
  schoolName: string;
  joinCode: string;
  loginUrl?: string;
};

export function PilotHandoutPanel({ schoolName, joinCode, loginUrl }: Props) {
  const { t } = useLocale();
  const detectedUrl = loginUrl ?? getLoginUrl();
  const [urlDraft, setUrlDraft] = useState(detectedUrl);
  const [copied, setCopied] = useState<"parent" | "student" | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = readSavedHandoutLoginUrl(joinCode);
      setUrlDraft(saved ?? detectedUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [joinCode, detectedUrl]);

  const portalUrl = normalizeLoginUrl(urlDraft) || detectedUrl;
  const isLocal =
    /localhost|127\.0\.0\.1/i.test(portalUrl) || portalUrl.startsWith("/");

  const parentText = useMemo(
    () => buildParentHandout({ schoolName, joinCode, loginUrl: portalUrl }),
    [schoolName, joinCode, portalUrl],
  );

  const studentText = useMemo(
    () => buildStudentHandout({ schoolName, joinCode, loginUrl: portalUrl }),
    [schoolName, joinCode, portalUrl],
  );

  function persistUrl(next: string) {
    const normalized = normalizeLoginUrl(next) || detectedUrl;
    setUrlDraft(normalized);
    saveHandoutLoginUrl(joinCode, normalized);
  }

  async function copy(kind: "parent" | "student", text: string) {
    persistUrl(urlDraft);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="cfg-section pilot-handout">
      <h2 className="cfg-section__title">{t("pilotHandoutUi.title")}</h2>
      <p className="cfg-section__lead">
        {t("pilotHandoutUi.leadBefore")}{" "}
        <Link href="/admin/academics">{t("pilotHandoutUi.academicsSetup")}</Link>{" "}
        {t("pilotHandoutUi.leadAfter")}
      </p>

      <label className="pilot-handout__url">
        <span>{t("pilotHandoutUi.publicLoginUrl")}</span>
        <div className="pilot-handout__url-row">
          <input
            type="url"
            value={urlDraft}
            placeholder={t("pilotHandoutUi.urlPlaceholder")}
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={(e) => persistUrl(e.target.value)}
          />
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => persistUrl(detectedUrl)}
          >
            {t("pilotHandoutUi.reset")}
          </button>
        </div>
        <em>
          {isLocal ? t("pilotHandoutUi.urlHintLocal") : t("pilotHandoutUi.urlHintPublic")}
        </em>
      </label>

      <div className="pilot-handout__grid">
        <div className="pilot-handout__card">
          <h3>{t("pilotHandoutUi.parents")}</h3>
          <pre className="pilot-handout__pre">{parentText}</pre>
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => void copy("parent", parentText)}
          >
            {copied === "parent" ? t("pilotHandoutUi.copied") : t("pilotHandoutUi.copyParent")}
          </button>
        </div>
        <div className="pilot-handout__card">
          <h3>{t("pilotHandoutUi.students")}</h3>
          <pre className="pilot-handout__pre">{studentText}</pre>
          <button
            type="button"
            className="cfg-btn cfg-btn--ghost"
            onClick={() => void copy("student", studentText)}
          >
            {copied === "student" ? t("pilotHandoutUi.copied") : t("pilotHandoutUi.copyStudent")}
          </button>
        </div>
      </div>
      <p className="cfg-hint">
        {t("pilotHandoutUi.staffHintBefore")}{" "}
        <Link href="/admin/teachers">{t("pilotHandoutUi.teachersLink")}</Link>{" "}
        {t("pilotHandoutUi.staffHintAfter")}
      </p>
    </section>
  );
}