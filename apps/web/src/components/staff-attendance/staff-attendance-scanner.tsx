"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AppToast } from "@/components/ui/app-toast";
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
        const msg = err instanceof Error ? err.message : "Scan failed";
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
    [date, mode, onScanned],
  );

  async function startCamera() {
    if (scannerRef.current) return;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    setCameraOn(true);
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
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
        text: "Camera not available. Type the staff card code below.",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
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
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </label>
        <label className="sa-field">
          <span>Scan mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ScanMode)}
          >
            <option value="auto">Auto (in → out)</option>
            <option value="check_in">Check-in only</option>
            <option value="check_out">Check-out only</option>
          </select>
        </label>
        <p className="sa-scan__hint">
          Accepts staff QR (`CAMPUS1-S:…`) and teacher cards (`CAMPUS1-T:…` /
          TCH- ID). Student cards (`CAMPUS1:…`) are rejected. Auto mode checks in
          on the first scan and checks out on the second.
        </p>
      </div>

      <div className="sa-scan__layout">
        <section className="sa-scan__camera-wrap">
          <div className={`sa-scan__camera${cameraOn ? " sa-scan__camera--live" : ""}`}>
            <div id={SCANNER_ID} className="sa-scan__reader" />
            {!cameraOn ? (
              <div className="sa-scan__idle">
                <p className="sa-scan__idle-title">Ready to scan</p>
                <p className="sa-scan__idle-sub">
                  Start the camera and point it at a staff ID card
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
                Start camera
              </button>
            ) : (
              <button
                type="button"
                className="sa-btn sa-btn--ghost"
                onClick={() => void stopCamera()}
              >
                Stop camera
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
                placeholder="Or type card code / TCH-…"
                autoComplete="off"
              />
              <button
                type="submit"
                className="sa-btn sa-btn--ghost"
                disabled={busy || !manualCode.trim()}
              >
                Submit
              </button>
            </form>
          </div>
        </section>

        <aside className="sa-scan__feed">
          <header className="sa-scan__feed-head">
            <h3>Recent scans</h3>
            <span>{scanned.length}</span>
          </header>
          {!scanned.length ? (
            <p className="sa-empty">Scans will appear here.</p>
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
                      ? "In"
                      : s.action === "check_out"
                        ? "Out"
                        : "Done"}
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
