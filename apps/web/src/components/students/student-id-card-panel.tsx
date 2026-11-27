"use client";

import { useEffect, useState } from "react";
import { StudentIdCardView } from "@/components/students/student-id-card";
import { StudentIdCardModal } from "@/components/students/student-id-card-modal";
import {
  getChildStudentIdCard,
  getMyStudentIdCard,
  getStudentIdCard,
  type StudentIdCard,
} from "@/lib/student-cards";
import type { StudentIdCardVariant } from "@/components/students/student-id-card";
import { useLocale } from "@/components/i18n/locale-provider";

export type StudentIdCardSource = "profile" | "me" | "child" | "static";

type Props = {
  source: StudentIdCardSource;
  profileId?: string;
  card?: StudentIdCard | null;
  variant?: StudentIdCardVariant;
  className?: string;
  title?: string;
  subtitle?: string;
};

export function StudentIdCardPanel({
  source,
  profileId,
  card: staticCard,
  variant = "compact",
  className = "",
  title,
  subtitle,
}: Props) {
  const { t } = useLocale();
  const displayTitle = title ?? t("idCardPortal.panelTitle");
  const [fetchedCard, setCard] = useState<StudentIdCard | null>(null);
  const [loadingState, setLoading] = useState(source !== "static");
  const [errorState, setError] = useState("");
  const missingProfile = (source === "profile" || source === "child") && !profileId;
  const card =
    source === "static" ? (staticCard ?? null) : missingProfile ? null : fetchedCard;
  const loading = source !== "static" && !missingProfile && loadingState;
  const error = missingProfile
    ? source === "child"
      ? t("idCardPortal.missingChildProfile")
      : t("idCardPortal.missingStudentProfile")
    : errorState;
  const [modalOpen, setModalOpen] = useState(false);

  const fetchKey = source === "static" || missingProfile ? "" : `${source}|${profileId ?? ""}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey);
    if (fetchKey) {
      setLoading(true);
      setError("");
    }
  }

  useEffect(() => {
    if (source === "static" || missingProfile) return;

    const fetcher =
      source === "me"
        ? getMyStudentIdCard()
        : source === "child"
          ? getChildStudentIdCard(profileId!)
          : getStudentIdCard(profileId!);

    void fetcher
      .then(setCard)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("idCardPortal.loadFailed")),
      )
      .finally(() => setLoading(false));
  }, [source, profileId, missingProfile]);

  return (
    <section className={`sid-my-panel dash-panel dash-panel--flat ${className}`.trim()}>
      <div className="sid-my-panel__head">
        <div>
          <h2 className="sid-my-panel__title">{displayTitle}</h2>
          {subtitle ? <p className="sid-my-panel__sub">{subtitle}</p> : null}
        </div>
        {card ? (
          <button
            type="button"
            className="att-btn att-btn--primary no-print"
            onClick={() => setModalOpen(true)}
          >
            {t("idCardPortal.fullViewPrint")}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="setup-hint">{t("idCardPortal.loadingIdCard")}</p>
      ) : error ? (
        <p className="att-toast att-toast--error">{error}</p>
      ) : card ? (
        <div className="sid-my-panel__card">
          <StudentIdCardView card={card} variant={variant} />
        </div>
      ) : null}

      {card ? (
        <p className="sid-my-panel__hint no-print">
          {t("idCardPortal.hintFullView")}
        </p>
      ) : null}

      {modalOpen && card ? (
        <StudentIdCardModal
          studentProfileId={card.studentProfileId}
          card={card}
          onClose={() => setModalOpen(false)}
          variant="standard"
          showBack
          downloadHint
        />
      ) : null}
    </section>
  );
}
