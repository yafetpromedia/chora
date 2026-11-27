"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { useLocale } from "@/components/i18n/locale-provider";
import { AppToast } from "@/components/ui/app-toast";
import {
  createIdCardScanner,
  ID_CARD_CAMERA_CONFIG,
} from "@/lib/id-card-scanner";
import {
  scanStaffAttendance,
  type StaffScanResult,
} from "@/lib/staff-attendance";

const SCANNER_ID = "staff-attendance-qr-reader";

type ScanMode = "auto" | "check_in" | "check_out";

type Props = {
  date: string;
  onDateChange: (date: string) => void;
  onScanned?: () => void;
};

export function StaffAttendanceScanner({
  date,
  onDateChange,
  onScanned,
}: Props) {
  const { t } = useLocale();
  const [mode, setMode] = useState<ScanMode>("auto");
  const [manualCode, setManualCode] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{
    type: "ok" | "dup" | "err";
    text: string;
  } | null>(null);
  const [scanned, setScanned] = useState<StaffScanResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const processCode = useCallback(
    async (raw: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setBusy(true);
      setFlash(null);
      try {
        const result = await scanStaffAttendance({
          code: raw,
          date,
          mode,
        });
        setScanned((prev) => {
          const without = prev.filter((p) => p.userId !== result.userId);
          return [result, ...without].slice(0, 40);
        });
        setFlash({
          type: result.alreadyMarked ? "dup" : "ok",
          text: result.message,
        });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(result.alreadyMarked ? [40, 30, 40] : 80);
        }
        onScanned?.();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : t("staffAttendanceUi.scanFailed");
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
    },
    [date, mode, onScanned, t],
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
        text: t("staffAttendanceUi.scanCameraUnavailable"),
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

  return (
    <div className="sa-scan">
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

      <div className="sa-scan__toolbar">
        <label className="sa-field">
          <span>{t("staffAttendanceUi.date")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </label>
        <label className="sa-field">
          <span>{t("staffAttendanceUi.scanMode")}</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ScanMode)}
          >
            <option value="auto">{t("staffAttendanceUi.scanMode_auto")}</option>
            <option value="check_in">
              {t("staffAttendanceUi.scanMode_check_in")}
            </option>
            <option value="check_out">
              {t("staffAttendanceUi.scanMode_check_out")}
            </option>
          </select>
        </label>
        <p className="sa-scan__hint">{t("staffAttendanceUi.scanHint")}</p>
      </div>

      <div className="sa-scan__layout">
        <section className="sa-scan__camera-wrap">
          <div className={`sa-scan__camera${cameraOn ? " sa-scan__camera--live" : ""}`}>
            <div id={SCANNER_ID} className="sa-scan__reader" />
            {!cameraOn ? (
              <div className="sa-scan__idle">
                <p className="sa-scan__idle-title">
                  {t("staffAttendanceUi.scanReadyTitle")}
                </p>
                <p className="sa-scan__idle-sub">
                  {t("staffAttendanceUi.scanReadySub")}
                </p>
              </div>
            ) : null}
          </div>
          <div className="sa-scan__controls">
            {!cameraOn ? (
              <button
                type="button"
                className="sa-btn sa-btn--primary"
                onClick={() => void startCamera()}
              >
                {t("attendanceScan.startCamera")}
              </button>
            ) : (
              <button
                type="button"
                className="sa-btn sa-btn--ghost"
                onClick={() => void stopCamera()}
              >
                {t("attendanceScan.stopCamera")}
              </button>
            )}
            <form
              className="sa-scan__manual"
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
                placeholder={t("staffAttendanceUi.scanManualPlaceholder")}
                autoComplete="off"
              />
              <button
                type="submit"
                className="sa-btn sa-btn--ghost"
                disabled={busy || !manualCode.trim()}
              >
                {t("common.submit")}
              </button>
            </form>
          </div>
        </section>

        <aside className="sa-scan__feed">
          <header className="sa-scan__feed-head">
            <h3>{t("staffAttendanceUi.recentScans")}</h3>
            <span>{scanned.length}</span>
          </header>
          {!scanned.length ? (
            <p className="sa-empty">{t("staffAttendanceUi.scansEmpty")}</p>
          ) : (
            <ul className="sa-scan__list">
              {scanned.map((s) => (
                <li key={`${s.userId}-${s.scannedAt}`}>
                  <div>
                    <strong>{s.name}</strong>
                    <span>
                      {s.department} · {s.roleName}
                    </span>
                  </div>
                  <em
                    className={
                      s.alreadyMarked
                        ? "sa-scan__tag sa-scan__tag--dup"
                        : s.action === "check_out"
                          ? "sa-scan__tag sa-scan__tag--out"
                          : "sa-scan__tag sa-scan__tag--in"
                    }
                  >
                    {s.action === "check_in"
                      ? t("staffAttendanceUi.historyIn")
                      : s.action === "check_out"
                        ? t("staffAttendanceUi.historyOut")
                        : t("staffAttendanceUi.scanDone")}
                  </em>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}