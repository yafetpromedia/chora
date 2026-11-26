"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listGradesForAttendance } from "@/lib/attendance";
import type { GradeWithSections } from "@/lib/api";
import { getMyTeacherProfile } from "@/lib/teachers";
import { scanStudentAttendance, type ScanAttendanceResult } from "@/lib/student-cards";
import {
  createIdCardScanner,
  ID_CARD_CAMERA_CONFIG,
} from "@/lib/id-card-scanner";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import { DashIcon } from "@/components/dashboard/dash-icons";
import type { Html5Qrcode } from "html5-qrcode";

const SCANNER_ID = "attendance-qr-reader";

function AttendanceScannerFallback() {
  const { t } = useLocale();
  return <p className="tch-meta">{t("attendanceScan.loadingScanner")}</p>;
}

export function AttendanceScanner() {
  return (
    <Suspense fallback={<AttendanceScannerFallback />}>
      <AttendanceScannerInner />
    </Suspense>
  );
}

function AttendanceScannerInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const initialGradeId = searchParams.get("gradeId") ?? "";
  const initialSectionId = searchParams.get("sectionId") ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const [grades, setGrades] = useState<GradeWithSections[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(today);
  const [manualCode, setManualCode] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ type: "ok" | "dup" | "err"; text: string } | null>(null);
  const [scanned, setScanned] = useState<ScanAttendanceResult[]>([]);
  const [justMatched, setJustMatched] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const selectedGrade = grades.find((g) => g.id === gradeId);

  useEffect(() => {
    void Promise.all([
      listGradesForAttendance(),
      getMyTeacherProfile().catch(() => null),
    ])
      .then(([g, profile]) => {
        setGrades(g);
        const homeroom = profile?.homeroom;
        const preferred =
          initialGradeId && g.some((x) => x.id === initialGradeId)
            ? initialGradeId
            : homeroom?.gradeId && g.some((x) => x.id === homeroom.gradeId)
              ? homeroom.gradeId
              : g[0]?.id ?? "";
        setGradeId(preferred);
        const grade = g.find((x) => x.id === preferred);
        const sectionPreferred =
          initialSectionId && grade?.sections.some((s) => s.id === initialSectionId)
            ? initialSectionId
            : homeroom?.sectionId && grade?.sections.some((s) => s.id === homeroom.sectionId)
              ? homeroom.sectionId
              : "";
        setSectionId(sectionPreferred);
      })
      .catch(() => undefined);
  }, [initialGradeId, initialSectionId]);

  const processCode = useCallback(
    async (raw: string) => {
      if (!gradeId || processingRef.current) return;
      processingRef.current = true;
      setBusy(true);
      setFlash(null);
      try {
        const result = await scanStudentAttendance({
          code: raw,
          date,
          gradeId,
          sectionId: sectionId || undefined,
          periodNumber: 0,
        });
        setScanned((prev) => {
          const without = prev.filter((p) => p.studentProfileId !== result.studentProfileId);
          return [result, ...without];
        });
        setJustMatched(true);
        window.setTimeout(() => setJustMatched(false), 850);
        setFlash({
          type: result.alreadyMarked ? "dup" : "ok",
          text: result.alreadyMarked
            ? t("attendanceScan.alreadyMarkedPresent", { name: result.name })
            : t("attendanceScan.markedPresent", { name: result.name }),
        });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(result.alreadyMarked ? [40, 30, 40] : 80);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("attendanceScan.scanFailed");
        setFlash({ type: "err", text: msg });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([60, 40, 60]);
        }
      } finally {
        setBusy(false);
        window.setTimeout(() => {
          processingRef.current = false;
        }, 600);
      }
    },
    [date, gradeId, sectionId, t],
  );

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
        text: t("attendanceScan.cameraUnavailable"),
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
    };
  }, []);

  const classLabel = selectedGrade
    ? `${selectedGrade.name}${sectionId ? ` · ${selectedGrade.sections.find((s) => s.id === sectionId)?.name ?? ""}` : ""}`
    : t("attendanceScan.selectClass");
  const statusLabel = busy
    ? t("attendanceScan.marking")
    : cameraOn
      ? t("attendanceScan.live")
      : t("attendanceScan.cameraOff");
  const presentCount = scanned.filter((s) => !s.alreadyMarked).length;

  return (
    <div className="att-scan">
      <AppToast
        message={flash?.type === "ok" ? flash.text : ""}
        tone="success"
        onDismiss={() => setFlash(null)}
      />
      <AppToast
        message={flash?.type === "dup" ? flash.text : ""}
        tone="warn"
        onDismiss={() => setFlash(null)}
      />
      <AppToast
        message={flash?.type === "err" ? flash.text : ""}
        tone="error"
        onDismiss={() => setFlash(null)}
      />

      <section className="att-scan__hero" aria-label={t("attendanceScan.homeroomScanAria")}>
        <div className="att-scan__hero-copy">
          <p className="att-scan__eyebrow">{t("attendanceScan.homeroomRoll")}</p>
          <h2 className="att-scan__hero-title">{t("attendanceScan.heroTitle")}</h2>
          <p className="att-scan__hero-sub">
            {t("attendanceScan.heroSub", { classLabel })}
          </p>
        </div>
        <div className="att-scan__hero-stats">
          <div>
            <strong>{scanned.length}</strong>
            <span>{t("attendanceScan.scanned")}</span>
          </div>
          <div>
            <strong>{presentCount}</strong>
            <span>{t("attendanceScan.newMarks")}</span>
          </div>
        </div>
      </section>

      <section className="att-scan__filters">
        <label className="att-scan__field">
          <span>{t("attendanceScan.grade")}</span>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId("");
              setScanned([]);
            }}
            disabled={grades.length === 0}
          >
            {grades.length === 0 ? (
              <option value="">{t("attendanceScan.noClassesAssigned")}</option>
            ) : null}
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="att-scan__field">
          <span>{t("attendanceScan.section")}</span>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">{t("attendanceScan.allSections")}</option>
            {selectedGrade?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="att-scan__field">
          <span>{t("attendanceScan.date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="att-scan__filter-meta">
          <span>{classLabel}</span>
        </div>
      </section>

      <div className="att-scan__layout">
        <section className="att-scan__stage">
          <div className="att-scan__stage-head">
            <div>
              <h3>{t("attendanceScan.scanner")}</h3>
              <p>{t("attendanceScan.scannerSub")}</p>
            </div>
            <span
              className={`att-scan__status${cameraOn ? " att-scan__status--live" : ""}${busy ? " att-scan__status--busy" : ""}`}
            >
              <i aria-hidden />
              {statusLabel}
            </span>
          </div>

          <div
            className={`att-scan__camera${cameraOn ? " att-scan__camera--live" : ""}${justMatched ? " att-scan__camera--match" : ""}`}
          >
            <div id={SCANNER_ID} className="att-scan__reader" />
            <div className="att-scan__frame" aria-hidden>
              <span className="att-scan__corner att-scan__corner--tl" />
              <span className="att-scan__corner att-scan__corner--tr" />
              <span className="att-scan__corner att-scan__corner--bl" />
              <span className="att-scan__corner att-scan__corner--br" />
              {cameraOn ? <span className="att-scan__beam" /> : null}
            </div>
            {!cameraOn ? (
              <div className="att-scan__idle">
                <div className="att-scan__idle-icon">
                  <DashIcon name="attendance" />
                </div>
                <p className="att-scan__idle-title">{t("attendanceScan.readyTitle")}</p>
                <p className="att-scan__idle-sub">{t("attendanceScan.readySub")}</p>
              </div>
            ) : null}
          </div>

          <div className="att-scan__controls">
            {!cameraOn ? (
              <button
                type="button"
                className="att-scan__btn att-scan__btn--primary"
                onClick={() => void startCamera()}
                disabled={!gradeId}
              >
                {t("attendanceScan.startCamera")}
              </button>
            ) : (
              <button
                type="button"
                className="att-scan__btn att-scan__btn--danger"
                onClick={() => void stopCamera()}
              >
                {t("attendanceScan.stopCamera")}
              </button>
            )}
            <form
              className="att-scan__manual"
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualCode.trim() || busy || !gradeId) return;
                void processCode(manualCode.trim());
                setManualCode("");
              }}
            >
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder={t("attendanceScan.manualPlaceholder")}
                autoComplete="off"
                aria-label={t("attendanceScan.cardCodeAria")}
              />
              <button
                type="submit"
                className="att-scan__btn att-scan__btn--ghost"
                disabled={busy || !manualCode.trim() || !gradeId}
              >
                {t("attendanceScan.mark")}
              </button>
            </form>
          </div>
        </section>

        <aside className="att-scan__log">
          <header className="att-scan__log-head">
            <h3>{t("attendanceScan.sessionLog")}</h3>
            <span>{scanned.length}</span>
          </header>
          {scanned.length === 0 ? (
            <div className="att-scan__log-empty">
              <DashIcon name="students" />
              <p>{t("attendanceScan.noScansYet")}</p>
              <span>{t("attendanceScan.noScansHint")}</span>
            </div>
          ) : (
            <ul className="att-scan__log-list">
              {scanned.map((s) => (
                <li
                  key={s.studentProfileId}
                  className={`att-scan__log-item${s.alreadyMarked ? " att-scan__log-item--dup" : ""}`}
                >
                  <span className="att-scan__log-mark" aria-hidden>
                    {s.alreadyMarked ? "·" : "✓"}
                  </span>
                  <div>
                    <strong>{s.name}</strong>
                    <p>
                      {s.grade}
                      {s.section ? ` · ${s.section}` : ""}
                      {s.alreadyMarked
                        ? ` · ${t("attendanceScan.alreadyMarkedSuffix")}`
                        : ` · ${t("attendanceScan.presentSuffix")}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
