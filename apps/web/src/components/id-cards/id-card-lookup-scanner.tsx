"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Html5Qrcode } from "html5-qrcode";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { DashIcon } from "@/components/dashboard/dash-icons";
import {
  createIdCardScanner,
  ID_CARD_CAMERA_CONFIG,
} from "@/lib/id-card-scanner";
import {
  lookupIdCard,
  type IdCardLookupResult,
} from "@/lib/id-cards";

const SCANNER_ID = "id-card-lookup-reader";

type Props = {
  workspace: "admin" | "teacher";
};

export function IdCardLookupScanner({ workspace }: Props) {
  const { t } = useLocale();
  const [manualCode, setManualCode] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [result, setResult] = useState<IdCardLookupResult | null>(null);
  const [history, setHistory] = useState<IdCardLookupResult[]>([]);
  const [justMatched, setJustMatched] = useState(false);
  const [verifiedPopup, setVerifiedPopup] = useState<IdCardLookupResult | null>(
    null,
  );
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const verifiedTimerRef = useRef<number | null>(null);

  const processCode = useCallback(async (raw: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setBusy(true);
    setFlash(null);
    try {
      const found = await lookupIdCard(raw);
      setResult(found);
      setJustMatched(true);
      setVerifiedPopup(found);
      if (verifiedTimerRef.current) {
        window.clearTimeout(verifiedTimerRef.current);
      }
      verifiedTimerRef.current = window.setTimeout(() => {
        setVerifiedPopup(null);
        setJustMatched(false);
      }, 2200);
      setHistory((prev) => {
        const key =
          found.kind === "student"
            ? `s:${found.studentProfileId}`
            : `t:${found.userId}:${found.credential}`;
        const next = [
          found,
          ...prev.filter((p) => {
            const k =
              p.kind === "student"
                ? `s:${p.studentProfileId}`
                : `t:${p.userId}:${p.credential}`;
            return k !== key;
          }),
        ];
        return next.slice(0, 12);
      });
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("idLookup.lookupFailed");
      setFlash({ type: "err", text: msg });
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        processingRef.current = false;
      }, 700);
    }
  }, [t]);

  async function startCamera() {
    if (scannerRef.current) return;
    const scanner = createIdCardScanner(SCANNER_ID);
    scannerRef.current = scanner;
    setCameraOn(true);
    try {
      await scanner.start(
        { facingMode: "environment" },
        ID_CARD_CAMERA_CONFIG,
        (decoded) => {
          void processCode(decoded);
        },
        () => undefined,
      );
    } catch {
      setCameraOn(false);
      scannerRef.current = null;
      setFlash({
        type: "err",
        text: t("idLookup.cameraUnavailable"),
      });
    }
  }

  async function stopCamera() {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => {
    return () => {
      void stopCamera();
      if (verifiedTimerRef.current) {
        window.clearTimeout(verifiedTimerRef.current);
      }
    };
  }, []);

  const attendanceHref =
    workspace === "admin" ? "/admin/attendance" : "/teacher/attendance";
  const staffAttendanceHref = "/admin/staff-attendance";
  const statusLabel = busy
    ? t("idLookup.lookingUp")
    : cameraOn
      ? t("idLookup.live")
      : t("idLookup.cameraOff");

  return (
    <div className="id-lookup">
      <AppToast
        message={flash?.type === "err" ? flash.text : ""}
        tone="error"
        onDismiss={() => setFlash(null)}
      />

      {verifiedPopup ? (
        <VerifiedScanPopup
          result={verifiedPopup}
          onDismiss={() => setVerifiedPopup(null)}
        />
      ) : null}

      <section className="id-lookup__hero" aria-label={t("idLookup.scanOverviewAria")}>
        <div className="id-lookup__hero-copy">
          <p className="id-lookup__eyebrow">{t("idLookup.campusIdentity")}</p>
          <h2 className="id-lookup__hero-title">{t("idLookup.heroTitle")}</h2>
          <p className="id-lookup__hero-sub">{t("idLookup.heroSub")}</p>
          <ul className="id-lookup__tips" aria-label={t("idLookup.whatYouCanScanAria")}>
            <li>
              <span className="id-lookup__tip-icon" aria-hidden>
                <DashIcon name="id-card" />
              </span>
              {t("idLookup.tipCards")}
            </li>
            <li>
              <span className="id-lookup__tip-icon" aria-hidden>
                <DashIcon name="eye" />
              </span>
              {t("idLookup.tipFormats")}
            </li>
            <li>
              <span className="id-lookup__tip-icon" aria-hidden>
                <DashIcon name="sparkle" />
              </span>
              {t("idLookup.tipProfile")}
            </li>
          </ul>
        </div>
        <div className="id-lookup__hero-visual" aria-hidden>
          <div className="id-lookup__orb id-lookup__orb--a" />
          <div className="id-lookup__orb id-lookup__orb--b" />
          <div className="id-lookup__hero-badge">
            <DashIcon name="id-card" />
            <span>{t("idLookup.scanReady")}</span>
          </div>
        </div>
      </section>

      <div className="id-lookup__layout">
        <section className="id-lookup__stage">
          <div className="id-lookup__stage-head">
            <div>
              <h3>{t("idLookup.scanner")}</h3>
              <p>{t("idLookup.scannerSub")}</p>
            </div>
            <span
              className={`id-lookup__status${cameraOn ? " id-lookup__status--live" : ""}${busy ? " id-lookup__status--busy" : ""}`}
            >
              <i aria-hidden />
              {statusLabel}
            </span>
          </div>

          <div
            className={`id-lookup__camera${cameraOn ? " id-lookup__camera--live" : ""}${busy ? " id-lookup__camera--busy" : ""}${justMatched ? " id-lookup__camera--match" : ""}`}
          >
            <div id={SCANNER_ID} className="id-lookup__reader" />
            <div className="id-lookup__frame" aria-hidden>
              <span className="id-lookup__corner id-lookup__corner--tl" />
              <span className="id-lookup__corner id-lookup__corner--tr" />
              <span className="id-lookup__corner id-lookup__corner--bl" />
              <span className="id-lookup__corner id-lookup__corner--br" />
              {cameraOn ? <span className="id-lookup__beam" /> : null}
            </div>
            {!cameraOn ? (
              <div className="id-lookup__idle">
                <div className="id-lookup__idle-icon">
                  <DashIcon name="id-card" />
                </div>
                <p className="id-lookup__idle-title">{t("idLookup.readyTitle")}</p>
                <p className="id-lookup__idle-sub">{t("idLookup.readySub")}</p>
              </div>
            ) : null}
          </div>

          <div className="id-lookup__controls">
            {!cameraOn ? (
              <button
                type="button"
                className="id-lookup__btn id-lookup__btn--primary"
                onClick={() => void startCamera()}
              >
                {t("idLookup.startCamera")}
              </button>
            ) : (
              <button
                type="button"
                className="id-lookup__btn id-lookup__btn--danger"
                onClick={() => void stopCamera()}
              >
                {t("idLookup.stopCamera")}
              </button>
            )}
            <form
              className="id-lookup__manual"
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualCode.trim() || busy) return;
                void processCode(manualCode.trim());
                setManualCode("");
              }}
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={t("idLookup.manualPlaceholder")}
                autoComplete="off"
                aria-label={t("idLookup.cardCodeAria")}
              />
              <button
                type="submit"
                className="id-lookup__btn id-lookup__btn--ghost"
                disabled={busy || !manualCode.trim()}
              >
                {t("idLookup.lookUp")}
              </button>
            </form>
          </div>
        </section>

        <aside className="id-lookup__result">
          {result ? (
            <ResultCard
              result={result}
              attendanceHref={attendanceHref}
              staffAttendanceHref={staffAttendanceHref}
              workspace={workspace}
              matched={justMatched}
              onClear={() => setResult(null)}
            />
          ) : (
            <div className="id-lookup__empty">
              <div className="id-lookup__empty-art" aria-hidden>
                <DashIcon name="users" />
              </div>
              <h3>{t("idLookup.waitingTitle")}</h3>
              <p>{t("idLookup.waitingSub")}</p>
            </div>
          )}

          {history.length > 0 ? (
            <div className="id-lookup__history">
              <div className="id-lookup__history-head">
                <h4>{t("idLookup.recentScans")}</h4>
                <span>{history.length}</span>
              </div>
              <ul>
                {history.map((h) => {
                  const key =
                    h.kind === "student"
                      ? `s:${h.studentProfileId}`
                      : `t:${h.userId}:${h.credential}`;
                  const active =
                    result &&
                    ((result.kind === "student" &&
                      h.kind === "student" &&
                      result.studentProfileId === h.studentProfileId) ||
                      (result.kind === "staff" &&
                        h.kind === "staff" &&
                        result.userId === h.userId));
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setResult(h)}
                        className={`id-lookup__history-item${active ? " id-lookup__history-item--active" : ""}`}
                      >
                        <span
                          className={`id-lookup__pill${h.kind === "student" ? " id-lookup__pill--student" : " id-lookup__pill--staff"}`}
                        >
                          {h.kind === "student" ? t("idLookup.student") : t("idLookup.staff")}
                        </span>
                        <span className="id-lookup__history-name">{h.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function VerifiedScanPopup({
  result,
  onDismiss,
}: {
  result: IdCardLookupResult;
  onDismiss: () => void;
}) {
  const { t } = useLocale();
  const isStudent = result.kind === "student";
  const subtitle = isStudent
    ? result.section
      ? `${result.grade} · ${result.section}`
      : result.grade
    : result.roleLabel;
  const initial = result.name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div
      className="id-lookup__verified"
      role="dialog"
      aria-modal="true"
      aria-label={t("idLookup.identityVerifiedAria")}
      onClick={onDismiss}
    >
      <div
        className="id-lookup__verified-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="id-lookup__verified-check" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="id-lookup__verified-eyebrow">{t("idLookup.choraVerified")}</p>
        <h3 className="id-lookup__verified-title">{t("idLookup.identityConfirmed")}</h3>
        <div className="id-lookup__verified-person">
          <div className="id-lookup__verified-avatar">
            {result.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.photoUrl} alt="" />
            ) : (
              <span aria-hidden>{initial}</span>
            )}
          </div>
          <div>
            <strong>{result.name}</strong>
            <span>
              {isStudent ? t("idLookup.student") : t("idLookup.staff")} · {subtitle}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="id-lookup__btn id-lookup__btn--primary id-lookup__verified-btn"
          onClick={onDismiss}
        >
          {t("idLookup.continue")}
        </button>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  attendanceHref,
  staffAttendanceHref,
  workspace,
  matched,
  onClear,
}: {
  result: IdCardLookupResult;
  attendanceHref: string;
  staffAttendanceHref: string;
  workspace: "admin" | "teacher";
  matched: boolean;
  onClear: () => void;
}) {
  const { t } = useLocale();
  const initial = result.name.trim().slice(0, 1).toUpperCase() || "?";
  const isStudent = result.kind === "student";
  const subtitle = isStudent
    ? result.section
      ? `${result.grade} · ${result.section}`
      : result.grade
    : result.roleLabel;

  return (
    <article
      className={`id-lookup__card${matched ? " id-lookup__card--pop" : ""}`}
    >
      <header
        className={`id-lookup__card-hero${isStudent ? " id-lookup__card-hero--student" : ""}`}
      >
        <div className="id-lookup__avatar">
          {result.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.photoUrl} alt="" />
          ) : (
            <span aria-hidden>{initial}</span>
          )}
        </div>
        <div className="id-lookup__card-hero-main">
          <div className="id-lookup__card-badges">
            <span
              className={`id-lookup__pill${isStudent ? " id-lookup__pill--student" : " id-lookup__pill--staff"}`}
            >
              {isStudent ? t("idLookup.student") : t("idLookup.staff")}
            </span>
            <span className="id-lookup__verified-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t("idLookup.verified")}
            </span>
          </div>
          <h3>{result.name}</h3>
          <p>{subtitle}</p>
        </div>
        <button
          type="button"
          className="id-lookup__card-clear"
          onClick={onClear}
          aria-label={t("idLookup.clearResultAria")}
        >
          ×
        </button>
      </header>

      <dl className="id-lookup__fields">
        {isStudent ? (
          <>
            <div>
              <dt>{t("idLookup.studentId")}</dt>
              <dd>{result.studentId ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("idLookup.cardCode")}</dt>
              <dd>
                <code>{result.cardCode}</code>
              </dd>
            </div>
            <div>
              <dt>{t("idLookup.phone")}</dt>
              <dd>{result.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("idLookup.campusCode")}</dt>
              <dd>
                <code className="id-lookup__payload">{result.cardCode}</code>
              </dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>{t("idLookup.staffId")}</dt>
              <dd>{result.teacherId ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("idLookup.cardCode")}</dt>
              <dd>
                <code>{result.cardCode ?? "—"}</code>
              </dd>
            </div>
            <div>
              <dt>{t("idLookup.credential")}</dt>
              <dd>
                {result.credential === "staff_gate_qr"
                  ? t("idLookup.gateQr")
                  : t("idLookup.printedIdCard")}
              </dd>
            </div>
            <div>
              <dt>{t("idLookup.phone")}</dt>
              <dd>{result.phone ?? "—"}</dd>
            </div>
          </>
        )}
      </dl>

      <div className="id-lookup__actions">
        {isStudent ? (
          <>
            <Link
              href={attendanceHref}
              className="id-lookup__btn id-lookup__btn--primary"
            >
              {t("idLookup.openAttendance")}
            </Link>
            {workspace === "admin" ? (
              <Link
                href={`/admin/students?q=${encodeURIComponent(result.studentId ?? result.name)}`}
                className="id-lookup__btn id-lookup__btn--ghost"
              >
                {t("idLookup.studentRecords")}
              </Link>
            ) : null}
          </>
        ) : workspace === "admin" ? (
          <Link
            href={staffAttendanceHref}
            className="id-lookup__btn id-lookup__btn--primary"
          >
            {t("idLookup.openStaffGate")}
          </Link>
        ) : (
          <Link
            href="/teacher/my-attendance"
            className="id-lookup__btn id-lookup__btn--primary"
          >
            {t("idLookup.myAttendance")}
          </Link>
        )}
      </div>
    </article>
  );
}
